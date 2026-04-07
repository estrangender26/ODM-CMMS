/**
 * Custom Field Model
 * For Professional+ plans
 */

const { pool } = require('../config/database');

class CustomField {
  /**
   * Get all custom field definitions for an organization and entity type
   */
  static async getDefinitions(organizationId, entityType, options = {}) {
    const { includeInactive = false } = options;
    
    let sql = `
      SELECT cfd.*, u.username as created_by_name
      FROM custom_field_definitions cfd
      LEFT JOIN users u ON cfd.created_by = u.id
      WHERE cfd.organization_id = ? AND cfd.entity_type = ?
    `;
    
    if (!includeInactive) {
      sql += ' AND cfd.is_active = TRUE';
    }
    
    sql += ' ORDER BY cfd.sort_order, cfd.field_label';
    
    const [rows] = await pool.execute(sql, [organizationId, entityType]);
    return rows.map(this.formatDefinition);
  }

  /**
   * Get a single custom field definition
   */
  static async getDefinitionById(id) {
    const [rows] = await pool.execute(
      `SELECT cfd.*, u.username as created_by_name
       FROM custom_field_definitions cfd
       LEFT JOIN users u ON cfd.created_by = u.id
       WHERE cfd.id = ?`,
      [id]
    );
    return rows[0] ? this.formatDefinition(rows[0]) : null;
  }

