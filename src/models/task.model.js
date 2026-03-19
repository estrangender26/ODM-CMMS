/**
 * Task Master Model
 */

const BaseModel = require('./base.model');

class TaskMasterModel extends BaseModel {
  constructor() {
    super('task_master');
  }

  /**
   * Get active tasks
   * @returns {Promise<Array>}
   */
  async getActive() {
    return this.findAll({ is_active: true }, { orderBy: 'task_code' });
  }

  /**
   * Find task by code
   * @param {string} code
   * @returns {Promise<Object|null>}
   */
  async findByCode(code) {
    return this.findByField('task_code', code);
  }

  /**
   * Get tasks by type
   * @param {string} taskType
   * @returns {Promise<Array>}
   */
  async getByType(taskType) {
    return this.findAll({ task_type: taskType, is_active: true });
  }

  /**
   * Get task with inspection points
   * @param {number} taskId
   * @returns {Promise<Object|null>}
   */
  async getWithInspectionPoints(taskId) {
    const task = await this.findById(taskId);
    if (!task) return null;

    const pointsSql = `
      SELECT * FROM inspection_points
      WHERE task_master_id = ? AND is_active = TRUE
      ORDER BY sort_order, id
    `;
    const points = await this.query(pointsSql, [taskId]);
    
    return { ...task, inspection_points: points };
  }

  /**
   * Get task types summary
   * @returns {Promise<Array>}
   */
  async getTypeSummary() {
    const sql = `
      SELECT task_type, COUNT(*) as count
      FROM ${this.tableName}
      WHERE is_active = TRUE
      GROUP BY task_type
      ORDER BY task_type
    `;
    return this.query(sql);
  }
}

module.exports = new TaskMasterModel();
