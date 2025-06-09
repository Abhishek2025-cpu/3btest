const Category = require('../models/Category');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const cloudinary = require('../utils/cloudinary');

async function generateCategoryId() {
  const lastCat = await Category.findOne().sort({ createdAt: -1 });
  if (!lastCat) return 'CAT001';

  const lastNum = parseInt(lastCat.categoryId.replace('CAT', '')) + 1;
  return `CAT${String(lastNum).padStart(3, '0')}`;
}



exports.createCategory = async (req, res) => {
  try {
    console.log("➡️ Received request:", req.body);
    console.log("➡️ Files received:", req.files);

    const { name, position } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'At least one image is required' });
    }

    const categoryId = await generateCategoryId();
    console.log("🆔 Generated Category ID:", categoryId);

    const uploadImageToCloudinary = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'categories', resource_type: 'image' },
          (err, result) => {
            if (err) {
              console.error("❌ Cloudinary Upload Error:", err);
              return reject(new Error("Cloudinary error: " + err.message));
            }
            resolve({
              url: result.secure_url,
              public_id: result.public_id,
            });
          }
        );
        stream.end(fileBuffer);
      });
    };

    let uploadedImages = [];
    try {
      uploadedImages = await Promise.all(
        req.files.map(file => uploadImageToCloudinary(file.buffer))
      );
    } catch (uploadError) {
      return res.status(500).json({
        message: '❌ Cloudinary upload failed',
        error: uploadError.message
      });
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
    res.status(500).json({ message: '❌ Category creation failed', error: error.message });
  }
};





exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find();

    // Aggregate product counts for each categoryId (string), only where quantity > 0
    const Product = require('../models/Product');
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

    const updateData = {};
    if (name) updateData.name = name;
    if (position !== undefined) updateData.position = Number(position);

    const existingCategory = await Category.findById(id);
    if (!existingCategory) {
      return res.status(404).json({ message: 'Category not found' });
    }

    // Parse imagesToRemove from JSON string if needed (because form-data sends it as string)
    let imagesToRemoveArr = [];
    if (imagesToRemove) {
      if (typeof imagesToRemove === 'string') {
        imagesToRemoveArr = JSON.parse(imagesToRemove);
      } else {
        imagesToRemoveArr = imagesToRemove;
      }
    }

    // Remove images from Cloudinary & existingCategory.images array
    if (imagesToRemoveArr.length > 0) {
      for (const public_id of imagesToRemoveArr) {
        await cloudinary.uploader.destroy(public_id);
      }
      // Filter out removed images from the category's images
      existingCategory.images = existingCategory.images.filter(
        img => !imagesToRemoveArr.includes(img.public_id)
      );
    }

    // Upload new images if any
    if (req.files && req.files.length > 0) {
      const uploadImageToCloudinary = (fileBuffer) => {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: 'categories', resource_type: 'image' },
            (err, result) => {
              if (err) return reject(err);
              resolve({
                url: result.secure_url,
                public_id: result.public_id,
              });
            }
          );
          stream.end(fileBuffer);
        });
      };

      const uploadedImages = await Promise.all(
        req.files.map(file => uploadImageToCloudinary(file.buffer))
      );

      // Append new images to existing ones
      existingCategory.images = [...existingCategory.images, ...uploadedImages];
    }

    // Update other fields
    if (updateData.name) existingCategory.name = updateData.name;
    if (updateData.position !== undefined) existingCategory.position = updateData.position;

    // Save updated category
    const updatedCategory = await existingCategory.save();

    res.status(200).json({
      message: '✅ Category updated successfully',
      category: {
        ...updatedCategory.toObject(),
        images: updatedCategory.images.map(img => ({
          url: img.url,
          public_id: img.public_id
        }))
      }
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