/**
 * Authentication Controller
 */

const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth');
const { User } = require('../models');
const { hashPassword, comparePassword, sanitizeUser } = require('../utils/helpers');

/**
 * Generate JWT token
 * @param {Object} user
 * @returns {string}
 */
const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, role: user.role },
    authConfig.jwt.secret,
    { expiresIn: authConfig.jwt.expiresIn }
  );
};

/**
 * Login user
 */
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Find user by username
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is disabled'
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Update last login
    await User.updateLastLogin(user.id);

    // Generate token
    const token = generateToken(user);

    // Set cookie
    res.cookie(authConfig.cookie.name, token, authConfig.cookie.options);

    // Return success with user data
    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: sanitizeUser(user),
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public signup (self-registration)
 * Only allows operator and supervisor roles
 */
const signup = async (req, res, next) => {
  try {
    const { username, email, password, full_name, phone, role } = req.body;

    // Validate required fields
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'Username, email, password, and full name are required'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if username exists
    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Check if email exists
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Restrict self-registration to operator and supervisor only
    // Admin accounts must be created by existing admins
    const allowedRoles = ['operator', 'supervisor'];
    const userRole = allowedRoles.includes(role) ? role : 'operator';

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await User.create({
      username,
      email,
      password_hash: passwordHash,
      full_name,
      phone,
      role: userRole,
      is_active: true
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please sign in.',
      data: { user: sanitizeUser(user) }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Register new user (admin only)
 */
const register = async (req, res, next) => {
  try {
    const { username, email, password, full_name, phone, role } = req.body;

    // Check if username exists
    const existingUsername = await User.findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists'
      });
    }

    // Check if email exists
    const existingEmail = await User.findByEmail(email);
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Email already exists'
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await User.create({
      username,
      email,
      password_hash: passwordHash,
      full_name,
      phone,
      role: role || 'operator'
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: sanitizeUser(user) }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user
 */
const logout = (req, res) => {
  res.clearCookie(authConfig.cookie.name);
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};

/**
 * Get current user profile
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      success: true,
      data: { user: sanitizeUser(user) }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { full_name, phone, email } = req.body;
    
    const updateData = {};
    if (full_name) updateData.full_name = full_name;
    if (phone) updateData.phone = phone;
    if (email) updateData.email = email;

    const user = await User.update(req.user.id, updateData);
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: sanitizeUser(user) }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 */
const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    // Verify current password
    const user = await User.findById(req.user.id);
    const isValid = await comparePassword(current_password, user.password_hash);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash and update new password
    const newHash = await hashPassword(new_password);
    await User.update(req.user.id, { password_hash: newHash });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  signup,
  register,
  logout,
  getProfile,
  updateProfile,
  changePassword
};
