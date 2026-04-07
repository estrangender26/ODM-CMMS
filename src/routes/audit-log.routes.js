/**
 * Audit Log Routes
 * For Enterprise plans
 */

const express = require('express');
const router = express.Router();
const auditLogController = require('../controllers/audit-log.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { requireFeature } = require('../middleware/feature-access.middleware');

router.use(authenticate);

/**
 * Get audit logs with filtering
 * GET /api/audit-logs
 */
router.get('/',
  requireFeature('audit_logs'),
  auditLogController.getLogs
);

/**
 * Get audit log statistics
 * GET /api/audit-logs/stats
 */
router.get('/stats',
  requireFeature('audit_logs'),
  auditLogController.getStats
);

/**
 * Get login history
 * GET /api/audit-logs/logins
 */
router.get('/logins',
  requireFeature('audit_logs'),
  auditLogController.getLoginHistory
);

/**
 * Get security events
 * GET /api/audit-logs/security
 */
router.get('/security',
  requireAdmin,
  requireFeature('audit_logs'),
  auditLogController.getSecurityEvents
);

/**
 * Get user activity
 * GET /api/audit-logs/user/:userId
 */
router.get('/user/:userId',
  requireFeature('audit_logs'),
  auditLogController.getUserActivity
);

/**
 * Get entity activity
 * GET /api/audit-logs/entity/:entityType/:entityId
 */
router.get('/entity/:entityType/:entityId',
  requireFeature('audit_logs'),
  auditLogController.getEntityActivity
);

/**
 * Get audit log by ID
 * GET /api/audit-logs/:id
 */
router.get('/:id',
  requireFeature('audit_logs'),
  auditLogController.getLogById
);

/**
 * Export audit logs
 * GET /api/audit-logs/export/all
 */
router.get('/export/all',
  requireAdmin,
  requireFeature('audit_logs'),
  auditLogController.exportLogs
);

/**
 * Get audit configuration
 * GET /api/audit-logs/config
 */
router.get('/config',
  requireAdmin,
  requireFeature('audit_logs'),
  auditLogController.getConfiguration
);

/**
 * Update audit configuration
 * PUT /api/audit-logs/config
 */
router.put('/config',
  requireAdmin,
  requireFeature('audit_logs'),
  auditLogController.updateConfiguration
);

/**
 * Purge old audit logs
 * POST /api/audit-logs/purge
 */
router.post('/purge',
  requireAdmin,
  requireFeature('audit_logs'),
  auditLogController.purgeOldLogs
);

module.exports = router;
