const Category = require('../models/Category');
const sharp = require('sharp');
const mongoose = require('mongoose');
const Product = require('../models/ProductUpload');
const { translateResponse } = require('../services/translation.service');
const { uploadBufferToGCS,deleteFileFromGCS  } = require('../utils/gcloud'); 

const CatFieldsToTranslate = [
  'name'         
];
const ProductFieldsToTranslate = ['name', 'about'];

async function generateCategoryId() {
  const lastCat = await Category.findOne().sort({ createdAt: -1 });
  if (!lastCat) return 'CAT001';

  const lastNum = parseInt(lastCat.categoryId.replace('CAT', '')) + 1;
  return `CAT${String(lastNum).padStart(3, '0')}`;
}


exports.createCategory = async (req, res) => {
  try {
    const { name, position } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'At least one image is required' });
    }

    const categoryId = await generateCategoryId();

    const uploadedImages = await Promise.all(
      req.files.map(async (file) => {
        const compressedBuffer = await sharp(file.buffer)
          .resize({ width: 1000 })
          .jpeg({ quality: 70 })
          .toBuffer();

        const fileName = `cat-${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
        const { id, url } = await uploadBufferToGCS(compressedBuffer, fileName, 'categories');

        return { id, url };
      })
    );

    // If a position is provided, shift existing categories
    if (position !== undefined && position !== null) {
      // Increment positions of existing categories >= new position
      await Category.updateMany(
        { position: { $gte: Number(position) } },
        { $inc: { position: 1 } }
      );
    }

    const category = new Category({
      categoryId,
      name,
      images: uploadedImages,
      position: position !== undefined ? Number(position) : null,
    });

    await category.save();

    res.status(201).json({
      message: '✅ Category created successfully',
      category
    });

  } catch (error) {
    console.error("❌ Error creating category:", error);
    res.status(500).json({
      message: '❌ Category creation failed',
      error: error.message
    });
  }
};





/**
 * @desc    Get all categories with product counts and translations
 * @route   GET /api/v1/categories
 * @access  Public
 */
exports.getCategories = async (req, res) => {
  try {
    // Step 1: Fetch product counts (this logic is efficient and remains unchanged)
    const productCounts = await Product.aggregate([
      { $match: { quantity: { $gt: 0 } } },
      { $group: { _id: "$categoryId", count: { $sum: 1 } } }
    ]);
    const productCountMap = productCounts.reduce((acc, pc) => {
      if (pc._id) { // Ensure we don't process null IDs
          acc[pc._id.toString()] = pc.count;
      }
      return acc;
    }, {});

    // Step 2: Fetch all categories from the database, using .lean() for performance
    const categoriesFromDB = await Category.find()
      .sort({ position: 1, createdAt: -1 })
      .lean(); // Use .lean() for faster processing

    // Step 3: Pass the raw data to the translation service
    const translatedCategories = await translateResponse(req, categoriesFromDB, CatFieldsToTranslate);

    // Step 4: Map the translated data to the final response format
    const formattedCategories = translatedCategories.map(cat => {
      
      // Process images to ensure every image has an _id
      // No .toObject() needed here because we used .lean()
      const processedImages = cat.images.map(img => ({
        _id: img._id || new mongoose.Types.ObjectId(),
        url: img.url,
        id: img.id || null
      }));

      // Return the final, structured category object for the response
      return {
        ...cat, // Spread the (potentially translated) category object
        images: processedImages,
        // The 'name' field from the spread will already be translated if a lang was specified
        totalProducts: productCountMap[cat.categoryId] || 0
      };
    });

    // Step 5: Send a consistent, successful response
    res.status(200).json({
      success: true,
      message: '✅ Categories fetched successfully',
      categories: formattedCategories
    });

  } catch (error) {
    // Consistent error handling
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: '❌ Failed to fetch categories',
      error: error.message
    });
  }
};



// exports.updateCategory = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { name, position, removeIds } = req.body;

//     const existingCategory = await Category.findById(id);
//     if (!existingCategory) {
//       return res.status(404).json({ message: 'Category not found' });
//     }

//     const oldPosition = existingCategory.position;

//     // 1️⃣ Remove images by ID
//     if (removeIds) {
//       const removeIdsArr = JSON.parse(removeIds);
//       const deletionPromises = removeIdsArr.map(imageId => deleteFileFromGCS(imageId));
//       await Promise.all(deletionPromises);

//       existingCategory.images = existingCategory.images.filter(
//         img => !removeIdsArr.includes(img.id)
//       );
//     }

//     // 2️⃣ Normalize old malformed images before adding new ones
// // 2️⃣ Normalize old malformed images before adding new ones
// existingCategory.images = existingCategory.images.map(img => {
//   if (img && typeof img.url === 'object') {
//     // Case: { url: { id: "...", url: "..." } }
//     return { id: img.url.id || '', url: img.url.url || '' };
//   }

//   if (!img.id && typeof img.url === 'string') {
//     // Case: { url: "https://..." } → no "id"
//     return { id: '', url: img.url };
//   }

//   return img; // Already valid { id, url }
// });


//     // 3️⃣ Upload new images
//     if (req.files && req.files.length > 0) {
//       const uploadPromises = req.files.map(async file => {
//         const compressedBuffer = await sharp(file.buffer)
//           .resize({ width: 1000 })
//           .jpeg({ quality: 70 })
//           .toBuffer();

//         const uploaded = await uploadBufferToGCS(
//           compressedBuffer,
//           file.originalname,
//           'categories',
//           'image/jpeg'
//         );

//         return { id: uploaded.id, url: uploaded.url };
//       });

//       const newImages = await Promise.all(uploadPromises);
//       existingCategory.images.push(...newImages);
//     }

//     // 4️⃣ Update other fields
//     if (name) existingCategory.name = name;

//     if (position !== undefined && position !== null) {
//       const newPosition = Number(position);

//       if (oldPosition !== newPosition) {
//         if (newPosition < oldPosition) {
//           // Shift categories between newPosition and oldPosition - 1 up by 1
//           await Category.updateMany(
//             { position: { $gte: newPosition, $lt: oldPosition }, _id: { $ne: id } },
//             { $inc: { position: 1 } }
//           );
//         } else {
//           // Shift categories between oldPosition + 1 and newPosition down by 1
//           await Category.updateMany(
//             { position: { $gt: oldPosition, $lte: newPosition }, _id: { $ne: id } },
//             { $inc: { position: -1 } }
//           );
//         }

//         existingCategory.position = newPosition;
//       }
//     }

//     // 5️⃣ Save category
//     const updatedCategory = await existingCategory.save();

//     res.status(200).json({
//       message: '✅ Category updated successfully',
//       category: updatedCategory
//     });

//   } catch (error) {
//     console.error("❌ Error updating category:", error);
//     res.status(500).json({
//       message: '❌ Category update failed',
//       error: error.message
//     });
//   }
// };


exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, position, removeIds } = req.body;

    const existingCategory = await Category.findById(id);
    if (!existingCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const oldPosition = existingCategory.position;

    // 1️⃣ Remove images by ID
    if (removeIds) {
      const removeIdsArr = Array.isArray(removeIds) ? removeIds : JSON.parse(removeIds);
      const deletionPromises = removeIdsArr.map(imageId => deleteFileFromGCS(imageId));
      await Promise.all(deletionPromises);

      existingCategory.images = existingCategory.images.filter(
        img => !removeIdsArr.includes(img.id)
      );
    }

    // 2️⃣ Normalize existing images (fix old malformed records)
    existingCategory.images = existingCategory.images.map(img => {
      if (img && img.url && typeof img.url === 'object') {
        // Case: { url: { id, url } } → flatten
        return { id: img.url.id || '', url: img.url.url || '' };
      }
      if (!img.id && typeof img.url === 'string') {
        // Case: only url string exists
        return { id: '', url: img.url };
      }
      return img; // Already correct
    });

    // 3️⃣ Parse incoming images payload (robust for all environments)
    let parsedImages = [];
    if (req.body.images) {
      if (typeof req.body.images === 'string') {
        parsedImages = JSON.parse(req.body.images); // JSON string from form-data
      } else if (Array.isArray(req.body.images)) {
        parsedImages = req.body.images; // already array (Cloud Run)
      } else if (typeof req.body.images === 'object') {
        parsedImages = [req.body.images]; // single object
      }
    }

    parsedImages = parsedImages.map(img => ({
      id: img.id || (img.url?.id || ''),
      url: img.url?.url || img.url || ''
    }));

    existingCategory.images.push(...parsedImages);

    // 4️⃣ Upload new files if any
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(async file => {
        const compressedBuffer = await sharp(file.buffer)
          .resize({ width: 1000 })
          .jpeg({ quality: 70 })
          .toBuffer();

        const uploaded = await uploadBufferToGCS(
          compressedBuffer,
          file.originalname,
          'categories',
          'image/jpeg'
        );

        return { id: uploaded.id, url: uploaded.url };
      });

      const newImages = await Promise.all(uploadPromises);
      existingCategory.images.push(...newImages);
    }

    // 5️⃣ Update other fields
    if (name) existingCategory.name = name;

    if (position !== undefined && position !== null) {
      const newPosition = Number(position);

      if (oldPosition !== newPosition) {
        if (newPosition < oldPosition) {
          await Category.updateMany(
            { position: { $gte: newPosition, $lt: oldPosition }, _id: { $ne: id } },
            { $inc: { position: 1 } }
          );
        } else {
          await Category.updateMany(
            { position: { $gt: oldPosition, $lte: newPosition }, _id: { $ne: id } },
            { $inc: { position: -1 } }
          );
        }

        existingCategory.position = newPosition;
      }
    }

    // 6️⃣ Save category
    const updatedCategory = await existingCategory.save();

    res.status(200).json({
      message: '✅ Category updated successfully',
      category: updatedCategory
    });

  } catch (error) {
    console.error("❌ Error updating category:", error);
    res.status(500).json({
      message: '❌ Category update failed',
      error: error.message
    });
  }
};







// Delete Category by categoryId
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;  // using _id from URL param

    // Find the category first to get its position
    const categoryToDelete = await Category.findById(id);

    if (!categoryToDelete) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const deletedPosition = categoryToDelete.position;

    // Delete the category
    await Category.findByIdAndDelete(id);

    // Shift back positions of categories that had higher positions
    if (deletedPosition !== undefined && deletedPosition !== null) {
      await Category.updateMany(
        { position: { $gt: deletedPosition } },
        { $inc: { position: -1 } }
      );
    }

    // Also delete images from Cloudinary if needed
    if (categoryToDelete.images && categoryToDelete.images.length > 0) {
      for (const img of categoryToDelete.images) {
        if (img.public_id) {
          await cloudinary.uploader.destroy(img.public_id);
        }
      }
    }

    res.status(200).json({ message: '✅ Category deleted successfully' });
  } catch (error) {
    console.error("❌ Error deleting category:", error);
    res.status(500).json({ message: '❌ Category deletion failed', error: error.message });
  }
};




exports.toggleCategoryStock = async (req, res) => {
  try {
    let { id } = req.params;
    id = id.trim();

    // Find category ONLY by categoryId field (not _id)
    const category = await Category.findOne({ categoryId: id });

    if (!category) {
      return res.status(404).json({ message: `Category with categoryId '${id}' not found` });
    }

    // Toggle inStock boolean (default true if missing)
    if (typeof category.inStock !== 'boolean') {
      category.inStock = true;
    } else {
      category.inStock = !category.inStock;
    }

    await category.save();

    res.status(200).json({
      message: `Category stock status updated to ${category.inStock ? 'In Stock' : 'Out of Stock'}`,
      inStock: category.inStock
    });
  } catch (error) {
    console.error('Toggle Error:', error.message);
    res.status(500).json({ message: 'Failed to toggle stock status', error: error.message });
  }
};

// GET /api/categories/:id
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Validate the ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid category id' });
    }

    // 2. Fetch the category and its products using .lean() for efficiency
    // .lean() returns plain JavaScript objects, which is ideal for translation
    const categoryFromDB = await Category.findById(id).lean();
    if (!categoryFromDB) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const productsFromDB = await Product.find({ categoryId: categoryFromDB._id }).lean();

    // 3. Translate the fetched data
    // The translateResponse service likely expects an array.
    // We wrap the single category object in an array `[categoryFromDB]` and then destructure the result.
    const [translatedCategory] = await translateResponse(req, [categoryFromDB], CatFieldsToTranslate);
    
    // The products are already in an array, so we can pass them directly.
    const translatedProducts = await translateResponse(req, productsFromDB, ProductFieldsToTranslate);

    // 4. Send the successful, translated response
    res.status(200).json({
      success: true,
      message: '✅ Category and products fetched successfully',
      category: translatedCategory, // Send the full translated category object
      products: translatedProducts // Send the array of translated product objects
    });

  } catch (error) {
    // 5. Consistent error handling
    console.error(`❌ Error fetching category by ID ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      message: '❌ Failed to fetch category',
      error: error.message
    });
  }
};


