/**
 * Audit Log Model
 * For Enterprise plans
 */

const { pool } = require('../config/database');

class AuditLog {
  /**
   * Create a new audit log entry
   */
  static async create(data) {
    const {
      organization_id,
      action,
      entity_type,
      entity_id,
      entity_name,
      user_id,
      user_name,
      user_role,
      old_values,
      new_values,
      changed_fields,
      ip_address,
      user_agent,
      session_id,
      request_id,
      api_endpoint,
      http_method,
      export_format,
      export_record_count,
      login_method,
      sso_provider,
      mfa_used,
      login_success,
      failure_reason
    } = data;

    const [result] = await pool.execute(
      `INSERT INTO audit_logs 
       (organization_id, action, entity_type, entity_id, entity_name,
        user_id, user_name, user_role, old_values, new_values, changed_fields,
        ip_address, user_agent, session_id, request_id, api_endpoint, http_method,
        export_format, export_record_count, login_method, sso_provider, mfa_used,
        login_success, failure_reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        organization_id,
        action,
        entity_type,
        entity_id,
        entity_name,
        user_id,
        user_name,
        user_role,
        old_values ? JSON.stringify(old_values) : null,
        new_values ? JSON.stringify(new_values) : null,
        changed_fields ? JSON.stringify(changed_fields) : null,
        ip_address,
        user_agent,
        session_id,
        request_id,
        api_endpoint,
        http_method,
        export_format,
        export_record_count,
        login_method,
        sso_provider,
        mfa_used,
        login_success,
        failure_reason
      ]
    );

    return result.insertId;
  }

  /**
   * Get audit logs for an organization with filtering
   */
  static async getForOrganization(organizationId, options = {}) {
    const {
      action,
      entity_type,
      user_id,
      start_date,
      end_date,
      search,
      limit = 50,
      offset = 0
    } = options;

    let sql = `
      SELECT al.*
      FROM audit_logs al
      WHERE al.organization_id = ?
    `;
    const params = [organizationId];

    if (action) {
      sql += ' AND al.action = ?';
      params.push(action);
    }

    if (entity_type) {
      sql += ' AND al.entity_type = ?';
      params.push(entity_type);
    }

    if (user_id) {
      sql += ' AND al.user_id = ?';
      params.push(user_id);
    }

    if (start_date) {
      sql += ' AND al.created_at >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND al.created_at <= ?';
      params.push(end_date);
    }

    if (search) {
      sql += ` AND (al.entity_name LIKE ? OR al.user_name LIKE ? OR al.action LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM audit_logs al ${sql.replace('SELECT al.* FROM audit_logs al', '')}`,
      params
    );

    // Add ordering and pagination
    sql += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.execute(sql, params);

    return {
      logs: rows.map(this.formatLog),
      total: countResult[0].total,
      limit,
      offset
    };
  }

  /**
   * Get a single audit log by ID
   */
  static async getById(id, organizationId) {
    const [rows] = await pool.execute(
      'SELECT * FROM audit_logs WHERE id = ? AND organization_id = ?',
      [id, organizationId]
    );
    return rows[0] ? this.formatLog(rows[0]) : null;
  }

  /**
   * Get recent activity for a user
   */
  static async getUserActivity(userId, organizationId, limit = 20) {
    const [rows] = await pool.execute(
      `SELECT * FROM audit_logs 
       WHERE user_id = ? AND organization_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, organizationId, limit]
    );
    return rows.map(this.formatLog);
  }

  /**
   * Get activity for an entity
   */
  static async getEntityActivity(entityType, entityId, organizationId, limit = 50) {
    const [rows] = await pool.execute(
      `SELECT * FROM audit_logs 
       WHERE entity_type = ? AND entity_id = ? AND organization_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [entityType, entityId, organizationId, limit]
    );
    return rows.map(this.formatLog);
  }

  /**
   * Get security events (failed logins, exports, etc.)
   */
  static async getSecurityEvents(organizationId, options = {}) {
    const { limit = 50, includeFailedLogins = true, includeExports = true } = options;

    const actions = [];
    if (includeFailedLogins) actions.push('login_failed');
    if (includeExports) actions.push('data_export');

    if (actions.length === 0) return [];

    const placeholders = actions.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT * FROM audit_logs 
       WHERE organization_id = ? AND action IN (${placeholders})
       ORDER BY created_at DESC
       LIMIT ?`,
      [organizationId, ...actions, limit]
    );

    return rows.map(this.formatLog);
  }

