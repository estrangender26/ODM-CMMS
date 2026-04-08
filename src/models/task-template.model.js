/**
 * Task Template Model
 * ISO 14224-aligned maintenance task templates
 * Linked to equipment types (not SMP Families)
 * 
 * Step 2: Added industry layer, task kinds, immutability, and cloning
 */

const BaseModel = require('./base.model');

class TaskTemplate extends BaseModel {
  constructor() {
    super('task_templates');
  }

  /**
   * TASK KINDS ENUM
   * Template-level classification for ODM task types
   */
  static TASK_KINDS = {
    INSPECTION: 'inspection',
    MEASUREMENT: 'measurement',
    CLEANING: 'cleaning',
    LUBRICATION: 'lubrication',
    ADJUSTMENT: 'adjustment',
    TIGHTENING: 'tightening',
    TESTING: 'testing',
    CALIBRATION: 'calibration',
    SAFETY_CHECK: 'safety_check'
  };

  /**
   * Find templates by equipment type
   * Returns both global templates (organization_id IS NULL) 
   * and organization-specific templates
   * 
   * @param {number} equipmentTypeId - Equipment type ID
   * @param {number} organizationId - Organization ID (optional)
   * @param {Object} filters - Optional filters (maintenance_type, is_active, task_kind, industry_id)
   */
  async findByEquipmentType(equipmentTypeId, organizationId = null, filters = {}) {
    let sql = `
      SELECT 
        tt.*,
        et.type_name,
        et.type_code,
        cl.class_name,
        c.category_name,
        i.name as industry_name,
        i.code as industry_code,
        u.full_name as created_by_name,
        pt.template_name as parent_template_name
      FROM task_templates tt
      JOIN equipment_types et ON tt.equipment_type_id = et.id
      JOIN equipment_classes cl ON et.class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      LEFT JOIN industries i ON tt.industry_id = i.id
      LEFT JOIN users u ON tt.created_by = u.id
      LEFT JOIN task_templates pt ON tt.parent_template_id = pt.id
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

    if (filters.task_kind) {
      sql += ' AND tt.task_kind = ?';
      params.push(filters.task_kind);
    }

    if (filters.industry_id) {
      sql += ' AND tt.industry_id = ?';
      params.push(filters.industry_id);
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
   * @param {Object} filters - Optional filters
   */
  async getTemplatesForAsset(equipmentTypeId, organizationId, filters = {}) {
    let sql = `
      SELECT 
        tt.*,
        et.type_name,
        et.type_code,
        cl.class_name,
        c.category_name,
        i.name as industry_name,
        CASE 
          WHEN tt.is_system = TRUE THEN 'System'
          WHEN tt.organization_id = ? THEN 'Organization'
          ELSE 'Global'
        END as template_source
      FROM task_templates tt
      JOIN equipment_types et ON tt.equipment_type_id = et.id
      JOIN equipment_classes cl ON et.class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      LEFT JOIN industries i ON tt.industry_id = i.id
      WHERE tt.equipment_type_id = ?
        AND tt.is_active = TRUE
        AND (
          tt.organization_id IS NULL
          OR tt.organization_id = ?
        )
    `;
    
    const params = [organizationId, equipmentTypeId, organizationId];

    if (filters.task_kind) {
      sql += ' AND tt.task_kind = ?';
      params.push(filters.task_kind);
    }

    if (filters.industry_id) {
      sql += ' AND tt.industry_id = ?';
      params.push(filters.industry_id);
    }
    
    sql += `
      ORDER BY 
        CASE WHEN tt.organization_id = ? THEN 0 ELSE 1 END,
        tt.maintenance_type,
        tt.template_name
    `;
    params.push(organizationId);
    
    return await this.query(sql, params);
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
        i.name as industry_name,
        i.code as industry_code,
        u.full_name as created_by_name,
        pt.template_name as parent_template_name
      FROM task_templates tt
      JOIN equipment_types et ON tt.equipment_type_id = et.id
      JOIN equipment_classes cl ON et.class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      LEFT JOIN industries i ON tt.industry_id = i.id
      LEFT JOIN users u ON tt.created_by = u.id
      LEFT JOIN task_templates pt ON tt.parent_template_id = pt.id
      WHERE tt.id = ?
    `, [id]);
    
    if (!template) return null;
    
