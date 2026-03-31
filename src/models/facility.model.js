/**
 * Facility Model
 * Multi-tenant aware facility management
 */

const BaseModel = require('./base.model');

class FacilityModel extends BaseModel {
  constructor() {
    super('facilities');
  }

  /**
   * Get all facilities with manager info (organization-aware)
   * @param {number} organizationId
   * @returns {Promise<Array>}
   */
  async getAllWithManager(organizationId) {
    const sql = `
      SELECT f.*, u.full_name as manager_name, u.email as manager_email
      FROM ${this.tableName} f
      LEFT JOIN users u ON f.manager_id = u.id
      WHERE f.organization_id = ?
      ORDER BY f.name
    `;
    return this.query(sql, [organizationId]);
  }

  /**
   * Find facility by code (organization-aware)
   * @param {string} code
   * @param {number} organizationId
   * @returns {Promise<Object|null>}
   */
  async findByCode(code, organizationId) {
    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE code = ? AND organization_id = ?
    `;
    const [row] = await this.query(sql, [code, organizationId]);
    return row || null;
  }

  /**
   * Get facility with full details and stats (organization-aware)
   * @param {number} facilityId
   * @param {number} organizationId
   * @returns {Promise<Object|null>}
   */
  async getWithStats(facilityId, organizationId) {
    const sql = `
      SELECT f.*, 
        COUNT(e.id) as equipment_count,
        SUM(CASE WHEN e.status = 'operational' THEN 1 ELSE 0 END) as operational_count,
        SUM(CASE WHEN e.status = 'maintenance' THEN 1 ELSE 0 END) as maintenance_count
      FROM ${this.tableName} f
      LEFT JOIN equipment e ON f.id = e.facility_id
      WHERE f.id = ? AND f.organization_id = ?
      GROUP BY f.id
    `;
    const [result] = await this.query(sql, [facilityId, organizationId]);
    return result || null;
  }

  /**
   * Get facilities by organization
   * @param {number} organizationId
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  async getByOrganization(organizationId, filters = {}) {
    const filterConditions = { organization_id: organizationId };
    
    if (filters.status) {
      filterConditions.status = filters.status;
    }

    return this.findAll(filterConditions, { orderBy: filters.orderBy || 'name' });
  }

  /**
   * Check if facility code exists in organization
   * @param {string} code
   * @param {number} organizationId
   * @param {number} excludeFacilityId - Optional facility ID to exclude (for updates)
   * @returns {Promise<boolean>}
   */
  async codeExistsInOrganization(code, organizationId, excludeFacilityId = null) {
    let sql = `
      SELECT COUNT(*) as count 
      FROM ${this.tableName} 
      WHERE code = ? AND organization_id = ?
    `;
    const params = [code, organizationId];
    
    if (excludeFacilityId) {
      sql += ' AND id != ?';
      params.push(excludeFacilityId);
    }
    
    const [result] = await this.query(sql, params);
    return result.count > 0;
  }

  /**
   * Count facilities in organization
   * @param {number} organizationId
   * @param {Object} filters
   * @returns {Promise<number>}
   */
  async countByOrganization(organizationId, filters = {}) {
    const filterConditions = { organization_id: organizationId };
    
    if (filters.status) {
      filterConditions.status = filters.status;
    }

    return this.count(filterConditions);
  }

  /**
   * Get facility statistics for organization
   * @param {number} organizationId
   * @returns {Promise<Object>}
   */
  async getStatsByOrganization(organizationId) {
    const sql = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) as inactive,
        SUM(CASE WHEN status = 'under_maintenance' THEN 1 ELSE 0 END) as under_maintenance
      FROM ${this.tableName}
      WHERE organization_id = ?
    `;
    const [result] = await this.query(sql, [organizationId]);
    return result || { total: 0, active: 0, inactive: 0, under_maintenance: 0 };
  }
}

module.exports = new FacilityModel();
