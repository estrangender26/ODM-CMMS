/**
 * Maintenance Plan Controller
 * Manages schedules that link templates to equipment
 */

const { getDb } = require('../config/database');
const db = getDb();

/**
 * Get all maintenance plans for organization
 */
const getAll = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { active } = req.query;
    
    let sql = `
      SELECT 
        mp.*,
        tt.template_name,
        e.name as equipment_name,
        e.code as equipment_code
      FROM maintenance_plans mp
      JOIN task_templates tt ON mp.task_template_id = tt.id
      LEFT JOIN equipment e ON mp.equipment_id = e.id
      WHERE mp.organization_id = ?
    `;
    
    const params = [organizationId];
    
    if (active === 'true') {
      sql += ' AND mp.is_active = TRUE';
    }
    
    sql += ' ORDER BY mp.plan_name';
    
    const plans = await db.query(sql, params);
    
    res.json({
      success: true,
      data: plans
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get maintenance plan by ID
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    const [plan] = await db.query(`
      SELECT 
        mp.*,
        tt.template_name,
        tt.description as template_description,
        e.name as equipment_name,
        e.code as equipment_code
      FROM maintenance_plans mp
      JOIN task_templates tt ON mp.task_template_id = tt.id
      LEFT JOIN equipment e ON mp.equipment_id = e.id
      WHERE mp.id = ? AND mp.organization_id = ?
    `, [id, organizationId]);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance plan not found'
      });
    }
    
    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new maintenance plan
 */
const create = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const {
      task_template_id,
      equipment_id,
      plan_code,
      plan_name,
      description,
      frequency_type,
      frequency_interval,
      day_of_week,
      day_of_month,
      start_date,
      end_date,
      priority,
      assigned_to
    } = req.body;
    
    // Validate required fields
    if (!task_template_id || !plan_name || !frequency_type || !start_date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: task_template_id, plan_name, frequency_type, start_date'
      });
    }
    
    const result = await db.query(`
      INSERT INTO maintenance_plans (
        organization_id, task_template_id, equipment_id, plan_code, plan_name,
        description, frequency_type, frequency_interval, day_of_week, day_of_month,
        start_date, end_date, priority, assigned_to, is_active, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)
    `, [
      organizationId, task_template_id, equipment_id || null, plan_code || null, plan_name,
      description || null, frequency_type, frequency_interval || 1, day_of_week || null, 
      day_of_month || null, start_date, end_date || null, priority || 'medium', 
      assigned_to || null, req.user.id
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Maintenance plan created',
      data: { id: result.insertId }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update maintenance plan
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    const updates = req.body;
    
    // Check if plan exists and belongs to this organization
    const [existing] = await db.query(
      'SELECT id FROM maintenance_plans WHERE id = ? AND organization_id = ?',
      [id, organizationId]
    );
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance plan not found'
      });
    }
    
    // Build update SQL dynamically
    const allowedFields = [
      'plan_code', 'plan_name', 'description', 'frequency_type', 
      'frequency_interval', 'day_of_week', 'day_of_month', 
      'start_date', 'end_date', 'priority', 'assigned_to', 'is_active'
    ];
    
    const fields = [];
    const values = [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }
    
    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }
    
    values.push(id);
    
    await db.query(
      `UPDATE maintenance_plans SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
    
    res.json({
      success: true,
      message: 'Maintenance plan updated'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete maintenance plan
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    const result = await db.query(
      'DELETE FROM maintenance_plans WHERE id = ? AND organization_id = ?',
      [id, organizationId]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance plan not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Maintenance plan deleted'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove
};
