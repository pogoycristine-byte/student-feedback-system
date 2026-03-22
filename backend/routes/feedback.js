const express = require('express');
const router = express.Router();
const { protect, authorize, requireAdminOrStaff } = require('../middleware/auth');
const feedbackController = require('../controllers/feedbackController');
const { upload } = require('../middleware/upload');

// ── ADMIN & STAFF ROUTES (MUST COME FIRST!) ──
// @route   GET /api/feedback - Get all feedback (admin & staff)
router.get('/', protect, requireAdminOrStaff, feedbackController.getAllFeedback);

// ── STUDENT ROUTES ──
// @route   POST /api/feedback
router.post(
  '/',
  protect,
  authorize('student'),
  upload.array('media', 5),
  feedbackController.submitFeedback
);

router.get('/my-feedback', protect, authorize('student'), feedbackController.getMyFeedback);

// @route   PUT /api/feedback/:id/status - Update status (admin & staff)
router.put('/:id/status', protect, requireAdminOrStaff, feedbackController.updateFeedbackStatus);

// @route   POST /api/feedback/:id/message - Send message (student, admin & staff)
router.post('/:id/message', protect, feedbackController.sendMessage);

// @route   GET /api/feedback/:id/messages - Get messages (student, admin & staff)
router.get('/:id/messages', protect, feedbackController.getMessages);

// ✅ NEW: Rating route - Student submits rating for resolved feedback
// @route   PUT /api/feedback/:id/rate - Submit rating (students only)
router.put('/:id/rate', protect, authorize('student'), feedbackController.submitRating);

// @route   DELETE /api/feedback/:id - Delete feedback (admin & staff)
router.delete('/:id', protect, requireAdminOrStaff, feedbackController.deleteFeedback);

// THIS MUST BE LAST! (catches any /:id that didn't match above)
router.get('/:id', protect, feedbackController.getFeedbackById);

module.exports = router;