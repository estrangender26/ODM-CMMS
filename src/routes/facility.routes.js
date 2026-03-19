/**
 * Facility Routes
 */

const express = require('express');
const router = express.Router();
const facilityController = require('../controllers/facility.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { idParamValidation } = require('../middleware/validation');

router.use(authenticate);

// Routes accessible to all authenticated users
router.get('/', facilityController.getAll);
router.get('/:id', idParamValidation, facilityController.getById);

// Admin only routes
router.post('/', requireAdmin, facilityController.create);
router.put('/:id', requireAdmin, idParamValidation, facilityController.update);
router.delete('/:id', requireAdmin, idParamValidation, facilityController.remove);

module.exports = router;
