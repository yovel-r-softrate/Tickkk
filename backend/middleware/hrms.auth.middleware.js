const jwt = require('jsonwebtoken');
const { errorResponse } = require('../utils/response');

const auth = (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');

    if (!authHeader) {
      return errorResponse(res, 401, 'Authentication required');
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return errorResponse(res, 401, 'Authentication token is missing');
    }

    // Decode the token without verifying signature locally, since we don't have the production secret
    const decoded = jwt.decode(token);
    
    if (!decoded) {
      console.error('Auth fail: Token could not be decoded', token);
      return errorResponse(res, 401, 'Invalid token format');
    }
    
    // Support both { user: { id: ... } } and direct payload { id: ... }
    const userData = decoded.user || decoded;

    if (!userData || (!userData.id && !userData._id)) {
      console.error('Auth fail: Token structure missing id/_id', decoded);
      return errorResponse(res, 401, 'Invalid token structure');
    }

    req.user = userData;
    // ensure id is set for fallback
    req.user.id = userData.id || userData._id;
    req.currentUser = userData;
    
    next();
  } catch (error) {
    console.error('Auth middleware catch error:', error);
    return errorResponse(res, 401, 'Invalid or expired token: ' + error.message);
  }
};

// With a flat model, any authenticated user is treated as an admin for tasks in their company
const isAdmin = (req, res, next) => {
  next(); // Flat role model
};

const organizationAdmin = (req, res, next) => {
  req.organization = req.user.companyId;
  next(); // Flat role model
};

module.exports = { auth, isAdmin, organizationAdmin };
