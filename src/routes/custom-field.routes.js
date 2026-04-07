/**
 * Custom Field Routes
 * For Professional+ plans
 */

const express = require('express');
const router = express.Router();
const customFieldController = require('../controllers/custom-field.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { requireFeature, checkCustomFieldLimit } = require('../middleware/feature-access.middleware');

router.use(authenticate);

/**
 * Get custom field definitions for an entity type
 * GET /api/custom-fields/definitions/:entityType
 */
router.get('/definitions/:entityType', 
  requireFeature('custom_fields'),
  customFieldController.getDefinitions
);

/**
 * Get a single custom field definition
 * GET /api/custom-fields/definitions/detail/:id
 */
router.get('/definitions/detail/:id',
  requireFeature('custom_fields'),
  customFieldController.getDefinitionById
);

/**
 * Create custom field definition
 * POST /api/custom-fields/definitions
 */
router.post('/definitions',
  requireAdmin,
  requireFeature('custom_fields'),
  checkCustomFieldLimit(),
  customFieldController.createDefinition
);

/**
 * Update custom field definition
 * PUT /api/custom-fields/definitions/:id
 */
router.put('/definitions/:id',
  requireAdmin,
  requireFeature('custom_fields'),
  customFieldController.updateDefinition
);

/**
 * Delete custom field definition
 * DELETE /api/custom-fields/definitions/:id
 */
router.delete('/definitions/:id',
  requireAdmin,
  requireFeature('custom_fields'),
  customFieldController.deleteDefinition
);

/**
 * Get custom field values for an entity
 * GET /api/custom-fields/values/:entityType/:entityId
 */
router.get('/values/:entityType/:entityId',
  requireFeature('custom_fields'),
  customFieldController.getValues
);

/**
 * Set single custom field value
 * POST /api/custom-fields/values/:fieldDefinitionId/:entityId
 */
router.post('/values/:fieldDefinitionId/:entityId',
  requireFeature('custom_fields'),
  customFieldController.setValue
);

/**
 * Set multiple custom field values
 * POST /api/custom-fields/values/bulk/:entityType/:entityId
 */
router.post('/values/bulk/:entityType/:entityId',
  requireFeature('custom_fields'),
  customFieldController.setMultipleValues
);

/**
 * Get custom field statistics
 * GET /api/custom-fields/stats
 */
router.get('/stats',
  requireAdmin,
  requireFeature('custom_fields'),
  customFieldController.getStats
);

module.exports = router;
