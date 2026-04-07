/**
 * API Key Model
 * For Professional+ plans
 */

const { pool } = require('../config/database');
const crypto = require('crypto');

class ApiKey {
  /**
   * Generate a new API key
   * Format: odm_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   */
  static generateKey() {
    const prefix = 'odm_live_';
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return prefix + randomBytes;
  }

  /**
   * Hash an API key for storage
   */
  static hashKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Get the prefix of an API key (for identification)
   */
  static getPrefix(apiKey) {
    return apiKey.substring(0, 8);
  }

  /**
   * Create a new API key
   */
  static async create(data) {
    const {
      organization_id,
      user_id,
      name,
      scopes = ['read'],
      rate_limit_per_minute = 60,
      expires_at = null
    } = data;

    // Generate the API key
    const apiKey = this.generateKey();
    const keyHash = this.hashKey(apiKey);
    const keyPrefix = this.getPrefix(apiKey);

    const [result] = await pool.execute(
      `INSERT INTO api_keys 
       (organization_id, user_id, name, api_key_hash, api_key_prefix, scopes, rate_limit_per_minute, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        organization_id,
        user_id,
        name,
        keyHash,
        keyPrefix,
        JSON.stringify(scopes),
        rate_limit_per_minute,
        expires_at
      ]
    );

    // Return the key info with the full key (only time it's available)
    return {
      id: result.insertId,
      name,
      api_key: apiKey, // ONLY returned on creation
      prefix: keyPrefix,
      scopes,
      rate_limit_per_minute,
      expires_at,
      created_at: new Date()
    };
  }

  /**
   * Validate an API key
   */
  static async validateKey(apiKey) {
    if (!apiKey || !apiKey.startsWith('odm_live_')) {
      return null;
    }

    const keyHash = this.hashKey(apiKey);

    const [rows] = await pool.execute(
      `SELECT ak.*, u.username, u.role, u.organization_id, u.facility_id
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE ak.api_key_hash = ? 
         AND ak.is_active = TRUE
         AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`,
      [keyHash]
    );

    if (!rows[0]) return null;

    const keyData = rows[0];

    // Update last used
    await pool.execute(
      'UPDATE api_keys SET last_used_at = NOW(), usage_count = usage_count + 1 WHERE id = ?',
      [keyData.id]
    );

    return {
      id: keyData.id,
      name: keyData.name,
      organization_id: keyData.organization_id,
      user_id: keyData.user_id,
      username: keyData.username,
      role: keyData.role,
      facility_id: keyData.facility_id,
      scopes: JSON.parse(keyData.scopes || '["read"]'),
      rate_limit_per_minute: keyData.rate_limit_per_minute
    };
  }

  /**
   * Get all API keys for an organization
   */
  static async getForOrganization(organizationId) {
    const [rows] = await pool.execute(
      `SELECT ak.id, ak.name, ak.api_key_prefix, ak.scopes, ak.rate_limit_per_minute,
              ak.last_used_at, ak.usage_count, ak.expires_at, ak.is_active, ak.created_at,
              u.username as created_by
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE ak.organization_id = ?
       ORDER BY ak.created_at DESC`,
      [organizationId]
    );

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      prefix: row.api_key_prefix + '...',
      scopes: JSON.parse(row.scopes || '["read"]'),
      rate_limit_per_minute: row.rate_limit_per_minute,
      last_used_at: row.last_used_at,
      usage_count: row.usage_count,
      expires_at: row.expires_at,
      is_active: row.is_active === 1,
      created_by: row.created_by,
      created_at: row.created_at
    }));
  }

  /**
   * Get API key by ID
   */
  static async getById(id, organizationId) {
    const [rows] = await pool.execute(
      `SELECT ak.*, u.username as created_by
       FROM api_keys ak
       JOIN users u ON ak.user_id = u.id
       WHERE ak.id = ? AND ak.organization_id = ?`,
      [id, organizationId]
    );

    if (!rows[0]) return null;

    return {
      id: rows[0].id,
      name: rows[0].name,
      prefix: rows[0].api_key_prefix + '...',
      scopes: JSON.parse(rows[0].scopes || '["read"]'),
      rate_limit_per_minute: rows[0].rate_limit_per_minute,
      last_used_at: rows[0].last_used_at,
      usage_count: rows[0].usage_count,
      expires_at: rows[0].expires_at,
      is_active: rows[0].is_active === 1,
      created_by: rows[0].created_by,
      created_at: rows[0].created_at
    };
  }

  /**
   * Update API key
   */
  static async update(id, organizationId, data) {
    const { name, scopes, is_active, expires_at } = data;

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }

    if (scopes !== undefined) {
      updates.push('scopes = ?');
      values.push(JSON.stringify(scopes));
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active);
    }

    if (expires_at !== undefined) {
      updates.push('expires_at = ?');
      values.push(expires_at);
    }

    if (updates.length === 0) return null;

    values.push(id, organizationId);

    await pool.execute(
      `UPDATE api_keys SET ${updates.join(', ')} WHERE id = ? AND organization_id = ?`,
      values
    );

    return this.getById(id, organizationId);
  }

  /**
   * Delete API key
   */
  static async delete(id, organizationId) {
    const [result] = await pool.execute(
      'DELETE FROM api_keys WHERE id = ? AND organization_id = ?',
      [id, organizationId]
    );

    return result.affectedRows > 0;
  }

  /**
   * Count API keys for organization
   */
  static async countForOrganization(organizationId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM api_keys WHERE organization_id = ? AND is_active = TRUE',
      [organizationId]
    );
    return rows[0].count;
  }

  /**
   * Log API usage
   */
  static async logUsage(data) {
    const {
      organization_id,
      api_key_id,
      user_id,
      endpoint,
      http_method,
      ip_address,
      user_agent,
      response_status,
      response_time_ms,
      error_message
    } = data;

    await pool.execute(
      `INSERT INTO api_usage_logs 
       (organization_id, api_key_id, user_id, endpoint, http_method, 
        ip_address, user_agent, response_status, response_time_ms, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        organization_id,
        api_key_id,
        user_id,
        endpoint,
        http_method,
        ip_address,
        user_agent,
        response_status,
        response_time_ms,
        error_message
      ]
    );
  }

