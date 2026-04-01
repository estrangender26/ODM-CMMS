/**
 * Subunit and Maintainable Item Routes
 * ISO 14224 Level 4 (Subunits) and Level 5 (Maintainable Items)
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const subunitController = require('../controllers/subunit.controller');

// All routes require authentication
router.use(authenticate);

// ==================== SUBUNITS ====================

/**
 * @route   GET /api/subunits
 * @desc    Get all subunits
 * @access  Private
 */
router.get('/', requirePermission('EQUIPMENT', 'VIEW'), subunitController.getAllSubunits);

/**
 * @route   GET /api/subunits/search
 * @desc    Search subunits
 * @access  Private
 */
router.get('/search', requirePermission('EQUIPMENT', 'VIEW'), subunitController.searchSubunits);

/**
 * @route   GET /api/subunits/equipment-type/:equipmentTypeId
 * @desc    Get subunits by equipment type
 * @access  Private
 */
router.get('/equipment-type/:equipmentTypeId', requirePermission('EQUIPMENT', 'VIEW'), subunitController.getSubunitsByEquipmentType);

/**
 * @route   GET /api/subunits/:id
 * @desc    Get subunit by ID
 * @access  Private
 */
router.get('/:id', requirePermission('EQUIPMENT', 'VIEW'), subunitController.getSubunitById);

// ==================== MAINTAINABLE ITEMS ====================

/**
 * @route   GET /api/subunits/items/all
 * @desc    Get all maintainable items
 * @access  Private
 */
router.get('/items/all', requirePermission('EQUIPMENT', 'VIEW'), subunitController.getAllItems);

/**
 * @route   GET /api/subunits/items/search
 * @desc    Search maintainable items
 * @access  Private
 */
router.get('/items/search', requirePermission('EQUIPMENT', 'VIEW'), subunitController.searchItems);

/**
 * @route   GET /api/subunits/items/criticality/:level
 * @desc    Get maintainable items by criticality
 * @access  Private
 */
router.get('/items/criticality/:level', requirePermission('EQUIPMENT', 'VIEW'), subunitController.getItemsByCriticality);

/**
 * @route   GET /api/subunits/items/equipment-type/:equipmentTypeId
 * @desc    Get maintainable items by equipment type
 * @access  Private
 */
router.get('/items/equipment-type/:equipmentTypeId', requirePermission('EQUIPMENT', 'VIEW'), subunitController.getItemsByEquipmentType);

/**
 * @route   GET /api/subunits/:subunitId/items
 * @desc    Get maintainable items by subunit
 * @access  Private
 */
router.get('/:subunitId/items', requirePermission('EQUIPMENT', 'VIEW'), subunitController.getItemsBySubunit);

/**
 * @route   GET /api/subunits/items/:id
 * @desc    Get maintainable item by ID
 * @access  Private
 */
router.get('/items/:id', requirePermission('EQUIPMENT', 'VIEW'), subunitController.getItemById);

module.exports = router;