  /**
   * Get login history
   */
  static async getLoginHistory(organizationId, options = {}) {
    const { user_id, start_date, end_date, limit = 50 } = options;

    let sql = `
      SELECT * FROM audit_logs 
      WHERE organization_id = ? AND action IN ('login', 'login_failed', 'logout', 'sso_login')
    `;
    const params = [organizationId];

    if (user_id) {
      sql += ' AND user_id = ?';
      params.push(user_id);
    }

    if (start_date) {
      sql += ' AND created_at >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND created_at <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const [rows] = await pool.execute(sql, params);
    return rows.map(this.formatLog);
  }

  /**
   * Get statistics for dashboard
   */
  static async getStats(organizationId, days = 30) {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    // Activity by action
    const [actionStats] = await pool.execute(
      `SELECT action, COUNT(*) as count 
       FROM audit_logs 
       WHERE organization_id = ? AND created_at >= ?
       GROUP BY action
       ORDER BY count DESC`,
      [organizationId, dateFrom]
    );

    // Activity by user
    const [userStats] = await pool.execute(
      `SELECT user_id, user_name, COUNT(*) as count 
       FROM audit_logs 
       WHERE organization_id = ? AND created_at >= ? AND user_id IS NOT NULL
       GROUP BY user_id, user_name
       ORDER BY count DESC
       LIMIT 10`,
      [organizationId, dateFrom]
    );

    // Failed login attempts
    const [failedLogins] = await pool.execute(
      `SELECT DATE(created_at) as date, COUNT(*) as count
       FROM audit_logs 
       WHERE organization_id = ? AND action = 'login_failed' AND created_at >= ?
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [organizationId, dateFrom]
    );

    // Total events
    const [totalResult] = await pool.execute(
      'SELECT COUNT(*) as total FROM audit_logs WHERE organization_id = ? AND created_at >= ?',
      [organizationId, dateFrom]
    );

    return {
      total_events: totalResult[0].total,
      action_breakdown: actionStats,
      top_users: userStats,
      failed_login_trend: failedLogins
    };
  }

  /**
   * Purge old audit logs based on retention policy
   */
  static async purgeOldLogs(organizationId, retentionDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    // First, archive the logs if needed
    await this.archiveOldLogs(organizationId, cutoffDate);

    // Then delete
    const [result] = await pool.execute(
      'DELETE FROM audit_logs WHERE organization_id = ? AND created_at < ?',
      [organizationId, cutoffDate]
    );

    return result.affectedRows;
  }

  /**
   * Archive old logs before deletion
   */
  static async archiveOldLogs(organizationId, cutoffDate) {
    // Check if archiving is enabled
    const [policy] = await pool.execute(
      'SELECT archive_before_delete FROM audit_retention_policies WHERE organization_id = ?',
      [organizationId]
    );

    if (!policy[0]?.archive_before_delete) return 0;

    // Move to archive table
    await pool.execute(
      `INSERT INTO audit_logs_archive 
       (id, organization_id, action, entity_type, entity_id, entity_name,
        user_id, user_name, old_values, new_values, changed_fields,
        ip_address, user_agent, created_at)
       SELECT id, organization_id, action, entity_type, entity_id, entity_name,
              user_id, user_name, old_values, new_values, changed_fields,
              ip_address, user_agent, created_at
       FROM audit_logs 
       WHERE organization_id = ? AND created_at < ?`,
      [organizationId, cutoffDate]
    );

    return true;
  }

  /**
   * Get or create audit configuration for organization
   */
  static async getConfiguration(organizationId) {
    const [rows] = await pool.execute(
      'SELECT * FROM audit_configurations WHERE organization_id = ?',
      [organizationId]
    );

    if (rows[0]) return rows[0];

    // Create default configuration
    await pool.execute(
      `INSERT INTO audit_configurations 
       (organization_id, log_level)
       VALUES (?, 'standard')`,
      [organizationId]
    );

    return this.getConfiguration(organizationId);
  }

  /**
   * Update audit configuration
   */
  static async updateConfiguration(organizationId, config) {
    const allowedFields = [
      'log_logins', 'log_data_exports', 'log_user_changes',
      'log_work_order_changes', 'log_equipment_changes',
      'log_schedule_changes', 'log_settings_changes',
      'log_level', 'mask_sensitive_data', 'sensitive_fields',
      'alert_on_failed_logins', 'alert_on_data_export',
      'alert_on_admin_actions', 'alert_email'
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (config[field] !== undefined) {
        updates.push(`${field} = ?`);
        if (field === 'sensitive_fields') {
          values.push(JSON.stringify(config[field]));
        } else {
          values.push(config[field]);
        }
      }
    }

    if (updates.length === 0) return false;

    values.push(organizationId);

    await pool.execute(
      `UPDATE audit_configurations SET ${updates.join(', ')} WHERE organization_id = ?`,
      values
    );

    return true;
  }

  /**
   * Check if an action should be logged based on configuration
   */
  static async shouldLog(organizationId, action, entityType) {
    const config = await this.getConfiguration(organizationId);

    // Check if logging is enabled for this action type
    switch (action) {
      case 'login':
      case 'login_failed':
      case 'logout':
      case 'sso_login':
        return config.log_logins;
      case 'data_export':
        return config.log_data_exports;
      case 'create':
      case 'update':
      case 'delete':
        if (entityType === 'user') return config.log_user_changes;
        if (entityType === 'work_order') return config.log_work_order_changes;
        if (entityType === 'equipment') return config.log_equipment_changes;
        if (entityType === 'schedule') return config.log_schedule_changes;
        return true;
      default:
        return true;
    }
  }

  // Helper method to format log entry
  static formatLog(row) {
    return {
      id: row.id,
      organization_id: row.organization_id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      entity_name: row.entity_name,
      user_id: row.user_id,
      user_name: row.user_name,
      user_role: row.user_role,
      old_values: row.old_values ? JSON.parse(row.old_values) : null,
      new_values: row.new_values ? JSON.parse(row.new_values) : null,
      changed_fields: row.changed_fields ? JSON.parse(row.changed_fields) : null,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      session_id: row.session_id,
      api_endpoint: row.api_endpoint,
      http_method: row.http_method,
      export_format: row.export_format,
      export_record_count: row.export_record_count,
      login_method: row.login_method,
      sso_provider: row.sso_provider,
      mfa_used: row.mfa_used,
      login_success: row.login_success,
      failure_reason: row.failure_reason,
      created_at: row.created_at
    };
  }
}

module.exports = AuditLog;
