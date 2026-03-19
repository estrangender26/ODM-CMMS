/**
 * Equipment Routes
 */

const express = require('express');
const router = express.Router();
const equipmentController = require('../controllers/equipment.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { equipmentValidation, idParamValidation } = require('../middleware/validation');

router.use(authenticate);

// Routes accessible to all authenticated users
router.get('/', equipmentController.getAll);
router.get('/stats', equipmentController.getStats);
router.get('/search', equipmentController.search);
router.get('/:id', idParamValidation, equipmentController.getById);

// Admin only routes
router.post('/', requireAdmin, equipmentValidation, equipmentController.create);
router.put('/:id', requireAdmin, idParamValidation, equipmentController.update);
router.delete('/:id', requireAdmin, idParamValidation, equipmentController.remove);

module.exports = router;
