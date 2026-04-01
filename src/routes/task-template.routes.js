/**
 * Task Template Routes
 * ISO 14224-aligned maintenance task templates
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const taskTemplateController = require('../controllers/task-template.controller');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/task-templates/stats
 * @desc    Get task template statistics
 * @access  Private (Admin/Supervisor)
 */
router.get('/stats', requireAdmin, taskTemplateController.getStats);

/**
 * @route   GET /api/task-templates/search
 * @desc    Search task templates
 * @access  Private
 */
router.get('/search', taskTemplateController.search);

/**
 * @route   GET /api/task-templates/equipment-type/:equipmentTypeId
 * @desc    Get templates by equipment type
 * @access  Private
 */
router.get('/equipment-type/:equipmentTypeId', taskTemplateController.getByEquipmentType);

/**
 * @route   GET /api/task-templates/for-asset/:assetId
 * @desc    Get applicable templates for an asset
 * @access  Private
 */
router.get('/for-asset/:assetId', taskTemplateController.getForAsset);

/**
 * @route   GET /api/task-templates/:id
 * @desc    Get task template details
 * @access  Private
 */
router.get('/:id', taskTemplateController.getById);

/**
 * @route   POST /api/task-templates
 * @desc    Create new task template
 * @access  Private (Admin/Supervisor)
 */
router.post('/', requireAdmin, taskTemplateController.create);

/**
 * @route   PUT /api/task-templates/:id
 * @desc    Update task template
 * @access  Private (Admin/Supervisor)
 */
router.put('/:id', requireAdmin, taskTemplateController.update);

/**
 * @route   DELETE /api/task-templates/:id
 * @desc    Delete task template
 * @access  Private (Admin/Supervisor)
 */
router.delete('/:id', requireAdmin, taskTemplateController.remove);

module.exports = router;
