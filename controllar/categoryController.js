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
    const categories = await Category.find();

    // Aggregate product counts for each categoryId (string), only where quantity > 0

    const productCounts = await Product.aggregate([
      { $match: { quantity: { $gt: 0 } } },
      { $group: { _id: "$categoryId", count: { $sum: 1 } } }
    ]);
    // Convert to a lookup object for quick access
    const productCountMap = {};
    productCounts.forEach(pc => {
      productCountMap[pc._id] = pc.count; // _id is categoryId string
    });

    const updated = categories.map(cat => ({
      _id: cat._id,
      categoryId: cat.categoryId,
      name: cat.name,
      position: cat.position ?? null,
      images: Array.isArray(cat.images)
        ? cat.images.map(img => ({
            url: img.url,
            public_id: img.public_id
          }))
        : [],
      totalProducts: productCountMap[cat.categoryId] || 0 // <-- use categoryId string for lookup
    }));

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: '❌ Failed to fetch categories', error: error.message });
  }
};



exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, position, imagesToRemove } = req.body;

    const existingCategory = await Category.findById(id);
    if (!existingCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // 1. Handle image removals
    let imagesToRemoveArr = [];
    if (imagesToRemove) {
      imagesToRemoveArr = typeof imagesToRemove === 'string' ? JSON.parse(imagesToRemove) : imagesToRemove;
    }

    if (imagesToRemoveArr.length > 0) {
      // Delete from GCS
      const deletionPromises = imagesToRemoveArr.map(imageId => deleteFileFromGCS(imageId));
      await Promise.all(deletionPromises);

      // Filter out removed images from the category's images array
      existingCategory.images = existingCategory.images.filter(
        img => !imagesToRemoveArr.includes(img.id)
      );
    }

    // 2. Handle new image uploads
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(async (file) => {
        const compressedBuffer = await sharp(file.buffer).resize({ width: 1000 }).jpeg({ quality: 70 }).toBuffer();
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

    // 4. Save the updated category
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


exports.deleteCategoryImage = async (req, res) => {
  try {
    const { categoryId, imageId } = req.params;

    // The imageId from the URL needs to be decoded to handle slashes correctly
    const decodedImageId = decodeURIComponent(imageId);

    // First, find the category to ensure it exists
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found.' });
    }
    
    // Check if the image exists in the category's array before trying to delete
    const imageExists = category.images.some(img => img.id === decodedImageId);
    if (!imageExists) {
        return res.status(404).json({ message: 'Image not found in this category.' });
    }

    // 1. Delete the file from Google Cloud Storage
    await deleteFileFromGCS(decodedImageId);

    // 2. Remove the image reference from the Category document in MongoDB
    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      { $pull: { images: { id: decodedImageId } } },
      { new: true }
    );

    res.status(200).json({
      message: '✅ Image deleted successfully',
      category: updatedCategory,
    });

  } catch (error) {
    res.status(500).json({ message: '❌ Image deletion failed', error: error.message });
  }
};