/**
 * Admin Coverage UI Routes
 * Step 5: Operational tooling for coverage management
 */

const express = require('express');
const router = express.Router();
const adminCoverageController = require('../controllers/admin-coverage-ui.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All routes require authentication and admin privileges
router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/admin/coverage/dashboard
 * @desc    Coverage dashboard with stats and charts
 * @access  Admin only
 */
router.get('/dashboard', adminCoverageController.getDashboard.bind(adminCoverageController));

/**
 * @route   GET /api/admin/coverage/equipment-with-filters
 * @desc    Equipment list with advanced filtering
 * @access  Admin only
 */
router.get('/equipment-with-filters', adminCoverageController.getEquipmentWithFilters.bind(adminCoverageController));

/**
 * @route   GET /api/admin/coverage/gap-resolution
 * @desc    Gap resolution view with actionable items
 * @access  Admin only
 */
router.get('/gap-resolution', adminCoverageController.getGapResolution.bind(adminCoverageController));

/**
 * @route   GET /api/admin/coverage/template-browser
 * @desc    Browse system templates with filters
 * @access  Admin only
 */
router.get('/template-browser', adminCoverageController.getTemplateBrowser.bind(adminCoverageController));

/**
 * @route   GET /api/admin/coverage/audit-log
 * @desc    View audit log with filters
 * @access  Admin only
 */
router.get('/audit-log', adminCoverageController.getAuditLog.bind(adminCoverageController));

module.exports = router;
