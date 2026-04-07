/**
 * Maintenance Plan Routes
 * Manage schedules linking templates to equipment
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireSupervisor } = require('../middleware/auth');
const planController = require('../controllers/maintenance-plan.controller');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/maintenance-plans
 * @desc    Get all maintenance plans
 * @access  Private
 */
router.get('/', planController.getAll);

/**
 * @route   GET /api/maintenance-plans/:id
 * @desc    Get maintenance plan by ID
 * @access  Private
 */
router.get('/:id', planController.getById);

/**
 * @route   POST /api/maintenance-plans
 * @desc    Create new maintenance plan
 * @access  Private (Admin/Supervisor)
 */
router.post('/', requireSupervisor, planController.create);

/**
 * @route   PUT /api/maintenance-plans/:id
 * @desc    Update maintenance plan
 * @access  Private (Admin/Supervisor)
 */
router.put('/:id', requireSupervisor, planController.update);

/**
 * @route   DELETE /api/maintenance-plans/:id
 * @desc    Delete maintenance plan
 * @access  Private (Admin/Supervisor)
 */
router.delete('/:id', requireSupervisor, planController.remove);

module.exports = router;
