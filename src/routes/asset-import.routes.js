/**
 * Asset Import Routes
 * API endpoints for bulk asset import
 */

const express = require('express');
const router = express.Router();
const { assetImportUpload, handleAssetImportUploadError } = require('../middleware/asset-import-upload');
const assetImportController = require('../controllers/asset-import.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

/**
 * @route   POST /api/assets/import
 * @desc    Upload and process asset import CSV
 * @access  Admin, Supervisor
 */
router.post('/import',
  authenticate,
  requirePermission('EQUIPMENT', 'CREATE'),
  assetImportUpload.single('file'),
  handleAssetImportUploadError,
  assetImportController.uploadImport
);

/**
 * @route   POST /api/assets/import/validate
 * @desc    Validate CSV without importing
 * @access  Admin, Supervisor
 */
router.post('/import/validate',
  authenticate,
  requirePermission('EQUIPMENT', 'CREATE'),
  assetImportUpload.single('file'),
  handleAssetImportUploadError,
  assetImportController.validateImport
);

/**
 * @route   GET /api/assets/import/template
 * @desc    Download CSV template
 * @access  Any authenticated user
 */
router.get('/import/template',
  authenticate,
  assetImportController.downloadTemplate
);

/**
 * @route   GET /api/assets/import/spec
 * @desc    Get import specification
 * @access  Any authenticated user
 */
router.get('/import/spec',
  authenticate,
  assetImportController.getSpec
);

module.exports = router;
