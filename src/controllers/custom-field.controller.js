/**
 * Custom Field Controller
 * For Professional+ plans
 */

const { CustomField } = require('../models');

/**
 * Get custom field definitions for an entity type
 */
const getDefinitions = async (req, res, next) => {
  try {
    const { entityType } = req.params;
    const organizationId = req.user.organization_id;
    
    const definitions = await CustomField.getDefinitions(organizationId, entityType);
    
    res.json({
      success: true,
      data: { definitions }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single custom field definition
 */
const getDefinitionById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const definition = await CustomField.getDefinitionById(id);
    
    if (!definition) {
      return res.status(404).json({
        success: false,
        message: 'Custom field definition not found'
      });
    }
    
    // Verify organization access
    if (definition.organization_id !== req.user.organization_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    res.json({
      success: true,
      data: { definition }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a custom field definition
 */
const createDefinition = async (req, res, next) => {
  try {
    const {
      entity_type,
      field_name,
      field_label,
      field_type,
      field_options,
      is_required,
      default_value,
      validation_regex,
      placeholder,
      help_text,
      sort_order
    } = req.body;
    
    // Validate required fields
    if (!entity_type || !field_name || !field_label) {
      return res.status(400).json({
        success: false,
        message: 'entity_type, field_name, and field_label are required'
      });
    }
    
    const definition = await CustomField.createDefinition({
      organization_id: req.user.organization_id,
      entity_type,
      field_name,
      field_label,
      field_type,
      field_options,
      is_required,
      default_value,
      validation_regex,
      placeholder,
      help_text,
      sort_order,
      created_by: req.user.id
    });
    
    res.status(201).json({
      success: true,
      message: 'Custom field created successfully',
      data: { definition }
    });
  } catch (error) {
    if (error.message.includes('Field name must start with a letter')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'A custom field with this name already exists for this entity type'
      });
    }
    next(error);
  }
};

/**
 * Update a custom field definition
 */
const updateDefinition = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Get existing definition
    const existing = await CustomField.getDefinitionById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Custom field definition not found'
      });
    }
    
    // Verify organization access
    if (existing.organization_id !== req.user.organization_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const updated = await CustomField.updateDefinition(id, req.body, req.user.id);
    
    res.json({
      success: true,
      message: 'Custom field updated successfully',
      data: { definition: updated }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a custom field definition
 */
const deleteDefinition = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { hard } = req.query;
    
    // Get existing definition
    const existing = await CustomField.getDefinitionById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Custom field definition not found'
      });
    }
    
    // Verify organization access
    if (existing.organization_id !== req.user.organization_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await CustomField.deleteDefinition(id, req.user.id, hard === 'true');
    
    res.json({
      success: true,
      message: 'Custom field deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get custom field values for an entity
 */
const getValues = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    const organizationId = req.user.organization_id;
    
    const values = await CustomField.getValues(organizationId, entityType, entityId);
    
    res.json({
      success: true,
      data: { values }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Set custom field value
 */
const setValue = async (req, res, next) => {
  try {
    const { fieldDefinitionId, entityId } = req.params;
    const { value, entity_type } = req.body;
    
    // Verify the field definition exists and belongs to the organization
    const definition = await CustomField.getDefinitionById(fieldDefinitionId);
    if (!definition) {
      return res.status(404).json({
        success: false,
        message: 'Custom field definition not found'
      });
    }
    
    if (definition.organization_id !== req.user.organization_id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await CustomField.setValue(
      fieldDefinitionId,
      entityId,
      entity_type || definition.entity_type,
      value,
      req.user.id
    );
    
    res.json({
      success: true,
      message: 'Custom field value saved successfully'
    });
  } catch (error) {
    if (error.message.includes('is required') || error.message.includes('invalid format')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};

/**
 * Set multiple custom field values at once
 */
const setMultipleValues = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    const { values } = req.body;
    const organizationId = req.user.organization_id;
    
    if (!values || typeof values !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'values object is required'
      });
    }
    
    // Get all definitions for this entity type
    const definitions = await CustomField.getDefinitions(organizationId, entityType);
    const definitionMap = {};
    definitions.forEach(d => {
      definitionMap[d.field_name] = d;
      definitionMap[d.id] = d;
    });
    
    const results = [];
    const errors = [];
    
    // Process each value
    for (const [key, value] of Object.entries(values)) {
      const definition = definitionMap[key];
      if (!definition) {
        errors.push({ field: key, error: 'Field not found' });
        continue;
      }
      
      try {
        await CustomField.setValue(
          definition.id,
          entityId,
          entityType,
          value,
          req.user.id
        );
        results.push({ field: key, success: true });
      } catch (err) {
        errors.push({ field: key, error: err.message });
      }
    }
    
    res.json({
      success: errors.length === 0,
      message: `${results.length} values saved, ${errors.length} errors`,
      data: { results, errors }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get custom field usage statistics
 */
const getStats = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    
    const totalFields = await CustomField.countForOrganization(organizationId);
    
    // Get counts by entity type
    const entityTypes = ['work_order', 'equipment', 'finding', 'user'];
    const byEntityType = {};
    
    for (const type of entityTypes) {
      byEntityType[type] = await CustomField.countByEntityType(organizationId, type);
    }
    
    res.json({
      success: true,
      data: {
        total_fields: totalFields,
        by_entity_type: byEntityType,
        limit: req.featureLimit || null
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDefinitions,
  getDefinitionById,
  createDefinition,
  updateDefinition,
  deleteDefinition,
  getValues,
  setValue,
  setMultipleValues,
  getStats
};
