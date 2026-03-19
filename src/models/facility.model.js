/**
 * Facility Model
 */

const BaseModel = require('./base.model');

class FacilityModel extends BaseModel {
  constructor() {
    super('facilities');
  }

  /**
   * Get all facilities with manager info
   * @returns {Promise<Array>}
   */
  async getAllWithManager() {
    const sql = `
      SELECT f.*, u.full_name as manager_name, u.email as manager_email
      FROM ${this.tableName} f
      LEFT JOIN users u ON f.manager_id = u.id
      ORDER BY f.name
    `;
    return this.query(sql);
  }

  /**
   * Find facility by code
   * @param {string} code
   * @returns {Promise<Object|null>}
   */
  async findByCode(code) {
    return this.findByField('code', code);
  }

  /**
   * Get facility with equipment count
   * @param {number} facilityId
   * @returns {Promise<Object|null>}
   */
  async getWithStats(facilityId) {
    const sql = `
      SELECT f.*, 
        COUNT(e.id) as equipment_count,
        SUM(CASE WHEN e.status = 'operational' THEN 1 ELSE 0 END) as operational_count,
        SUM(CASE WHEN e.status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_count
      FROM ${this.tableName} f
      LEFT JOIN equipment e ON f.id = e.facility_id
      WHERE f.id = ?
      GROUP BY f.id
    `;
    const [result] = await this.query(sql, [facilityId]);
    return result || null;
  }
}

module.exports = new FacilityModel();
