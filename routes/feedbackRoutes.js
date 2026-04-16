const express = require('express');
const router = express.Router();

const feedbackController = require('../controllar/feedbackController');
const { checkPermission } = require('../middleware/checkPermission');

/**
 * 🔓 PUBLIC FEEDBACK (NO PERMISSION - USER SIDE)
 */
router.post(
  '/add-feedback',
  feedbackController.createFeedback
);

router.get(
  '/user',
  feedbackController.getPublicFeedbacks
);

router.get(
  '/user/:userId',
  feedbackController.getFeedbackByUser
);

/**
 * 🔐 ADMIN - VIEW ALL FEEDBACK
 */
router.get(
  '/getall/admin',
  checkPermission('feedback'),
  feedbackController.getAllFeedbacksForAdmin
);

/**
 * 🔐 ADMIN - UPDATE STATUS
 */
router.patch(
  '/status/:feedbackId',
  checkPermission('feedback'),
  feedbackController.updateFeedbackStatus
);

/**
 * 🔐 ADMIN - DELETE FEEDBACK
 */
router.delete(
  '/delete-feedback/:feedbackId',
  checkPermission('feedback'),
  feedbackController.deleteFeedback
);

module.exports = router;