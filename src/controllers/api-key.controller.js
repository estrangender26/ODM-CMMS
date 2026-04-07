/**
 * API Key Controller
 * For Professional+ plans
 */

const { ApiKey } = require('../models');
const subscriptionService = require('../services/subscription.service');

/**
 * Get all API keys for organization
 */
const getApiKeys = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    
    const keys = await ApiKey.getForOrganization(organizationId);
    
    res.json({
      success: true,
      data: { keys }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new API key
 */
const createApiKey = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { name, scopes, rate_limit_per_minute, expires_at } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'API key name is required'
      });
    }
    
    // Check limit
    const currentCount = await ApiKey.countForOrganization(organizationId);
    const billing = await subscriptionService.getBillingInfo(organizationId);
    const maxKeys = billing?.plan?.max_api_keys || 0;
    
    if (maxKeys !== null && currentCount >= maxKeys) {
      return res.status(403).json({
        success: false,
        message: `Maximum number of API keys (${maxKeys}) reached`,
        code: 'API_KEY_LIMIT_REACHED'
      });
    }
    
    // Validate scopes
    const validScopes = ['read', 'write', 'admin'];
    const requestedScopes = scopes || ['read'];
    const invalidScopes = requestedScopes.filter(s => !validScopes.includes(s));
    
    if (invalidScopes.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid scopes: ${invalidScopes.join(', ')}`,
        valid_scopes: validScopes
      });
    }
    
    const apiKey = await ApiKey.create({
      organization_id: organizationId,
      user_id: req.user.id,
      name,
      scopes: requestedScopes,
      rate_limit_per_minute: rate_limit_per_minute || 60,
      expires_at
    });
    
    res.status(201).json({
      success: true,
      message: 'API key created successfully',
      data: { 
        key: apiKey,
        warning: 'This is the only time the API key will be shown. Please copy it now.'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update API key
 */
const updateApiKey = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    const { name, scopes, is_active, expires_at } = req.body;
    
    const existing = await ApiKey.getById(id, organizationId);
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }
    
    // Validate scopes if provided
    if (scopes) {
      const validScopes = ['read', 'write', 'admin'];
      const invalidScopes = scopes.filter(s => !validScopes.includes(s));
      
      if (invalidScopes.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid scopes: ${invalidScopes.join(', ')}`,
          valid_scopes: validScopes
        });
      }
    }
    
    const updated = await ApiKey.update(id, organizationId, {
      name,
      scopes,
      is_active,
      expires_at
    });
    
    res.json({
      success: true,
      message: 'API key updated successfully',
      data: { key: updated }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete API key
 */
const deleteApiKey = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    const existing = await ApiKey.getById(id, organizationId);
    
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'API key not found'
      });
    }
    
    await ApiKey.delete(id, organizationId);
    
    res.json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get API usage statistics
 */
const getUsageStats = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { days = 30 } = req.query;
    
    const stats = await ApiKey.getUsageStats(organizationId, parseInt(days));
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getApiKeys,
  createApiKey,
  updateApiKey,
  deleteApiKey,
  getUsageStats
};
