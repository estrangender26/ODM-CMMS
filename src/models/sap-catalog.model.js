/**
 * SAP Catalog Models
 * SAP S/4HANA PM-compatible failure coding catalogs
 * 
 * Catalog A - Object Parts (Bauteil)
 * Catalog B - Damage Codes / Failure Modes (Schaden)
 * Catalog C - Cause Codes / Root Causes (Ursache)
 * Catalog 5 - Activity Codes / Maintenance Actions (Tätigkeit)
 */

const BaseModel = require('./base.model');

/**
 * Object Part Model (SAP Catalog A)
 * Represents components/parts of equipment that can be damaged
 */
class ObjectPartModel extends BaseModel {
  constructor() {
    super('object_parts');
  }

  /**
   * Get object parts by equipment class
   * @param {number} equipmentClassId - Equipment class ID
   */
  async getByEquipmentClass(equipmentClassId) {
    return this.query(
      'SELECT * FROM object_parts WHERE equipment_class_id = ? AND is_active = TRUE ORDER BY object_part_code',
      [equipmentClassId]
    );
  }

  /**
   * Get object part with equipment class details
   * @param {number} partId - Object part ID
   */
  async getWithDetails(partId) {
    const [result] = await this.query(`
      SELECT 
        op.*,
        cl.class_code,
        cl.class_name,
        c.category_code,
        c.category_name
      FROM object_parts op
      JOIN equipment_classes cl ON op.equipment_class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      WHERE op.id = ?
    `, [partId]);
    return result || null;
  }

  /**
   * Find object part by code
   * @param {string} code - Object part code
   */
  async findByCode(code) {
    const [result] = await this.query(
      'SELECT * FROM object_parts WHERE object_part_code = ? AND is_active = TRUE',
      [code]
    );
    return result || null;
  }

  /**
   * Search object parts
   * @param {string} searchTerm - Search term
   */
  async search(searchTerm) {
    return this.query(`
      SELECT 
        op.*,
        cl.class_name,
        c.category_name
      FROM object_parts op
      JOIN equipment_classes cl ON op.equipment_class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      WHERE (op.object_part_name LIKE ? OR op.object_part_code LIKE ? OR op.description LIKE ?)
        AND op.is_active = TRUE
      ORDER BY c.category_name, cl.class_name, op.object_part_code
    `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]);
  }

  /**
   * Get all active object parts with details
   */
  async getAllActiveWithDetails() {
    return this.query(`
      SELECT 
        op.*,
        cl.class_code,
        cl.class_name,
        c.category_code,
        c.category_name
      FROM object_parts op
      JOIN equipment_classes cl ON op.equipment_class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      WHERE op.is_active = TRUE
      ORDER BY c.category_name, cl.class_name, op.object_part_code
    `);
  }
}

/**
 * Damage Code Model (SAP Catalog B)
 * Represents failure modes / types of damage
 */
class DamageCodeModel extends BaseModel {
  constructor() {
    super('damage_codes');
  }

  /**
   * Get damage codes by equipment class
   * @param {number} equipmentClassId - Equipment class ID
   */
  async getByEquipmentClass(equipmentClassId) {
    return this.query(
      'SELECT * FROM damage_codes WHERE equipment_class_id = ? AND is_active = TRUE ORDER BY damage_code',
      [equipmentClassId]
    );
  }

  /**
   * Get damage code with equipment class details
   * @param {number} damageId - Damage code ID
   */
  async getWithDetails(damageId) {
    const [result] = await this.query(`
      SELECT 
        dc.*,
        cl.class_code,
        cl.class_name,
        c.category_code,
        c.category_name
      FROM damage_codes dc
      JOIN equipment_classes cl ON dc.equipment_class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      WHERE dc.id = ?
    `, [damageId]);
    return result || null;
  }

  /**
   * Find damage code by code
   * @param {string} code - Damage code
   */
  async findByCode(code) {
    const [result] = await this.query(
      'SELECT * FROM damage_codes WHERE damage_code = ? AND is_active = TRUE',
      [code]
    );
    return result || null;
  }

