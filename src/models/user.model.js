/**
 * User Model
 */

const BaseModel = require('./base.model');

class UserModel extends BaseModel {
  constructor() {
    super('users');
  }

  /**
   * Find user by username
   * @param {string} username
   * @returns {Promise<Object|null>}
   */
  async findByUsername(username) {
    return this.findByField('username', username);
  }

  /**
   * Find user by email
   * @param {string} email
   * @returns {Promise<Object|null>}
   */
  async findByEmail(email) {
    return this.findByField('email', email);
  }

  /**
   * Update last login time
   * @param {number} userId
   * @returns {Promise}
   */
  async updateLastLogin(userId) {
    return this.update(userId, { last_login: new Date() });
  }

  /**
   * Get users by role
   * @param {string} role
   * @returns {Promise<Array>}
   */
  async findByRole(role) {
    return this.findAll({ role, is_active: true });
  }

  /**
   * Get active operators
   * @returns {Promise<Array>}
   */
  async getActiveOperators() {
    return this.findAll({ role: 'operator', is_active: true }, { orderBy: 'full_name' });
  }

  /**
   * Search users
   * @param {string} searchTerm
   * @returns {Promise<Array>}
   */
  async search(searchTerm) {
    const sql = `
      SELECT * FROM ${this.tableName} 
      WHERE is_active = TRUE 
      AND (full_name LIKE ? OR username LIKE ? OR email LIKE ?)
      ORDER BY full_name
    `;
    const likeTerm = `%${searchTerm}%`;
    return this.query(sql, [likeTerm, likeTerm, likeTerm]);
  }

  /**
   * Get all users with facility information
   * @returns {Promise<Array>}
   */
  async getAllWithFacility() {
    const sql = `
      SELECT u.*, f.name as facility_name, f.code as facility_code
      FROM ${this.tableName} u
      LEFT JOIN facilities f ON u.facility_id = f.id
      ORDER BY u.full_name
    `;
    return this.query(sql);
  }

  /**
   * Get users by facility
   * @param {number} facilityId
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  async getByFacility(facilityId, filters = {}) {
    let sql = `
      SELECT u.*, f.name as facility_name, f.code as facility_code
      FROM ${this.tableName} u
      LEFT JOIN facilities f ON u.facility_id = f.id
      WHERE u.facility_id = ? AND u.is_active = TRUE
    `;
    const params = [facilityId];

    if (filters.role) {
      sql += ' AND u.role = ?';
      params.push(filters.role);
    }

    sql += ' ORDER BY u.full_name';
    return this.query(sql, params);
  }

  /**
   * Get active operators by facility
   * @param {number} facilityId
   * @returns {Promise<Array>}
   */
  async getActiveOperatorsByFacility(facilityId) {
    return this.getByFacility(facilityId, { role: 'operator' });
  }
}

module.exports = new UserModel();
