/**
 * Asset Import Routes
 * API endpoints for bulk asset import
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const os = require('os');
const assetImportController = require('../controllers/asset-import.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// Configure multer for CSV uploads
const upload = multer({
  dest: os.tmpdir(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept CSV files only
    if (file.mimetype === 'text/csv' || 
        file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

/**
 * @route   POST /api/assets/import
 * @desc    Upload and process asset import CSV
 * @access  Admin, Supervisor
 */
router.post('/import',
  authenticate,
  requirePermission('EQUIPMENT', 'CREATE'),
  upload.single('file'),
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
  upload.single('file'),
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
