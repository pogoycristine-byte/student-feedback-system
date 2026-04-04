const express = require('express');
const router = express.Router();
const { protect, requireAdmin, requireAdminOrStaff } = require('../middleware/auth');
const announcementController = require('../controllers/announcementController');

// Public to logged-in users (students see active announcements)
router.get('/', protect, announcementController.getAnnouncements);

// Admin only
router.get('/all', protect, requireAdmin, announcementController.getAllAnnouncements);

// Admin or Staff
router.post('/', protect, requireAdminOrStaff, announcementController.createAnnouncement);
router.put('/:id', protect, requireAdminOrStaff, announcementController.updateAnnouncement);
router.delete('/:id', protect, requireAdminOrStaff, announcementController.deleteAnnouncement);

module.exports = router;