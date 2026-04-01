/**
 * Subunit and Maintainable Item Models
 * ISO 14224 Level 4 (Subunits) and Level 5 (Maintainable Items)
 * 
 * Subunits represent functional assemblies within equipment types.
 * Maintainable items are the specific components that can be replaced or repaired.
 */

const BaseModel = require('./base.model');

/**
 * Subunit Model (ISO 14224 Level 4)
 * Functional assemblies within equipment types
 */
class SubunitModel extends BaseModel {
  constructor() {
    super('subunits');
  }

  /**
   * Get subunits by equipment type
   * @param {number} equipmentTypeId - Equipment type ID
   */
  async getByEquipmentType(equipmentTypeId) {
    return this.query(
      'SELECT * FROM subunits WHERE equipment_type_id = ? ORDER BY subunit_code',
      [equipmentTypeId]
    );
  }

  /**
   * Get subunit with full hierarchy details
   * @param {number} subunitId - Subunit ID
   */
  async getWithHierarchy(subunitId) {
    const [result] = await this.query(`
      SELECT 
        su.*,
        et.type_code,
        et.type_name,
        et.description as type_description,
        cl.class_code,
        cl.class_name,
        c.category_code,
        c.category_name,
        CONCAT(c.category_name, ' > ', cl.class_name, ' > ', et.type_name, ' > ', su.subunit_name) as full_hierarchy
      FROM subunits su
      JOIN equipment_types et ON su.equipment_type_id = et.id
      JOIN equipment_classes cl ON et.class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      WHERE su.id = ?
    `, [subunitId]);
    return result || null;
  }

  /**
   * Get subunits with maintainable item count
   * @param {number} equipmentTypeId - Equipment type ID
   */
  async getWithItemCount(equipmentTypeId) {
    return this.query(`
      SELECT 
        su.*,
        COUNT(mi.id) as maintainable_item_count
      FROM subunits su
      LEFT JOIN maintainable_items mi ON su.id = mi.subunit_id
      WHERE su.equipment_type_id = ?
      GROUP BY su.id
      ORDER BY su.subunit_code
    `, [equipmentTypeId]);
  }

  /**
   * Search subunits
   * @param {string} searchTerm - Search term
   */
  async search(searchTerm) {
    return this.query(`
      SELECT 
        su.*,
        et.type_name,
        cl.class_name,
        c.category_name
      FROM subunits su
      JOIN equipment_types et ON su.equipment_type_id = et.id
      JOIN equipment_classes cl ON et.class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      WHERE su.subunit_name LIKE ? 
         OR su.subunit_code LIKE ?
         OR su.description LIKE ?
      ORDER BY c.category_name, cl.class_name, et.type_name, su.subunit_code
    `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]);
  }

  /**
   * Find subunit by code within equipment type
   * @param {number} equipmentTypeId - Equipment type ID
   * @param {string} code - Subunit code
   */
  async findByCode(equipmentTypeId, code) {
    const [result] = await this.query(
      'SELECT * FROM subunits WHERE equipment_type_id = ? AND subunit_code = ?',
      [equipmentTypeId, code]
    );
    return result || null;
  }

  /**
   * Get all subunits with full details
   */
  async getAllWithDetails() {
    return this.query(`
      SELECT 
        su.*,
        et.type_code,
        et.type_name,
        cl.class_code,
        cl.class_name,
        c.category_code,
        c.category_name
      FROM subunits su
      JOIN equipment_types et ON su.equipment_type_id = et.id
      JOIN equipment_classes cl ON et.class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      ORDER BY c.category_name, cl.class_name, et.type_name, su.subunit_code
    `);
  }
}

/**
 * Maintainable Item Model (ISO 14224 Level 5)
 * Specific components that can be replaced or repaired
 */
class MaintainableItemModel extends BaseModel {
  constructor() {
    super('maintainable_items');
  }

