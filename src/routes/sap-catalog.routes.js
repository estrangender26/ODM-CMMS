/**
 * SAP Catalog Routes
 * SAP S/4HANA PM-compatible catalog APIs
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const sapCatalogController = require('../controllers/sap-catalog.controller');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/sap-catalogs
 * @desc    Get all catalogs (complete reference)
 * @access  Private
 */
router.get('/', requirePermission('CATALOGS', 'VIEW'), sapCatalogController.getAllCatalogs);

/**
 * @route   GET /api/sap-catalogs/for-finding/:equipmentClassId
 * @desc    Get catalog options for finding creation
 * @access  Private
 */
router.get('/for-finding/:equipmentClassId', requirePermission('CATALOGS', 'VIEW'), sapCatalogController.getCatalogsForFinding);

/**
 * @route   GET /api/sap-catalogs/:catalogType
 * @desc    Get catalog by type (a, b, c, 5, object-parts, damage-codes, cause-codes, activity-codes)
 * @access  Private
 */
router.get('/:catalogType', requirePermission('CATALOGS', 'VIEW'), sapCatalogController.getCatalogByType);

/**
 * @route   GET /api/sap-catalogs/:catalogType/:id
 * @desc    Get specific catalog item
 * @access  Private
 */
router.get('/:catalogType/:id', requirePermission('CATALOGS', 'VIEW'), sapCatalogController.getCatalogItem);

module.exports = router;
