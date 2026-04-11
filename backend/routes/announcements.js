const express = require('express');
const router = express.Router();
const { protect, requireAdmin, requireAdminOrStaff } = require('../middleware/auth');
const announcementController = require('../controllers/announcementController');
const rateLimit = require('express-rate-limit'); // ✅ ADDED

// ✅ ADDED: limit announcement creation to prevent spam
const announcementLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many announcements created, please try again later.' }
});

// Public to logged-in users
router.get('/', protect, announcementController.getAnnouncements);

// Admin only
router.get('/all', protect, requireAdmin, announcementController.getAllAnnouncements);

// Admin or Staff
router.get('/my', protect, requireAdminOrStaff, announcementController.getMyAnnouncements);

// ✅ ADDED: announcementLimiter on create/update/delete
router.post('/', protect, requireAdminOrStaff, announcementLimiter, announcementController.createAnnouncement);
router.put('/:id', protect, requireAdminOrStaff, announcementLimiter, announcementController.updateAnnouncement);
router.delete('/:id', protect, requireAdminOrStaff, announcementController.deleteAnnouncement);

module.exports = router;