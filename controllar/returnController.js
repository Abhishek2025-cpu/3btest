// controllers/returnController.js

const ReturnRequest = require('../models/ReturnRequest');
const Order = require('../models/Order');

// MODIFICATION: Import your GCS uploader utility
const { uploadBufferToGCS } = require('../utils/gcloud'); 

// MODIFICATION: This is the new, real implementation using your GCS function
async function uploadFilesToCloud(files, folder) {
  if (!files || files.length === 0) {
    return []; // Return empty array if no files are provided
  }

  // Create an array of upload promises
  const uploadPromises = files.map(file => 
    uploadBufferToGCS(
      file.buffer, 
      file.originalname, 
      folder, // Pass a specific folder for organization
      file.mimetype
    )
  );
  
  // Wait for all uploads to complete
  return await Promise.all(uploadPromises);
}

// @desc    Create a new return request
// @route   POST /api/v1/returns/request
// @access  Private (Customer)
exports.createReturnRequest = async (req, res) => {
  try {
    const { orderId, userId, products, description, boxSerialNumbers } = req.body;

    // 1️⃣ Basic validation
    if (!orderId || !userId || !products || !description) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    // 2️⃣ Find the order
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // 3️⃣ Ensure order belongs to this user
    if (order.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'This order does not belong to the user.' });
    }

    // 4️⃣ Check order status and delivery window
    if (order.status !== 'Delivered') {
      return res.status(400).json({
        success: false,
        message: 'Return requests can only be made for orders that have been delivered.'
      });
    }

    // Ensure order has a deliveredAt or deliveredVerifiedAt timestamp
    const deliveredAt = order.deliveredAt || order.deliveredVerifiedAt || order.updatedAt; // fallback
    if (!deliveredAt) {
      return res.status(400).json({
        success: false,
        message: 'Delivery date not found. Cannot process return request.'
      });
    }

    // Calculate 30-day window
    const now = new Date();
    const deliveryDate = new Date(deliveredAt);
    const diffInDays = Math.floor((now - deliveryDate) / (1000 * 60 * 60 * 24));

    if (diffInDays > 30) {
      return res.status(400).json({
        success: false,
        message: `Return request period expired. (${diffInDays} days since delivery — limit is 30 days).`
      });
    }

    // 5️⃣ Parse product data
    const parsedProducts = JSON.parse(products);

    // 6️⃣ Validate requested products
    for (const item of parsedProducts) {
      const requestIdentifier = item.productId || item._id;
      const productInOrder = order.products.find(
        (p) =>
          (p.productId && p.productId.toString() === requestIdentifier) ||
          (p._id && p._id.toString() === requestIdentifier)
      );

      if (!productInOrder) {
        return res.status(400).json({
          success: false,
          message: `Product with identifier ${requestIdentifier} not found in this specific order.`,
        });
      }

      if (item.quantityToReturn > productInOrder.quantity) {
        return res.status(400).json({
          success: false,
          message: `Cannot return more items than were purchased for product ${requestIdentifier}.`,
        });
      }
    }

    // 7️⃣ Upload any attached images
    const boxImages = await uploadFilesToCloud(req.files?.boxImages, 'return-requests/box-images');
    const damagedPieceImages = await uploadFilesToCloud(req.files?.damagedPieceImages, 'return-requests/damaged-pieces');

    // 8️⃣ Create and save the return request
    const returnRequest = await ReturnRequest.create({
      orderId,
      userId,
      products: parsedProducts,
      description,
      boxSerialNumbers: boxSerialNumbers ? JSON.parse(boxSerialNumbers) : [],
      boxImages,
      damagedPieceImages,
    });

    res.status(201).json({
      success: true,
      message: 'Return request submitted successfully.',
      data: returnRequest,
    });
  } catch (error) {
    console.error('Error creating return request:', error);
    res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
};


// =========================================================================
// NO CHANGES ARE NEEDED FOR THE OTHER CONTROLLER FUNCTIONS BELOW THIS LINE
// =========================================================================


// @desc    Get all return requests for a specific user
// @route   GET /api/v1/returns/my-requests/:userId
// @access  Private (Customer)
exports.getUserReturnRequests = async (req, res) => {
  try {
    const { userId } = req.params;

    const requests = await ReturnRequest.find({ userId })
      .populate('userId', 'name email') // ✅ populate user name (and email if needed)
      .populate('orderId', 'orderId totalPrice') // populate order details
      .populate('products.productId', 'name images') // populate product details
      .sort({ createdAt: -1 });

    if (!requests || requests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No return requests found for this user.',
      });
    }

    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error('Error fetching user return requests:', error);
    res.status(500).json({
      success: false,
      message: 'Server error.',
      error: error.message,
    });
  }
};



// @desc    Get all return requests (for Admin)
// @route   GET /api/v1/returns/admin/all
// @access  Private (Admin)
exports.getAllReturnRequests = async (req, res) => {
    try {
        const requests = await ReturnRequest.find()
            .populate('userId', 'name email')
            .populate('orderId', 'orderId')
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, count: requests.length, data: requests });
    } catch (error) {
        console.error('Error fetching all return requests:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// @desc    Get a single return request by ID (for Admin)
// @route   GET /api/v1/returns/admin/:id
// @access  Private (Admin)
exports.getReturnRequestById = async (req, res) => {
    try {
        const request = await ReturnRequest.findById(req.params.id)
            .populate('userId', 'name email number')
            .populate({
                path: 'orderId',
                populate: {
                    path: 'products.productId',
                    model: 'ProductUpload'
                }
            })
            .populate('products.productId', 'name images totalPiecesPerBox');
            
        if (!request) {
            return res.status(404).json({ success: false, message: 'Return request not found.' });
        }

        res.status(200).json({ success: true, data: request });
    } catch (error) {
        console.error('Error fetching return request by ID:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};


// @desc    Update the status of a return request (for Admin)
// @route   PUT /api/v1/returns/admin/:id/status
// @access  Private (Admin)
exports.updateReturnRequestStatus = async (req, res) => {
    try {
        const { status, adminNotes } = req.body;
        const allowedStatuses = ['Pending', 'Approved', 'Rejected', 'Processing', 'Completed'];

        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status provided.' });
        }

        const request = await ReturnRequest.findById(req.params.id);

        if (!request) {
            return res.status(404).json({ success: false, message: 'Return request not found.' });
        }

        request.status = status;
        if (adminNotes) {
            request.adminNotes = adminNotes;
        }

        await request.save();
        res.status(200).json({ success: true, message: `Status updated to ${status}.`, data: request });
    } catch (error) {
        console.error('Error updating return request status:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};