// ✅ CORRECTED AND FINAL VERSION
// ✅ CORRECTED AND FINAL VERSION
exports.deleteCategoryImage = async (req, res) => {
  try {
    // The :categoryId is the parent document's _id
    // The :imageId is the sub-document's _id (the image's unique _id)
    const { categoryId, imageId } = req.params;

    // 1. Find the parent category first
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }
    
    // 2. Find the specific image subdocument within the category's array using its _id
    const imageToDelete = category.images.find(img => img._id.toString() === imageId);

    // If the image with that _id doesn't exist in this category, return an error
    if (!imageToDelete) {
        return res.status(404).json({ message: 'Image with the specified ID was not found in this category.' });
    }

    // 3. Extract the GCS file path from the image's public URL
    // Example URL: https://storage.googleapis.com/3bprofiles-products/categories/cea30...
    // We need to extract the path: "categories/cea30..."
    const urlParts = imageToDelete.url.split('/');
    const gcsFilePath = urlParts.slice(4).join('/'); // Skips the first 4 parts (https:, , storage.googleapis.com, bucket-name)

    if (!gcsFilePath) {
      return res.status(500).json({ message: 'Could not parse file path from image URL.' });
    }

    // 4. Delete the file from Google Cloud Storage using the extracted path
    await deleteFileFromGCS(gcsFilePath);

    // 5. Remove the image reference from the Category document in MongoDB using its _id
    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      { $pull: { images: { _id: imageId } } }, // Pull the element where the _id matches
      { new: true }
    );

    res.status(200).json({
      message: '✅ Image deleted successfully',
      category: updatedCategory,
    });

  } catch (error) {
    console.error("❌ Image deletion failed:", error);
    res.status(500).json({ message: '❌ Image deletion failed', error: error.message });
  }
};