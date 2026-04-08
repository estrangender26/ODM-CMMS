/**
 * Coverage Validation Routes
 * Step 4: Admin-safe visibility for coverage validation
 */

const express = require('express');
const router = express.Router();
const coverageController = require('../controllers/coverage-validation.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');

// All routes require authentication and admin privileges
router.use(authenticate, requireAdmin);

/**
 * @route   GET /api/admin/coverage/validate
 * @desc    Full coverage validation report
 * @access  Admin only
 */
router.get('/validate', coverageController.validateCoverage.bind(coverageController));

/**
 * @route   GET /api/admin/coverage/unmapped-equipment
 * @desc    Equipment types without family mappings
 * @access  Admin only
 */
router.get('/unmapped-equipment', coverageController.getUnmappedEquipment.bind(coverageController));

/**
 * @route   GET /api/admin/coverage/missing-industry-mappings
 * @desc    Equipment types without industry associations
 * @access  Admin only
 */
router.get('/missing-industry-mappings', coverageController.getMissingIndustryMappings.bind(coverageController));

/**
 * @route   GET /api/admin/coverage/missing-templates
 * @desc    Equipment types without system templates
 * @access  Admin only
 */
router.get('/missing-templates', coverageController.getMissingTemplates.bind(coverageController));

/**
 * @route   GET /api/admin/coverage/by-industry
 * @desc    Template coverage by industry
 * @access  Admin only
 */
router.get('/by-industry', coverageController.getCoverageByIndustry.bind(coverageController));

/**
 * @route   GET /api/admin/coverage/by-family
 * @desc    Template coverage by family
 * @access  Admin only
 */
router.get('/by-family', coverageController.getCoverageByFamily.bind(coverageController));

/**
 * @route   GET /api/admin/coverage/equipment-mappings
 * @desc    All equipment type mappings with pagination
 * @access  Admin only
 */
router.get('/equipment-mappings', coverageController.getEquipmentMappings.bind(coverageController));

/**
 * @route   POST /api/admin/coverage/map-equipment-to-family
 * @desc    Map equipment type to template family
 * @access  Admin only
 */
router.post('/map-equipment-to-family', coverageController.mapEquipmentToFamily.bind(coverageController));

/**
 * @route   POST /api/admin/coverage/map-equipment-to-industry
 * @desc    Map equipment type to industry
 * @access  Admin only
 */
router.post('/map-equipment-to-industry', coverageController.mapEquipmentToIndustry.bind(coverageController));

/**
 * @route   PUT /api/admin/coverage/update-family-mapping
 * @desc    Update existing family mapping (with safeguards)
 * @access  Admin only
 */
router.put('/update-family-mapping', coverageController.updateFamilyMapping.bind(coverageController));

module.exports = router;
