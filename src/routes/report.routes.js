/**
 * Report Routes
 * With Subscription-based Access Control
 */

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission, filterReportsByFacility } = require('../middleware/rbac');
const { requireReportAccess } = require('../middleware/subscription-reports.middleware');

// All report routes require authentication
router.use(authenticate);

// Apply facility filtering for supervisors and operators
router.use(filterReportsByFacility);

// Work Order Summary Report - Free plan+
router.get('/work-orders/summary', 
  requirePermission('REPORTS', 'VIEW'),
  requireReportAccess('work-orders/summary'),
  reportController.getWorkOrderSummary
);

// Equipment Maintenance Report - Starter plan+
router.get('/equipment', 
  requirePermission('REPORTS', 'VIEW'),
  requireReportAccess('equipment'),
  reportController.getEquipmentReport
);

// Technician Performance Report - Professional plan+
router.get('/technicians', 
  requirePermission('REPORTS', 'VIEW'),
  requireReportAccess('technicians'),
  reportController.getTechnicianReport
);

// Schedule Compliance Report - Professional plan+
router.get('/schedule-compliance', 
  requirePermission('REPORTS', 'VIEW'),
  requireReportAccess('schedule-compliance'),
  reportController.getScheduleCompliance
);

// Work Order Trends - Professional plan+
router.get('/trends', 
  requirePermission('REPORTS', 'VIEW'),
  requireReportAccess('trends'),
  reportController.getTrends
);

// Export all reports as CSV - Enterprise only
router.get('/export/:type', 
  requirePermission('REPORTS', 'EXPORT'),
  requireReportAccess('export'),
  reportController.exportReport
);

// Test endpoint
router.get('/test/db', requirePermission('REPORTS', 'VIEW'), async (req, res) => {
  try {
    const { getDb } = require('../config/database');
    const db = getDb();
    const result = await db.query('SELECT COUNT(*) as count FROM work_orders');
    res.json({ success: true, message: 'DB OK', work_orders: result[0].count });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
