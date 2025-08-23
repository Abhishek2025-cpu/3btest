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

    // 1. Basic Validation
    if (!orderId || !userId || !products || !description) {
      return res.status(400).json({ success: false, message: 'Missing required fields.' });
    }

    // 2. Find the original order to validate against
    console.log(`--- DEBUG: Finding order with ID: ${orderId} ---`);
    const order = await Order.findById(orderId);

    if (!order) {
      console.log('--- DEBUG: Order not found in database. ---');
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // --- ADDED FOR DEBUGGING ---
    console.log('--- DEBUG: Found Order. The products in THIS order are: ---');
    console.log(JSON.stringify(order.products, null, 2));
    // --- END DEBUGGING ---


    // 3. Check if the order belongs to the user
    if (order.userId.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'This order does not belong to the user.' });
    }
    
    const parsedProducts = JSON.parse(products);

    // 4. Validate products and quantities in the return request
    for (const item of parsedProducts) {
        const requestIdentifier = item.productId || item._id;
        
        // --- ADDED FOR DEBUGGING ---
        console.log(`--- DEBUG: Trying to find a product in the order that matches this identifier from the request: ${requestIdentifier} ---`);
        // --- END DEBUGGING ---
        
        const productInOrder = order.products.find(p => 
            (p.productId && p.productId.toString() === requestIdentifier) || 
            (p._id && p._id.toString() === requestIdentifier)
        );

        if (!productInOrder) {
            console.log(`--- DEBUG: FAILED to find a match for identifier: ${requestIdentifier}. Aborting. ---`);
            // This error message is slightly improved from the last version.
            const identifierForError = requestIdentifier || 'N/A';
            return res.status(400).json({ 
                success: false, 
                message: `Product with identifier ${identifierForError} not found in this specific order.` 
            });
        }

        // We found it!
        console.log(`--- DEBUG: SUCCESS! Found a matching product in the order for identifier: ${requestIdentifier} ---`);

        if (item.quantityToReturn > productInOrder.quantity) {
            const identifierForError = requestIdentifier || 'N/A';
            return res.status(400).json({ 
                success: false, 
                message: `Cannot return more items than were purchased for product ${identifierForError}.`
            });
        }
    }

    // 5. Handle File Uploads
    const boxImages = await uploadFilesToCloud(req.files.boxImages, 'return-requests/box-images');
    const damagedPieceImages = await uploadFilesToCloud(req.files.damagedPieceImages, 'return-requests/damaged-pieces');

    // 6. Create and save the new return request
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
            .populate('orderId', 'orderId totalPrice') 
            .populate('products.productId', 'name images') 
            .sort({ createdAt: -1 });

        if (!requests) {
            return res.status(404).json({ success: false, message: 'No return requests found for this user.' });
        }

        res.status(200).json({ success: true, count: requests.length, data: requests });
    } catch (error) {
        console.error('Error fetching user return requests:', error);
        res.status(500).json({ success: false, message: 'Server error.' });
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