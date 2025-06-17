const Feedback = require('../models/feedback');
const User = require('../models/User');

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
exports.getPublicFeedbacks = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ isPrivate: false })
      .populate('user', 'name profileImage')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: '✅ Public feedbacks fetched successfully',
      feedbacks
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '❌ Failed to fetch feedbacks', error: error.message });
  }
};


// controllers/feedbackController.js

exports.updateFeedback = async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const cleanId = feedbackId.trim(); // 🧼 Remove newline or whitespace

    const { message, isPrivate, rating } = req.body;

    const feedback = await Feedback.findById(cleanId); // Use cleanId
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found' });
    }

    if (message) feedback.message = message;
    if (typeof isPrivate === 'boolean') feedback.isPrivate = isPrivate;
    if (rating !== undefined) {
      feedback.rating = Math.max(1, Math.min(5, Number(rating)));
    }

    await feedback.save();

    res.status(200).json({ success: true, message: '✅ Feedback updated successfully', feedback });
  } catch (error) {
    res.status(500).json({ success: false, message: '❌ Failed to update feedback', error: error.message });
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
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: '✅ User feedbacks fetched successfully',
      feedbacks
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '❌ Failed to get feedbacks', error: error.message });
  }
};
