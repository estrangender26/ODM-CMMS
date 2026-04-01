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

  // ============================================================
  // ISO 14224 Equipment Classification Methods
  // ============================================================

  /**
   * Get equipment with ISO classification details
   * @param {number} equipmentId
   * @param {number} organizationId
   * @returns {Promise<Object|null>}
   */
  async getWithIsoClassification(equipmentId, organizationId) {
    const sql = `
      SELECT e.*,
        f.name as facility_name, f.code as facility_code,
        u.full_name as created_by_name,
        et.type_code, et.type_name, et.typical_components,
        cl.class_code, cl.class_name,
        c.category_code, c.category_name,
        CONCAT(c.category_name, ' > ', cl.class_name, ' > ', et.type_name) as iso_classification
      FROM ${this.tableName} e
      JOIN facilities f ON e.facility_id = f.id
      LEFT JOIN users u ON e.created_by = u.id
      LEFT JOIN equipment_types et ON e.equipment_type_id = et.id
      LEFT JOIN equipment_classes cl ON et.class_id = cl.id
      LEFT JOIN equipment_categories c ON cl.category_id = c.id
      WHERE e.id = ? AND e.organization_id = ?
    `;
    const [result] = await this.query(sql, [equipmentId, organizationId]);
    return result || null;
  }

  /**
   * Get all equipment with ISO classification (organization-aware)
   * @param {number} organizationId
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  async getAllWithIsoClassification(organizationId, filters = {}) {
    let sql = `
      SELECT e.*,
        f.name as facility_name, f.code as facility_code,
        et.type_code, et.type_name,
        cl.class_code, cl.class_name,
        c.category_code, c.category_name,
        CONCAT(COALESCE(c.category_name, ''), ' > ', COALESCE(cl.class_name, ''), ' > ', COALESCE(et.type_name, '')) as iso_classification
      FROM ${this.tableName} e
      JOIN facilities f ON e.facility_id = f.id
      LEFT JOIN equipment_types et ON e.equipment_type_id = et.id
      LEFT JOIN equipment_classes cl ON et.class_id = cl.id
      LEFT JOIN equipment_categories c ON cl.category_id = c.id
      WHERE e.organization_id = ?
    `;
    
    const params = [organizationId];

    if (filters.equipment_type_id) {
      sql += ' AND e.equipment_type_id = ?';
      params.push(filters.equipment_type_id);
    }
    if (filters.equipment_category_id) {
      sql += ' AND e.equipment_category_id = ?';
      params.push(filters.equipment_category_id);
    }
    if (filters.facility_id) {
      sql += ' AND e.facility_id = ?';
      params.push(filters.facility_id);
    }
    if (filters.status) {
      sql += ' AND e.status = ?';
      params.push(filters.status);
    }

    sql += ` ORDER BY e.code`;

    return this.query(sql, params);
  }

  /**
   * Update equipment ISO classification
   * @param {number} equipmentId
   * @param {number} equipmentTypeId
   * @param {number} organizationId
   * @returns {Promise<boolean>}
   */
  async updateIsoClassification(equipmentId, equipmentTypeId, organizationId) {
    // Get the full hierarchy for the type
    const [hierarchy] = await this.query(`
      SELECT 
        et.id as type_id,
        cl.id as class_id,
        c.id as category_id
      FROM equipment_types et
      JOIN equipment_classes cl ON et.class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      WHERE et.id = ?
    `, [equipmentTypeId]);

    if (!hierarchy) {
      throw new Error('Invalid equipment type');
    }

    const sql = `
      UPDATE ${this.tableName}
      SET 
        equipment_type_id = ?,
        equipment_class_id = ?,
        equipment_category_id = ?,
        updated_at = NOW()
      WHERE id = ? AND organization_id = ?
    `;
    
    await this.query(sql, [
      hierarchy.type_id,
      hierarchy.class_id,
      hierarchy.category_id,
      equipmentId,
      organizationId
    ]);
    
    return true;
  }

  /**
   * Get equipment grouped by ISO category (organization-aware)
   * @param {number} organizationId
   * @returns {Promise<Array>}
   */
  async getGroupedByCategory(organizationId) {
    const sql = `
      SELECT 
        c.category_code,
        c.category_name,
        COUNT(e.id) as equipment_count
      FROM equipment_categories c
      LEFT JOIN equipment e ON e.equipment_category_id = c.id 
        AND e.organization_id = ?
      GROUP BY c.id, c.category_code, c.category_name
      ORDER BY c.category_name
    `;
    return this.query(sql, [organizationId]);
  }

  // ============================================================
  // QR Code Support
  // ============================================================

  /**
   * Generate QR token for equipment
   * Creates a unique token for QR code generation
   * @param {number} equipmentId - Equipment ID
   * @param {number} organizationId - Organization ID
   * @returns {Promise<string>} QR token
   */
  async generateQRToken(equipmentId, organizationId) {
    const crypto = require('crypto');
    
    // Generate unique token
    const token = crypto.randomBytes(16).toString('hex');
    
    const sql = `
      UPDATE ${this.tableName}
      SET qr_token = ?,
          qr_token_generated_at = NOW(),
          updated_at = NOW()
      WHERE id = ? AND organization_id = ?
    `;
    
    await this.query(sql, [token, equipmentId, organizationId]);
    return token;
  }

  /**
   * Get equipment by QR token
   * @param {string} token - QR token
   * @returns {Promise<Object|null>} Equipment with ISO classification
   */
  async getByQRToken(token) {
    const sql = `
      SELECT e.*,
        f.name as facility_name, f.code as facility_code,
        f.facility_type, f.sap_reference_code as facility_sap_ref,
        et.type_code, et.type_name, et.typical_components,
        cl.class_code, cl.class_name,
        c.category_code, c.category_name,
        CONCAT(c.category_name, ' > ', cl.class_name, ' > ', et.type_name) as iso_classification
      FROM ${this.tableName} e
      JOIN facilities f ON e.facility_id = f.id
      LEFT JOIN equipment_types et ON e.equipment_type_id = et.id
      LEFT JOIN equipment_classes cl ON et.class_id = cl.id
      LEFT JOIN equipment_categories c ON cl.category_id = c.id
      WHERE e.qr_token = ?
    `;
    const [result] = await this.query(sql, [token]);
    return result || null;
  }

  /**
   * Get equipment with QR info
   * @param {number} equipmentId - Equipment ID
   * @param {number} organizationId - Organization ID
   */
  async getWithQRInfo(equipmentId, organizationId) {
    const sql = `
      SELECT e.*,
        f.name as facility_name, f.code as facility_code,
        u.full_name as created_by_name,
        CASE 
          WHEN e.qr_token IS NOT NULL THEN CONCAT('/m/asset/', e.qr_token)
          ELSE NULL
        END as qr_url
      FROM ${this.tableName} e
      JOIN facilities f ON e.facility_id = f.id
      LEFT JOIN users u ON e.created_by = u.id
      WHERE e.id = ? AND e.organization_id = ?
    `;
    const [result] = await this.query(sql, [equipmentId, organizationId]);
    return result || null;
  }

  /**
   * Find equipment without QR tokens (for batch generation)
   * @param {number} organizationId - Organization ID
   */
  async getWithoutQRToken(organizationId) {
    const sql = `
      SELECT e.*, f.name as facility_name, f.code as facility_code
      FROM ${this.tableName} e
      JOIN facilities f ON e.facility_id = f.id
      WHERE e.organization_id = ? AND e.qr_token IS NULL
      ORDER BY e.code
    `;
    return this.query(sql, [organizationId]);
  }

  /**
   * Get QR code data for equipment
   * Returns data needed to generate QR code
   * @param {number} equipmentId - Equipment ID
   * @param {number} organizationId - Organization ID
   * @param {string} baseUrl - Base URL for QR code
   */
  async getQRCodeData(equipmentId, organizationId, baseUrl) {
    let equipment = await this.getWithQRInfo(equipmentId, organizationId);
    
    if (!equipment) {
      return null;
    }
    
    // Generate token if not exists
    if (!equipment.qr_token) {
      const token = await this.generateQRToken(equipmentId, organizationId);
      equipment = await this.getWithQRInfo(equipmentId, organizationId);
      equipment.qr_token = token;
    }
    
    const qrUrl = `${baseUrl}/m/asset/${equipment.qr_token}`;
    
    return {
      equipment: {
        id: equipment.id,
        name: equipment.name,
        code: equipment.code,
        facility_name: equipment.facility_name
      },
      qr_token: equipment.qr_token,
      qr_url: qrUrl,
      generated_at: equipment.qr_token_generated_at
    };
  }
}

module.exports = new EquipmentModel();
