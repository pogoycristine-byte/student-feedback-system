const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const categoryController = require('../controllers/categoryController');

// @route   GET /api/categories - Get all categories
router.get('/', categoryController.getAllCategories);

// @route   POST /api/categories - Create category (Admin)
router.post('/', protect, authorize('admin'), categoryController.createCategory);

// @route   PUT /api/categories/:id - Update category (Admin)
router.put('/:id', protect, authorize('admin'), categoryController.updateCategory);

// @route   DELETE /api/categories/:id - Delete category (Admin)
router.delete('/:id', protect, authorize('admin'), categoryController.deleteCategory);

module.exports = router;