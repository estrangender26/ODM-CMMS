/**
 * Subscription Routes
 * Organization subscription management and billing
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const subscriptionController = require('../controllers/subscription.controller');

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/subscriptions/current
 * @desc    Get current organization's subscription
 * @access  Private
 */
router.get('/current', subscriptionController.getCurrentSubscription);

/**
 * @route   GET /api/subscriptions/plans
 * @desc    Get available subscription plans
 * @access  Private
 */
router.get('/plans', subscriptionController.getPlans);

/**
 * @route   GET /api/subscriptions/seats
 * @desc    Get seat usage
 * @access  Private
 */
router.get('/seats', subscriptionController.getSeatUsage);

/**
 * @route   PUT /api/subscriptions/plan
 * @desc    Change subscription plan
 * @access  Private (Organization Admin)
 */
router.put('/plan', subscriptionController.changePlan);

/**
 * @route   PUT /api/subscriptions/extra-users
 * @desc    Set extra users count
 * @access  Private (Organization Admin)
 */
router.put('/extra-users', subscriptionController.setExtraUsers);

/**
 * @route   POST /api/subscriptions/cancel
 * @desc    Cancel subscription
 * @access  Private (Organization Admin)
 */
router.post('/cancel', subscriptionController.cancelSubscription);

/**
 * @route   POST /api/subscriptions/reactivate
 * @desc    Reactivate cancelled subscription
 * @access  Private (Organization Admin)
 */
router.post('/reactivate', subscriptionController.reactivateSubscription);

// Admin-only routes

/**
 * @route   GET /api/subscriptions/admin/organizations/:id
 * @desc    Get subscription for any organization (admin only)
 * @access  Private (Admin)
 */
router.get('/admin/organizations/:id', requireAdmin, subscriptionController.getOrganizationSubscription);

/**
 * @route   PUT /api/subscriptions/admin/organizations/:id
 * @desc    Update subscription for any organization (admin only)
 * @access  Private (Admin)
 */
router.put('/admin/organizations/:id', requireAdmin, subscriptionController.updateOrganizationSubscription);

module.exports = router;
