/**
 * Industry Routes
 * Master data and organization industry management
 */

const express = require('express');
const router = express.Router();
const industryController = require('../controllers/industry.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Public route - get all active industries
router.get('/', industryController.getAll);

// Protected routes
router.use(authenticate);

// Organization industry management
router.get('/my-organization', industryController.getByOrganization);
router.get('/my-organization/default', industryController.getDefault);
router.post('/my-organization/assign', requireAdmin, industryController.assignToOrganization);
router.post('/my-organization/set-default', requireAdmin, industryController.setDefault);
router.delete('/my-organization/:industry_id', requireAdmin, industryController.removeFromOrganization);

// Get equipment types for an industry
router.get('/:id/equipment-types', industryController.getEquipmentTypes);

module.exports = router;
