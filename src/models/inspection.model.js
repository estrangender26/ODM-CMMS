/**
 * Inspection Points and Readings Model
 * Multi-tenant aware inspection management
 */

const BaseModel = require('./base.model');

class InspectionModel extends BaseModel {
  constructor() {
    super('inspection_points');
    this.readingsTable = 'inspection_readings';
  }

  /**
   * Get inspection points for a task (organization-aware)
   * @param {number} taskMasterId
   * @param {number} organizationId
   * @returns {Promise<Array>}
   */
  async getPointsForTask(taskMasterId, organizationId) {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE task_master_id = ? 
      AND organization_id = ?
      AND is_active = TRUE
      ORDER BY sort_order, id
    `;
    return this.query(sql, [taskMasterId, organizationId]);
  }

  /**
   * Create inspection reading (organization-aware)
   * @param {Object} data
   * @param {number} organizationId
   * @returns {Promise<Object>}
   */
  async createReading(data, organizationId) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map(() => '?').join(', ');

    const sql = `INSERT INTO ${this.readingsTable} (organization_id, ${fields.join(', ')}) VALUES (?, ${placeholders})`;
    const result = await this.query(sql, [organizationId, ...values]);

    return this.getReadingById(result.insertId, organizationId);
  }

  /**
   * Get reading by ID (organization-aware)
   * @param {number} readingId
   * @param {number} organizationId
   * @returns {Promise<Object|null>}
   */
  async getReadingById(readingId, organizationId) {
    const sql = `
      SELECT ir.*, ip.point_code, ip.description as point_description,
        ip.input_type, ip.unit_of_measure
      FROM ${this.readingsTable} ir
      JOIN ${this.tableName} ip ON ir.inspection_point_id = ip.id
      WHERE ir.id = ? AND ir.organization_id = ?
    `;
    const [result] = await this.query(sql, [readingId, organizationId]);
    return result || null;
  }

  /**
   * Get readings for work order (organization-aware)
   * @param {number} workOrderId
   * @param {number} organizationId
   * @returns {Promise<Array>}
   */
  async getReadingsForWorkOrder(workOrderId, organizationId) {
    const sql = `
      SELECT ir.*, ip.point_code, ip.description as point_description,
        ip.input_type, ip.unit_of_measure, ip.min_value, ip.max_value,
        ip.expected_value, ip.is_critical
      FROM ${this.readingsTable} ir
      JOIN ${this.tableName} ip ON ir.inspection_point_id = ip.id
      WHERE ir.work_order_id = ? AND ir.organization_id = ?
      ORDER BY ip.sort_order
    `;
    return this.query(sql, [workOrderId, organizationId]);
  }

  /**
   * Get readings statistics for work order (organization-aware)
   * @param {number} workOrderId
   * @param {number} organizationId
   * @returns {Promise<Object>}
   */
  async getReadingsStats(workOrderId, organizationId) {
    const sql = `
      SELECT 
        COUNT(*) as total_points,
        SUM(CASE WHEN ir.id IS NOT NULL THEN 1 ELSE 0 END) as readings_taken,
        SUM(CASE WHEN ir.is_passing = TRUE THEN 1 ELSE 0 END) as passing,
        SUM(CASE WHEN ir.is_passing = FALSE THEN 1 ELSE 0 END) as failing,
        SUM(CASE WHEN ip.is_critical = TRUE AND ir.is_passing = FALSE THEN 1 ELSE 0 END) as critical_failures
      FROM ${this.tableName} ip
      LEFT JOIN ${this.readingsTable} ir ON ip.id = ir.inspection_point_id 
        AND ir.work_order_id = ? AND ir.organization_id = ?
      WHERE ip.task_master_id = (SELECT task_master_id FROM work_orders WHERE id = ? AND organization_id = ?)
        AND ip.organization_id = ?
        AND ip.is_active = TRUE
    `;
    const [result] = await this.query(sql, [workOrderId, organizationId, workOrderId, organizationId, organizationId]);
    return result;
  }

  /**
   * Delete readings for work order (organization-aware)
   * @param {number} workOrderId
   * @param {number} organizationId
   */
  async deleteReadingsForWorkOrder(workOrderId, organizationId) {
    const sql = `DELETE FROM ${this.readingsTable} WHERE work_order_id = ? AND organization_id = ?`;
    return this.query(sql, [workOrderId, organizationId]);
  }

  /**
   * Validate reading against inspection point criteria
   * @param {Object} point
   * @param {*} value
   * @returns {boolean}
   */
  validateReading(point, value) {
    switch (point.input_type) {
      case 'numeric':
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return false;
        if (point.min_value !== null && numValue < point.min_value) return false;
        if (point.max_value !== null && numValue > point.max_value) return false;
        return true;
      
      case 'boolean':
        return typeof value === 'boolean' || value === 'true' || value === 'false' || value === 1 || value === 0;
      
      case 'select':
        if (!point.acceptable_values) return true;
        try {
          const acceptable = JSON.parse(point.acceptable_values);
          return acceptable.includes(value);
        } catch {
          return true;
        }
      
      default:
        return value !== null && value !== undefined && value !== '';
    }
  }

  /**
   * Check if inspection point belongs to organization
   * @param {number} pointId
   * @param {number} organizationId
   * @returns {Promise<boolean>}
   */
  async belongsToOrganization(pointId, organizationId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE id = ? AND organization_id = ?
    `;
    const [result] = await this.query(sql, [pointId, organizationId]);
    return result.count > 0;
  }

