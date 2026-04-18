const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const { cloudinary } = require('../middleware/upload');

// ── Brevo email client (via fetch) ──

// ── In-memory reset code store { email: { code, expiresAt } } ──
const resetCodes = new Map();

// ── Track failed login attempts { email: { count, lockedUntil } } ──
const loginAttempts = new Map();

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; // 15 minutes

// ── Helper: check if account is locked ──
const isAccountLocked = (email) => {
  const attempts = loginAttempts.get(email);
  if (!attempts) return false;
  if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) return true;
  if (attempts.lockedUntil && Date.now() >= attempts.lockedUntil) {
    loginAttempts.delete(email);
    return false;
  }
  return false;
};

// ── Helper: record failed login attempt ──
const recordFailedAttempt = (email) => {
  const attempts = loginAttempts.get(email) || { count: 0, lockedUntil: null };
  attempts.count += 1;
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    attempts.lockedUntil = Date.now() + LOCK_TIME;
  }
  loginAttempts.set(email, attempts);
};

// ── Helper: clear login attempts on success ──
const clearLoginAttempts = (email) => {
  loginAttempts.delete(email);
};

// ── Helper: upload a base64 or remote URI to Cloudinary ──
const uploadProfilePicToCloudinary = async (dataUri) => {
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: 'student-feedback/profile-pictures',
    transformation: [{ width: 300, height: 300, crop: 'fill', gravity: 'face', quality: 'auto' }],
    public_id: `profile-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  });
  return result.secure_url;
};

// @desc    Register new student
exports.register = async (req, res) => {
  try {
    const { name, studentId, email, phoneNumber, yearLevel, section, password, profilePicture } = req.body;

    if (!name || !studentId || !email || !phoneNumber || !yearLevel || !section || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    const existingStudentId = await User.findOne({ studentId });
    if (existingStudentId) {
      return res.status(400).json({ success: false, message: 'Student ID already registered' });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // ✅ CHANGED: raised minimum password length from 6 to 8
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    let profilePictureUrl = null;
    if (req.file) {
      profilePictureUrl = req.file.path || req.file.secure_url || req.file.url || null;
    } else if (profilePicture) {
      try {
        profilePictureUrl = await uploadProfilePicToCloudinary(profilePicture);
      } catch (uploadErr) {
        console.error('Profile picture upload failed:', uploadErr.message);
      }
    }

    const user = await User.create({
      name,
      studentId,
      email,
      phoneNumber,
      yearLevel,
      section,
      password,
      profilePicture: profilePictureUrl,
      role: 'student'
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        studentId: user.studentId,
        email: user.email,
        phoneNumber: user.phoneNumber,
        yearLevel: user.yearLevel,
        section: user.section,
        role: user.role,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error in registration',
      // ✅ CHANGED: hide error details in production
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Login user (admin and staff only for web portal)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

   // if (isAccountLocked(email.toLowerCase())) {
     // const attempts = loginAttempts.get(email.toLowerCase());
      //const minutesLeft = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
      //return res.status(429).json({
       // success: false,
       // message: `Too many failed attempts. Try again in ${minutesLeft} minute(s).`
     // });
   // }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
     // recordFailedAttempt(email.toLowerCase());
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // ✅ CHANGED: 403 + deactivated flag so mobile can detect and show specific alert
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact admin.',
        deactivated: true,
      });
    }

    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      // recordFailedAttempt(email.toLowerCase());
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // ── ADDED: Block students from accessing the admin/staff web portal ──
    if (!['admin', 'staff'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. This portal is for admin and staff only.',
      });
    }
    // ─────────────────────────────────────────────────────────────────────

   // clearLoginAttempts(email.toLowerCase());

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    const userResponse = {
      id: user._id,
      name: user.name,
      studentId: user.studentId,
      email: user.email,
      role: user.role,
      profilePicture: user.profilePicture || null
    };

    if (user.role === 'student') {
      userResponse.phoneNumber = user.phoneNumber;
      userResponse.yearLevel = user.yearLevel;
      userResponse.section = user.section;
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error in login',
      // ✅ CHANGED: hide error details in production
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get current user
exports.getProfile = async (req, res) => {
  try {
    // ✅ CHANGED: exclude password field explicitly
    const user = await User.findById(req.user.id).select('-password');
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user data',
      // ✅ CHANGED: hide error details in production
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phoneNumber, yearLevel, section, profilePicture } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (phoneNumber) updateFields.phoneNumber = phoneNumber;
    if (yearLevel) updateFields.yearLevel = yearLevel;
    if (section) updateFields.section = section;

    // ✅ ADDED: prevent studentId and role from being updated via this route
    delete updateFields.studentId;
    delete updateFields.role;
    delete updateFields.email;

    if (req.file) {
      updateFields.profilePicture = req.file.path || req.file.secure_url || req.file.url;
    } else if (profilePicture) {
      try {
        updateFields.profilePicture = await uploadProfilePicToCloudinary(profilePicture);
      } catch (uploadErr) {
        console.error('Profile picture upload failed:', uploadErr.message);
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateFields,
      { new: true, runValidators: true }
    // ✅ ADDED: exclude password from response
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      // ✅ CHANGED: hide error details in production
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Change password
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    // ✅ CHANGED: raised minimum from 6 to 8
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters'
      });
    }

    // ✅ ADDED: prevent reusing the same password
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password'
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error changing password',
      // ✅ CHANGED: hide error details in production
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Send forgot password code to email
// @route   POST /api/auth/forgot-password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide your email.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(200).json({ success: true, message: 'If this email exists, a reset code has been sent.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    resetCodes.set(email.toLowerCase(), { code, expiresAt });

    await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'ClassBack Support', email: process.env.BREVO_SENDER_EMAIL },
        to: [{ email: email }],
        subject: 'ClassBack — Password Reset Code',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f9f9f9; border-radius: 12px;">
            <h2 style="color: #6D28D9; margin-bottom: 8px;">🔐 Password Reset</h2>
            <p style="color: #444; font-size: 15px;">Hi <strong>${user.name}</strong>,</p>
            <p style="color: #444; font-size: 15px;">Use the code below to reset your ClassBack password. This code expires in <strong>10 minutes</strong>.</p>
            <div style="background: #6D28D9; color: #fff; font-size: 32px; font-weight: bold; letter-spacing: 10px; text-align: center; padding: 20px; border-radius: 10px; margin: 24px 0;">
              ${code}
            </div>
            <p style="color: #888; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      }),
    });

    res.status(200).json({ success: true, message: 'If this email exists, a reset code has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send reset code.',
      // ✅ CHANGED: hide error details in production
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Verify reset code
// @route   POST /api/auth/verify-reset-code
exports.verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Email and code are required.' });
    }

    // ✅ ADDED: code must be exactly 6 digits
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, message: 'Invalid code format.' });
    }

    const entry = resetCodes.get(email.toLowerCase());
    if (!entry) {
      return res.status(400).json({ success: false, message: 'No reset code found. Please request a new one.' });
    }
    if (Date.now() > entry.expiresAt) {
      resetCodes.delete(email.toLowerCase());
      return res.status(400).json({ success: false, message: 'Code has expired. Please request a new one.' });
    }
    if (entry.code !== code) {
      return res.status(400).json({ success: false, message: 'Invalid code. Please try again.' });
    }

    res.status(200).json({ success: true, message: 'Code verified.' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying code.',
      // ✅ CHANGED: hide error details in production
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Reset password after code verification
// @route   POST /api/auth/reset-password
exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // ✅ CHANGED: raised minimum from 6 to 8
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    // ✅ ADDED: code must be exactly 6 digits
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ success: false, message: 'Invalid code format.' });
    }

    const entry = resetCodes.get(email.toLowerCase());
    if (!entry || entry.code !== code || Date.now() > entry.expiresAt) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.password = newPassword;
    await user.save();

    resetCodes.delete(email.toLowerCase());

    res.status(200).json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error resetting password.',
      // ✅ CHANGED: hide error details in production
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Create staff accounts (ADMIN ONLY - REMOVE AFTER USE)
exports.createStaffAccounts = async (req, res) => {
  try {
    // ✅ CHANGED: use header instead of query string (query shows in server logs)
    if (req.headers['x-admin-secret'] !== process.env.STAFF_CREATION_SECRET) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const staff = [
      {
        name: 'Staff Member 1',
        email: 'staff1@schoolname.edu',
        password: 'staff123',
        role: 'staff',
        studentId: 'STAFF001',
        phoneNumber: '000-000-0001',
        yearLevel: '',
        section: '',
        isActive: true
      },
      {
        name: 'Staff Member 2',
        email: 'staff2@schoolname.edu',
        password: 'staff123',
        role: 'staff',
        studentId: 'STAFF002',
        phoneNumber: '000-000-0002',
        yearLevel: '',
        section: '',
        isActive: true
      }
    ];

    const results = [];
    for (const s of staff) {
      const existing = await User.findOne({ email: s.email });
      if (existing) {
        results.push({ email: s.email, status: 'already exists' });
      } else {
        await User.create(s);
        results.push({ email: s.email, status: 'created' });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Staff creation complete',
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating staff',
      // ✅ CHANGED: hide error details in production
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};