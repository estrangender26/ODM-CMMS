/**
 * Audit Log Controller
 * For Enterprise plans
 */

const { AuditLog } = require('../models');

/**
 * Get audit logs with filtering
 */
const getLogs = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const {
      action,
      entity_type,
      user_id,
      start_date,
      end_date,
      search,
      limit = 50,
      offset = 0
    } = req.query;
    
    const result = await AuditLog.getForOrganization(organizationId, {
      action,
      entity_type,
      user_id: user_id ? parseInt(user_id) : undefined,
      start_date,
      end_date,
      search,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single audit log by ID
 */
const getLogById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    const log = await AuditLog.getById(id, organizationId);
    
    if (!log) {
      return res.status(404).json({
        success: false,
        message: 'Audit log not found'
      });
    }
    
    res.json({
      success: true,
      data: { log }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get audit log statistics
 */
const getStats = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { days = 30 } = req.query;
    
    const stats = await AuditLog.getStats(organizationId, parseInt(days));
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user activity
 */
const getUserActivity = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const organizationId = req.user.organization_id;
    const { limit = 20 } = req.query;
    
    // Verify user belongs to organization (simplified check)
    const { User } = require('../models');
    const user = await User.findById(userId);
    
    if (!user || user.organization_id !== organizationId) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const activity = await AuditLog.getUserActivity(
      userId,
      organizationId,
      parseInt(limit)
    );
    
    res.json({
      success: true,
      data: { activity }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get entity activity
 */
const getEntityActivity = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    const organizationId = req.user.organization_id;
    const { limit = 50 } = req.query;
    
    const activity = await AuditLog.getEntityActivity(
      entityType,
      parseInt(entityId),
      organizationId,
      parseInt(limit)
    );
    
    res.json({
      success: true,
      data: { activity }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get security events
 */
const getSecurityEvents = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { limit = 50 } = req.query;
    
    const events = await AuditLog.getSecurityEvents(organizationId, {
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      data: { events }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get login history
 */
const getLoginHistory = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { user_id, start_date, end_date, limit = 50 } = req.query;
    
    const history = await AuditLog.getLoginHistory(organizationId, {
      user_id: user_id ? parseInt(user_id) : undefined,
      start_date,
      end_date,
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      data: { history }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get audit configuration
 */
const getConfiguration = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    
    const config = await AuditLog.getConfiguration(organizationId);
    
    res.json({
      success: true,
      data: { configuration: config }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update audit configuration
 */
const updateConfiguration = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    
    const updated = await AuditLog.updateConfiguration(organizationId, req.body);
    
    if (!updated) {
      return res.status(400).json({
        success: false,
        message: 'No valid configuration fields provided'
      });
    }
    
    const config = await AuditLog.getConfiguration(organizationId);
    
    res.json({
      success: true,
      message: 'Configuration updated successfully',
      data: { configuration: config }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export audit logs
 */
const exportLogs = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { format = 'csv', start_date, end_date } = req.query;
    
    // Fetch all matching logs (no limit for export)
    const result = await AuditLog.getForOrganization(organizationId, {
      start_date,
      end_date,
      limit: 10000, // Max export limit
      offset: 0
    });
    
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.json"`);
      res.json({
        export_date: new Date().toISOString(),
        organization_id: organizationId,
        total_records: result.total,
        logs: result.logs
      });
    } else {
      // CSV format
      const csvHeaders = [
        'ID', 'Timestamp', 'Action', 'Entity Type', 'Entity ID', 'Entity Name',
        'User ID', 'User Name', 'User Role', 'IP Address', 'Changes'
      ];
      
      const csvRows = result.logs.map(log => [
        log.id,
        log.created_at,
        log.action,
        log.entity_type,
        log.entity_id,
        log.entity_name || '',
        log.user_id || '',
        log.user_name || '',
        log.user_role || '',
        log.ip_address || '',
        JSON.stringify(log.changed_fields || {})
      ].map(field => `"${String(field).replace(/"/g, '""')}"`));
      
      const csv = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${Date.now()}.csv"`);
      res.send(csv);
    }
    
    // Log the export
    await AuditLog.create({
      organization_id: organizationId,
      action: 'data_export',
      entity_type: 'audit_logs',
      user_id: req.user.id,
      user_name: req.user.username,
      user_role: req.user.role,
      ip_address: req.ip,
      export_format: format,
      export_record_count: result.logs.length,
      api_endpoint: req.originalUrl,
      http_method: req.method
    });
    
  } catch (error) {
    next(error);
  }
};

/**
 * Purge old audit logs
 */
const purgeOldLogs = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { retention_days } = req.body;
    
    if (!retention_days || retention_days < 30) {
      return res.status(400).json({
        success: false,
        message: 'Minimum retention period is 30 days'
      });
    }
    
    const deletedCount = await AuditLog.purgeOldLogs(organizationId, retention_days);
    
    // Log the purge action
    await AuditLog.create({
      organization_id: organizationId,
      action: 'purge_logs',
      entity_type: 'audit_logs',
      entity_name: `Purged logs older than ${retention_days} days`,
      user_id: req.user.id,
      user_name: req.user.username,
      user_role: req.user.role,
      ip_address: req.ip
    });
    
    res.json({
      success: true,
      message: `Purged ${deletedCount} old audit log entries`,
      data: { deleted_count: deletedCount }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLogs,
  getLogById,
  getStats,
  getUserActivity,
  getEntityActivity,
  getSecurityEvents,
  getLoginHistory,
  getConfiguration,
  updateConfiguration,
  exportLogs,
  purgeOldLogs
};