  /**
   * Get maintainable items by subunit
   * @param {number} subunitId - Subunit ID
   */
  async getBySubunit(subunitId) {
    return this.query(
      'SELECT * FROM maintainable_items WHERE subunit_id = ? ORDER BY item_code',
      [subunitId]
    );
  }

  /**
   * Get maintainable item with full hierarchy
   * @param {number} itemId - Item ID
   */
  async getWithHierarchy(itemId) {
    const [result] = await this.query(`
      SELECT 
        mi.*,
        su.subunit_code,
        su.subunit_name,
        et.type_code,
        et.type_name,
        cl.class_code,
        cl.class_name,
        c.category_code,
        c.category_name,
        CONCAT(c.category_name, ' > ', cl.class_name, ' > ', et.type_name, ' > ', su.subunit_name, ' > ', mi.item_name) as full_hierarchy
      FROM maintainable_items mi
      JOIN subunits su ON mi.subunit_id = su.id
      JOIN equipment_types et ON su.equipment_type_id = et.id
      JOIN equipment_classes cl ON et.class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      WHERE mi.id = ?
    `, [itemId]);
    return result || null;
  }

  /**
   * Get maintainable items by equipment type (across all subunits)
   * @param {number} equipmentTypeId - Equipment type ID
   */
  async getByEquipmentType(equipmentTypeId) {
    return this.query(`
      SELECT 
        mi.*,
        su.subunit_code,
        su.subunit_name
      FROM maintainable_items mi
      JOIN subunits su ON mi.subunit_id = su.id
      WHERE su.equipment_type_id = ?
      ORDER BY su.subunit_code, mi.item_code
    `, [equipmentTypeId]);
  }

  /**
   * Search maintainable items
   * @param {string} searchTerm - Search term
   */
  async search(searchTerm) {
    return this.query(`
      SELECT 
        mi.*,
        su.subunit_code,
        su.subunit_name,
        et.type_name,
        cl.class_name,
        c.category_name
      FROM maintainable_items mi
      JOIN subunits su ON mi.subunit_id = su.id
      JOIN equipment_types et ON su.equipment_type_id = et.id
      JOIN equipment_classes cl ON et.class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      WHERE mi.item_name LIKE ? 
         OR mi.item_code LIKE ?
         OR mi.description LIKE ?
         OR mi.spare_part_reference LIKE ?
      ORDER BY c.category_name, cl.class_name, et.type_name, su.subunit_code, mi.item_code
    `, [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`]);
  }

  /**
   * Find maintainable item by code within subunit
   * @param {number} subunitId - Subunit ID
   * @param {string} code - Item code
   */
  async findByCode(subunitId, code) {
    const [result] = await this.query(
      'SELECT * FROM maintainable_items WHERE subunit_id = ? AND item_code = ?',
      [subunitId, code]
    );
    return result || null;
  }

  /**
   * Get items by criticality level
   * @param {string} criticality - Criticality level (low, medium, high, critical)
   */
  async getByCriticality(criticality) {
    return this.query(
      'SELECT * FROM maintainable_items WHERE criticality = ? ORDER BY item_code',
      [criticality]
    );
  }

  /**
   * Get all maintainable items with full details
   */
  async getAllWithDetails() {
    return this.query(`
      SELECT 
        mi.*,
        su.subunit_code,
        su.subunit_name,
        et.type_code,
        et.type_name,
        cl.class_code,
        cl.class_name,
        c.category_code,
        c.category_name
      FROM maintainable_items mi
      JOIN subunits su ON mi.subunit_id = su.id
      JOIN equipment_types et ON su.equipment_type_id = et.id
      JOIN equipment_classes cl ON et.class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      ORDER BY c.category_name, cl.class_name, et.type_name, su.subunit_code, mi.item_code
    `);
  }
}

module.exports = {
  Subunit: new SubunitModel(),
  MaintainableItem: new MaintainableItemModel()
};
