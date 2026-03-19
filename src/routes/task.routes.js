/**
 * Task Master Routes
 */

const express = require('express');
const router = express.Router();
const taskController = require('../controllers/task.controller');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { idParamValidation } = require('../middleware/validation');

router.use(authenticate);

// Routes accessible to all authenticated users
router.get('/', taskController.getAll);
router.get('/types', taskController.getTypes);
router.get('/:id', idParamValidation, taskController.getById);

// Admin only routes
router.post('/', requireAdmin, taskController.create);
router.put('/:id', requireAdmin, idParamValidation, taskController.update);
router.delete('/:id', requireAdmin, idParamValidation, taskController.remove);

module.exports = router;
