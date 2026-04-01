/**
 * Mobile Inspection Routes
 * Mobile-first inspection workflow APIs
 */

const express = require('express');
const router = express.Router();
const { authenticate, optionalAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const mobileInspectionController = require('../controllers/mobile-inspection.controller');

// QR Asset Page - supports both authenticated and public (QR scan) access
// If token is valid, show asset info even without auth
router.get('/asset/:token', optionalAuth, mobileInspectionController.getAssetPage);

// All other routes require authentication
router.use(authenticate);

// Facility and Asset browsing
router.get('/facilities', requirePermission('INSPECTIONS', 'VIEW'), mobileInspectionController.getFacilitiesList);
router.get('/facility/:facilityId/assets', requirePermission('INSPECTIONS', 'VIEW'), mobileInspectionController.getAssetsByFacility);

// Asset History
router.get('/asset/:assetId/history', requirePermission('INSPECTIONS', 'VIEW'), mobileInspectionController.getAssetHistory);

// Inspection Runner
router.get('/asset/:assetId/inspect/:templateId', requirePermission('INSPECTIONS', 'VIEW'), mobileInspectionController.getInspectionRunner);
router.post('/asset/:assetId/inspect', requirePermission('INSPECTIONS', 'SUBMIT'), mobileInspectionController.submitInspectionResults);

// Finding Recorder
router.get('/asset/:assetId/finding-form', requirePermission('FINDINGS', 'CREATE'), mobileInspectionController.getFindingForm);
router.post('/asset/:assetId/finding', requirePermission('FINDINGS', 'CREATE'), mobileInspectionController.submitFinding);

module.exports = router;
