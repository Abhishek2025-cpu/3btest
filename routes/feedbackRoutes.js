const express = require('express');
const router = express.Router();
const feedbackController = require('../Controllers/feedbackController');

router.post('/add-feedback', feedbackController.createFeedback);
router.get('/get-feedbacks', feedbackController.getPublicFeedbacks);
router.get('/get-feedback/user/:userId', feedbackController.getFeedbackByUser);
router.patch('/update-feedback/:feedbackId', feedbackController.updateFeedback);
router.delete('/delete-feedback/:feedbackId', feedbackController.deleteFeedback);

module.exports = router;
