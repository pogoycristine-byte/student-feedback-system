const User = require('../models/User');
const { generateToken } = require('../middleware/auth');


// ── Brevo email client (via fetch) ──



// ── In-memory reset code store { email: { code, expiresAt } } ──
const resetCodes = new Map();

// @desc    Register new student
exports.register = async (req, res) => {
  try {
    const { name, studentId, email, phoneNumber, yearLevel, section, password } = req.body;

    if (!name || !studentId || !email || !phoneNumber || !yearLevel || !section || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const existingStudentId = await User.findOne({ studentId });
    if (existingStudentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID already registered'
      });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const user = await User.create({
      name,
      studentId,
      email,
      phoneNumber,
      yearLevel,
      section,
      password,
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
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error in registration',
      error: error.message
    });
  }
};

// @desc    Login user (students, staff, and admin)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact admin.'
      });
    }

    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    const userResponse = {
      id: user._id,
      name: user.name,
      studentId: user.studentId,
      email: user.email,
      role: user.role
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
      error: error.message
    });
  }
};

// @desc    Get current user
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user data',
      error: error.message
    });
  }
};

// @desc    Update profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phoneNumber, yearLevel, section } = req.body;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (phoneNumber) updateFields.phoneNumber = phoneNumber;
    if (yearLevel) updateFields.yearLevel = yearLevel;
    if (section) updateFields.section = section;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateFields,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: error.message
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

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters'
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
      error: error.message
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
      return res.status(404).json({ success: false, message: 'No account found with this email.' });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    resetCodes.set(email.toLowerCase(), { code, expiresAt });

    // ── Send email via Brevo API ──
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

    res.status(200).json({ success: true, message: 'Reset code sent to your email.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Failed to send reset code.', error: error.message });
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
    res.status(500).json({ success: false, message: 'Error verifying code.', error: error.message });
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
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
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
    res.status(500).json({ success: false, message: 'Error resetting password.', error: error.message });
  }
};

// @desc    Create staff accounts (ADMIN ONLY - REMOVE AFTER USE)
exports.createStaffAccounts = async (req, res) => {
  try {
    if (req.query.secret !== process.env.STAFF_CREATION_SECRET) {
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
      error: error.message
    });
  }
};