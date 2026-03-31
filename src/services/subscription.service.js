/**
 * Subscription Service
 * 
 * Handles subscription management, seat tracking, and billing calculations.
 */

const { pool } = require('../config/database');

class SubscriptionService {
  /**
   * Get billing information for an organization
   * @param {number} organizationId
   * @returns {Object|null} Billing details
   */
  async getBillingInfo(organizationId) {
    const [rows] = await pool.execute(
      `SELECT os.*, sp.plan_name, sp.plan_code, sp.description
       FROM organization_subscriptions os
       JOIN subscription_plans sp ON os.plan_id = sp.id
       WHERE os.organization_id = ?`,
      [organizationId]
    );
    
    if (!rows[0]) return null;
    
    const sub = rows[0];
    const basePrice = parseFloat(sub.base_price);
    const extraUsers = sub.extra_users || 0;
    const pricePerExtra = parseFloat(sub.price_per_additional_user);
    const extraCost = extraUsers * pricePerExtra;
    
    return {
      subscriptionId: sub.id,
      organizationId: sub.organization_id,
      plan: {
        id: sub.plan_id,
        code: sub.plan_code,
        name: sub.plan_name,
        description: sub.description
      },
      basePrice,
      extraUsersCost: extraCost,
      totalMonthlyCost: basePrice + extraCost,
      includedUsers: sub.included_users,
      extraUsers,
      totalAllowedUsers: sub.included_users + extraUsers,
      maxUsers: sub.max_users,
      status: sub.status,
      billingCycle: sub.billing_cycle,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      cancelledAt: sub.cancelled_at
    };
  }

  /**
   * Get current seat usage for an organization
   * @param {number} organizationId
   * @returns {Object} Seat usage details
   */
  async getSeatUsage(organizationId) {
    const [rows] = await pool.execute(
      `SELECT os.*, sp.plan_name, sp.plan_code, sp.max_users as plan_max_users
       FROM organization_subscriptions os
       JOIN subscription_plans sp ON os.plan_id = sp.id
       WHERE os.organization_id = ?`,
      [organizationId]
    );
    
    if (!rows[0]) return null;
    
    const subscription = rows[0];
    
    // Count active and invited billable users
    const [result] = await pool.execute(
      `SELECT COUNT(*) as activeBillableUsers 
       FROM users 
       WHERE organization_id = ? 
       AND is_billable = TRUE 
       AND status IN ('active', 'invited')`,
      [organizationId]
    );
    
    const activeUsers = result[0].activeBillableUsers;
    const includedUsers = subscription.included_users;
    const extraUsers = subscription.extra_users || 0;
    const totalAllowed = includedUsers + extraUsers;
    const maxUsers = subscription.plan_max_users || subscription.max_users;
    const availableSeats = Math.max(0, totalAllowed - activeUsers);
    
    // Check if over the hard limit (if max_users is set)
    const overHardLimit = maxUsers !== null && activeUsers > maxUsers;
    
    return {
      organizationId,
      plan: {
        id: subscription.plan_id,
        code: subscription.plan_code,
        name: subscription.plan_name
      },
      includedUsers,
      extraUsers,
      totalAllowedUsers: totalAllowed,
      maxUsers,
      activeUsers,
      availableSeats,
      overHardLimit,
      isFull: availableSeats === 0
    };
  }

  /**
   * Check if organization can add a new user
   * @param {number} organizationId
   * @returns {boolean}
   */
  async canAddUser(organizationId) {
    const usage = await this.getSeatUsage(organizationId);
    if (!usage) return false;
    
    // Can add if there are available seats and not over hard limit
    return usage.availableSeats > 0 && !usage.overHardLimit;
  }

  /**
   * Get available seats count
   * @param {number} organizationId
   * @returns {number}
   */
  async getAvailableSeats(organizationId) {
    const usage = await this.getSeatUsage(organizationId);
    return usage ? usage.availableSeats : 0;
  }

  /**
   * Recalculate and update seat usage
   * @param {number} organizationId
   */
  async recalculateSeats(organizationId) {
    const [result] = await pool.execute(
      `SELECT COUNT(*) as count 
       FROM users 
       WHERE organization_id = ? 
       AND is_billable = TRUE 
       AND status IN ('active', 'invited')`,
      [organizationId]
    );
    
    const seatsUsed = result[0].count;
    
    // Get total allowed
    const [subRows] = await pool.execute(
      `SELECT included_users, extra_users FROM organization_subscriptions WHERE organization_id = ?`,
      [organizationId]
    );
    
    if (!subRows[0]) return;
    
    const totalAllowed = subRows[0].included_users + (subRows[0].extra_users || 0);
    const seatsAvailable = Math.max(0, totalAllowed - seatsUsed);
    
    await pool.execute(
      `UPDATE organization_subscriptions 
       SET seats_used = ?, seats_available = ?, updated_at = NOW()
       WHERE organization_id = ?`,
      [seatsUsed, seatsAvailable, organizationId]
    );
    
    return { seatsUsed, seatsAvailable };
  }

