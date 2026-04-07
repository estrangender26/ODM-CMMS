/**
 * QR Label Routes
 * Routes for QR label generation and management
 * Mounted under /api by routes/index.js
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const qrLabelController = require('../controllers/qr-label.controller');

// API Routes
router.get('/assets/:id/qr',
  authenticate,
  requirePermission('ASSETS', 'VIEW'),
  qrLabelController.getAssetQR
);

router.get('/assets/:id/qr-label.png',
  authenticate,
  requirePermission('ASSETS', 'VIEW'),
  qrLabelController.downloadLabelPNG
);

router.get('/assets/:id/qr-label.pdf',
  authenticate,
  requirePermission('ASSETS', 'VIEW'),
  qrLabelController.downloadLabelPDF
);

router.post('/assets/qr-labels/batch',
  authenticate,
  requirePermission('ASSETS', 'VIEW'),
  qrLabelController.downloadBatchPDF
);

router.post('/assets/:id/qr/regenerate',
  authenticate,
  requirePermission('ASSETS', 'UPDATE'),
  qrLabelController.regenerateQR
);

module.exports = router;
