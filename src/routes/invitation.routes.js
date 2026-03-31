/**
 * Invitation Routes
 * Organization invitation management
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const invitationController = require('../controllers/invitation.controller');

// Public routes (no authentication required)
router.get('/validate/:token', invitationController.validate);
router.post('/accept', invitationController.accept);

// Protected routes (authentication required)
router.use(authenticate);

// Get all invitations for current organization
router.get('/', invitationController.getAll);

// Create new invitation (admin only)
router.post('/', requireAdmin, invitationController.create);

// Cancel invitation (admin only)
router.delete('/:id', requireAdmin, invitationController.cancel);

// Resend invitation (admin only)
router.post('/:id/resend', requireAdmin, invitationController.resend);

module.exports = router;
