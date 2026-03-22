const User = require('../models/User');

// @desc    Get all users (Admin) — supports ?role=student|staff|admin
exports.getAllUsers = async (req, res) => {
  try {
    const { yearLevel, section, search, isActive, role } = req.query;

    // ── CHANGED: use the role query param if provided, otherwise return ALL roles ──
    let query = {};
    if (role) {
      query.role = role;
    }
    // ── END CHANGE ──

    if (yearLevel) {
      query.yearLevel = yearLevel;
    }

    if (section) {
      query.section = section;
    }

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
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
      error: error.message,
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
      error: error.message,
    });
  }
};

// @desc    Toggle user status (Admin)
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.isActive = !user.isActive;
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
      error: error.message,
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
      error: error.message,
    });
  }
};