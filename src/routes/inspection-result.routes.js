/**
 * Inspection Result Routes
 * Structured inspection response recording
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const inspectionResultController = require('../controllers/inspection-result.controller');

// All routes require authentication
router.use(authenticate);

/**
 * @route   POST /api/inspection-results
 * @desc    Create inspection result
 * @access  Private (Operator and above)
 */
router.post('/', requirePermission('INSPECTIONS', 'SUBMIT'), inspectionResultController.create);

/**
 * @route   POST /api/inspection-results/bulk
 * @desc    Create bulk inspection results
 * @access  Private (Operator and above)
 */
router.post('/bulk', requirePermission('INSPECTIONS', 'SUBMIT'), inspectionResultController.createBulk);

/**
 * @route   GET /api/inspection-results/stats
 * @desc    Get inspection statistics for organization
 * @access  Private
 */
router.get('/stats', requirePermission('INSPECTIONS', 'VIEW'), inspectionResultController.getStats);

/**
 * @route   GET /api/inspection-results/asset/:assetId
 * @desc    Get inspection results for an asset
 * @access  Private
 */
router.get('/asset/:assetId', requirePermission('INSPECTIONS', 'VIEW'), inspectionResultController.getByAsset);

/**
 * @route   GET /api/inspection-results/asset/:assetId/latest
 * @desc    Get latest inspection results for an asset
 * @access  Private
 */
router.get('/asset/:assetId/latest', requirePermission('INSPECTIONS', 'VIEW'), inspectionResultController.getLatestForAsset);

/**
 * @route   GET /api/inspection-results/asset/:assetId/stats
 * @desc    Get inspection statistics for an asset
 * @access  Private
 */
router.get('/asset/:assetId/stats', requirePermission('INSPECTIONS', 'VIEW'), inspectionResultController.getStatsForAsset);

/**
 * @route   GET /api/inspection-results/facility/:facilityId
 * @desc    Get inspection results for a facility
 * @access  Private
 */
router.get('/facility/:facilityId', requirePermission('INSPECTIONS', 'VIEW'), inspectionResultController.getByFacility);

/**
 * @route   GET /api/inspection-results/template/:templateId
 * @desc    Get inspection results for a template
 * @access  Private
 */
router.get('/template/:templateId', requirePermission('INSPECTIONS', 'VIEW'), inspectionResultController.getByTemplate);

/**
 * @route   GET /api/inspection-results/:id
 * @desc    Get inspection result by ID
 * @access  Private
 */
router.get('/:id', requirePermission('INSPECTIONS', 'VIEW'), inspectionResultController.getById);

module.exports = router;
