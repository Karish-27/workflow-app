const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { hasPermission } = require('../utils/permissions');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user || user.deletedAt) {
      return res.status(401).json({
        success: false,
        message: 'User not found.',
      });
    }

    if (!user.organization) {
      return res.status(403).json({
        success: false,
        message: 'No organization assigned to this account.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.',
    });
  }
  next();
};

const requirePermission = (permission) => (req, res, next) => {
  if (!hasPermission(req.user.role, permission)) {
    return res.status(403).json({
      success: false,
      message: `Access denied. Missing permission: ${permission}`,
    });
  }
  next();
};

const requireVerifiedEmail = (req, res, next) => {
  if (!req.user.emailVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email before continuing.',
      code: 'EMAIL_NOT_VERIFIED',
    });
  }
  next();
};

module.exports = { protect, adminOnly, requirePermission, requireVerifiedEmail };
