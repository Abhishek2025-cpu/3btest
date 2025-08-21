const Category = require('../models/Category');
const sharp = require('sharp');
const mongoose = require('mongoose');
const Product = require('../models/ProductUpload');
const { uploadBufferToGCS,deleteFileFromGCS  } = require('../utils/gcloud'); // ✅ Fixed named import

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
        
        // Destructure the id and url from the returned object
        const { id, url } = await uploadBufferToGCS(compressedBuffer, fileName, 'categories');

        return { id, url }; // Return the complete object
      })
    );

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




exports.getCategories = async (req, res) => {
  try {
    // Fetch all categories from the database
    const categoriesFromDB = await Category.find().sort({ position: 1, createdAt: -1 });
    
    // Fetch product counts (your existing logic is good)
    const productCounts = await Product.aggregate([
      { $match: { quantity: { $gt: 0 } } },
      { $group: { _id: "$categoryId", count: { $sum: 1 } } }
    ]);
    const productCountMap = productCounts.reduce((acc, pc) => {
      acc[pc._id] = pc.count;
      return acc;
    }, {});

    // ✅ MODIFICATION HAPPENS HERE:
    // Process the categories to ensure every image has an _id
    const categoriesForResponse = categoriesFromDB.map(cat => {
      
      const processedImages = cat.images.map(img => {
        // Convert the Mongoose subdocument to a plain JavaScript object
        const imageObject = img.toObject();

        // If the image doesn't have an _id (old data), create one.
        // If it does (new data), use the existing one.
        return {
          _id: imageObject._id || new mongoose.Types.ObjectId(), // <-- THE KEY CHANGE
          url: imageObject.url,
          id: imageObject.id || null // Use 'id' (file path), not 'public_id'
        };
      });

      // Return the final, structured category object for the response
      return {
        _id: cat._id,
        categoryId: cat.categoryId,
        name: cat.name,
        position: cat.position ?? null,
        images: processedImages, // Use the newly processed images array
        totalProducts: productCountMap[cat.categoryId] || 0
      };
    });

    res.status(200).json(categoriesForResponse);

  } catch (error) {
    res.status(500).json({ message: '❌ Failed to fetch categories', error: error.message });
  }
};



exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, position } = req.body;

    const existingCategory = await Category.findById(id);
    if (!existingCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Group uploaded files by field name
    const filesByField = req.files?.reduce((acc, file) => {
      if (!acc[file.fieldname]) acc[file.fieldname] = [];
      acc[file.fieldname].push(file);
      return acc;
    }, {}) || {};

    // 1. Handle image removals
    if (filesByField.removeImages && filesByField.removeImages.length > 0) {
      const removeFiles = filesByField.removeImages;

      // get stored image IDs from filenames
      const removeIds = removeFiles.map(file => {
        // we assume file.originalname matches stored fileName
        return `categories/${file.originalname}`;
      });

      // Delete from GCS
      const deletionPromises = removeIds.map(imageId => deleteFileFromGCS(imageId));
      await Promise.all(deletionPromises);

      // Filter them out of DB
      existingCategory.images = existingCategory.images.filter(
        img => !removeIds.includes(img.id)
      );
    }

    // 2. Handle new image uploads
    if (filesByField.newImages && filesByField.newImages.length > 0) {
      const uploadPromises = filesByField.newImages.map(async (file) => {
        const compressedBuffer = await sharp(file.buffer)
          .resize({ width: 1000 })
          .jpeg({ quality: 70 })
          .toBuffer();

        const fileName = `compressed-${Date.now()}-${file.originalname}`;
        const url = await uploadBufferToGCS(compressedBuffer, fileName, 'categories');
        return { url, id: `categories/${fileName}` };
      });

      const newImages = await Promise.all(uploadPromises);
      existingCategory.images.push(...newImages);
    }

    // 3. Update other fields
    if (name) existingCategory.name = name;
    if (position !== undefined) existingCategory.position = Number(position);

    // 4. Save
    const updatedCategory = await existingCategory.save();

    res.status(200).json({
      message: '✅ Category updated successfully',
      category: updatedCategory
    });

  } catch (error) {
    res.status(500).json({ message: '❌ Category update failed', error: error.message });
  }
};




// Delete Category by categoryId
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;  // using _id from URL param

    // Find by _id and delete
    const deleted = await Category.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Also delete images from Cloudinary if needed
    if (deleted.images && deleted.images.length > 0) {
      for (const img of deleted.images) {
        if (img.public_id) {
          await cloudinary.uploader.destroy(img.public_id);
        }
      }
    }

    res.status(200).json({ message: '✅ Category deleted successfully' });
  } catch (error) {
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

    // Find category by _id (ObjectId)
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid category id' });
    }
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Find all products with this category's _id
    const products = await Product.find({ categoryId: category._id });

    res.status(200).json({
      category: {
        _id: category._id,
        categoryId: category.categoryId,
        name: category.name,
        position: category.position,
        images: category.images,
        inStock: category.inStock
      },
      products
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch category', error: error.message });
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