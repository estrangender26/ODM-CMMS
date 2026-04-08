/**
 * Industry Model
 * Master data for industry classification
 * Supports multi-industry organizations
 */

const BaseModel = require('./base.model');

class IndustryModel extends BaseModel {
  constructor() {
    super('industries');
  }

  /**
   * Get all active industries
   */
  async getAllActive() {
    return this.findAll({ is_active: true }, { orderBy: 'name' });
  }

  /**
   * Get industry by code
   */
  async findByCode(code) {
    const [result] = await this.query(
      'SELECT * FROM industries WHERE code = ? AND is_active = TRUE',
      [code]
    );
    return result || null;
  }

  /**
   * Get industries for an organization
   */
  async getByOrganization(organizationId) {
    const sql = `
      SELECT i.*, oi.is_default
      FROM industries i
      JOIN organization_industries oi ON i.id = oi.industry_id
      WHERE oi.organization_id = ? AND i.is_active = TRUE
      ORDER BY oi.is_default DESC, i.name
    `;
    return this.query(sql, [organizationId]);
  }

  /**
   * Get default industry for organization
   */
  async getDefaultForOrganization(organizationId) {
    const sql = `
      SELECT i.*
      FROM industries i
      JOIN organization_industries oi ON i.id = oi.industry_id
      WHERE oi.organization_id = ? AND oi.is_default = TRUE AND i.is_active = TRUE
      LIMIT 1
    `;
    const [result] = await this.query(sql, [organizationId]);
    return result || null;
  }

  /**
   * Assign industry to organization
   */
  async assignToOrganization(organizationId, industryId, isDefault = false) {
    // If setting as default, unset other defaults first
    if (isDefault) {
      await this.query(
        'UPDATE organization_industries SET is_default = FALSE WHERE organization_id = ?',
        [organizationId]
      );
    }

    const sql = `
      INSERT INTO organization_industries (organization_id, industry_id, is_default)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE is_default = VALUES(is_default)
    `;
    await this.query(sql, [organizationId, industryId, isDefault]);
    return true;
  }

  /**
   * Remove industry from organization
   */
  async removeFromOrganization(organizationId, industryId) {
    await this.query(
      'DELETE FROM organization_industries WHERE organization_id = ? AND industry_id = ?',
      [organizationId, industryId]
    );
    return true;
  }

  /**
   * Set default industry for organization
   * ENFORCES INVARIANT: Exactly one default industry
   */
  async setDefaultForOrganization(organizationId, industryId) {
    // First, unset all defaults
    await this.query(
      'UPDATE organization_industries SET is_default = FALSE WHERE organization_id = ?',
      [organizationId]
    );
    
    // Set the new default
    await this.query(
      'UPDATE organization_industries SET is_default = TRUE WHERE organization_id = ? AND industry_id = ?',
      [organizationId, industryId]
    );
    return true;
  }

  /**
   * Get industries for an equipment type
   */
  async getByEquipmentType(equipmentTypeId) {
    const sql = `
      SELECT i.*
      FROM industries i
      JOIN equipment_type_industries eti ON i.id = eti.industry_id
      WHERE eti.equipment_type_id = ? AND i.is_active = TRUE
      ORDER BY i.name
    `;
    return this.query(sql, [equipmentTypeId]);
  }

  /**
   * Assign industry to equipment type
   */
  async assignToEquipmentType(equipmentTypeId, industryId) {
    const sql = `
      INSERT INTO equipment_type_industries (equipment_type_id, industry_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE equipment_type_id = equipment_type_id
    `;
    await this.query(sql, [equipmentTypeId, industryId]);
    return true;
  }

  /**
   * Remove industry from equipment type
   */
  async removeFromEquipmentType(equipmentTypeId, industryId) {
    await this.query(
      'DELETE FROM equipment_type_industries WHERE equipment_type_id = ? AND industry_id = ?',
      [equipmentTypeId, industryId]
    );
    return true;
  }

  /**
   * Get equipment types by industry
   */
  async getEquipmentTypesByIndustry(industryId) {
    const sql = `
      SELECT et.*, ec.class_name, c.category_name
      FROM equipment_types et
      JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
      JOIN equipment_classes ec ON et.class_id = ec.id
      JOIN equipment_categories c ON ec.category_id = c.id
      WHERE eti.industry_id = ?
      ORDER BY c.category_name, ec.class_name, et.type_name
    `;
    return this.query(sql, [industryId]);
  }
}

module.exports = new IndustryModel();