  /**
   * Create a new custom field definition
   */
  static async createDefinition(data) {
    const {
      organization_id,
      entity_type,
      field_name,
      field_label,
      field_type = 'text',
      field_options,
      is_required = false,
      default_value,
      validation_regex,
      placeholder,
      help_text,
      sort_order = 0,
      created_by
    } = data;

    // Validate field name (alphanumeric and underscore only)
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field_name)) {
      throw new Error('Field name must start with a letter and contain only letters, numbers, and underscores');
    }

    const [result] = await pool.execute(
      `INSERT INTO custom_field_definitions 
       (organization_id, entity_type, field_name, field_label, field_type, 
        field_options, is_required, default_value, validation_regex, 
        placeholder, help_text, sort_order, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        organization_id,
        entity_type,
        field_name,
        field_label,
        field_type,
        field_options ? JSON.stringify(field_options) : null,
        is_required,
        default_value,
        validation_regex,
        placeholder,
        help_text,
        sort_order,
        created_by
      ]
    );

    // Log to history
    await this.logHistory(result.insertId, 'created', null, data, created_by);

    return this.getDefinitionById(result.insertId);
  }

  /**
   * Update a custom field definition
   */
  static async updateDefinition(id, data, changedBy) {
    const oldDefinition = await this.getDefinitionById(id);
    if (!oldDefinition) return null;

    const updates = [];
    const values = [];

    const allowedFields = [
      'field_label', 'field_type', 'field_options', 'is_required',
      'default_value', 'validation_regex', 'placeholder', 
      'help_text', 'sort_order', 'is_active'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        if (field === 'field_options' && data[field]) {
          values.push(JSON.stringify(data[field]));
        } else {
          values.push(data[field]);
        }
      }
    }

    if (updates.length === 0) return oldDefinition;

    values.push(id);

    await pool.execute(
      `UPDATE custom_field_definitions SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const newDefinition = await this.getDefinitionById(id);
    
    // Log to history
    await this.logHistory(id, 'updated', oldDefinition, newDefinition, changedBy);

    return newDefinition;
  }

  /**
   * Delete a custom field definition (soft delete by deactivating)
   */
  static async deleteDefinition(id, deletedBy, hardDelete = false) {
    const definition = await this.getDefinitionById(id);
    if (!definition) return false;

    if (hardDelete) {
      // Delete all values first
      await pool.execute(
        'DELETE FROM custom_field_values WHERE field_definition_id = ?',
        [id]
      );
      await pool.execute(
        'DELETE FROM custom_field_definitions WHERE id = ?',
        [id]
      );
    } else {
      // Soft delete - just deactivate
      await pool.execute(
        'UPDATE custom_field_definitions SET is_active = FALSE WHERE id = ?',
        [id]
      );
    }

    // Log to history
    await this.logHistory(id, 'deleted', definition, null, deletedBy);

    return true;
  }

  /**
   * Get custom field values for an entity
   */
  static async getValues(organizationId, entityType, entityId) {
    const [rows] = await pool.execute(
      `SELECT cfv.*, cfd.field_name, cfd.field_label, cfd.field_type,
              cfd.field_options, cfd.is_required, cfd.validation_regex
       FROM custom_field_values cfv
       JOIN custom_field_definitions cfd ON cfv.field_definition_id = cfd.id
       WHERE cfd.organization_id = ? 
         AND cfv.entity_type = ? 
         AND cfv.entity_id = ?
         AND cfd.is_active = TRUE`,
      [organizationId, entityType, entityId]
    );
    return rows.map(this.formatValue);
  }

  /**
   * Get all custom field values for multiple entities (bulk fetch)
   */
  static async getValuesForEntities(organizationId, entityType, entityIds) {
    if (!entityIds || entityIds.length === 0) return {};

    const placeholders = entityIds.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT cfv.*, cfd.field_name, cfd.field_label, cfd.field_type
       FROM custom_field_values cfv
       JOIN custom_field_definitions cfd ON cfv.field_definition_id = cfd.id
       WHERE cfd.organization_id = ? 
         AND cfv.entity_type = ? 
         AND cfv.entity_id IN (${placeholders})
         AND cfd.is_active = TRUE`,
      [organizationId, entityType, ...entityIds]
    );

    // Group by entity_id
    const grouped = {};
    entityIds.forEach(id => grouped[id] = []);
    
    rows.forEach(row => {
      if (!grouped[row.entity_id]) grouped[row.entity_id] = [];
      grouped[row.entity_id].push(this.formatValue(row));
    });

    return grouped;
  }

  /**
   * Set a custom field value
   */
  static async setValue(fieldDefinitionId, entityId, entityType, value, changedBy) {
    const definition = await this.getDefinitionById(fieldDefinitionId);
    if (!definition) throw new Error('Custom field definition not found');

    // Validate value
    const validation = this.validateValue(value, definition);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Determine which column to use based on field type
    const valueData = this.prepareValueForStorage(value, definition.field_type);

    // Check if value already exists
    const [existing] = await pool.execute(
      'SELECT id FROM custom_field_values WHERE field_definition_id = ? AND entity_id = ?',
      [fieldDefinitionId, entityId]
    );

    let oldValue = null;

    if (existing.length > 0) {
      // Get old value for history
      const [old] = await pool.execute(
        'SELECT * FROM custom_field_values WHERE id = ?',
        [existing[0].id]
      );
      oldValue = old[0];

      // Update
      await pool.execute(
        `UPDATE custom_field_values 
         SET value_text = ?, value_number = ?, value_date = ?, 
             value_datetime = ?, value_json = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          valueData.text,
          valueData.number,
          valueData.date,
          valueData.datetime,
          valueData.json,
          existing[0].id
        ]
      );
    } else {
      // Insert
      await pool.execute(
        `INSERT INTO custom_field_values 
         (field_definition_id, entity_id, entity_type, value_text, 
          value_number, value_date, value_datetime, value_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fieldDefinitionId,
          entityId,
          entityType,
          valueData.text,
          valueData.number,
          valueData.date,
          valueData.datetime,
          valueData.json
        ]
      );
    }

    // Log to history
    await this.logHistory(fieldDefinitionId, 'value_changed', 
      { entity_id: entityId, value: oldValue }, 
      { entity_id: entityId, value: value }, 
      changedBy
    );

    return true;
  }

  /**
   * Delete custom field values for an entity
   */
  static async deleteValuesForEntity(entityType, entityId) {
    await pool.execute(
      'DELETE FROM custom_field_values WHERE entity_type = ? AND entity_id = ?',
      [entityType, entityId]
    );
    return true;
  }

  /**
   * Count custom fields for an organization
   */
  static async countForOrganization(organizationId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM custom_field_definitions WHERE organization_id = ? AND is_active = TRUE',
      [organizationId]
    );
    return rows[0].count;
  }

  /**
   * Count custom fields by entity type
   */
  static async countByEntityType(organizationId, entityType) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) as count FROM custom_field_definitions 
       WHERE organization_id = ? AND entity_type = ? AND is_active = TRUE`,
      [organizationId, entityType]
    );
    return rows[0].count;
  }

  // Helper methods
  static formatDefinition(row) {
    return {
      id: row.id,
      organization_id: row.organization_id,
      entity_type: row.entity_type,
      field_name: row.field_name,
      field_label: row.field_label,
      field_type: row.field_type,
      field_options: row.field_options ? JSON.parse(row.field_options) : null,
      is_required: row.is_required === 1,
      default_value: row.default_value,
      validation_regex: row.validation_regex,
      placeholder: row.placeholder,
      help_text: row.help_text,
      sort_order: row.sort_order,
      is_active: row.is_active === 1,
      created_by: row.created_by,
      created_by_name: row.created_by_name,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  static formatValue(row) {
    let displayValue;
    
    switch (row.field_type) {
      case 'number':
        displayValue = row.value_number;
        break;
      case 'date':
        displayValue = row.value_date;
        break;
      case 'datetime':
        displayValue = row.value_datetime;
        break;
      case 'select':
      case 'multiselect':
      case 'checkbox':
        displayValue = row.value_json ? JSON.parse(row.value_json) : null;
        break;
      default:
        displayValue = row.value_text;
    }

    return {
      id: row.id,
      field_definition_id: row.field_definition_id,
      field_name: row.field_name,
      field_label: row.field_label,
      field_type: row.field_type,
      value: displayValue,
      entity_id: row.entity_id,
      entity_type: row.entity_type
    };
  }

  static validateValue(value, definition) {
    if (definition.is_required && (value === null || value === undefined || value === '')) {
      return { valid: false, error: `${definition.field_label} is required` };
    }

    if (!value && !definition.is_required) {
      return { valid: true };
    }

    // Regex validation
    if (definition.validation_regex && value) {
      const regex = new RegExp(definition.validation_regex);
      if (!regex.test(String(value))) {
        return { valid: false, error: `${definition.field_label} has invalid format` };
      }
    }

    return { valid: true };
  }

  static prepareValueForStorage(value, fieldType) {
    const result = {
      text: null,
      number: null,
      date: null,
      datetime: null,
      json: null
    };

    if (value === null || value === undefined) return result;

    switch (fieldType) {
      case 'number':
        result.number = parseFloat(value);
        result.text = String(value);
        break;
      case 'date':
        result.date = value;
        result.text = String(value);
        break;
      case 'datetime':
        result.datetime = value;
        result.text = String(value);
        break;
      case 'select':
      case 'multiselect':
      case 'checkbox':
        result.json = JSON.stringify(value);
        result.text = Array.isArray(value) ? value.join(', ') : String(value);
        break;
      default:
        result.text = String(value);
    }

    return result;
  }

  static async logHistory(fieldDefinitionId, action, oldValue, newValue, changedBy) {
    try {
      await pool.execute(
        `INSERT INTO custom_field_history 
         (field_definition_id, action, old_value, new_value, changed_by)
         VALUES (?, ?, ?, ?, ?)`,
        [
          fieldDefinitionId,
          action,
          oldValue ? JSON.stringify(oldValue) : null,
          newValue ? JSON.stringify(newValue) : null,
          changedBy
        ]
      );
    } catch (err) {
      console.error('Failed to log custom field history:', err);
    }
  }
}

module.exports = CustomField;
