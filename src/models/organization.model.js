/**
 * Organization Model
 * Multi-tenant organization management
 */

const BaseModel = require('./base.model');

class OrganizationModel extends BaseModel {
  constructor() {
    super('organizations');
  }

  /**
   * Find organization by name
   * @param {string} name
   * @returns {Promise<Object|null>}
   */
  async findByName(name) {
    const sql = `SELECT * FROM ${this.tableName} WHERE organization_name = ?`;
    const [result] = await this.query(sql, [name]);
    return result || null;
  }

  /**
   * Find organization by ID with subscription info
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findByIdWithStats(id) {
    const sql = `
      SELECT o.*,
        (SELECT COUNT(*) FROM users WHERE organization_id = o.id AND is_active = TRUE) as user_count,
        (SELECT COUNT(*) FROM facilities WHERE organization_id = o.id) as facility_count,
        (SELECT COUNT(*) FROM equipment WHERE organization_id = o.id) as equipment_count
      FROM ${this.tableName} o
      WHERE o.id = ?
    `;
    const [result] = await this.query(sql, [id]);
    return result || null;
  }

  /**
   * Get organization subscription info
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async getSubscriptionInfo(id) {
    const sql = `
      SELECT id, organization_name, subscription_plan, subscription_status,
             max_users, max_facilities, max_equipment,
             billing_email, billing_address,
             created_at, updated_at
      FROM ${this.tableName}
      WHERE id = ?
    `;
    const [result] = await this.query(sql, [id]);
    return result || null;
  }

  /**
   * Check if organization is active
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async isActive(id) {
    const sql = `
      SELECT COUNT(*) as count 
      FROM ${this.tableName} 
      WHERE id = ? AND subscription_status = 'active'
    `;
    const [result] = await this.query(sql, [id]);
    return result.count > 0;
  }

  /**
   * Get all organizations with stats
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  async getAllWithStats(filters = {}) {
    let sql = `
      SELECT o.*,
        (SELECT COUNT(*) FROM users WHERE organization_id = o.id AND is_active = TRUE) as user_count,
        (SELECT COUNT(*) FROM facilities WHERE organization_id = o.id) as facility_count,
        (SELECT COUNT(*) FROM equipment WHERE organization_id = o.id) as equipment_count
      FROM ${this.tableName} o
    `;
    
    const params = [];
    const conditions = [];

    if (filters.subscription_status) {
      conditions.push('o.subscription_status = ?');
      params.push(filters.subscription_status);
    }
    if (filters.subscription_plan) {
      conditions.push('o.subscription_plan = ?');
      params.push(filters.subscription_plan);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY o.created_at DESC`;
    return this.query(sql, params);
  }

  /**
   * Update subscription status
   * @param {number} id
   * @param {string} status
   * @returns {Promise<Object>}
   */
  async updateSubscriptionStatus(id, status) {
    return this.update(id, { subscription_status: status });
  }

  /**
   * Update subscription plan
   * @param {number} id
   * @param {string} plan
   * @param {Object} limits
   * @returns {Promise<Object>}
   */
  async updateSubscriptionPlan(id, plan, limits = {}) {
    const data = { subscription_plan: plan };
    if (limits.max_users) data.max_users = limits.max_users;
    if (limits.max_facilities) data.max_facilities = limits.max_facilities;
    if (limits.max_equipment) data.max_equipment = limits.max_equipment;
    return this.update(id, data);
  }

  /**
   * Check if organization has reached user limit
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async hasReachedUserLimit(id) {
    const sql = `
      SELECT o.max_users, COUNT(u.id) as user_count
      FROM ${this.tableName} o
      LEFT JOIN users u ON o.id = u.organization_id AND u.is_active = TRUE
      WHERE o.id = ?
      GROUP BY o.id
    `;
    const [result] = await this.query(sql, [id]);
    if (!result) return true;
    return result.user_count >= result.max_users;
  }

  /**
   * Check if organization has reached facility limit
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async hasReachedFacilityLimit(id) {
    const sql = `
      SELECT o.max_facilities, COUNT(f.id) as facility_count
      FROM ${this.tableName} o
      LEFT JOIN facilities f ON o.id = f.organization_id
      WHERE o.id = ?
      GROUP BY o.id
    `;
    const [result] = await this.query(sql, [id]);
    if (!result) return true;
    return result.facility_count >= result.max_facilities;
  }

  /**
   * Check if organization has reached equipment limit
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async hasReachedEquipmentLimit(id) {
    const sql = `
      SELECT o.max_equipment, COUNT(e.id) as equipment_count
      FROM ${this.tableName} o
      LEFT JOIN equipment e ON o.id = e.organization_id
      WHERE o.id = ?
      GROUP BY o.id
    `;
    const [result] = await this.query(sql, [id]);
    if (!result) return true;
    return result.equipment_count >= result.max_equipment;
  }

  /**
   * Get organization usage stats
   * @param {number} id
   * @returns {Promise<Object>}
   */
  async getUsageStats(id) {
    const sql = `
      SELECT 
        o.max_users,
        o.max_facilities,
        o.max_equipment,
        COUNT(DISTINCT u.id) as user_count,
        COUNT(DISTINCT f.id) as facility_count,
        COUNT(DISTINCT e.id) as equipment_count,
        COUNT(DISTINCT wo.id) as work_order_count,
        COUNT(DISTINCT s.id) as schedule_count
      FROM ${this.tableName} o
      LEFT JOIN users u ON o.id = u.organization_id AND u.is_active = TRUE
      LEFT JOIN facilities f ON o.id = f.organization_id
      LEFT JOIN equipment e ON o.id = e.organization_id
      LEFT JOIN work_orders wo ON o.id = wo.organization_id
      LEFT JOIN schedules s ON o.id = s.organization_id
      WHERE o.id = ?
      GROUP BY o.id
    `;
    const [result] = await this.query(sql, [id]);
    return result || null;
  }
}

module.exports = new OrganizationModel();