  /**
   * Get damage codes by severity
   * @param {string} severity - Severity level (low, medium, high, critical)
   */
  async getBySeverity(severity) {
    return this.query(
      'SELECT * FROM damage_codes WHERE severity_level = ? AND is_active = TRUE ORDER BY damage_code',
      [severity]
    );
  }

  /**
   * Search damage codes
   * @param {string} searchTerm - Search term
   */
  async search(searchTerm) {
    return this.query(`
      SELECT 
        dc.*,
        cl.class_name,
        c.category_name
      FROM damage_codes dc
      JOIN equipment_classes cl ON dc.equipment_class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      WHERE (dc.damage_name LIKE ? OR dc.damage_code LIKE ? OR dc.description LIKE ? OR dc.typical_symptoms LIKE ?)
        AND dc.is_active = TRUE
      ORDER BY dc.severity_level DESC, c.category_name, cl.class_name, dc.damage_code
    `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]);
  }

  /**
   * Get all active damage codes with details
   */
  async getAllActiveWithDetails() {
    return this.query(`
      SELECT 
        dc.*,
        cl.class_code,
        cl.class_name,
        c.category_code,
        c.category_name
      FROM damage_codes dc
      JOIN equipment_classes cl ON dc.equipment_class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      WHERE dc.is_active = TRUE
      ORDER BY dc.severity_level DESC, c.category_name, cl.class_name, dc.damage_code
    `);
  }
}

/**
 * Cause Code Model (SAP Catalog C)
 * Represents root causes of failures
 */
class CauseCodeModel extends BaseModel {
  constructor() {
    super('cause_codes');
  }

  /**
   * Get cause codes by equipment class
   * @param {number} equipmentClassId - Equipment class ID
   */
  async getByEquipmentClass(equipmentClassId) {
    return this.query(
      'SELECT * FROM cause_codes WHERE equipment_class_id = ? AND is_active = TRUE ORDER BY cause_code',
      [equipmentClassId]
    );
  }

  /**
   * Get cause code with details
   * @param {number} causeId - Cause code ID
   */
  async getWithDetails(causeId) {
    const [result] = await this.query(`
      SELECT 
        cc.*,
        cl.class_code,
        cl.class_name,
        c.category_code,
        c.category_name
      FROM cause_codes cc
      LEFT JOIN equipment_classes cl ON cc.equipment_class_id = cl.id
      LEFT JOIN equipment_categories c ON cl.category_id = c.id
      WHERE cc.id = ?
    `, [causeId]);
    return result || null;
  }

  /**
   * Find cause code by code
   * @param {string} code - Cause code
   */
  async findByCode(code) {
    const [result] = await this.query(
      'SELECT * FROM cause_codes WHERE cause_code = ? AND is_active = TRUE',
      [code]
    );
    return result || null;
  }

  /**
   * Get cause codes by category
   * @param {string} category - Cause category (design, manufacturing, operation, maintenance, human_error, environmental, material, unknown)
   */
  async getByCategory(category) {
    return this.query(
      'SELECT * FROM cause_codes WHERE cause_category = ? AND is_active = TRUE ORDER BY cause_code',
      [category]
    );
  }

  /**
   * Get preventable causes
   */
  async getPreventable() {
    return this.query(
      'SELECT * FROM cause_codes WHERE is_preventable = TRUE AND is_active = TRUE ORDER BY cause_code'
    );
  }

  /**
   * Search cause codes
   * @param {string} searchTerm - Search term
   */
  async search(searchTerm) {
    return this.query(`
      SELECT 
        cc.*,
        cl.class_name,
        c.category_name
      FROM cause_codes cc
      LEFT JOIN equipment_classes cl ON cc.equipment_class_id = cl.id
      LEFT JOIN equipment_categories c ON cl.category_id = c.id
      WHERE (cc.cause_name LIKE ? OR cc.cause_code LIKE ? OR cc.description LIKE ? OR cc.prevention_guidelines LIKE ?)
        AND cc.is_active = TRUE
      ORDER BY cc.cause_category, cc.cause_code
    `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]);
  }

  /**
   * Get all active cause codes with details
   */
  async getAllActiveWithDetails() {
    return this.query(`
      SELECT 
        cc.*,
        cl.class_code,
        cl.class_name,
        c.category_code,
        c.category_name
      FROM cause_codes cc
      LEFT JOIN equipment_classes cl ON cc.equipment_class_id = cl.id
      LEFT JOIN equipment_categories c ON cl.category_id = c.id
      WHERE cc.is_active = TRUE
      ORDER BY cc.cause_category, cc.cause_code
    `);
  }
}

