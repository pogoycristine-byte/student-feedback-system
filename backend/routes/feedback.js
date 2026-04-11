const express = require('express');
const router = express.Router();
const { protect, authorize, requireAdminOrStaff } = require('../middleware/auth');
const feedbackController = require('../controllers/feedbackController');
const { upload } = require('../middleware/upload');
const rateLimit = require('express-rate-limit'); // ✅ ADDED

// ✅ ADDED: limit feedback submissions to prevent spam
const feedbackSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many feedback submissions, please try again later.' }
});

// ✅ ADDED: limit message sending to prevent spam
const messageLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,
  message: { success: false, message: 'Too many messages sent, please slow down.' }
});

// ── ADMIN & STAFF ROUTES (MUST COME FIRST!) ──
router.get('/', protect, requireAdminOrStaff, feedbackController.getAllFeedback);

// ── STUDENT ROUTES ──
// ✅ ADDED: feedbackSubmitLimiter to prevent spam submissions
router.post(
  '/',
  protect,
  authorize('student'),
  feedbackSubmitLimiter,
  upload.array('media', 5),
  feedbackController.submitFeedback
);

router.get('/my-feedback', protect, authorize('student'), feedbackController.getMyFeedback);

router.put('/:id/status', protect, requireAdminOrStaff, feedbackController.updateFeedbackStatus);

// ✅ ADDED: messageLimiter to prevent message flooding
router.post('/:id/message', protect, messageLimiter, feedbackController.sendMessage);

router.get('/:id/messages', protect, feedbackController.getMessages);

router.put('/:id/rate', protect, authorize('student'), feedbackController.submitRating);

router.delete('/:id', protect, requireAdminOrStaff, feedbackController.deleteFeedback);

// THIS MUST BE LAST!
router.get('/:id', protect, feedbackController.getFeedbackById);

module.exports = router;