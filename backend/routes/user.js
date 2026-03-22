const express = require('express');
const router = express.Router();
const { protect, requireAdminOrStaff } = require('../middleware/auth');
const userController = require('../controllers/userController');

// @route   GET /api/users - Get all students (Admin & Staff)
router.get('/', protect, requireAdminOrStaff, userController.getAllUsers);

// @route   GET /api/users/:id - Get single user (Admin & Staff)
router.get('/:id', protect, requireAdminOrStaff, userController.getUserById);

// @route   PUT /api/users/:id/toggle-status - Toggle user status (Admin only)
router.put('/:id/toggle-status', protect, requireAdminOrStaff, userController.toggleUserStatus);

// @route   DELETE /api/users/:id - Delete user (Admin only)
router.delete('/:id', protect, requireAdminOrStaff, userController.deleteUser);

module.exports = router;