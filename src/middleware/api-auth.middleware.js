/**
 * API Authentication Middleware
 * 
 * Authenticates requests using API keys
 * For Professional+ plans
 */

const { ApiKey } = require('../models');
const subscriptionService = require('../services/subscription.service');

/**
 * Middleware to authenticate API requests using API key
 * Checks for X-API-Key header
 */
const authenticateApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        message: 'API key required',
        code: 'API_KEY_MISSING'
      });
    }
    
    // Validate the API key
    const keyData = await ApiKey.validateKey(apiKey);
    
    if (!keyData) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired API key',
        code: 'API_KEY_INVALID'
      });
    }
    
    // Check rate limit
    const rateLimit = await ApiKey.checkRateLimit(keyData.id, keyData.rate_limit_per_minute);
    
    if (!rateLimit.allowed) {
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        data: {
          reset_at: rateLimit.reset_at
        }
      });
    }
    
    // Check if organization has API access (Professional+)
    const billing = await subscriptionService.getBillingInfo(keyData.organization_id);
    const planCode = billing?.plan?.code || 'free';
    
    if (planCode === 'free' || planCode === 'starter') {
      return res.status(403).json({
        success: false,
        message: 'API access requires Professional plan or higher',
        code: 'API_ACCESS_DENIED'
      });
    }
    
    // Set user info from API key
    req.user = {
      id: keyData.user_id,
      username: keyData.username,
      role: keyData.role,
      organization_id: keyData.organization_id,
      facility_id: keyData.facility_id
    };
    
    req.apiKey = {
      id: keyData.id,
      scopes: keyData.scopes
    };
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
    
    // Continue processing
    next();
    
  } catch (error) {
    console.error('[API AUTH] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

/**
 * Middleware to check API key scopes
 */
const requireScope = (requiredScopes) => {
  return (req, res, next) => {
    // If not authenticated via API key, skip (might be session auth)
    if (!req.apiKey) {
      return next();
    }
    
    const scopes = req.apiKey.scopes || ['read'];
    const required = Array.isArray(requiredScopes) ? requiredScopes : [requiredScopes];
    
    // Check if API key has any of the required scopes
    // 'admin' scope grants all permissions
    // 'write' scope grants read and write
    // 'read' scope grants only read
    
    const hasAdmin = scopes.includes('admin');
    const hasWrite = scopes.includes('write');
    const hasRead = scopes.includes('read');
    
    for (const scope of required) {
      let allowed = false;
      
      switch (scope) {
        case 'read':
          allowed = hasRead || hasWrite || hasAdmin;
          break;
        case 'write':
          allowed = hasWrite || hasAdmin;
          break;
        case 'admin':
          allowed = hasAdmin;
          break;
      }
      
      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: `Insufficient scope. Required: ${scope}`,
          code: 'INSUFFICIENT_SCOPE',
          data: {
            required_scopes: required,
            provided_scopes: scopes
          }
        });
      }
    }
    
    next();
  };
};

/**
 * Middleware to log API usage
 */
const logApiUsage = async (req, res, next) => {
  const startTime = Date.now();
  
  // Store original json method
  const originalJson = res.json;
  
  // Override json method to capture response
  res.json = function(data) {
    // Restore original method
    res.json = originalJson;
    
    // Log usage if authenticated via API key
    if (req.apiKey && req.user) {
      const responseTime = Date.now() - startTime;
      
      ApiKey.logUsage({
        organization_id: req.user.organization_id,
        api_key_id: req.apiKey.id,
        user_id: req.user.id,
        endpoint: req.originalUrl,
        http_method: req.method,
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        response_status: res.statusCode,
        response_time_ms: responseTime
      }).catch(err => console.error('[API USAGE] Failed to log:', err));
    }
    
    return res.json(data);
  };
  
  next();
};

module.exports = {
  authenticateApiKey,
  requireScope,
  logApiUsage
};
