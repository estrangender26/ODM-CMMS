/**
 * Equipment Model
 * Multi-tenant aware equipment management
 */

const BaseModel = require('./base.model');

class EquipmentModel extends BaseModel {
  constructor() {
    super('equipment');
  }

  /**
   * Get all equipment with facility info (organization-aware)
   * @param {number} organizationId
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  async getAllWithFacility(organizationId, filters = {}) {
    let sql = `
      SELECT e.*, f.name as facility_name, f.code as facility_code,
        u.full_name as created_by_name
      FROM ${this.tableName} e
      JOIN facilities f ON e.facility_id = f.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.organization_id = ?
    `;
    
    const params = [organizationId];
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
      sql += ` AND ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY e.code`;

    return this.query(sql, params);
  }

  /**
   * Find equipment by code (organization-aware)
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
   * Get equipment with full details (organization-aware)
   * @param {number} equipmentId
   * @param {number} organizationId
   * @returns {Promise<Object|null>}
   */
  async getWithDetails(equipmentId, organizationId) {
    const sql = `
      SELECT e.*, 
        f.name as facility_name, f.code as facility_code,
        u.full_name as created_by_name
      FROM ${this.tableName} e
      JOIN facilities f ON e.facility_id = f.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = ? AND e.organization_id = ?
    `;
    const [result] = await this.query(sql, [equipmentId, organizationId]);
    return result || null;
  }

  /**
   * Get equipment categories (organization-aware)
   * @param {number} organizationId
   * @returns {Promise<Array>}
   */
  async getCategories(organizationId) {
    const sql = `
      SELECT DISTINCT category, COUNT(*) as count
      FROM ${this.tableName}
      WHERE organization_id = ? AND category IS NOT NULL
      GROUP BY category
      ORDER BY category
    `;
    return this.query(sql, [organizationId]);
  }

  /**
   * Get equipment statistics (organization-aware)
   * @param {number} organizationId
   * @returns {Promise<Object>}
   */
  async getStats(organizationId) {
    const sql = `
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN status = 'operational' THEN 1 ELSE 0 END), 0) as operational,
        COALESCE(SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END), 0) as maintenance,
        COALESCE(SUM(CASE WHEN status = 'out_of_order' THEN 1 ELSE 0 END), 0) as out_of_order,
        COALESCE(SUM(CASE WHEN criticality = 'critical' THEN 1 ELSE 0 END), 0) as critical_count
      FROM ${this.tableName}
      WHERE organization_id = ?
    `;
    const [result] = await this.query(sql, [organizationId]);
    return result;
  }

  /**
   * Get equipment statistics by facility (organization-aware)
   * @param {number} facilityId
   * @param {number} organizationId
   * @returns {Promise<Object>}
   */
  async getStatsByFacility(facilityId, organizationId) {
    const sql = `
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN status = 'operational' THEN 1 ELSE 0 END), 0) as operational,
        COALESCE(SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END), 0) as maintenance,
        COALESCE(SUM(CASE WHEN status = 'out_of_order' THEN 1 ELSE 0 END), 0) as out_of_order,
        COALESCE(SUM(CASE WHEN criticality = 'critical' THEN 1 ELSE 0 END), 0) as critical_count
      FROM ${this.tableName}
      WHERE facility_id = ? AND organization_id = ?
    `;
    const [result] = await this.query(sql, [facilityId, organizationId]);
    return result;
  }

  /**
   * Search equipment (organization-aware)
   * @param {string} searchTerm
   * @param {number} organizationId
   * @returns {Promise<Array>}
   */
  async search(searchTerm, organizationId) {
    const sql = `
      SELECT e.*, f.name as facility_name
      FROM ${this.tableName} e
      JOIN facilities f ON e.facility_id = f.id
      WHERE e.organization_id = ?
      AND (e.name LIKE ? OR e.code LIKE ? OR e.description LIKE ?)
      ORDER BY e.code
    `;
    const likeTerm = `%${searchTerm}%`;
    return this.query(sql, [organizationId, likeTerm, likeTerm, likeTerm]);
  }

  /**
   * Check if equipment belongs to organization
   * @param {number} equipmentId
   * @param {number} organizationId
   * @returns {Promise<boolean>}
   */
  async belongsToOrganization(equipmentId, organizationId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE id = ? AND organization_id = ?
    `;
    const [result] = await this.query(sql, [equipmentId, organizationId]);
    return result.count > 0;
  }

  /**
   * Check if equipment belongs to facility (organization-aware)
   * @param {number} equipmentId
   * @param {number} facilityId
   * @param {number} organizationId
   * @returns {Promise<boolean>}
   */
  async belongsToFacility(equipmentId, facilityId, organizationId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE id = ? AND facility_id = ? AND organization_id = ?
    `;
    const [result] = await this.query(sql, [equipmentId, facilityId, organizationId]);
    return result.count > 0;
  }

  /**
   * Check if equipment code exists in organization
   * @param {string} code
   * @param {number} organizationId
   * @param {number} excludeEquipmentId - Optional equipment ID to exclude (for updates)
   * @returns {Promise<boolean>}
   */
  async codeExistsInOrganization(code, organizationId, excludeEquipmentId = null) {
    let sql = `
      SELECT COUNT(*) as count 
      FROM ${this.tableName} 
      WHERE code = ? AND organization_id = ?
    `;
    const params = [code, organizationId];
    
    if (excludeEquipmentId) {
      sql += ' AND id != ?';
      params.push(excludeEquipmentId);
    }
    
    const [result] = await this.query(sql, params);
    return result.count > 0;
  }

  /**
   * Get equipment by organization with pagination
   * @param {number} organizationId
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async getByOrganization(organizationId, options = {}) {
    const filterConditions = { organization_id: organizationId };
    
    if (options.status) {
      filterConditions.status = options.status;
    }
    if (options.category) {
      filterConditions.category = options.category;
    }
    if (options.facility_id) {
      filterConditions.facility_id = options.facility_id;
    }

    return this.findAll(filterConditions, {
      orderBy: options.orderBy || 'code',
      order: options.order || 'asc',
      limit: options.limit,
      offset: options.offset
    });
  }
}

module.exports = new EquipmentModel();
