/**
 * Schedule Model
 * Multi-tenant aware schedule management
 */

const BaseModel = require('./base.model');

class ScheduleModel extends BaseModel {
  constructor() {
    super('schedules');
  }

  /**
   * Get all schedules with related info (organization-aware)
   * @param {number} organizationId
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  async getAllWithDetails(organizationId, filters = {}) {
    let sql = `
      SELECT s.*, 
        e.name as equipment_name, e.code as equipment_code,
        tm.task_code, tm.title as task_title, tm.task_type,
        u.full_name as assigned_to_name
      FROM ${this.tableName} s
      JOIN equipment e ON s.equipment_id = e.id
      JOIN task_master tm ON s.task_master_id = tm.id
      LEFT JOIN users u ON s.assigned_to = u.id
      WHERE s.organization_id = ?
    `;

    const params = [organizationId];
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

    sql += ` AND ${conditions.join(' AND ')}`;
    sql += ` ORDER BY s.next_due_date`;

    return this.query(sql, params);
  }

  /**
   * Get overdue schedules (organization-aware)
   * @param {number} organizationId
   * @returns {Promise<Array>}
   */
  async getOverdue(organizationId) {
    const sql = `
      SELECT s.*, 
        e.name as equipment_name, e.code as equipment_code,
        tm.title as task_title
      FROM ${this.tableName} s
      JOIN equipment e ON s.equipment_id = e.id
      JOIN task_master tm ON s.task_master_id = tm.id
      WHERE s.organization_id = ?
        AND s.is_active = TRUE
        AND s.next_due_date < CURDATE()
      ORDER BY s.next_due_date
    `;
    return this.query(sql, [organizationId]);
  }

  /**
   * Get overdue schedules by facility (organization-aware)
   * @param {number} facilityId
   * @param {number} organizationId
   * @returns {Promise<Array>}
   */
  async getOverdueByFacility(facilityId, organizationId) {
    const sql = `
      SELECT s.*, 
        e.name as equipment_name, e.code as equipment_code,
        tm.title as task_title
      FROM ${this.tableName} s
      JOIN equipment e ON s.equipment_id = e.id
      JOIN task_master tm ON s.task_master_id = tm.id
      WHERE s.organization_id = ?
        AND e.facility_id = ?
        AND s.is_active = TRUE
        AND s.next_due_date < CURDATE()
      ORDER BY s.next_due_date
    `;
    return this.query(sql, [organizationId, facilityId]);
  }

  /**
   * Get schedules due today (organization-aware)
   * @param {number} organizationId
   * @returns {Promise<Array>}
   */
  async getDueToday(organizationId) {
    const sql = `
      SELECT s.*, 
        e.name as equipment_name, e.code as equipment_code,
        tm.title as task_title
      FROM ${this.tableName} s
      JOIN equipment e ON s.equipment_id = e.id
      JOIN task_master tm ON s.task_master_id = tm.id
      WHERE s.organization_id = ?
        AND s.is_active = TRUE
        AND s.next_due_date = CURDATE()
      ORDER BY s.priority
    `;
    return this.query(sql, [organizationId]);
  }

  /**
   * Get schedules due today by facility (organization-aware)
   * @param {number} facilityId
   * @param {number} organizationId
   * @returns {Promise<Array>}
   */
  async getDueTodayByFacility(facilityId, organizationId) {
    const sql = `
      SELECT s.*, 
        e.name as equipment_name, e.code as equipment_code,
        tm.title as task_title
      FROM ${this.tableName} s
      JOIN equipment e ON s.equipment_id = e.id
      JOIN task_master tm ON s.task_master_id = tm.id
      WHERE s.organization_id = ?
        AND e.facility_id = ?
        AND s.is_active = TRUE
        AND s.next_due_date = CURDATE()
      ORDER BY s.priority
    `;
    return this.query(sql, [organizationId, facilityId]);
  }

  /**
   * Update next due date
   * @param {number} scheduleId
   * @param {Date} nextDueDate
   * @returns {Promise}
   */
  async updateNextDueDate(scheduleId, nextDueDate) {
    return this.update(scheduleId, { next_due_date: nextDueDate });
  }

  /**
   * Get schedules by facility (organization-aware)
   * @param {number} facilityId
   * @param {number} organizationId
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  async getByFacility(facilityId, organizationId, filters = {}) {
    let sql = `
      SELECT s.*, 
        e.name as equipment_name, e.code as equipment_code,
        tm.task_code, tm.title as task_title, tm.task_type,
        u.full_name as assigned_to_name
      FROM ${this.tableName} s
      JOIN equipment e ON s.equipment_id = e.id
      JOIN task_master tm ON s.task_master_id = tm.id
      LEFT JOIN users u ON s.assigned_to = u.id
      WHERE s.organization_id = ? AND e.facility_id = ? AND s.is_active = TRUE
    `;

    const params = [organizationId, facilityId];

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
   * Check if schedule belongs to organization
   * @param {number} scheduleId
   * @param {number} organizationId
   * @returns {Promise<boolean>}
   */
  async belongsToOrganization(scheduleId, organizationId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE id = ? AND organization_id = ?
    `;
    const [result] = await this.query(sql, [scheduleId, organizationId]);
    return result.count > 0;
  }

  /**
   * Check if schedule belongs to facility (organization-aware)
   * @param {number} scheduleId
   * @param {number} facilityId
   * @param {number} organizationId
   * @returns {Promise<boolean>}
   */
  async belongsToFacility(scheduleId, facilityId, organizationId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM ${this.tableName} s
      JOIN equipment e ON s.equipment_id = e.id
      WHERE s.id = ? AND e.facility_id = ? AND s.organization_id = ?
    `;
    const [result] = await this.query(sql, [scheduleId, facilityId, organizationId]);
    return result.count > 0;
  }

  /**
   * Get schedules by equipment (organization-aware)
   * @param {number} equipmentId
   * @param {number} organizationId
   * @returns {Promise<Array>}
   */
  async getByEquipment(equipmentId, organizationId) {
    return this.findAll(
      { equipment_id: equipmentId, organization_id: organizationId, is_active: true },
      { orderBy: 'next_due_date' }
    );
  }

  /**
   * Get schedule count by organization
   * @param {number} organizationId
   * @param {Object} filters
   * @returns {Promise<number>}
   */
  async countByOrganization(organizationId, filters = {}) {
    const filterConditions = { organization_id: organizationId };
    
    if (filters.is_active !== undefined) {
      filterConditions.is_active = filters.is_active;
    }

    return this.count(filterConditions);
  }
}

module.exports = new ScheduleModel();
