/**
 * Subscription Plan Model
 * Defines available subscription tiers and pricing
 */

const BaseModel = require('./base.model');

class SubscriptionPlanModel extends BaseModel {
  constructor() {
    super('subscription_plans');
  }

  /**
   * Get all active public plans for pricing page
   */
  async getPublicPlans() {
    return this.findAll(
      { is_active: true, is_public: true },
      { orderBy: 'sort_order', order: 'asc' }
    );
  }

  /**
   * Get plan by code
   */
  async findByCode(planCode) {
    return this.findByField('plan_code', planCode);
  }

  /**
   * Get plan with feature details
   */
  async getWithFeatures(planId) {
    const plan = await this.findById(planId);
    if (!plan) return null;

    return {
      ...plan,
      features: this.parseFeatures(plan.features)
    };
  }

  /**
   * Parse features JSON
   */
  parseFeatures(featuresJson) {
    try {
      return featuresJson ? JSON.parse(featuresJson) : [];
    } catch {
      return [];
    }
  }

  /**
   * Check if plan allows unlimited users
   */
  hasUnlimitedUsers(planId) {
    return this.findById(planId).then(plan => plan && plan.max_users === null);
  }

  /**
   * Calculate price for a given number of users
   */
  calculatePrice(planId, totalUsers) {
    return this.findById(planId).then(plan => {
      if (!plan) return null;

      const includedUsers = plan.included_users;
      const extraUsers = Math.max(0, totalUsers - includedUsers);
      const additionalCost = extraUsers * plan.price_per_additional_user;
      const totalPrice = plan.base_price + additionalCost;

      return {
        base_price: plan.base_price,
        included_users: includedUsers,
        extra_users: extraUsers,
        price_per_additional_user: plan.price_per_additional_user,
        total_price: totalPrice,
        is_unlimited: plan.max_users === null
      };
    });
  }
}

module.exports = new SubscriptionPlanModel();
