/**
 * Finding Routes
 * ODM Findings / Defects with SAP catalog coding
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const findingController = require('../controllers/finding.controller');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/findings
 * @desc    Get all findings for organization
 * @access  Private
 */
router.get('/', requirePermission('FINDINGS', 'VIEW'), findingController.getAll);

/**
 * @route   GET /api/findings/stats
 * @desc    Get findings statistics
 * @access  Private
 */
router.get('/stats', requirePermission('FINDINGS', 'VIEW'), findingController.getStats);

/**
 * @route   GET /api/findings/search
 * @desc    Search findings
 * @access  Private
 */
router.get('/search', requirePermission('FINDINGS', 'VIEW'), findingController.search);

/**
 * @route   GET /api/findings/pending-sap
 * @desc    Get findings requiring SAP notification
 * @access  Private (Admin/Supervisor)
 */
router.get('/pending-sap', requirePermission('FINDINGS', 'MANAGE'), findingController.getPendingSapNotifications);

/**
 * @route   GET /api/findings/catalog-options/:equipmentClassId
 * @desc    Get SAP catalog options for finding creation
 * @access  Private
 */
router.get('/catalog-options/:equipmentClassId', requirePermission('FINDINGS', 'VIEW'), findingController.getCatalogOptions);

/**
 * @route   GET /api/findings/asset/:assetId
 * @desc    Get findings for a specific asset
 * @access  Private
 */
router.get('/asset/:assetId', requirePermission('FINDINGS', 'VIEW'), findingController.getByAsset);

/**
 * @route   GET /api/findings/:id
 * @desc    Get finding details
 * @access  Private
 */
router.get('/:id', requirePermission('FINDINGS', 'VIEW'), findingController.getById);

/**
 * @route   POST /api/findings
 * @desc    Create a new finding
 * @access  Private (Operator and above)
 */
router.post('/', requirePermission('FINDINGS', 'CREATE'), findingController.create);

/**
 * @route   PATCH /api/findings/:id/sap-notification
 * @desc    Link SAP notification to finding
 * @access  Private (Admin/Supervisor)
 */
router.patch('/:id/sap-notification', requirePermission('FINDINGS', 'MANAGE'), findingController.linkSapNotification);

/**
 * @route   PATCH /api/findings/:id/status
 * @desc    Update finding status
 * @access  Private (Admin/Supervisor)
 */
router.patch('/:id/status', requirePermission('FINDINGS', 'MANAGE'), findingController.updateStatus);

module.exports = router;
