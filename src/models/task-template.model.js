/**
 * Task Template Model
 * ISO 14224-aligned maintenance task templates
 * Linked to equipment types (not SMP Families)
 */

const BaseModel = require('./base.model');

class TaskTemplate extends BaseModel {
  constructor() {
    super('task_templates');
  }

  /**
   * Find templates by equipment type
   * Returns both global templates (organization_id IS NULL) 
   * and organization-specific templates
   * 
   * @param {number} equipmentTypeId - Equipment type ID
   * @param {number} organizationId - Organization ID (optional)
   * @param {Object} filters - Optional filters (maintenance_type, is_active)
   */
  async findByEquipmentType(equipmentTypeId, organizationId = null, filters = {}) {
    let sql = `
      SELECT 
        tt.*,
        et.type_name,
        et.type_code,
        cl.class_name,
        c.category_name,
        u.full_name as created_by_name
      FROM task_templates tt
      JOIN equipment_types et ON tt.equipment_type_id = et.id
      JOIN equipment_classes cl ON et.class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      LEFT JOIN users u ON tt.created_by = u.id
      WHERE tt.equipment_type_id = ?
        AND (
          tt.organization_id IS NULL
          ${organizationId ? 'OR tt.organization_id = ?' : ''}
        )
    `;
    
    const params = [equipmentTypeId];
    if (organizationId) params.push(organizationId);
    
    // Apply filters
    if (filters.maintenance_type) {
      sql += ' AND tt.maintenance_type = ?';
      params.push(filters.maintenance_type);
    }
    
    if (filters.is_active !== undefined) {
      sql += ' AND tt.is_active = ?';
      params.push(filters.is_active);
    }
    
    sql += ' ORDER BY tt.template_name';
    
    return await this.query(sql, params);
  }

  /**
   * Get templates applicable to an asset
   * Based on asset's equipment_type_id
   * 
   * @param {number} equipmentTypeId - Asset's equipment type ID
   * @param {number} organizationId - Organization ID
   */
  async getTemplatesForAsset(equipmentTypeId, organizationId) {
    return await this.query(`
      SELECT 
        tt.*,
        et.type_name,
        et.type_code,
        cl.class_name,
        c.category_name,
        CASE 
          WHEN tt.organization_id IS NULL THEN 'Global'
          ELSE 'Organization'
        END as template_source
      FROM task_templates tt
      JOIN equipment_types et ON tt.equipment_type_id = et.id
      JOIN equipment_classes cl ON et.class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      WHERE tt.equipment_type_id = ?
        AND tt.is_active = TRUE
        AND (
          tt.organization_id IS NULL
          OR tt.organization_id = ?
        )
      ORDER BY 
        CASE WHEN tt.organization_id = ? THEN 0 ELSE 1 END,
        tt.maintenance_type,
        tt.template_name
    `, [equipmentTypeId, organizationId, organizationId]);
  }

  /**
   * Get template with all details including steps and safety controls
   * @param {number} id - Template ID
   */
  async getWithDetails(id) {
    // Get template
    const [template] = await this.query(`
      SELECT 
        tt.*,
        et.type_name,
        et.type_code,
        et.typical_components,
        cl.class_name,
        cl.class_code,
        c.category_name,
        c.category_code,
        u.full_name as created_by_name
      FROM task_templates tt
      JOIN equipment_types et ON tt.equipment_type_id = et.id
      JOIN equipment_classes cl ON et.class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      LEFT JOIN users u ON tt.created_by = u.id
      WHERE tt.id = ?
    `, [id]);
    
    if (!template) return null;
    
    // Get steps
    template.steps = await this.query(`
      SELECT * FROM task_template_steps
      WHERE task_template_id = ?
      ORDER BY step_no
    `, [id]);
    
    // Get safety controls
    template.safety_controls = await this.query(`
      SELECT * FROM task_template_safety_controls
      WHERE task_template_id = ?
      ORDER BY id
    `, [id]);
    
    return template;
  }

