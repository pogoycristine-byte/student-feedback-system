const express = require('express');
const router = express.Router();
const { protect, requireAdmin } = require('../middleware/auth');
const announcementController = require('../controllers/announcementController');

// Public to logged-in users (students see active announcements)
router.get('/', protect, announcementController.getAnnouncements);

// Admin only
router.get('/all', protect, requireAdmin, announcementController.getAllAnnouncements);
router.post('/', protect, requireAdmin, announcementController.createAnnouncement);
router.put('/:id', protect, requireAdmin, announcementController.updateAnnouncement);
router.delete('/:id', protect, requireAdmin, announcementController.deleteAnnouncement);

module.exports = router;