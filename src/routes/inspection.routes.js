/**
 * Inspection Routes
 */

const express = require('express');
const router = express.Router();
const inspectionController = require('../controllers/inspection.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { canSubmitInspection, requirePermission } = require('../middleware/rbac');
const { inspectionReadingValidation, idParamValidation } = require('../middleware/validation');

router.use(authenticate);

// Get inspection points for a task - viewable by all
router.get('/points/task/:taskId', requirePermission('INSPECTIONS', 'VIEW'), inspectionController.getPointsForTask);

// Get readings for work order - viewable by all
router.get('/readings/work-order/:workOrderId', requirePermission('INSPECTIONS', 'VIEW'), inspectionController.getReadingsForWorkOrder);

// Submit inspection readings - operators can submit for their own work orders
router.post('/readings/work-order/:workOrderId', 
  canSubmitInspection, 
  inspectionReadingValidation, 
  inspectionController.submitReading
);

// Submit bulk readings - operators can submit for their own work orders
router.post('/readings/work-order/:workOrderId/bulk', 
  canSubmitInspection, 
  inspectionController.submitBulkReadings
);

// Manage inspection points - admin and supervisor can manage
router.post('/points/task/:taskId', requirePermission('INSPECTIONS', 'MANAGE_POINTS'), inspectionController.createInspectionPoint);
router.put('/points/:pointId', requirePermission('INSPECTIONS', 'MANAGE_POINTS'), inspectionController.updateInspectionPoint);
router.delete('/points/:pointId', requireAdmin, inspectionController.deleteInspectionPoint);

module.exports = router;
