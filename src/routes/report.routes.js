/**
 * Report Routes
 */

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission, filterReportsByFacility } = require('../middleware/rbac');

// All report routes require authentication
router.use(authenticate);

// Apply facility filtering for supervisors and operators
router.use(filterReportsByFacility);

// Work Order Summary Report - accessible to all authenticated users
router.get('/work-orders/summary', requirePermission('REPORTS', 'VIEW'), reportController.getWorkOrderSummary);

// Equipment Maintenance Report - accessible to all authenticated users
router.get('/equipment', requirePermission('REPORTS', 'VIEW'), reportController.getEquipmentReport);

// Technician Performance Report - accessible to all authenticated users
router.get('/technicians', requirePermission('REPORTS', 'VIEW'), reportController.getTechnicianReport);

// Schedule Compliance Report - accessible to all authenticated users
router.get('/schedule-compliance', requirePermission('REPORTS', 'VIEW'), reportController.getScheduleCompliance);

// Work Order Trends - accessible to all authenticated users
router.get('/trends', requirePermission('REPORTS', 'VIEW'), reportController.getTrends);

// Export all reports as CSV
router.get('/export/:type', requirePermission('REPORTS', 'EXPORT'), reportController.exportReport);

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
