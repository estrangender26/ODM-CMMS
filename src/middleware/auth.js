/**
 * Authentication Middleware
 */

const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');
const { User } = require('../models');

/**
 * Verify JWT token from cookie or header
 */
const authenticate = async (req, res, next) => {
  console.log('[AUTH] entering', req.method, req.originalUrl);
  try {
    // Get token from cookie or Authorization header
    const token = req.cookies?.[authConfig.cookie.name] || 
                  req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      console.log('[AUTH] No token found');
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, authConfig.jwt.secret);
    
    // Get user from database with organization info
    const user = await User.findById(decoded.userId);
    if (!user || !user.is_active) {
      console.log('[AUTH] User not found or inactive');
      return res.status(401).json({ 
        success: false, 
        message: 'User not found or inactive' 
      });
    }

    // Attach user and organization context to request
    req.user = user;
    req.organization_id = user.organization_id;
    console.log('[AUTH] user ok, org_id:', user.organization_id, 'calling next()');
    next();
  } catch (error) {
    console.log('[AUTH] Error:', error.name);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token' 
      });
    }
    next(error);
  }
};

/**
 * Check if user has admin role
 */
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin access required' 
    });
  }
  next();
};

/**
 * Check if user has operator or admin role
 */
const requireOperator = (req, res, next) => {
  console.log('[REQUIRE-OPERATOR] Checking role:', req.user?.role);
  if (!req.user || (req.user.role !== 'operator' && req.user.role !== 'admin' && req.user.role !== 'supervisor')) {
    console.log('[REQUIRE-OPERATOR] Access denied');
    return res.status(403).json({ 
      success: false, 
      message: 'Operator access required' 
    });
  }
  console.log('[REQUIRE-OPERATOR] Access granted');
  next();
};

/**
 * Check if user is admin or supervisor
 */
const requireSupervisor = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'supervisor')) {
    return res.status(403).json({ 
      success: false, 
      message: 'Supervisor access required' 
    });
  }
  next();
};

/**
 * Optional authentication - sets user if token exists but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.[authConfig.cookie.name] || 
                  req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, authConfig.jwt.secret);
      const user = await User.findById(decoded.userId);
      if (user && user.is_active) {
        // Ensure organization context is available
        req.user = user;
        req.organization_id = user.organization_id;
      }
    }
    next();
  } catch {
    // Continue without user
    next();
  }
};

module.exports = {
  authenticate,
  requireAdmin,
  requireOperator,
  requireSupervisor,
  optionalAuth
};
