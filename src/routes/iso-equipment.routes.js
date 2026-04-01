/**
 * ISO 14224 Equipment Classification Routes
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const isoEquipmentController = require('../controllers/iso-equipment.controller');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/iso-equipment/categories
 * @desc    Get all equipment categories
 * @access  Private
 */
router.get('/categories', isoEquipmentController.getCategories);

/**
 * @route   GET /api/iso-equipment/hierarchy
 * @desc    Get full hierarchy (categories > classes > types)
 * @access  Private
 */
router.get('/hierarchy', isoEquipmentController.getFullHierarchy);

/**
 * @route   GET /api/iso-equipment/types
 * @desc    Get all equipment types with hierarchy
 * @access  Private
 */
router.get('/types', isoEquipmentController.getAllTypes);

/**
 * @route   GET /api/iso-equipment/types/search
 * @desc    Search equipment types
 * @access  Private
 */
router.get('/types/search', isoEquipmentController.searchTypes);

/**
 * @route   GET /api/iso-equipment/types/:id
 * @desc    Get equipment type details with failure modes
 * @access  Private
 */
router.get('/types/:id', isoEquipmentController.getTypeDetails);

/**
 * @route   GET /api/iso-equipment/categories/:categoryId/classes
 * @desc    Get classes by category
 * @access  Private
 */
router.get('/categories/:categoryId/classes', isoEquipmentController.getClassesByCategory);

/**
 * @route   GET /api/iso-equipment/classes/:classId/types
 * @desc    Get types by class
 * @access  Private
 */
router.get('/classes/:classId/types', isoEquipmentController.getTypesByClass);

/**
 * @route   GET /api/iso-equipment/types/:typeId/failure-modes
 * @desc    Get failure modes for equipment type
 * @access  Private
 */
router.get('/types/:typeId/failure-modes', isoEquipmentController.getFailureModes);

module.exports = router;
