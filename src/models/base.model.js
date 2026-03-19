/**
 * Base Model Class
 * Provides common CRUD operations
 */

const { pool } = require('../config/database');

class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
    this.pool = pool;
  }

  /**
   * Execute a query
   * @param {string} sql
   * @param {Array} params
   * @returns {Promise}
   */
  async query(sql, params = []) {
    // Ensure all params are valid - convert undefined to null, ensure numbers are actual numbers
    const validParams = params.map(p => {
      if (p === undefined) return null;
      if (typeof p === 'number' && isNaN(p)) return null;
      if (typeof p === 'string' && p.trim() === '') return null;
      return p;
    });
    
    console.log('[BASE MODEL] Params:', validParams);
    
    const [results] = await this.pool.execute(sql, validParams);
    return results;
  }

  /**
   * Find all records with optional filters
   * @param {Object} filters
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async findAll(filters = {}, options = {}) {
    let sql = `SELECT * FROM ${this.tableName}`;
    const params = [];
    const conditions = [];

    // Build WHERE clause
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    });

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add ORDER BY
    if (options.orderBy) {
      sql += ` ORDER BY ${options.orderBy}`;
      if (options.order === 'desc') {
        sql += ' DESC';
      }
    }

    // Add LIMIT and OFFSET
    if (options.limit) {
      sql += ` LIMIT ?`;
      params.push(parseInt(options.limit));

      if (options.offset) {
        sql += ` OFFSET ?`;
        params.push(parseInt(options.offset));
      }
    }

    return this.query(sql, params);
  }

  /**
   * Find one record by ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async findById(id) {
    const [row] = await this.query(
      `SELECT * FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return row || null;
  }

  /**
   * Find one record by specific field
   * @param {string} field
   * @param {*} value
   * @returns {Promise<Object|null>}
   */
  async findByField(field, value) {
    const [row] = await this.query(
      `SELECT * FROM ${this.tableName} WHERE ${field} = ?`,
      [value]
    );
    return row || null;
  }

  /**
   * Create a new record
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async create(data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map(() => '?').join(', ');

    const sql = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
    const result = await this.query(sql, values);

    return this.findById(result.insertId);
  }

  /**
   * Update a record by ID
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async update(id, data) {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map(field => `${field} = ?`).join(', ');

    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = ?`;
    await this.query(sql, [...values, id]);

    return this.findById(id);
  }

  /**
   * Delete a record by ID
   * @param {number} id
   * @returns {Promise<boolean>}
   */
  async delete(id) {
    const result = await this.query(
      `DELETE FROM ${this.tableName} WHERE id = ?`,
      [id]
    );
    return result.affectedRows > 0;
  }

  /**
   * Count records with optional filters
   * @param {Object} filters
   * @returns {Promise<number>}
   */
  async count(filters = {}) {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    const params = [];
    const conditions = [];

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        conditions.push(`${key} = ?`);
        params.push(value);
      }
    });

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    const [result] = await this.query(sql, params);
    return result.count;
  }
}

module.exports = BaseModel;
