const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const { errorResponse } = require('../utils/response');

const auth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      return errorResponse(res, 401, 'Authentication required');
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return errorResponse(res, 401, 'Authentication token is missing');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    const user = await User.findById(decoded._id).lean();
    if (!user) {
      return errorResponse(res, 401, 'User no longer exists');
    }
    req.currentUser = user;
    next();
  } catch (error) {
    return errorResponse(res, 401, 'Invalid or expired token');
  }
};

const isAdmin = (req, res, next) => {
  const user = req.currentUser;
  if (!user || (user.role !== 'admin' && user.role !== 'super')) {
    return errorResponse(res, 403, 'Access denied');
  }
  next();
};

const organizationAdmin = async (req, res, next) => {
  try {
    const user = req.currentUser;
    if (!user.organization) {
      return errorResponse(res, 403, "User not associated with any organization");
    }

    if (user.role !== 'admin' && user.role !== 'super') {
      return errorResponse(res, 403, "Access denied: Requires organization admin privileges");
    }

    req.organization = user.organization;
    next();
  } catch (error) {
    return errorResponse(res, 500, error.message);
  }
};

module.exports = { auth, isAdmin, organizationAdmin };
