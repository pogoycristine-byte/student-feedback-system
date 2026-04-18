const express = require('express');
const router = express.Router();
const { protect, requireAdminOrStaff, requireAdmin } = require('../middleware/auth'); // ✅ ADDED requireAdmin
const userController = require('../controllers/userController');

// @route   GET /api/users - Get all students (Admin & Staff)
router.get('/', protect, requireAdminOrStaff, userController.getAllUsers);

// ✅ MOVED UP: must be before /:id routes to prevent save-fcm-token being treated as an :id param
// @route   POST /api/users/save-fcm-token - Save FCM token
router.post('/save-fcm-token', protect, userController.saveFcmToken);

// @route   GET /api/users/:id - Get single user (Admin & Staff)
router.get('/:id', protect, requireAdminOrStaff, userController.getUserById);

// @route   PUT /api/users/:id/toggle-status - Toggle user status (Admin only)
// ✅ CHANGED: was requireAdminOrStaff, now requireAdmin only — staff should not deactivate users
router.put('/:id/toggle-status', protect, requireAdmin, userController.toggleUserStatus);

// @route   DELETE /api/users/:id - Delete user (Admin only)
// ✅ CHANGED: was requireAdminOrStaff, now requireAdmin only — staff should not delete users
router.delete('/:id', protect, requireAdmin, userController.deleteUser);

module.exports = router;