/**
 * Scheduler Routes
 * API endpoints for work order auto-generation
 */

const express = require('express');
const router = express.Router();
const schedulerController = require('../controllers/scheduler.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

/**
 * @route   POST /api/scheduler/run
 * @desc    Run scheduler for current organization
 * @access  Supervisor, Admin
 */
router.post('/run', 
  authenticate,
  requirePermission('SCHEDULES', 'CREATE'),
  schedulerController.runScheduler
);

/**
 * @route   GET /api/scheduler/preview
 * @desc    Preview scheduled work orders (dry run)
 * @access  Supervisor, Admin
 */
router.get('/preview',
  authenticate,
  requirePermission('SCHEDULES', 'VIEW'),
  schedulerController.previewSchedule
);

/**
 * @route   POST /api/scheduler/run-all
 * @desc    Run scheduler for all organizations (admin only)
 * @access  Admin only
 */
router.post('/run-all',
  authenticate,
  requirePermission('SCHEDULES', 'CREATE'),
  schedulerController.runAll
);

module.exports = router;
