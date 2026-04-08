/**
 * Organization Routes
 * Multi-tenant organization management endpoints
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const { resolveOrganization } = require('../middleware/tenant');
const organizationController = require('../controllers/organization.controller');

// Public route - get organizations for signup
router.get('/public', organizationController.getPublicOrganizations);

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/organizations
 * @desc    Get all organizations (system admin only)
 * @access  Private (Admin)
 */
router.get('/', requireAdmin, organizationController.getAll);

/**
 * @route   POST /api/organizations
 * @desc    Create new organization (system admin only)
 * @access  Private (Admin)
 */
router.post('/', requireAdmin, organizationController.create);

/**
 * @route   GET /api/organizations/my
 * @desc    Get current user's organization
 * @access  Private
 */
router.get('/my', resolveOrganization, organizationController.getMyOrganization);

/**
 * @route   GET /api/organizations/:id
 * @desc    Get organization by ID
 * @access  Private (Own org or System Admin)
 */
router.get('/:id', resolveOrganization, organizationController.getById);

/**
 * @route   PUT /api/organizations/:id
 * @desc    Update organization
 * @access  Private (Own org admin or System Admin)
 */
router.put('/:id', resolveOrganization, organizationController.update);

/**
 * @route   PUT /api/organizations/:id/subscription
 * @desc    Update organization subscription (system admin only)
 * @access  Private (Admin)
 */
router.put('/:id/subscription', requireAdmin, organizationController.updateSubscription);

/**
 * @route   GET /api/organizations/:id/stats
 * @desc    Get organization usage stats
 * @access  Private (Own org or System Admin)
 */
router.get('/:id/stats', resolveOrganization, organizationController.getUsageStats);

/**
 * @route   DELETE /api/organizations/:id
 * @desc    Delete organization (system admin only)
 * @access  Private (Admin)
 */
router.delete('/:id', requireAdmin, organizationController.remove);

/**
 * @route   POST /api/organizations/logo
 * @desc    Upload organization logo (paid plans only)
 * @access  Private (Org Admin)
 */
router.post('/logo', resolveOrganization, organizationController.uploadLogo);

module.exports = router;
