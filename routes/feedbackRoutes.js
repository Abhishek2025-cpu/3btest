const express = require('express');
const router = express.Router();
const feedbackController = require('../controllar/feedbackController');

router.post('/add-feedback', feedbackController.createFeedback);
router.get('/user', feedbackController.getPublicFeedbacks);
router.get('/user/:userId', feedbackController.getFeedbackByUser);
router.get('/getall/admin', feedbackController.getAllFeedbacksForAdmin);

router.patch('/status/:feedbackId', feedbackController.updateFeedbackStatus);
router.delete('/delete-feedback/:feedbackId', feedbackController.deleteFeedback);

module.exports = router;