/**
 * Activity Code Model (SAP Catalog 5)
 * Represents maintenance actions/activities
 */
class ActivityCodeModel extends BaseModel {
  constructor() {
    super('activity_codes');
  }

  /**
   * Get activity code by code
   * @param {string} code - Activity code
   */
  async getByCode(code) {
    const [result] = await this.query(
      'SELECT * FROM activity_codes WHERE activity_code = ? AND is_active = TRUE',
      [code]
    );
    return result || null;
  }

  /**
   * Get activity codes by category
   * @param {string} category - Activity category (inspection, preventive, corrective, predictive, modification, overhaul)
   */
  async getByCategory(category) {
    return this.query(
      'SELECT * FROM activity_codes WHERE activity_category = ? AND is_active = TRUE ORDER BY activity_code',
      [category]
    );
  }

  /**
   * Search activity codes
   * @param {string} searchTerm - Search term
   */
  async search(searchTerm) {
    return this.query(`
      SELECT * FROM activity_codes
      WHERE (activity_name LIKE ? OR activity_code LIKE ? OR description LIKE ? OR required_skills LIKE ?)
        AND is_active = TRUE
      ORDER BY activity_category, activity_code
    `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]);
  }

  /**
   * Get all active activity codes
   */
  async getAllActive() {
    return this.query(
      'SELECT * FROM activity_codes WHERE is_active = TRUE ORDER BY activity_category, activity_code'
    );
  }

  /**
   * Get activity codes suitable for findings (corrective/preventive)
   */
  async getForFindings() {
    return this.query(`
      SELECT * FROM activity_codes 
      WHERE activity_category IN ('corrective', 'preventive', 'inspection', 'modification')
        AND is_active = TRUE
      ORDER BY activity_category, activity_code
    `);
  }
}

/**
 * SAP Catalog Service
 * Provides combined catalog queries for findings forms
 */
class SapCatalogService {
  /**
   * Get all catalog options for a finding form
   * @param {number} equipmentClassId - Equipment class ID
   */
  async getCatalogOptionsForFinding(equipmentClassId) {
    const [objectParts, damageCodes, causeCodes, activityCodes] = await Promise.all([
      new ObjectPartModel().getByEquipmentClass(equipmentClassId),
      new DamageCodeModel().getByEquipmentClass(equipmentClassId),
      new CauseCodeModel().getAllActiveWithDetails(), // Cause codes can be global
      new ActivityCodeModel().getForFindings()
    ]);

    return {
      object_parts: objectParts,
      damage_codes: damageCodes,
      cause_codes: causeCodes,
      activity_codes: activityCodes
    };
  }

  /**
   * Get complete catalog reference for reporting
   */
  async getCompleteCatalogReference() {
    const [objectParts, damageCodes, causeCodes, activityCodes] = await Promise.all([
      new ObjectPartModel().getAllActiveWithDetails(),
      new DamageCodeModel().getAllActiveWithDetails(),
      new CauseCodeModel().getAllActiveWithDetails(),
      new ActivityCodeModel().getAllActive()
    ]);

    return {
      catalog_a_object_parts: objectParts,
      catalog_b_damage_codes: damageCodes,
      catalog_c_cause_codes: causeCodes,
      catalog_5_activity_codes: activityCodes
    };
  }
}

module.exports = {
  ObjectPart: new ObjectPartModel(),
  DamageCode: new DamageCodeModel(),
  CauseCode: new CauseCodeModel(),
  ActivityCode: new ActivityCodeModel(),
  SapCatalogService: new SapCatalogService()
};
