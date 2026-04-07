/**
 * Task Template Controller
 * ISO 14224-aligned maintenance task templates
 * Linked to equipment types (not SMP Families)
 */

const { TaskTemplate, EquipmentType } = require('../models');

/**
 * Get all task templates (with optional filters)
 */
const getAll = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { scheduled, is_active } = req.query;
    
    let sql = `
      SELECT 
        tt.*,
        et.type_name,
        et.type_code
      FROM task_templates tt
      JOIN equipment_types et ON tt.equipment_type_id = et.id
      WHERE (
        tt.organization_id IS NULL 
        OR tt.organization_id = ?
      )
    `;
    
    const params = [organizationId];
    
    // Filter for scheduled templates only
    if (scheduled === 'true') {
      sql += ' AND tt.frequency_type IS NOT NULL';
    }
    
    // Filter by active status
    if (is_active !== undefined) {
      sql += ' AND tt.is_active = ?';
      params.push(is_active === 'true');
    }
    
    sql += ' ORDER BY tt.template_name';
    
    const templates = await TaskTemplate.query(sql, params);
    
    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get task templates for an equipment type
 */
const getByEquipmentType = async (req, res, next) => {
  try {
    const { equipmentTypeId } = req.params;
    const organizationId = req.user.organization_id;
    const { maintenance_type, is_active } = req.query;
    
    const filters = {};
    if (maintenance_type) filters.maintenance_type = maintenance_type;
    if (is_active !== undefined) filters.is_active = is_active === 'true';
    
    const templates = await TaskTemplate.findByEquipmentType(
      equipmentTypeId, 
      organizationId, 
      filters
    );
    
    res.json({
      success: true,
      data: { templates }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get task templates applicable to an asset
 */
const getForAsset = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const organizationId = req.user.organization_id;
    
    // Get asset's equipment type
    const { Equipment } = require('../models');
    const asset = await Equipment.findById(assetId);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    if (!asset.equipment_type_id) {
      return res.status(400).json({
        success: false,
        message: 'Asset does not have ISO equipment classification'
      });
    }
    
    const templates = await TaskTemplate.getTemplatesForAsset(
      asset.equipment_type_id,
      organizationId
    );
    
    res.json({
      success: true,
      data: { 
        templates,
        asset: {
          id: asset.id,
          name: asset.name,
          code: asset.code,
          equipment_type_id: asset.equipment_type_id
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get task template details with steps and safety controls
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    const template = await TaskTemplate.getWithDetails(id);
    
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Task template not found'
      });
    }
    
    // Check access: global templates or organization's own templates
    if (template.organization_id !== null && template.organization_id !== organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      data: { template }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new task template
 */
const create = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    
    const {
      equipment_type_id,
      template_code,
      template_name,
      maintenance_type,
      task_scope,
      description,
      frequency_value,
      frequency_unit,
      estimated_duration_minutes,
      required_skills,
      required_tools,
      steps,
      safety_controls
    } = req.body;
    
    // Validate required fields
    if (!equipment_type_id || !template_name || !maintenance_type) {
      return res.status(400).json({
        success: false,
        message: 'equipment_type_id, template_name, and maintenance_type are required'
      });
    }
    
    // Verify equipment type exists
    const equipType = await EquipmentType.findById(equipment_type_id);
    if (!equipType) {
      return res.status(400).json({
        success: false,
        message: 'Invalid equipment type'
      });
    }
    
    const template = await TaskTemplate.createWithDetails(
      {
        organization_id: organizationId,
        equipment_type_id,
        template_code,
        template_name,
        maintenance_type,
        task_scope,
        description,
        frequency_value,
        frequency_unit,
        estimated_duration_minutes,
        required_skills,
        required_tools,
        created_by: userId
      },
      steps || [],
      safety_controls || []
    );
    
    res.status(201).json({
      success: true,
      message: 'Task template created successfully',
      data: { template }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search task templates
 */
const search = async (req, res, next) => {
  try {
    const { q } = req.query;
    const organizationId = req.user.organization_id;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search term must be at least 2 characters'
      });
    }
    
    const templates = await TaskTemplate.search(q, organizationId);
    
    res.json({
      success: true,
      data: { templates }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get task template statistics
 */
const getStats = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    
    const stats = await TaskTemplate.getStats(organizationId);
    
    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update task template
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    // Check template exists and belongs to organization
    const existing = await TaskTemplate.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Task template not found'
      });
    }
    
    // Only organization-specific templates can be updated
    // Global templates (organization_id IS NULL) cannot be modified
    if (existing.organization_id === null) {
      return res.status(403).json({
        success: false,
        message: 'Global system templates cannot be modified. Create a custom template instead.'
      });
    }
    
    if (existing.organization_id !== organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const updateData = { ...req.body };
    delete updateData.id;
    delete updateData.created_by;
    delete updateData.created_at;
    
    await TaskTemplate.update(id, updateData);
    
    const updated = await TaskTemplate.getWithDetails(id);
    
    res.json({
      success: true,
      message: 'Task template updated successfully',
      data: { template: updated }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete task template
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    // Check template exists and belongs to organization
    const existing = await TaskTemplate.findById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Task template not found'
      });
    }
    
    // Cannot delete global templates
    if (existing.organization_id === null) {
      return res.status(403).json({
        success: false,
        message: 'Global system templates cannot be deleted'
      });
    }
    
    if (existing.organization_id !== organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await TaskTemplate.delete(id);
    
    res.json({
      success: true,
      message: 'Task template deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getByEquipmentType,
  getForAsset,
  getById,
  create,
  search,
  getStats,
  update,
  remove
};
