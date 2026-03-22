const express = require('express');
const router = express.Router();
const { protect, requireAdminOrStaff } = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

// @route   GET /api/analytics/dashboard - Get dashboard stats (Admin & Staff)
router.get('/dashboard', protect, requireAdminOrStaff, analyticsController.getDashboard);

// @route   GET /api/analytics/trends - Get feedback trends (Admin & Staff)
router.get('/trends', protect, requireAdminOrStaff, analyticsController.getTrends);

module.exports = router;