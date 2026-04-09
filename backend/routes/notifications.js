const express = require('express');
const router = express.Router();
const { protect, requireAdminOrStaff } = require('../middleware/auth');
const Notification = require('../models/Notification');

// GET /api/notifications
router.get('/', protect, requireAdminOrStaff, async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { targetRoles: req.user.role, targetUserId: null },  // ← role-wide (feedback notifs)
        { targetUserId: req.user._id },                       // ← DM notifs — only for me
      ]
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const withReadStatus = notifications.map(n => ({
      ...n,
      isReadByMe: n.readBy?.some(id => id.toString() === req.user._id.toString()) || false,
    }));

    const unreadCount = withReadStatus.filter(n => !n.isReadByMe).length;

    res.json({ success: true, notifications: withReadStatus, unreadCount });
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// PUT /api/notifications/read-all — MUST be before /:id
router.put('/read-all', protect, requireAdminOrStaff, async (req, res) => {
  try {
    await Notification.updateMany(
      {
        $or: [
          { targetRoles: req.user.role, targetUserId: null },
          { targetUserId: req.user._id },
        ],
        readBy: { $ne: req.user._id }
      },
      { $addToSet: { readBy: req.user._id } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', protect, requireAdminOrStaff, async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, {
      $addToSet: { readBy: req.user._id }
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
});

// DELETE /api/notifications/clear-all — MUST be before /:id
router.delete('/clear-all', protect, requireAdminOrStaff, async (req, res) => {
  try {
    await Notification.deleteMany({
      $or: [
        { targetRoles: req.user.role, targetUserId: null },
        { targetUserId: req.user._id },
      ]
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to clear notifications' });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', protect, requireAdminOrStaff, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete notification' });
  }
});

module.exports = router;