/**
 * Equipment Routes
 */

const express = require('express');
const router = express.Router();
const equipmentController = require('../controllers/equipment.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { filterEquipmentByFacility } = require('../middleware/rbac');
const { equipmentValidation, idParamValidation } = require('../middleware/validation');

router.use(authenticate);

// Routes accessible to all authenticated users (with role-based facility filtering)
router.get('/', filterEquipmentByFacility, equipmentController.getAll);
router.get('/stats', filterEquipmentByFacility, equipmentController.getStats);
router.get('/search', filterEquipmentByFacility, equipmentController.search);

// QR Code routes
router.get('/without-qr', equipmentController.getWithoutQRToken);
router.get('/:id/qr', equipmentController.getQRCode);
router.post('/:id/qr', requireAdmin, equipmentController.generateQRToken);
router.get('/qr/lookup/:token', equipmentController.lookupByQRToken);

// Standard CRUD routes
router.get('/:id', idParamValidation, equipmentController.getById);

// Admin only routes
router.post('/', requireAdmin, equipmentValidation, equipmentController.create);
router.put('/:id', requireAdmin, idParamValidation, equipmentController.update);
router.delete('/:id', requireAdmin, idParamValidation, equipmentController.remove);

module.exports = router;
