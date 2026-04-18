const express = require('express');
const router = express.Router();
const { protect, requireAdmin } = require('../middleware/auth');
const authController = require('../controllers/authController');
const { uploadProfile } = require('../middleware/upload');
const User = require('../models/User');
const rateLimit = require('express-rate-limit'); // ✅ ADDED

// ✅ ADDED: strict limiter for sensitive routes
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many attempts, please try again later.' }
});

// ✅ ADDED: limiter for forgot password to prevent email spam
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, message: 'Too many password reset attempts, please try again in an hour.' }
});

// ✅ ADDED: heartbeat has its own loose limiter (called frequently)
const heartbeatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message: { success: false, message: 'Too many heartbeat requests.' }
});

// @route   POST /api/auth/register
// ✅ ADDED: strictLimiter to prevent mass account creation
router.post('/register', strictLimiter, uploadProfile.single('profilePicture'), authController.register);

// @route   POST /api/auth/login
// ✅ ADDED: strictLimiter (you already have authLimiter in server.js, this adds per-route protection too)
router.post('/login', authController.login);

// @route   GET /api/auth/me
router.get('/me', protect, authController.getProfile);

// ✅ ADDED: used by mobile app to poll account status (detects deactivation)
router.get('/status', protect, authController.getProfile);

// @route   PUT /api/auth/update-profile
router.put('/update-profile', protect, uploadProfile.single('profilePicture'), authController.updateProfile);

// @route   PUT /api/auth/change-password
// ✅ ADDED: strictLimiter to prevent brute force password changes
router.put('/change-password', protect, strictLimiter, authController.changePassword);

// ── Forgot password routes ──
// ✅ ADDED: forgotPasswordLimiter to prevent email bombing
router.post('/forgot-password',   forgotPasswordLimiter, authController.forgotPassword);
router.post('/verify-reset-code', forgotPasswordLimiter, authController.verifyResetCode);
router.post('/reset-password',    forgotPasswordLimiter, authController.resetPassword);

// ── Heartbeat ──
router.put('/heartbeat', protect, heartbeatLimiter, async (req, res) => { // ✅ ADDED: heartbeatLimiter
  try {
    await User.findByIdAndUpdate(req.user._id, { lastSeen: new Date() });
    res.json({ success: true });
  } catch (error) {
    // ✅ CHANGED: don't log full error in production
    if (process.env.NODE_ENV === 'development') console.error('Heartbeat error:', error);
    res.status(500).json({ success: false, message: 'Heartbeat failed' });
  }
});

// ── Create Staff (Admin only) ──
router.post('/create-staff', protect, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, studentId } = req.body;

    if (!name || !email || !password || !studentId) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide all required fields: name, email, password, studentId' 
      });
    }

    // ✅ ADDED: input length limits to prevent oversized payloads slipping through
    if (name.length > 50 || email.length > 100 || password.length > 128 || studentId.length > 30) {
      return res.status(400).json({
        success: false,
        message: 'One or more fields exceed the maximum allowed length'
      });
    }

    // ✅ ADDED: basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // ✅ ADDED: minimum password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
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
    // ✅ CHANGED: hide error.message in production
    if (process.env.NODE_ENV === 'development') console.error('Create staff error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error'
      // ✅ REMOVED: error.message was exposed here before
    });
  }
});

module.exports = router;