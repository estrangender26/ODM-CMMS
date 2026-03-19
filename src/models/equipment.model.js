/**
 * Equipment Model
 */

const BaseModel = require('./base.model');

class EquipmentModel extends BaseModel {
  constructor() {
    super('equipment');
  }

  /**
   * Get all equipment with facility info
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  async getAllWithFacility(filters = {}) {
    let sql = `
      SELECT e.*, f.name as facility_name, f.code as facility_code,
        u.full_name as created_by_name
      FROM ${this.tableName} e
      JOIN facilities f ON e.facility_id = f.id
      LEFT JOIN users u ON e.created_by = u.id
    `;
    
    const params = [];
    const conditions = [];

    if (filters.facility_id) {
      conditions.push('e.facility_id = ?');
      params.push(filters.facility_id);
    }
    if (filters.status) {
      conditions.push('e.status = ?');
      params.push(filters.status);
    }
    if (filters.category) {
      conditions.push('e.category = ?');
      params.push(filters.category);
    }
    if (filters.criticality) {
      conditions.push('e.criticality = ?');
      params.push(filters.criticality);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY e.code`;

    return this.query(sql, params);
  }

  /**
   * Find equipment by code
   * @param {string} code
   * @returns {Promise<Object|null>}
   */
  async findByCode(code) {
    return this.findByField('code', code);
  }

  /**
   * Get equipment with full details
   * @param {number} equipmentId
   * @returns {Promise<Object|null>}
   */
  async getWithDetails(equipmentId) {
    const sql = `
      SELECT e.*, 
        f.name as facility_name, f.code as facility_code,
        u.full_name as created_by_name
      FROM ${this.tableName} e
      JOIN facilities f ON e.facility_id = f.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = ?
    `;
    const [result] = await this.query(sql, [equipmentId]);
    return result || null;
  }

  /**
   * Get equipment categories
   * @returns {Promise<Array>}
   */
  async getCategories() {
    const sql = `
      SELECT DISTINCT category, COUNT(*) as count
      FROM ${this.tableName}
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY category
    `;
    return this.query(sql);
  }

  /**
   * Get equipment statistics
   * @returns {Promise<Object>}
   */
  async getStats() {
    const sql = `
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN status = 'operational' THEN 1 ELSE 0 END), 0) as operational,
        COALESCE(SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END), 0) as maintenance,
        COALESCE(SUM(CASE WHEN status = 'out_of_order' THEN 1 ELSE 0 END), 0) as out_of_order,
        COALESCE(SUM(CASE WHEN criticality = 'critical' THEN 1 ELSE 0 END), 0) as critical_count
      FROM ${this.tableName}
    `;
    const [result] = await this.query(sql);
    return result;
  }

  /**
   * Get equipment statistics by facility
   * @param {number} facilityId
   * @returns {Promise<Object>}
   */
  async getStatsByFacility(facilityId) {
    const sql = `
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN status = 'operational' THEN 1 ELSE 0 END), 0) as operational,
        COALESCE(SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END), 0) as maintenance,
        COALESCE(SUM(CASE WHEN status = 'out_of_order' THEN 1 ELSE 0 END), 0) as out_of_order,
        COALESCE(SUM(CASE WHEN criticality = 'critical' THEN 1 ELSE 0 END), 0) as critical_count
      FROM ${this.tableName}
      WHERE facility_id = ?
    `;
    const [result] = await this.query(sql, [facilityId]);
    return result;
  }

  /**
   * Search equipment
   * @param {string} searchTerm
   * @returns {Promise<Array>}
   */
  async search(searchTerm) {
    const sql = `
      SELECT e.*, f.name as facility_name
      FROM ${this.tableName} e
      JOIN facilities f ON e.facility_id = f.id
      WHERE e.name LIKE ? OR e.code LIKE ? OR e.description LIKE ?
      ORDER BY e.code
    `;
    const likeTerm = `%${searchTerm}%`;
    return this.query(sql, [likeTerm, likeTerm, likeTerm]);
  }

  /**
   * Check if equipment belongs to facility
   * @param {number} equipmentId
   * @param {number} facilityId
   * @returns {Promise<boolean>}
   */
  async belongsToFacility(equipmentId, facilityId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE id = ? AND facility_id = ?
    `;
    const [result] = await this.query(sql, [equipmentId, facilityId]);
    return result.count > 0;
  }
}

module.exports = new EquipmentModel();
