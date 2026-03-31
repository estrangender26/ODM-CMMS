/**
 * Subscription Controller
 * 
 * Handles subscription management endpoints for organizations.
 */

const subscriptionService = require('../services/subscription.service');
const pool = require('../config/database');

class SubscriptionController {
  /**
   * Get available subscription plans
   * GET /api/subscriptions/plans
   */
  async getPlans(req, res, next) {
    try {
      const includePrivate = req.user?.role === 'superadmin';
      const plans = await subscriptionService.getPlans(includePrivate);
      
      res.json({
        success: true,
        data: { plans }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current organization's subscription
   * GET /api/subscriptions/current
   */
  async getCurrentSubscription(req, res, next) {
    try {
      const organizationId = req.user?.organization_id;
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'User must belong to an organization'
        });
      }

      const billing = await subscriptionService.getBillingInfo(organizationId);
      const seats = await subscriptionService.getSeatUsage(organizationId);
      
      if (!billing) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found for this organization'
        });
      }

      res.json({
        success: true,
        data: {
          subscription: billing,
          seats
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get seat usage for current organization
   * GET /api/subscriptions/seats
   */
  async getSeatUsage(req, res, next) {
    try {
      const organizationId = req.user?.organization_id;
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'User must belong to an organization'
        });
      }

      const usage = await subscriptionService.getSeatUsage(organizationId);
      
      if (!usage) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      res.json({
        success: true,
        data: usage
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change subscription plan (admin only)
   * PUT /api/subscriptions/plan
   */
  async changePlan(req, res, next) {
    try {
      const organizationId = req.user?.organization_id;
      const { planId, billingCycle } = req.body;
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'User must belong to an organization'
        });
      }

      if (!planId) {
        return res.status(400).json({
          success: false,
          message: 'Plan ID is required'
        });
      }

      const billing = await subscriptionService.changePlan(organizationId, planId, {
        billingCycle: billingCycle || 'monthly'
      });

      res.json({
        success: true,
        message: 'Plan updated successfully',
        data: { subscription: billing }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Add extra users to subscription (admin only)
   * PUT /api/subscriptions/extra-users
   */
  async setExtraUsers(req, res, next) {
    try {
      const organizationId = req.user?.organization_id;
      const { extraUsers } = req.body;
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'User must belong to an organization'
        });
      }

      if (extraUsers === undefined || extraUsers === null) {
        return res.status(400).json({
          success: false,
          message: 'extraUsers is required'
        });
      }

      const billing = await subscriptionService.setExtraUsers(organizationId, extraUsers);

      res.json({
        success: true,
        message: 'Extra users updated successfully',
        data: { subscription: billing }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel subscription (admin only)
   * POST /api/subscriptions/cancel
   */
  async cancelSubscription(req, res, next) {
    try {
      const organizationId = req.user?.organization_id;
      const { reason } = req.body;
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'User must belong to an organization'
        });
      }

      // Get current subscription
      const billing = await subscriptionService.getBillingInfo(organizationId);
      
      if (!billing) {
        return res.status(404).json({
          success: false,
          message: 'Subscription not found'
        });
      }

      // Mark for cancellation at period end
      await pool.execute(
        `UPDATE organization_subscriptions 
         SET cancel_at_period_end = TRUE, 
             cancellation_reason = ?,
             cancelled_at = NOW(),
             updated_at = NOW()
         WHERE organization_id = ?`,
        [reason || null, organizationId]
      );

      res.json({
        success: true,
        message: 'Subscription will be cancelled at the end of the current billing period',
        data: {
          currentPeriodEnd: billing.currentPeriodEnd,
          cancelAtPeriodEnd: true
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reactivate cancelled subscription (admin only)
   * POST /api/subscriptions/reactivate
   */
  async reactivateSubscription(req, res, next) {
    try {
      const organizationId = req.user?.organization_id;
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'User must belong to an organization'
        });
      }

      await pool.execute(
        `UPDATE organization_subscriptions 
         SET cancel_at_period_end = FALSE, 
             cancelled_at = NULL,
             cancellation_reason = NULL,
             status = 'active',
             updated_at = NOW()
         WHERE organization_id = ?`,
        [organizationId]
      );

      const billing = await subscriptionService.getBillingInfo(organizationId);

      res.json({
        success: true,
        message: 'Subscription reactivated successfully',
        data: { subscription: billing }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Get subscription for any organization
   * GET /api/admin/organizations/:id/subscription
   */
  async getOrganizationSubscription(req, res, next) {
    try {
      const organizationId = req.params.id;

      const [org] = await pool.execute(
        'SELECT id, name FROM organizations WHERE id = ?',
        [organizationId]
      );

      if (!org[0]) {
        return res.status(404).json({
          success: false,
          message: 'Organization not found'
        });
      }

      const billing = await subscriptionService.getBillingInfo(organizationId);
      const seats = await subscriptionService.getSeatUsage(organizationId);

      res.json({
        success: true,
        data: {
          organization: org[0],
          subscription: billing,
          seats
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Update subscription for any organization
   * PUT /api/admin/organizations/:id/subscription
   */
  async updateOrganizationSubscription(req, res, next) {
    try {
      const organizationId = req.params.id;
      const { planId, extraUsers, status } = req.body;

      if (planId) {
        await subscriptionService.changePlan(organizationId, planId);
      }

      if (extraUsers !== undefined) {
        await subscriptionService.setExtraUsers(organizationId, extraUsers);
      }

      if (status) {
        await pool.execute(
          `UPDATE organization_subscriptions 
           SET status = ?, updated_at = NOW()
           WHERE organization_id = ?`,
          [status, organizationId]
        );
      }

      const billing = await subscriptionService.getBillingInfo(organizationId);
      const seats = await subscriptionService.getSeatUsage(organizationId);

      res.json({
        success: true,
        message: 'Subscription updated successfully',
        data: {
          subscription: billing,
          seats
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SubscriptionController();
