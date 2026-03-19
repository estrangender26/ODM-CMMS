/**
 * Work Order Routes
 */

const express = require('express');
const router = express.Router();
const workOrderController = require('../controllers/work-order.controller');
const { authenticate, requireAdmin, requireSupervisor } = require('../middleware/auth');
const { canUpdateWorkOrderStatus, canAddWorkOrderNote, canAssignWorkOrder, canAccessFacilityWorkOrder, canCreateInFacility, requirePermission } = require('../middleware/rbac');
const { workOrderValidation, idParamValidation } = require('../middleware/validation');

console.log('[WORK-ORDER-ROUTES] File loaded, registering routes...');

router.use(authenticate);

console.log('[WORK-ORDER-ROUTES] Registering /my-work-orders');

// Operator routes - view own work orders
router.get('/my-work-orders', requirePermission('WORK_ORDERS', 'VIEW_OWN'), (req, res, next) => {
  console.log('[HANDLER] HIT /my-work-orders');
  next();
}, workOrderController.getMyWorkOrders);

// Statistics - admin sees all, supervisor sees facility stats
router.get('/stats', requirePermission('WORK_ORDERS', 'VIEW_ALL'), workOrderController.getStats);

// Create work order - admin and supervisor only (supervisor restricted to their facility)
router.post('/', requirePermission('WORK_ORDERS', 'CREATE'), canCreateInFacility, workOrderValidation, workOrderController.create);

// Work order by number - viewable by all
router.get('/number/:number', requirePermission('WORK_ORDERS', 'VIEW_OWN'), workOrderController.getByNumber);

// List all work orders - admin sees all, supervisor sees facility only
router.get('/', requirePermission('WORK_ORDERS', 'VIEW_ALL'), workOrderController.getAll);

// Re-assign work order - admin and supervisor only (supervisor restricted to their facility)
router.put('/:id/assign', 
  idParamValidation, 
  requirePermission('WORK_ORDERS', 'ASSIGN'), 
  canAssignWorkOrder,
  workOrderController.reassign
);

// Individual work order routes
// View single work order - operators can view their own, supervisors can view facility work orders
router.get('/:id', idParamValidation, requirePermission('WORK_ORDERS', 'VIEW_OWN'), canAccessFacilityWorkOrder, workOrderController.getById);

// Update work order details - admin and supervisor only (supervisor restricted to their facility)
router.put('/:id', idParamValidation, requirePermission('WORK_ORDERS', 'UPDATE'), canAccessFacilityWorkOrder, workOrderController.update);

// Update work order status - with RBAC checks for operators
router.put('/:id/status', idParamValidation, canUpdateWorkOrderStatus, workOrderController.updateStatus);

// Add notes - with RBAC checks for operators
router.post('/:id/notes', idParamValidation, canAddWorkOrderNote, workOrderController.addNote);

// Delete work order - admin only
router.delete('/:id', requireAdmin, idParamValidation, workOrderController.remove);

module.exports = router;
