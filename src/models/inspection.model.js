/**
 * Inspection Points and Readings Model
 */

const BaseModel = require('./base.model');

class InspectionModel extends BaseModel {
  constructor() {
    super('inspection_points');
    this.readingsTable = 'inspection_readings';
  }

  /**
   * Get inspection points for a task
   * @param {number} taskMasterId
   * @returns {Promise<Array>}
   */
  async getPointsForTask(taskMasterId) {
    const sql = `
      SELECT * FROM ${this.tableName}
      WHERE task_master_id = ? AND is_active = TRUE
      ORDER BY sort_order, id
    `;
    return this.query(sql, [taskMasterId]);
  }

  /**
   * Create inspection reading
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createReading(data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map(() => '?').join(', ');

    const sql = `INSERT INTO ${this.readingsTable} (${fields.join(', ')}) VALUES (${placeholders})`;
    const result = await this.query(sql, values);

    return this.getReadingById(result.insertId);
  }

  /**
   * Get reading by ID
   * @param {number} readingId
   * @returns {Promise<Object|null>}
   */
  async getReadingById(readingId) {
    const sql = `
      SELECT ir.*, ip.point_code, ip.description as point_description,
        ip.input_type, ip.unit_of_measure
      FROM ${this.readingsTable} ir
      JOIN ${this.tableName} ip ON ir.inspection_point_id = ip.id
      WHERE ir.id = ?
    `;
    const [result] = await this.query(sql, [readingId]);
    return result || null;
  }

  /**
   * Get readings for work order
   * @param {number} workOrderId
   * @returns {Promise<Array>}
   */
  async getReadingsForWorkOrder(workOrderId) {
    const sql = `
      SELECT ir.*, ip.point_code, ip.description as point_description,
        ip.input_type, ip.unit_of_measure, ip.min_value, ip.max_value,
        ip.expected_value, ip.is_critical
      FROM ${this.readingsTable} ir
      JOIN ${this.tableName} ip ON ir.inspection_point_id = ip.id
      WHERE ir.work_order_id = ?
      ORDER BY ip.sort_order
    `;
    return this.query(sql, [workOrderId]);
  }

  /**
   * Get readings statistics for work order
   * @param {number} workOrderId
   * @returns {Promise<Object>}
   */
  async getReadingsStats(workOrderId) {
    const sql = `
      SELECT 
        COUNT(*) as total_points,
        SUM(CASE WHEN ir.id IS NOT NULL THEN 1 ELSE 0 END) as readings_taken,
        SUM(CASE WHEN ir.is_passing = TRUE THEN 1 ELSE 0 END) as passing,
        SUM(CASE WHEN ir.is_passing = FALSE THEN 1 ELSE 0 END) as failing,
        SUM(CASE WHEN ip.is_critical = TRUE AND ir.is_passing = FALSE THEN 1 ELSE 0 END) as critical_failures
      FROM ${this.tableName} ip
      LEFT JOIN ${this.readingsTable} ir ON ip.id = ir.inspection_point_id AND ir.work_order_id = ?
      WHERE ip.task_master_id = (SELECT task_master_id FROM work_orders WHERE id = ?)
        AND ip.is_active = TRUE
    `;
    const [result] = await this.query(sql, [workOrderId, workOrderId]);
    return result;
  }

  /**
   * Delete readings for work order
   * @param {number} workOrderId
   */
  async deleteReadingsForWorkOrder(workOrderId) {
    const sql = `DELETE FROM ${this.readingsTable} WHERE work_order_id = ?`;
    return this.query(sql, [workOrderId]);
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
}

module.exports = new InspectionModel();
