/**
 * Automatic Audit Logging Middleware
 * 
 * Logs data changes, exports, and security events automatically
 * For Enterprise plans
 */

const { AuditLog } = require('../models');

/**
 * Middleware to log data exports
 */
const logExport = (entityType) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;
    
    // Override json method
    res.json = function(data) {
      // Restore original method
      res.json = originalJson;
      
      // Log the export
      if (req.user && req.user.organization_id) {
        AuditLog.create({
          organization_id: req.user.organization_id,
          action: 'data_export',
          entity_type: entityType,
          user_id: req.user.id,
          user_name: req.user.username,
          user_role: req.user.role,
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
          session_id: req.sessionID,
          api_endpoint: req.originalUrl,
          http_method: req.method,
          export_format: req.query.format || 'json',
          export_record_count: Array.isArray(data?.data) ? data.data.length : 
                               data?.data?.records ? data.data.records.length : 0
        }).catch(err => console.error('[AUDIT] Failed to log export:', err));
      }
      
      // Call original json
      return res.json(data);
    };
    
    next();
  };
};

/**
 * Middleware to log entity changes (create, update, delete)
 */
const logEntityChanges = (entityType, options = {}) => {
  return async (req, res, next) => {
    const { captureBody = false, excludeFields = ['password', 'password_hash'] } = options;
    
    // Store original json method
    const originalJson = res.json;
    
    // Capture old values if updating
    let oldValues = null;
    if (req.method === 'PUT' || req.method === 'PATCH') {
      // Old values would need to be fetched before the update
      // This is a simplified version - you'd need to adapt based on your route
      oldValues = req._oldValues || null;
    }
    
    // Override json method to capture response
    res.json = function(data) {
      // Restore original method
      res.json = originalJson;
      
      // Determine action type
      let action;
      switch (req.method) {
        case 'POST': action = 'create'; break;
        case 'PUT':
        case 'PATCH': action = 'update'; break;
        case 'DELETE': action = 'delete'; break;
        default: action = 'other';
      }
      
      // Log if successful
      if (data?.success !== false && req.user && req.user.organization_id) {
        const newValues = captureBody ? sanitizeBody(req.body, excludeFields) : null;
        const changedFields = action === 'update' && newValues ? 
          Object.keys(newValues).filter(k => k !== 'id') : null;
        
        AuditLog.create({
          organization_id: req.user.organization_id,
          action: action,
          entity_type: entityType,
          entity_id: data?.data?.id || req.params.id,
          entity_name: data?.data?.name || data?.data?.username || data?.data?.title,
          user_id: req.user.id,
          user_name: req.user.username,
          user_role: req.user.role,
          old_values: oldValues,
          new_values: newValues,
          changed_fields: changedFields,
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
          api_endpoint: req.originalUrl,
          http_method: req.method
        }).catch(err => console.error('[AUDIT] Failed to log change:', err));
      }
      
      return res.json(data);
    };
    
    next();
  };
};

/**
 * Log login attempt
 */
const logLoginAttempt = (success, user = null, failureReason = null) => {
  return async (req, res, next) => {
    // Get organization from user or request
    const organizationId = user?.organization_id || req.body?.organization_id;
    
    if (organizationId) {
      await AuditLog.create({
        organization_id: organizationId,
        action: success ? 'login' : 'login_failed',
        entity_type: 'user',
        entity_id: user?.id,
        entity_name: user?.username || req.body?.username,
        user_id: user?.id,
        user_name: user?.username || req.body?.username,
        user_role: user?.role,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        session_id: req.sessionID,
        login_method: 'password',
        login_success: success,
        failure_reason: failureReason,
        api_endpoint: req.originalUrl,
        http_method: req.method
      }).catch(err => console.error('[AUDIT] Failed to log login:', err));
    }
    
    if (next) next();
  };
};

/**
 * Log SSO login
 */
const logSSOLogin = async (req, user, ssoProvider, success = true, failureReason = null) => {
  if (!user?.organization_id) return;
  
  await AuditLog.create({
    organization_id: user.organization_id,
    action: success ? 'sso_login' : 'sso_login_failed',
    entity_type: 'user',
    entity_id: user.id,
    entity_name: user.username,
    user_id: user.id,
    user_name: user.username,
    user_role: user.role,
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
    session_id: req.sessionID,
    login_method: 'sso',
    sso_provider: ssoProvider,
    login_success: success,
    failure_reason: failureReason,
    api_endpoint: req.originalUrl,
    http_method: req.method
  }).catch(err => console.error('[AUDIT] Failed to log SSO login:', err));
};

/**
 * Log logout
 */
const logLogout = async (req, user) => {
  if (!user?.organization_id) return;
  
  await AuditLog.create({
    organization_id: user.organization_id,
    action: 'logout',
    entity_type: 'user',
    entity_id: user.id,
    entity_name: user.username,
    user_id: user.id,
    user_name: user.username,
    user_role: user.role,
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
    session_id: req.sessionID,
    api_endpoint: req.originalUrl,
    http_method: req.method
  }).catch(err => console.error('[AUDIT] Failed to log logout:', err));
};

/**
 * Log admin actions
 */
const logAdminAction = async (req, action, entityType, entityId, entityName, details = null) => {
  if (!req.user?.organization_id) return;
  
  await AuditLog.create({
    organization_id: req.user.organization_id,
    action: action,
    entity_type: entityType,
    entity_id: entityId,
    entity_name: entityName,
    user_id: req.user.id,
    user_name: req.user.username,
    user_role: req.user.role,
    new_values: details,
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
    api_endpoint: req.originalUrl,
    http_method: req.method
  }).catch(err => console.error('[AUDIT] Failed to log admin action:', err));
};

// Helper function
function sanitizeBody(body, excludeFields) {
  if (!body || typeof body !== 'object') return null;
  
  const sanitized = {};
  for (const [key, value] of Object.entries(body)) {
    if (!excludeFields.includes(key)) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

module.exports = {
  logExport,
  logEntityChanges,
  logLoginAttempt,
  logSSOLogin,
  logLogout,
  logAdminAction
};
