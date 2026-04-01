/**
 * ISO 14224 Equipment Classification Models
 * Global reference tables for equipment taxonomy
 */

const BaseModel = require('./base.model');

/**
 * Equipment Category Model (ISO 14224 Level 1)
 * Top-level equipment classification
 */
class EquipmentCategory extends BaseModel {
  constructor() {
    super('equipment_categories');
  }

  /**
   * Find category by code
   * @param {string} code - Category code (e.g., 'PUMP', 'MOTOR')
   */
  async findByCode(code) {
    const [result] = await this.query(
      'SELECT * FROM equipment_categories WHERE category_code = ?',
      [code]
    );
    return result || null;
  }

  /**
   * Get all categories with their classes and types
   */
  async getFullHierarchy() {
    return await this.query(`
      SELECT 
        c.id as category_id,
        c.category_code,
        c.category_name,
        c.description as category_description,
        cl.id as class_id,
        cl.class_code,
        cl.class_name,
        cl.description as class_description,
        t.id as type_id,
        t.type_code,
        t.type_name,
        t.description as type_description
      FROM equipment_categories c
      LEFT JOIN equipment_classes cl ON c.id = cl.category_id
      LEFT JOIN equipment_types t ON cl.id = t.class_id
      ORDER BY c.category_name, cl.class_name, t.type_name
    `);
  }
}

/**
 * Equipment Class Model (ISO 14224 Level 2)
 * Equipment classification within a category
 */
class EquipmentClass extends BaseModel {
  constructor() {
    super('equipment_classes');
  }

  /**
   * Find classes by category
   * @param {number} categoryId - Category ID
   */
  async findByCategory(categoryId) {
    return await this.query(
      'SELECT * FROM equipment_classes WHERE category_id = ? ORDER BY class_name',
      [categoryId]
    );
  }

  /**
   * Find class by code within a category
   * @param {number} categoryId - Category ID
   * @param {string} code - Class code
   */
  async findByCode(categoryId, code) {
    const [result] = await this.query(
      'SELECT * FROM equipment_classes WHERE category_id = ? AND class_code = ?',
      [categoryId, code]
    );
    return result || null;
  }

  /**
   * Get class with its category
   * @param {number} id - Class ID
   */
  async getWithCategory(id) {
    const [result] = await this.query(`
      SELECT 
        cl.*,
        c.category_code,
        c.category_name,
        c.description as category_description
      FROM equipment_classes cl
      JOIN equipment_categories c ON cl.category_id = c.id
      WHERE cl.id = ?
    `, [id]);
    return result || null;
  }
}

/**
 * Equipment Type Model (ISO 14224 Level 3)
 * Most specific equipment classification
 */
class EquipmentType extends BaseModel {
  constructor() {
    super('equipment_types');
  }

  /**
   * Find types by class
   * @param {number} classId - Class ID
   */
  async findByClass(classId) {
    return await this.query(
      'SELECT * FROM equipment_types WHERE class_id = ? ORDER BY type_name',
      [classId]
    );
  }

  /**
   * Find type by code
   * @param {string} code - Type code
   */
  async findByCode(code) {
    const [result] = await this.query(
      'SELECT * FROM equipment_types WHERE type_code = ?',
      [code]
    );
    return result || null;
  }

  /**
   * Get type with full hierarchy (category > class > type)
   * @param {number} id - Type ID
   */
  async getFullHierarchy(id) {
    const [result] = await this.query(`
      SELECT 
        t.*,
        cl.class_code,
        cl.class_name,
        cl.description as class_description,
        c.category_code,
        c.category_name,
        c.description as category_description,
        CONCAT(c.category_name, ' > ', cl.class_name, ' > ', t.type_name) as full_hierarchy
      FROM equipment_types t
      JOIN equipment_classes cl ON t.class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      WHERE t.id = ?
    `, [id]);
    return result || null;
  }

  /**
   * Search types by name or code
   * @param {string} searchTerm - Search term
   */
  async search(searchTerm) {
    return await this.query(`
      SELECT 
        t.*,
        cl.class_name,
        c.category_name
      FROM equipment_types t
      JOIN equipment_classes cl ON t.class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      WHERE t.type_name LIKE ? 
         OR t.type_code LIKE ?
         OR t.description LIKE ?
      ORDER BY c.category_name, cl.class_name, t.type_name
    `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]);
  }

  /**
   * Get all types with full hierarchy info
   */
  async getAllWithHierarchy() {
    return await this.query(`
      SELECT 
        t.id,
        t.type_code,
        t.type_name,
        t.description,
        t.typical_components,
        cl.id as class_id,
        cl.class_code,
        cl.class_name,
        c.id as category_id,
        c.category_code,
        c.category_name,
        CONCAT(c.category_name, ' > ', cl.class_name, ' > ', t.type_name) as full_hierarchy
      FROM equipment_types t
      JOIN equipment_classes cl ON t.class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      ORDER BY c.category_name, cl.class_name, t.type_name
    `);
  }
}

/**
 * Failure Mode Model
 * ISO 14224 compatible failure data for reliability analytics
 */
class FailureMode extends BaseModel {
  constructor() {
    super('failure_modes');
  }

  /**
   * Find failure modes by equipment type
   * @param {number} equipmentTypeId - Equipment type ID
   */
  async findByEquipmentType(equipmentTypeId) {
    return await this.query(
      'SELECT * FROM failure_modes WHERE equipment_type_id = ? AND is_active = TRUE ORDER BY failure_mode',
      [equipmentTypeId]
    );
  }

  /**
   * Search failure modes
   * @param {string} searchTerm - Search term
   */
  async search(searchTerm) {
    return await this.query(`
      SELECT 
        fm.*,
        et.type_name,
        cl.class_name,
        c.category_name
      FROM failure_modes fm
      JOIN equipment_types et ON fm.equipment_type_id = et.id
      JOIN equipment_classes cl ON et.class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      WHERE fm.failure_mode LIKE ? 
         OR fm.failure_cause LIKE ?
         OR fm.failure_mechanism LIKE ?
      ORDER BY c.category_name, et.type_name, fm.failure_mode
    `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]);
  }
}

module.exports = {
  EquipmentCategory: new EquipmentCategory(),
  EquipmentClass: new EquipmentClass(),
  EquipmentType: new EquipmentType(),
  FailureMode: new FailureMode()
};
