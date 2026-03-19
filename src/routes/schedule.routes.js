/**
 * Schedule Routes
 */

const express = require('express');
const router = express.Router();
const scheduleController = require('../controllers/schedule.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { requirePermission, canCreateInFacility, canManageSchedule } = require('../middleware/rbac');
const { scheduleValidation, idParamValidation } = require('../middleware/validation');

router.use(authenticate);

// Routes accessible to all authenticated users (filtered by facility for supervisors)
router.get('/', scheduleController.getAll);
router.get('/overdue', scheduleController.getOverdue);
router.get('/due-today', scheduleController.getDueToday);

// View single schedule - supervisors can only view their facility's schedules
router.get('/:id', idParamValidation, requirePermission('SCHEDULES', 'VIEW'), canManageSchedule, scheduleController.getById);

// Create schedule - admin and supervisor only (supervisor restricted to their facility)
router.post('/', requirePermission('SCHEDULES', 'CREATE'), canCreateInFacility, scheduleValidation, scheduleController.create);

// Update schedule - admin and supervisor only (supervisor restricted to their facility)
router.put('/:id', requirePermission('SCHEDULES', 'UPDATE'), idParamValidation, canManageSchedule, scheduleController.update);

// Delete schedule - admin and supervisor only (supervisor restricted to their facility)
router.delete('/:id', requirePermission('SCHEDULES', 'DELETE'), idParamValidation, canManageSchedule, scheduleController.remove);

module.exports = router;
