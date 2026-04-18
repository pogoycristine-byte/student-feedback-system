const User = require('../models/User');

// @desc    Get all users (Admin) — supports ?role=student|staff|admin
exports.getAllUsers = async (req, res) => {
  try {
    const { yearLevel, section, search, isActive, role } = req.query;

    let query = {};

    // ✅ ADDED: whitelist allowed role values
    const allowedRoles = ['student', 'staff', 'admin'];
    if (role) {
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role value' });
      }
      query.role = role;
    }

    if (yearLevel) {
      // ✅ ADDED: limit yearLevel length
      if (yearLevel.length > 20) {
        return res.status(400).json({ success: false, message: 'Invalid yearLevel value' });
      }
      query.yearLevel = yearLevel;
    }

    if (section) {
      // ✅ ADDED: limit section length
      if (section.length > 20) {
        return res.status(400).json({ success: false, message: 'Invalid section value' });
      }
      query.section = section;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      // ✅ ADDED: limit search length
      if (search.length > 100) {
        return res.status(400).json({ success: false, message: 'Search term too long' });
      }
      // ✅ ADDED: escape regex to prevent ReDoS attack
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { studentId: { $regex: escapedSearch, $options: 'i' } },
        { email: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Get single user (Admin)
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const Feedback = require('../models/Feedback');
    const feedbackStats = await Feedback.aggregate([
      { $match: { student: user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    res.status(200).json({
      success: true,
      user,
      feedbackStats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Toggle user status (Admin)
exports.toggleUserStatus = async (req, res) => {
  try {
    // ✅ ADDED: exclude password from response
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // ✅ ADDED: prevent admin from deactivating their own account
    if (req.user.id === user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account',
      });
    }

    user.isActive = !user.isActive;

    // ✅ ADDED: save remark when deactivating
    if (!user.isActive && req.body.remarks) {
      user.deactivationRemark = req.body.remarks;
    }

    // ✅ ADDED: clear remark when re-activating
    if (user.isActive) {
      user.deactivationRemark = '';
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating user status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Delete user (Admin)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // ✅ ADDED: prevent admin from deleting their own account
    if (req.user.id === user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    // ✅ ADDED: prevent deleting other admins
    if (user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Admin accounts cannot be deleted',
      });
    }

    const Feedback = require('../models/Feedback');
    const feedbackCount = await Feedback.countDocuments({ student: req.params.id });

    if (feedbackCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete user. User has ${feedbackCount} feedback(s). Consider deactivating instead.`,
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Save FCM Token for push notifications
exports.saveFcmToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

    await User.findByIdAndUpdate(req.user._id, { fcmToken: token });

    res.status(200).json({ success: true, message: 'FCM token saved' });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error saving FCM token',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Get current logged-in user (used by mobile to poll account status)
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact your administrator.',
        deactivated: true,
      });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};