/**
 * Utility Helper Functions
 */

const bcrypt = require('bcryptjs');
const authConfig = require('../config/auth');

/**
 * Hash a password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password) => {
  return bcrypt.hash(password, authConfig.bcrypt.saltRounds);
};

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>}
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Generate unique code with prefix
 * @param {string} prefix - Code prefix (e.g., 'WO', 'EQ')
 * @param {number} id - ID to include in code
 * @param {number} padding - Number padding (default 4)
 * @returns {string}
 */
const generateCode = (prefix, id, padding = 4) => {
  const year = new Date().getFullYear();
  const paddedId = String(id).padStart(padding, '0');
  return `${prefix}-${year}-${paddedId}`;
};

/**
 * Format date for MySQL
 * @param {Date|string} date
 * @returns {string}
 */
const formatDateForMySQL = (date) => {
  const d = new Date(date);
  return d.toISOString().slice(0, 19).replace('T', ' ');
};

/**
 * Calculate next due date based on frequency
 * @param {Date} currentDate
 * @param {string} frequencyType
 * @param {number} frequencyValue
 * @returns {Date}
 */
const calculateNextDueDate = (currentDate, frequencyType, frequencyValue = 1) => {
  const date = new Date(currentDate);
  
  switch (frequencyType) {
    case 'daily':
      date.setDate(date.getDate() + frequencyValue);
      break;
    case 'weekly':
      date.setDate(date.getDate() + (frequencyValue * 7));
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + frequencyValue);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + (frequencyValue * 3));
      break;
    case 'yearly':
      date.setFullYear(date.getFullYear() + frequencyValue);
      break;
    default:
      date.setDate(date.getDate() + 1);
  }
  
  return date;
};

/**
 * Sanitize user object (remove sensitive data)
 * @param {Object} user
 * @returns {Object}
 */
const sanitizeUser = (user) => {
  const { password_hash, ...sanitized } = user;
  return sanitized;
};

/**
 * Parse JSON safely
 * @param {string} jsonString
 * @param {*} defaultValue
 * @returns {*}
 */
const safeJsonParse = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch {
    return defaultValue;
  }
};

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generate pagination metadata
 * @param {number} page
 * @param {number} limit
 * @param {number} total
 * @returns {Object}
 */
const getPaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

module.exports = {
  hashPassword,
  comparePassword,
  generateCode,
  formatDateForMySQL,
  calculateNextDueDate,
  sanitizeUser,
  safeJsonParse,
  isValidEmail,
  getPaginationMeta
};
