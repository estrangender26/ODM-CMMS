/**
 * Schedule Model
 */

const BaseModel = require('./base.model');

class ScheduleModel extends BaseModel {
  constructor() {
    super('schedules');
  }

  /**
   * Get all schedules with related info
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  async getAllWithDetails(filters = {}) {
    let sql = `
      SELECT s.*, 
        e.name as equipment_name, e.code as equipment_code,
        tm.task_code, tm.title as task_title, tm.task_type,
        u.full_name as assigned_to_name
      FROM ${this.tableName} s
      JOIN equipment e ON s.equipment_id = e.id
      JOIN task_master tm ON s.task_master_id = tm.id
      LEFT JOIN users u ON s.assigned_to = u.id
    `;

    const params = [];
    const conditions = ['s.is_active = TRUE'];

    if (filters.equipment_id) {
      conditions.push('s.equipment_id = ?');
      params.push(filters.equipment_id);
    }
    if (filters.assigned_to) {
      conditions.push('s.assigned_to = ?');
      params.push(filters.assigned_to);
    }
    if (filters.frequency_type) {
      conditions.push('s.frequency_type = ?');
      params.push(filters.frequency_type);
    }

    sql += ` WHERE ${conditions.join(' AND ')}`;
    sql += ` ORDER BY s.next_due_date`;

    return this.query(sql, params);
  }

  /**
   * Get overdue schedules
   * @returns {Promise<Array>}
   */
  async getOverdue() {
    const sql = `
      SELECT s.*, 
        e.name as equipment_name, e.code as equipment_code,
        tm.title as task_title
      FROM ${this.tableName} s
      JOIN equipment e ON s.equipment_id = e.id
      JOIN task_master tm ON s.task_master_id = tm.id
      WHERE s.is_active = TRUE
        AND s.next_due_date < CURDATE()
      ORDER BY s.next_due_date
    `;
    return this.query(sql);
  }

  /**
   * Get overdue schedules by facility
   * @param {number} facilityId
   * @returns {Promise<Array>}
   */
  async getOverdueByFacility(facilityId) {
    const sql = `
      SELECT s.*, 
        e.name as equipment_name, e.code as equipment_code,
        tm.title as task_title
      FROM ${this.tableName} s
      JOIN equipment e ON s.equipment_id = e.id
      JOIN task_master tm ON s.task_master_id = tm.id
      WHERE s.is_active = TRUE
        AND e.facility_id = ?
        AND s.next_due_date < CURDATE()
      ORDER BY s.next_due_date
    `;
    return this.query(sql, [facilityId]);
  }

  /**
   * Get schedules due today
   * @returns {Promise<Array>}
   */
  async getDueToday() {
    const sql = `
      SELECT s.*, 
        e.name as equipment_name, e.code as equipment_code,
        tm.title as task_title
      FROM ${this.tableName} s
      JOIN equipment e ON s.equipment_id = e.id
      JOIN task_master tm ON s.task_master_id = tm.id
      WHERE s.is_active = TRUE
        AND s.next_due_date = CURDATE()
      ORDER BY s.priority
    `;
    return this.query(sql);
  }

  /**
   * Get schedules due today by facility
   * @param {number} facilityId
   * @returns {Promise<Array>}
   */
  async getDueTodayByFacility(facilityId) {
    const sql = `
      SELECT s.*, 
        e.name as equipment_name, e.code as equipment_code,
        tm.title as task_title
      FROM ${this.tableName} s
      JOIN equipment e ON s.equipment_id = e.id
      JOIN task_master tm ON s.task_master_id = tm.id
      WHERE s.is_active = TRUE
        AND e.facility_id = ?
        AND s.next_due_date = CURDATE()
      ORDER BY s.priority
    `;
    return this.query(sql, [facilityId]);
  }

  /**
   * Update next due date
   * @param {number} scheduleId
   * @param {Date} nextDueDate
   */
  async updateNextDueDate(scheduleId, nextDueDate) {
    return this.update(scheduleId, { next_due_date: nextDueDate });
  }

  /**
   * Get schedules by facility
   * @param {number} facilityId
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  async getByFacility(facilityId, filters = {}) {
    let sql = `
      SELECT s.*, 
        e.name as equipment_name, e.code as equipment_code,
        tm.task_code, tm.title as task_title, tm.task_type,
        u.full_name as assigned_to_name
      FROM ${this.tableName} s
      JOIN equipment e ON s.equipment_id = e.id
      JOIN task_master tm ON s.task_master_id = tm.id
      LEFT JOIN users u ON s.assigned_to = u.id
      WHERE s.is_active = TRUE AND e.facility_id = ?
    `;

    const params = [facilityId];

    if (filters.equipment_id) {
      sql += ' AND s.equipment_id = ?';
      params.push(filters.equipment_id);
    }
    if (filters.assigned_to) {
      sql += ' AND s.assigned_to = ?';
      params.push(filters.assigned_to);
    }
    if (filters.frequency_type) {
      sql += ' AND s.frequency_type = ?';
      params.push(filters.frequency_type);
    }

    sql += ` ORDER BY s.next_due_date`;

    return this.query(sql, params);
  }

  /**
   * Check if schedule belongs to facility
   * @param {number} scheduleId
   * @param {number} facilityId
   * @returns {Promise<boolean>}
   */
  async belongsToFacility(scheduleId, facilityId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM ${this.tableName} s
      JOIN equipment e ON s.equipment_id = e.id
      WHERE s.id = ? AND e.facility_id = ?
    `;
    const [result] = await this.query(sql, [scheduleId, facilityId]);
    return result.count > 0;
  }
}

module.exports = new ScheduleModel();
