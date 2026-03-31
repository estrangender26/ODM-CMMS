/**
 * Task Master Model
 * Multi-tenant aware task management
 */

const BaseModel = require('./base.model');

class TaskMasterModel extends BaseModel {
  constructor() {
    super('task_master');
  }

  /**
   * Get active tasks (organization-aware)
   * @param {number} organizationId
   * @returns {Promise<Array>}
   */
  async getActive(organizationId) {
    return this.findAll(
      { organization_id: organizationId, is_active: true }, 
      { orderBy: 'task_code' }
    );
  }

  /**
   * Find task by code (organization-aware)
   * @param {string} code
   * @param {number} organizationId
   * @returns {Promise<Object|null>}
   */
  async findByCode(code, organizationId) {
    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE task_code = ? AND organization_id = ?
    `;
    const [row] = await this.query(sql, [code, organizationId]);
    return row || null;
  }

  /**
   * Get tasks by type (organization-aware)
   * @param {string} taskType
   * @param {number} organizationId
   * @returns {Promise<Array>}
   */
  async getByType(taskType, organizationId) {
    return this.findAll({ 
      task_type: taskType, 
      organization_id: organizationId,
      is_active: true 
    });
  }

  /**
   * Get task with inspection points (organization-aware)
   * @param {number} taskId
   * @param {number} organizationId
   * @returns {Promise<Object|null>}
   */
  async getWithInspectionPoints(taskId, organizationId) {
    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE id = ? AND organization_id = ?
    `;
    const [task] = await this.query(sql, [taskId, organizationId]);
    if (!task) return null;

    const pointsSql = `
      SELECT * FROM inspection_points
      WHERE task_master_id = ? AND organization_id = ? AND is_active = TRUE
      ORDER BY sort_order, id
    `;
    const points = await this.query(pointsSql, [taskId, organizationId]);
    
    return { ...task, inspection_points: points };
  }

  /**
   * Get task types summary (organization-aware)
   * @param {number} organizationId
   * @returns {Promise<Array>}
   */
  async getTypeSummary(organizationId) {
    const sql = `
      SELECT task_type, COUNT(*) as count
      FROM ${this.tableName}
      WHERE organization_id = ? AND is_active = TRUE
      GROUP BY task_type
      ORDER BY task_type
    `;
    return this.query(sql, [organizationId]);
  }

  /**
   * Get tasks by organization with pagination
   * @param {number} organizationId
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async getByOrganization(organizationId, options = {}) {
    const filterConditions = { organization_id: organizationId };
    
    if (options.is_active !== undefined) {
      filterConditions.is_active = options.is_active;
    }
    if (options.task_type) {
      filterConditions.task_type = options.task_type;
    }

    return this.findAll(filterConditions, {
      orderBy: options.orderBy || 'task_code',
      order: options.order || 'asc',
      limit: options.limit,
      offset: options.offset
    });
  }

  /**
   * Check if task code exists in organization
   * @param {string} code
   * @param {number} organizationId
   * @param {number} excludeTaskId - Optional task ID to exclude (for updates)
   * @returns {Promise<boolean>}
   */
  async codeExistsInOrganization(code, organizationId, excludeTaskId = null) {
    let sql = `
      SELECT COUNT(*) as count 
      FROM ${this.tableName} 
      WHERE task_code = ? AND organization_id = ?
    `;
    const params = [code, organizationId];
    
    if (excludeTaskId) {
      sql += ' AND id != ?';
      params.push(excludeTaskId);
    }
    
    const [result] = await this.query(sql, params);
    return result.count > 0;
  }

  /**
   * Check if task belongs to organization
   * @param {number} taskId
   * @param {number} organizationId
   * @returns {Promise<boolean>}
   */
  async belongsToOrganization(taskId, organizationId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE id = ? AND organization_id = ?
    `;
    const [result] = await this.query(sql, [taskId, organizationId]);
    return result.count > 0;
  }

  /**
   * Search tasks (organization-aware)
   * @param {string} searchTerm
   * @param {number} organizationId
   * @returns {Promise<Array>}
   */
  async search(searchTerm, organizationId) {
    const sql = `
      SELECT *
      FROM ${this.tableName}
      WHERE organization_id = ?
      AND is_active = TRUE
      AND (title LIKE ? OR task_code LIKE ? OR description LIKE ?)
      ORDER BY task_code
    `;
    const likeTerm = `%${searchTerm}%`;
    return this.query(sql, [organizationId, likeTerm, likeTerm, likeTerm]);
  }

  /**
   * Count tasks by organization
   * @param {number} organizationId
   * @param {Object} filters
   * @returns {Promise<number>}
   */
  async countByOrganization(organizationId, filters = {}) {
    const filterConditions = { organization_id: organizationId };
    
    if (filters.is_active !== undefined) {
      filterConditions.is_active = filters.is_active;
    }
    if (filters.task_type) {
      filterConditions.task_type = filters.task_type;
    }

    return this.count(filterConditions);
  }
}

module.exports = new TaskMasterModel();
