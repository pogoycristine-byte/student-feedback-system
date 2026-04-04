const express = require('express');
const router = express.Router();
const { protect, requireAdmin } = require('../middleware/auth');
const authController = require('../controllers/authController');
const { uploadProfile } = require('../middleware/upload');
const User = require('../models/User');

// @route   POST /api/auth/register
router.post('/register', uploadProfile.single('profilePicture'), authController.register);

// @route   POST /api/auth/login
router.post('/login', authController.login);

// @route   GET /api/auth/me
router.get('/me', protect, authController.getProfile);

// @route   PUT /api/auth/update-profile
// ✅ UPDATED: now accepts multipart/form-data for photo uploads
router.put('/update-profile', protect, uploadProfile.single('profilePicture'), authController.updateProfile);

// @route   PUT /api/auth/change-password
router.put('/change-password', protect, authController.changePassword);

// ── NEW: Forgot password routes (no auth required) ──
router.post('/forgot-password',    authController.forgotPassword);
router.post('/verify-reset-code',  authController.verifyResetCode);
router.post('/reset-password',     authController.resetPassword);

// ── NEW: Heartbeat — updates lastSeen so admin panel shows live online status ──
// @route   PUT /api/auth/heartbeat
router.put('/heartbeat', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { lastSeen: new Date() });
    res.json({ success: true });
  } catch (error) {
    console.error('Heartbeat error:', error);
    res.status(500).json({ success: false, message: 'Heartbeat failed' });
  }
});

// CREATE STAFF ACCOUNT (Admin only)
router.post('/create-staff', protect, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, studentId } = req.body;

    if (!name || !email || !password || !studentId) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide all required fields: name, email, password, studentId' 
      });
    }

    const existingUser = await User.findOne({ 
      $or: [{ email: email.toLowerCase() }, { studentId: studentId }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: existingUser.email === email.toLowerCase() 
          ? 'Email already registered' 
          : 'Staff ID already exists' 
      });
    }

    const staff = new User({
      name,
      email: email.toLowerCase(),
      password: password,
      studentId,
      role: 'staff',
      isActive: true,
    });

    await staff.save();

    res.status(201).json({
      success: true,
      message: 'Staff account created successfully',
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        studentId: staff.studentId,
        role: staff.role,
      },
    });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error', 
      error: error.message 
    });
  }
});

module.exports = router;