  /**
   * Change organization plan
   * @param {number} organizationId
   * @param {number} planId
   * @param {Object} options
   */
  async changePlan(organizationId, planId, options = {}) {
    const [planRows] = await pool.execute(
      'SELECT * FROM subscription_plans WHERE id = ? AND is_active = TRUE',
      [planId]
    );
    
    if (!planRows[0]) {
      throw new Error('Plan not found or inactive');
    }
    
    const plan = planRows[0];
    
    await pool.execute(
      `UPDATE organization_subscriptions 
       SET plan_id = ?,
           included_users = ?,
           max_users = ?,
           base_price = ?,
           price_per_additional_user = ?,
           billing_cycle = ?,
           updated_at = NOW()
       WHERE organization_id = ?`,
      [
        planId,
        plan.included_users,
        plan.max_users,
        plan.base_price,
        plan.price_per_additional_user,
        options.billingCycle || 'monthly',
        organizationId
      ]
    );
    
    // Recalculate seats with new limits
    await this.recalculateSeats(organizationId);
    
    return this.getBillingInfo(organizationId);
  }

  /**
   * Add or update extra users
   * @param {number} organizationId
   * @param {number} extraUsers
   */
  async setExtraUsers(organizationId, extraUsers) {
    const parsedExtraUsers = Math.max(0, parseInt(extraUsers) || 0);
    
    await pool.execute(
      `UPDATE organization_subscriptions 
       SET extra_users = ?, updated_at = NOW()
       WHERE organization_id = ?`,
      [parsedExtraUsers, organizationId]
    );
    
    await this.recalculateSeats(organizationId);
    
    return this.getBillingInfo(organizationId);
  }

  /**
   * Activate a user (set status to active)
   * @param {number} organizationId
   * @param {number} userId
   * @returns {boolean}
   */
  async activateUser(organizationId, userId) {
    const canAdd = await this.canAddUser(organizationId);
    if (!canAdd) {
      return false;
    }
    
    await pool.execute(
      `UPDATE users SET status = 'active', updated_at = NOW() WHERE id = ? AND organization_id = ?`,
      [userId, organizationId]
    );
    
    await this.recalculateSeats(organizationId);
    return true;
  }

  /**
   * Suspend a user
   * @param {number} organizationId
   * @param {number} userId
   */
  async suspendUser(organizationId, userId) {
    await pool.execute(
      `UPDATE users SET status = 'suspended', updated_at = NOW() WHERE id = ? AND organization_id = ?`,
      [userId, organizationId]
    );
    
    await this.recalculateSeats(organizationId);
    return true;
  }

  /**
   * Archive a user
   * @param {number} organizationId
   * @param {number} userId
   */
  async archiveUser(organizationId, userId) {
    await pool.execute(
      `UPDATE users SET status = 'archived', is_billable = FALSE, updated_at = NOW() 
       WHERE id = ? AND organization_id = ?`,
      [userId, organizationId]
    );
    
    await this.recalculateSeats(organizationId);
    return true;
  }

  /**
   * Get all available subscription plans
   * @param {boolean} includePrivate
   * @returns {Array}
   */
  async getPlans(includePrivate = false) {
    const query = includePrivate 
      ? 'SELECT * FROM subscription_plans WHERE is_active = TRUE ORDER BY sort_order'
      : 'SELECT * FROM subscription_plans WHERE is_active = TRUE AND is_public = TRUE ORDER BY sort_order';
    
    const [rows] = await pool.execute(query);
    return rows.map(plan => ({
      id: plan.id,
      code: plan.plan_code,
      name: plan.plan_name,
      description: plan.description,
      includedUsers: plan.included_users,
      maxUsers: plan.max_users,
      basePrice: parseFloat(plan.base_price),
      pricePerAdditionalUser: parseFloat(plan.price_per_additional_user),
      features: plan.features ? JSON.parse(plan.features) : [],
      isPublic: plan.is_public === 1
    }));
  }

  /**
   * Get subscription plan by code
   * @param {string} planCode
   * @returns {Object|null}
   */
  async getPlanByCode(planCode) {
    const [rows] = await pool.execute(
      'SELECT * FROM subscription_plans WHERE plan_code = ? AND is_active = TRUE',
      [planCode]
    );
    
    if (!rows[0]) return null;
    
    const plan = rows[0];
    return {
      id: plan.id,
      code: plan.plan_code,
      name: plan.plan_name,
      description: plan.description,
      includedUsers: plan.included_users,
      maxUsers: plan.max_users,
      basePrice: parseFloat(plan.base_price),
      pricePerAdditionalUser: parseFloat(plan.price_per_additional_user),
      features: plan.features ? JSON.parse(plan.features) : [],
      isPublic: plan.is_public === 1
    };
  }

  /**
   * Update user seat status
   * @param {number} userId
   * @param {boolean} isBillable
   */
  async setUserBillable(userId, isBillable) {
    await pool.execute(
      `UPDATE users SET is_billable = ?, updated_at = NOW() WHERE id = ?`,
      [isBillable, userId]
    );
    
    // Get organization_id and recalculate
    const [rows] = await pool.execute(
      'SELECT organization_id FROM users WHERE id = ?',
      [userId]
    );
    
    if (rows[0]) {
      await this.recalculateSeats(rows[0].organization_id);
    }
    
    return true;
  }
}

module.exports = new SubscriptionService();
