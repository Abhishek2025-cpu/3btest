const Feedback = require('../models/feedback');
const User = require('../models/User');
const { translateResponse } = require('../services/translation.service'); // Adjust path if needed


const feedbackFieldsToTranslate = [
  'message' 
];
// Create feedback
exports.createFeedback = async (req, res) => {
  try {
    const { userId, message, isPrivate, rating } = req.body;

    const user = await User.findById(userId).select('name profileImage');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const newFeedback = new Feedback({
      user: user._id,
      message,
      isPrivate: !!isPrivate,
      rating: rating ? Math.max(1, Math.min(5, Number(rating))) : null
    });

    await newFeedback.save();

    res.status(201).json({
      success: true,
      message: '✅ Feedback submitted successfully',
      feedback: {
        _id: newFeedback._id,
        message: newFeedback.message,
        isPrivate: newFeedback.isPrivate,
        rating: newFeedback.rating,
        user: {
          _id: user._id,
          name: user.name,
          profileImage: user.profileImage
        },
        createdAt: newFeedback.createdAt
      }
    });
  } catch (error) {
    console.error('Create feedback error:', error);
    res.status(500).json({ success: false, message: '❌ Failed to submit feedback', error: error.message });
  }
};

// Get public feedbacks only
// In feedbackController.js

exports.getPublicFeedbacks = async (req, res) => {
  try {
    // Fetch only public and enabled feedbacks
    const feedbacksFromDB = await Feedback.find({
      isPrivate: false,
      isEnabled: true // ✅ only include enabled feedbacks
    })
      .populate('user', 'name profileImage')
      .sort({ createdAt: -1 })
      .select('message rating isPrivate isEnabled createdAt updatedAt user') // include isEnabled
      .lean();

    // Translate fields if needed
    const translatedFeedbacks = await translateResponse(req, feedbacksFromDB, feedbackFieldsToTranslate);

    res.status(200).json({
      success: true,
      message: '✅ Public feedbacks fetched successfully',
      feedbacks: translatedFeedbacks
    });
    
  } catch (error) {
    console.error('❌ Error fetching public feedbacks:', error);
    res.status(500).json({
      success: false,
      message: '❌ Failed to fetch feedbacks',
      error: error.message
    });
  }
};



exports.getAllFeedbacksForAdmin = async (req, res) => {
  try {
    // Fetch all feedbacks, no filters
    const feedbacksFromDB = await Feedback.find({})
      .populate('user', 'name profileImage')
      .sort({ createdAt: -1 })
      .select('message rating isPrivate isEnabled createdAt updatedAt user') // include all fields
      .lean();

    res.status(200).json({
      success: true,
      message: '✅ All feedbacks fetched successfully',
      feedbacks: feedbacksFromDB
    });
    
  } catch (error) {
    console.error('❌ Error fetching all feedbacks for admin:', error);
    res.status(500).json({
      success: false,
      message: '❌ Failed to fetch feedbacks',
      error: error.message
    });
  }
};


exports.updateFeedbackStatus = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    let { isEnabled } = req.body;

    // Convert string "true"/"false" to boolean
    if (typeof isEnabled === 'string') {
      if (isEnabled.toLowerCase() === 'true') isEnabled = true;
      else if (isEnabled.toLowerCase() === 'false') isEnabled = false;
    }

    // Validate input
    if (typeof isEnabled !== 'boolean') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid input: isEnabled must be true or false.' 
      });
    }

    // Trim ID and find feedback
    const feedback = await Feedback.findById(feedbackId.trim());
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    // Update and save
    feedback.isEnabled = isEnabled;
    await feedback.save();

    res.status(200).json({ 
      success: true, 
      message: `✅ Feedback has been successfully ${isEnabled ? 'enabled' : 'disabled'}`, 
      feedback 
    });

  } catch (error) {
    console.error('Update feedback status error:', error);
    res.status(500).json({ 
      success: false, 
      message: '❌ Failed to update feedback status', 
      error: error.message 
    });
  }
};





// controllers/feedbackController.js

exports.deleteFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const deleted = await Feedback.findByIdAndDelete(feedbackId);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    res.status(200).json({ success: true, message: '🗑️ Feedback deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: '❌ Failed to delete feedback', error: error.message });
  }
};


// controllers/feedbackController.js

exports.getFeedbackByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const feedbacks = await Feedback.find({ user: userId })
      .populate('user', 'name profileImage')
      .sort({ createdAt: -1 })
      .select('message rating isPrivate isEnabled createdAt updatedAt user'); 

    res.status(200).json({
      success: true,
      message: '✅ User feedbacks fetched successfully',
      feedbacks
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '❌ Failed to get feedbacks', error: error.message });
  }
};