  /**
   * Create template with steps and safety controls
   * @param {Object} data - Template data
   * @param {Array} steps - Template steps
   * @param {Array} safetyControls - Safety controls
   */
  async createWithDetails(data, steps = [], safetyControls = []) {
    const connection = await this.pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Create template
      const [templateResult] = await connection.execute(`
        INSERT INTO task_templates (
          organization_id, equipment_type_id, template_code, template_name,
          maintenance_type, task_scope, description, frequency_value, frequency_unit,
          estimated_duration_minutes, required_skills, required_tools,
          is_active, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.organization_id || null,
        data.equipment_type_id,
        data.template_code || null,
        data.template_name,
        data.maintenance_type,
        data.task_scope || null,
        data.description || null,
        data.frequency_value || null,
        data.frequency_unit || null,
        data.estimated_duration_minutes || null,
        data.required_skills || null,
        data.required_tools || null,
        data.is_active !== undefined ? data.is_active : true,
        data.created_by
      ]);
      
      const templateId = templateResult.insertId;
      
      // Create steps
      if (steps.length > 0) {
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          await connection.execute(`
            INSERT INTO task_template_steps (
              task_template_id, step_no, step_type, instruction,
              data_type, expected_value, min_value, max_value, unit,
              is_required, options
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            templateId,
            step.step_no || (i + 1),
            step.step_type,
            step.instruction,
            step.data_type || null,
            step.expected_value || null,
            step.min_value || null,
            step.max_value || null,
            step.unit || null,
            step.is_required !== undefined ? step.is_required : true,
            step.options ? JSON.stringify(step.options) : null
          ]);
        }
      }
      
      // Create safety controls
      if (safetyControls.length > 0) {
        for (const sc of safetyControls) {
          await connection.execute(`
            INSERT INTO task_template_safety_controls (
              task_template_id, safety_type, description, is_mandatory
            ) VALUES (?, ?, ?, ?)
          `, [
            templateId,
            sc.safety_type,
            sc.description,
            sc.is_mandatory !== undefined ? sc.is_mandatory : false
          ]);
        }
      }
      
      await connection.commit();
      
      return {
        id: templateId,
        ...data,
        steps: steps,
        safety_controls: safetyControls
      };
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Search templates
   * @param {string} searchTerm - Search term
   * @param {number} organizationId - Organization ID (optional)
   */
  async search(searchTerm, organizationId = null) {
    let sql = `
      SELECT 
        tt.*,
        et.type_name,
        et.type_code,
        cl.class_name,
        c.category_name
      FROM task_templates tt
      JOIN equipment_types et ON tt.equipment_type_id = et.id
      JOIN equipment_classes cl ON et.class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      WHERE (
        tt.template_name LIKE ? 
        OR tt.template_code LIKE ?
        OR tt.description LIKE ?
        OR et.type_name LIKE ?
      )
    `;
    
    const params = [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];
    
    if (organizationId) {
      sql += ' AND (tt.organization_id IS NULL OR tt.organization_id = ?)';
      params.push(organizationId);
    }
    
    sql += ' ORDER BY tt.template_name';
    
    return await this.query(sql, params);
  }

  /**
   * Get templates statistics for an organization
   * @param {number} organizationId - Organization ID
   */
  async getStats(organizationId) {
    const [result] = await this.query(`
      SELECT 
        COUNT(*) as total_templates,
        COUNT(CASE WHEN organization_id IS NULL THEN 1 END) as global_templates,
        COUNT(CASE WHEN organization_id = ? THEN 1 END) as org_templates,
        COUNT(CASE WHEN maintenance_type = 'inspection' THEN 1 END) as inspection_templates,
        COUNT(CASE WHEN maintenance_type = 'preventive' THEN 1 END) as preventive_templates,
        COUNT(CASE WHEN maintenance_type = 'corrective' THEN 1 END) as corrective_templates
      FROM task_templates
      WHERE organization_id IS NULL OR organization_id = ?
    `, [organizationId, organizationId]);
    
    return result;
  }
}

class TaskTemplateStep extends BaseModel {
  constructor() {
    super('task_template_steps');
  }
}

class TaskTemplateSafetyControl extends BaseModel {
  constructor() {
    super('task_template_safety_controls');
  }
}

module.exports = {
  TaskTemplate: new TaskTemplate(),
  TaskTemplateStep: new TaskTemplateStep(),
  TaskTemplateSafetyControl: new TaskTemplateSafetyControl()
};