  /**
   * Check if reading belongs to organization
   * @param {number} readingId
   * @param {number} organizationId
   * @returns {Promise<boolean>}
   */
  async readingBelongsToOrganization(readingId, organizationId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM ${this.readingsTable}
      WHERE id = ? AND organization_id = ?
    `;
    const [result] = await this.query(sql, [readingId, organizationId]);
    return result.count > 0;
  }

  /**
   * Get inspection points by organization
   * @param {number} organizationId
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  async getByOrganization(organizationId, filters = {}) {
    const filterConditions = { organization_id: organizationId };
    
    if (filters.is_active !== undefined) {
      filterConditions.is_active = filters.is_active;
    }
    if (filters.task_master_id) {
      filterConditions.task_master_id = filters.task_master_id;
    }

    return this.findAll(filterConditions, {
      orderBy: filters.orderBy || 'sort_order'
    });
  }

  /**
   * Get readings by organization
   * @param {number} organizationId
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  async getReadingsByOrganization(organizationId, filters = {}) {
    let sql = `
      SELECT ir.*, ip.point_code, ip.description as point_description
      FROM ${this.readingsTable} ir
      JOIN ${this.tableName} ip ON ir.inspection_point_id = ip.id
      WHERE ir.organization_id = ?
    `;
    const params = [organizationId];

    if (filters.work_order_id) {
      sql += ' AND ir.work_order_id = ?';
      params.push(filters.work_order_id);
    }
    if (filters.taken_by) {
      sql += ' AND ir.taken_by = ?';
      params.push(filters.taken_by);
    }
    if (filters.equipment_id) {
      sql += ' AND ir.equipment_id = ?';
      params.push(filters.equipment_id);
    }

    sql += ' ORDER BY ir.taken_at DESC';

    return this.query(sql, params);
  }

  /**
   * Count inspection points by organization
   * @param {number} organizationId
   * @param {Object} filters
   * @returns {Promise<number>}
   */
  async countByOrganization(organizationId, filters = {}) {
    const filterConditions = { organization_id: organizationId };
    
    if (filters.is_active !== undefined) {
      filterConditions.is_active = filters.is_active;
    }

    return this.count(filterConditions);
  }
}

module.exports = new InspectionModel();