  /**
   * Get API usage statistics
   */
  static async getUsageStats(organizationId, days = 30) {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    // Total requests
    const [totalResult] = await pool.execute(
      'SELECT COUNT(*) as count FROM api_usage_logs WHERE organization_id = ? AND created_at >= ?',
      [organizationId, dateFrom]
    );

    // Requests by endpoint
    const [endpointStats] = await pool.execute(
      `SELECT endpoint, COUNT(*) as count 
       FROM api_usage_logs 
       WHERE organization_id = ? AND created_at >= ?
       GROUP BY endpoint
       ORDER BY count DESC
       LIMIT 10`,
      [organizationId, dateFrom]
    );

    // Error rate
    const [errorStats] = await pool.execute(
      `SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN response_status >= 400 THEN 1 END) as errors
       FROM api_usage_logs 
       WHERE organization_id = ? AND created_at >= ?`,
      [organizationId, dateFrom]
    );

    // Requests by day
    const [dailyStats] = await pool.execute(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM api_usage_logs 
       WHERE organization_id = ? AND created_at >= ?
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [organizationId, dateFrom]
    );

    return {
      total_requests: totalResult[0].count,
      error_rate: errorStats[0].total > 0 ? (errorStats[0].errors / errorStats[0].total * 100).toFixed(2) : 0,
      top_endpoints: endpointStats,
      daily_usage: dailyStats
    };
  }

  /**
   * Check rate limit
   */
  static async checkRateLimit(apiKeyId, limitPerMinute) {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60000); // 1 minute ago

    // Clean old entries
    await pool.execute(
      'DELETE FROM api_rate_limit_tracking WHERE api_key_id = ? AND window_start < ?',
      [apiKeyId, windowStart]
    );

    // Get current count
    const [rows] = await pool.execute(
      'SELECT SUM(request_count) as count FROM api_rate_limit_tracking WHERE api_key_id = ? AND window_start >= ?',
      [apiKeyId, windowStart]
    );

    const currentCount = rows[0].count || 0;

    if (currentCount >= limitPerMinute) {
      return { allowed: false, remaining: 0, reset_at: new Date(windowStart.getTime() + 60000) };
    }

    // Increment count
    await pool.execute(
      `INSERT INTO api_rate_limit_tracking (api_key_id, window_start, request_count)
       VALUES (?, DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:00'), 1)
       ON DUPLICATE KEY UPDATE request_count = request_count + 1`,
      [apiKeyId]
    );

    return { allowed: true, remaining: limitPerMinute - currentCount - 1 };
  }
}

module.exports = ApiKey;
