/**
 * Validation Middleware
 * Uses express-validator
 */

const { body, param, validationResult } = require('express-validator');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.path,
        message: err.msg
      }))
    });
  }
  next();
};

// Auth validations
const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

const registerValidation = [
  body('username').trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('full_name').trim().notEmpty().withMessage('Full name is required'),
  body('role').optional().isIn(['admin', 'operator', 'supervisor']).withMessage('Invalid role'),
  handleValidationErrors
];

// Equipment validations
const equipmentValidation = [
  body('facility_id').isInt({ min: 1 }).withMessage('Valid facility is required'),
  body('name').trim().notEmpty().withMessage('Equipment name is required'),
  body('code').trim().notEmpty().withMessage('Equipment code is required'),
  body('category').optional().trim(),
  body('status').optional().isIn(['operational', 'maintenance', 'out_of_order', 'retired']),
  body('criticality').optional().isIn(['low', 'medium', 'high', 'critical']),
  handleValidationErrors
];

// Work Order validations
const workOrderValidation = [
  body('equipment_id').isInt({ min: 1 }).withMessage('Valid equipment is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').optional().trim(),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('wo_type').optional().isIn(['preventive', 'corrective', 'predictive', 'emergency', 'project']),
  body('assigned_to').optional().isInt().withMessage('Assigned to must be a valid user ID'),
  handleValidationErrors
];

// Inspection reading validation
const inspectionReadingValidation = [
  body('inspection_point_id').isInt({ min: 1 }).withMessage('Inspection point is required'),
  body('reading_value').optional(),
  body('reading_numeric').optional().isFloat(),
  body('reading_text').optional().trim(),
  body('reading_boolean').optional().isBoolean(),
  body('notes').optional().trim(),
  handleValidationErrors
];

// Schedule validation
const scheduleValidation = [
  body('equipment_id').isInt({ min: 1 }).withMessage('Valid equipment is required'),
  body('task_master_id').isInt({ min: 1 }).withMessage('Valid task template is required'),
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('frequency_type').isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'hours_based', 'custom']),
  body('frequency_value').optional().isInt({ min: 1 }),
  body('start_date').isDate().withMessage('Valid start date is required'),
  handleValidationErrors
];

// ID parameter validation
const idParamValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid ID is required'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  loginValidation,
  registerValidation,
  equipmentValidation,
  workOrderValidation,
  inspectionReadingValidation,
  scheduleValidation,
  idParamValidation
};