    // Get steps with safety metadata
    template.steps = await this.query(`
      SELECT 
        id, task_template_id, step_no, step_type, instruction,
        data_type, expected_value, min_value, max_value, unit,
        is_required, options,
        safety_note, is_visual_only, requires_equipment_stopped,
        prohibit_if_running, prohibit_opening_covers
      FROM task_template_steps
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
   * Check if template can be edited (not a system template)
   * @param {number} id - Template ID
   */
  async isEditable(id) {
    const [template] = await this.query(
      'SELECT is_system, is_editable FROM task_templates WHERE id = ?',
      [id]
    );
    if (!template) return false;
    return template.is_system !== true && template.is_editable !== false;
  }

  /**
   * Check if template is a system template
   * @param {number} id - Template ID
   */
  async isSystemTemplate(id) {
    const [template] = await this.query(
      'SELECT is_system FROM task_templates WHERE id = ?',
      [id]
    );
    return template ? template.is_system === true : false;
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
      
      // Create template with new fields
      const [templateResult] = await connection.execute(`
        INSERT INTO task_templates (
          organization_id, equipment_type_id, industry_id, template_code, template_name,
          maintenance_type, task_kind, task_scope, description, frequency_value, frequency_unit,
          estimated_duration_minutes, required_skills, required_tools,
          is_system, is_editable, parent_template_id,
          is_active, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        data.organization_id || null,
        data.equipment_type_id,
        data.industry_id || null,
        data.template_code || null,
        data.template_name,
        data.maintenance_type,
        data.task_kind || null,
        data.task_scope || null,
        data.description || null,
        data.frequency_value || null,
        data.frequency_unit || null,
        data.estimated_duration_minutes || null,
        data.required_skills || null,
        data.required_tools || null,
        data.is_system !== undefined ? data.is_system : false,
        data.is_editable !== undefined ? data.is_editable : true,
        data.parent_template_id || null,
        data.is_active !== undefined ? data.is_active : true,
        data.created_by
      ]);
      
      const templateId = templateResult.insertId;
      
