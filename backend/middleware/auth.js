const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. Please login.'
      });
    }

    // ✅ ADDED: basic token format check before verifying
    if (typeof token !== 'string' || token.length > 500) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // ✅ ADDED: make sure decoded has an id and it's a valid shape
      if (!decoded || !decoded.id || typeof decoded.id !== 'string') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token payload'
        });
      }

      req.user = await User.findById(decoded.id).select('-password'); // ✅ ADDED: never load password into req.user

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Your account has been deactivated'
        });
      }

      next();
    } catch (error) {
      // ✅ ADDED: distinguish between expired and invalid tokens
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired, please login again'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        // ✅ CHANGED: don't reveal the user's role to the client
        message: 'You are not authorized to access this route'
      });
    }
    next();
  };
};

exports.requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }
};

exports.requireAdminOrStaff = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'staff')) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Access denied. Admin or staff only.'
    });
  }
};

exports.generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};