      // Create steps with safety metadata
      if (steps.length > 0) {
        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          await connection.execute(`
            INSERT INTO task_template_steps (
              task_template_id, step_no, step_type, instruction,
              data_type, expected_value, min_value, max_value, unit,
              is_required, options,
              safety_note, is_visual_only, requires_equipment_stopped,
              prohibit_if_running, prohibit_opening_covers
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            step.options ? JSON.stringify(step.options) : null,
            step.safety_note || null,
            step.is_visual_only !== undefined ? step.is_visual_only : true,
            step.requires_equipment_stopped !== undefined ? step.requires_equipment_stopped : false,
            step.prohibit_if_running !== undefined ? step.prohibit_if_running : false,
            step.prohibit_opening_covers !== undefined ? step.prohibit_opening_covers : false
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
   * Clone a template from system template to organization
   * Creates a full copy: template + steps + safety controls
   * @param {number} sourceTemplateId - System template to clone
   * @param {number} organizationId - Target organization
   * @param {number} userId - User creating the clone
   * @param {Object} overrides - Optional overrides (template_name, etc.)
   */
  async cloneTemplate(sourceTemplateId, organizationId, userId, overrides = {}) {
    // Get source template with all details
    const source = await this.getWithDetails(sourceTemplateId);
    if (!source) {
      throw new Error('Source template not found');
    }

    // Verify source is a system template (optional - can clone org templates too)
    if (source.is_system !== true) {
      console.warn(`[TaskTemplate] Cloning non-system template ${sourceTemplateId}`);
    }

    // Prepare clone data
    const cloneData = {
      organization_id: organizationId,
      equipment_type_id: source.equipment_type_id,
      industry_id: source.industry_id,
      template_code: overrides.template_code || `${source.template_code}_CLONE`,
      template_name: overrides.template_name || `${source.template_name} (Copy)`,
      maintenance_type: source.maintenance_type,
      task_kind: source.task_kind,
      task_scope: source.task_scope,
      description: overrides.description || source.description,
      frequency_value: source.frequency_value,
      frequency_unit: source.frequency_unit,
      estimated_duration_minutes: source.estimated_duration_minutes,
      required_skills: source.required_skills,
      required_tools: source.required_tools,
      is_system: false,
      is_editable: true,
      parent_template_id: sourceTemplateId,
      is_active: true,
      created_by: userId
    };

    // Prepare steps with safety metadata
    const cloneSteps = source.steps.map(step => ({
      step_no: step.step_no,
      step_type: step.step_type,
      instruction: step.instruction,
      data_type: step.data_type,
      expected_value: step.expected_value,
      min_value: step.min_value,
      max_value: step.max_value,
      unit: step.unit,
      is_required: step.is_required,
      options: step.options ? JSON.parse(step.options) : null,
      // Safety metadata
      safety_note: step.safety_note,
      is_visual_only: step.is_visual_only,
      requires_equipment_stopped: step.requires_equipment_stopped,
      prohibit_if_running: step.prohibit_if_running,
      prohibit_opening_covers: step.prohibit_opening_covers
    }));

    // Prepare safety controls
    const cloneSafetyControls = source.safety_controls.map(sc => ({
      safety_type: sc.safety_type,
      description: sc.description,
      is_mandatory: sc.is_mandatory
    }));

    // Create the cloned template
    return this.createWithDetails(cloneData, cloneSteps, cloneSafetyControls);
  }

  /**
   * Update template (only if editable)
   * @param {number} id - Template ID
   * @param {Object} data - Update data
   */
  async updateIfEditable(id, data) {
    // Check if editable
    const isEditable = await this.isEditable(id);
    if (!isEditable) {
      throw new Error('System templates cannot be modified. Clone the template to make changes.');
    }

    // Filter allowed fields
    const allowedFields = [
      'industry_id', 'template_code', 'template_name', 'maintenance_type', 'task_kind',
      'task_scope', 'description', 'frequency_value', 'frequency_unit',
      'estimated_duration_minutes', 'required_skills', 'required_tools',
      'is_active'
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return null;
    }

    return this.update(id, updateData);
  }

  /**
   * Delete template (only if editable and not system)
   * @param {number} id - Template ID
   */
  async deleteIfEditable(id) {
    const isSystem = await this.isSystemTemplate(id);
    if (isSystem) {
      throw new Error('System templates cannot be deleted.');
    }

    return this.delete(id);
  }

  /**
   * Search templates with new filters
   * @param {string} searchTerm - Search term
   * @param {number} organizationId - Organization ID (optional)
   * @param {Object} filters - Optional filters (task_kind, industry_id, is_system)
   */
  async search(searchTerm, organizationId = null, filters = {}) {
    let sql = `
      SELECT 
        tt.*,
        et.type_name,
        et.type_code,
        cl.class_name,
        c.category_name,
        i.name as industry_name,
        i.code as industry_code
      FROM task_templates tt
      JOIN equipment_types et ON tt.equipment_type_id = et.id
      JOIN equipment_classes cl ON et.class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      LEFT JOIN industries i ON tt.industry_id = i.id
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

    if (filters.task_kind) {
      sql += ' AND tt.task_kind = ?';
      params.push(filters.task_kind);
    }

    if (filters.industry_id) {
      sql += ' AND tt.industry_id = ?';
      params.push(filters.industry_id);
    }

    if (filters.is_system !== undefined) {
      sql += ' AND tt.is_system = ?';
      params.push(filters.is_system);
    }
    
    sql += ' ORDER BY tt.template_name';
    
    return await this.query(sql, params);
  }

  /**
   * Get templates by industry
   * @param {number} industryId - Industry ID
   * @param {Object} filters - Optional filters
   */
  async getByIndustry(industryId, filters = {}) {
    let sql = `
      SELECT 
        tt.*,
        et.type_name,
        et.type_code,
        cl.class_name,
        c.category_name,
        i.name as industry_name
      FROM task_templates tt
      JOIN equipment_types et ON tt.equipment_type_id = et.id
      JOIN equipment_classes cl ON et.class_id = cl.id
      JOIN equipment_categories c ON cl.category_id = c.id
      JOIN industries i ON tt.industry_id = i.id
      WHERE tt.industry_id = ?
    `;
    
    const params = [industryId];

    if (filters.is_system !== undefined) {
      sql += ' AND tt.is_system = ?';
      params.push(filters.is_system);
    }

    if (filters.is_active !== undefined) {
      sql += ' AND tt.is_active = ?';
      params.push(filters.is_active);
    }
    
    sql += ' ORDER BY tt.template_name';
    
    return await this.query(sql, params);
  }

  /**
   * Get templates statistics for an organization with new fields
   * @param {number} organizationId - Organization ID
   */
  async getStats(organizationId) {
    const [result] = await this.query(`
      SELECT 
        COUNT(*) as total_templates,
        COUNT(CASE WHEN is_system = TRUE THEN 1 END) as system_templates,
        COUNT(CASE WHEN organization_id = ? THEN 1 END) as org_templates,
        COUNT(CASE WHEN task_kind = 'inspection' THEN 1 END) as inspection_templates,
        COUNT(CASE WHEN task_kind = 'measurement' THEN 1 END) as measurement_templates,
        COUNT(CASE WHEN task_kind = 'cleaning' THEN 1 END) as cleaning_templates,
        COUNT(CASE WHEN task_kind = 'lubrication' THEN 1 END) as lubrication_templates,
        COUNT(CASE WHEN task_kind = 'adjustment' THEN 1 END) as adjustment_templates,
        COUNT(CASE WHEN task_kind = 'tightening' THEN 1 END) as tightening_templates,
        COUNT(CASE WHEN task_kind = 'testing' THEN 1 END) as testing_templates,
        COUNT(CASE WHEN task_kind = 'calibration' THEN 1 END) as calibration_templates,
        COUNT(CASE WHEN task_kind = 'safety_check' THEN 1 END) as safety_check_templates,
        COUNT(CASE WHEN task_kind IS NULL THEN 1 END) as unclassified_templates
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

  /**
   * Update step with safety metadata
   * @param {number} stepId - Step ID
   * @param {Object} data - Update data including safety fields
   */
  async updateWithSafety(stepId, data) {
    const allowedFields = [
      'step_type', 'instruction', 'data_type', 'expected_value',
      'min_value', 'max_value', 'unit', 'is_required', 'options',
      'safety_note', 'is_visual_only', 'requires_equipment_stopped',
      'prohibit_if_running', 'prohibit_opening_covers'
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    if (data.options !== undefined && typeof data.options !== 'string') {
      updateData.options = JSON.stringify(data.options);
    }

    if (Object.keys(updateData).length === 0) {
      return null;
    }

    return this.update(stepId, updateData);
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
  TaskTemplateSafetyControl: new TaskTemplateSafetyControl(),
  TASK_KINDS: TaskTemplate.TASK_KINDS
};
