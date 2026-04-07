/**
 * Feature Access Control Middleware
 * 
 * Enforces subscription plan-based access to features
 * Features: custom_fields, sso, audit_logs, api_access, schedules, inspections, etc.
 */

const subscriptionService = require('../services/subscription.service');
const { OrganizationSubscription } = require('../models');

// Feature to plan mapping
const FEATURE_REQUIREMENTS = {
  // Core features - available on all plans
  'work_orders': { minPlan: 'free' },
  'equipment': { minPlan: 'free' },
  'basic_reports': { minPlan: 'free' },
  
  // Starter features
  'schedules': { minPlan: 'starter' },
  'inspections': { minPlan: 'starter' },
  'standard_reports': { minPlan: 'starter' },
  'email_notifications': { minPlan: 'starter' },
  
  // Professional features
  'advanced_reports': { minPlan: 'professional' },
  'custom_fields': { minPlan: 'professional', limitField: 'max_custom_fields' },
  'api_access': { minPlan: 'professional' },
  'priority_support': { minPlan: 'professional' },
  
  // Enterprise features
  'audit_logs': { minPlan: 'enterprise', limitField: 'audit_retention_days' },
  'sso': { minPlan: 'enterprise', limitField: 'max_sso_providers' },
  'data_retention': { minPlan: 'enterprise' },
  'dedicated_support': { minPlan: 'enterprise' },
  'sla': { minPlan: 'enterprise' },
  
  // Utility special tier
  'utility_features': { minPlan: 'utility' }
};

// Plan hierarchy levels
const PLAN_LEVELS = {
  'free': 0,
  'starter': 1,
  'professional': 2,
  'enterprise': 3,
  'utility': 4
};

/**
 * Check if user's plan has access to a feature
 * @param {string} feature - Feature name
 * @param {string} userPlanCode - User's current plan code
 * @returns {object} - { hasAccess: boolean, requiredPlan: string, currentPlan: string }
 */
function checkFeatureAccess(feature, userPlanCode) {
  const requirement = FEATURE_REQUIREMENTS[feature];
  
  if (!requirement) {
    // Unknown feature - allow by default but log warning
    console.warn(`[FEATURE ACCESS] Unknown feature checked: ${feature}`);
    return { hasAccess: true, requiredPlan: 'unknown', currentPlan: userPlanCode };
  }
  
  const userLevel = PLAN_LEVELS[userPlanCode] || 0;
  const requiredLevel = PLAN_LEVELS[requirement.minPlan] || 0;
  
  return {
    hasAccess: userLevel >= requiredLevel,
    requiredPlan: requirement.minPlan,
    currentPlan: userPlanCode
  };
}

/**
 * Middleware factory to require a specific feature
 * @param {string} feature - Feature name
 * @param {object} options - Additional options
 */
const requireFeature = (feature, options = {}) => {
  return async (req, res, next) => {
    try {
      const organizationId = req.user?.organization_id;
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'User must belong to an organization'
        });
      }
      
      // Get subscription info
      const billing = await subscriptionService.getBillingInfo(organizationId);
      const planCode = billing?.plan?.code || 'free';
      
      // Check feature access
      const access = checkFeatureAccess(feature, planCode);
      
      if (!access.hasAccess) {
        return res.status(403).json({
          success: false,
          message: `This feature requires ${access.requiredPlan} plan or higher`,
          code: 'FEATURE_UPGRADE_REQUIRED',
          data: {
            feature: feature,
            currentPlan: access.currentPlan,
            requiredPlan: access.requiredPlan,
            upgradeUrl: '/mobile/admin/subscription'
          }
        });
      }
      
      // Check if feature has usage limits
      const requirement = FEATURE_REQUIREMENTS[feature];
      if (requirement?.limitField && options.checkLimit) {
        const subscription = await OrganizationSubscription.getWithPlan(organizationId);
        const limit = subscription?.[requirement.limitField];
        
        if (limit !== null && limit !== undefined) {
          req.featureLimit = limit;
          req.featureUsage = await getFeatureUsage(feature, organizationId);
          
          if (req.featureUsage >= limit) {
            return res.status(403).json({
              success: false,
              message: `You have reached the limit for ${feature}`,
              code: 'FEATURE_LIMIT_REACHED',
              data: {
                feature: feature,
                limit: limit,
                usage: req.featureUsage
              }
            });
          }
        }
      }
      
      // Attach feature info to request
      req.featureInfo = {
        feature,
        plan: planCode,
        hasFullAccess: access.hasAccess
      };
      
      next();
      
    } catch (error) {
      console.error(`[FEATURE ACCESS] Error checking feature ${feature}:`, error);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify feature access'
      });
    }
  };
};

/**
 * Get current usage for a feature
 */
async function getFeatureUsage(feature, organizationId) {
  switch (feature) {
    case 'custom_fields':
      const { CustomField } = require('../models');
      return await CustomField.countForOrganization(organizationId);
    
    case 'sso':
      const { pool } = require('../config/database');
      const [ssoRows] = await pool.execute(
        'SELECT COUNT(*) as count FROM sso_configurations WHERE organization_id = ? AND is_enabled = TRUE',
        [organizationId]
      );
      return ssoRows[0].count;
    
    default:
      return 0;
  }
}

/**
 * Middleware to check multiple features (any of them)
 */
const requireAnyFeature = (features) => {
  return async (req, res, next) => {
    try {
      const organizationId = req.user?.organization_id;
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'User must belong to an organization'
        });
      }
      
      const billing = await subscriptionService.getBillingInfo(organizationId);
      const planCode = billing?.plan?.code || 'free';
      
      // Check if any feature is accessible
      const accessibleFeatures = features.filter(f => {
        const access = checkFeatureAccess(f, planCode);
        return access.hasAccess;
      });
      
      if (accessibleFeatures.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'This feature requires a higher subscription plan',
          code: 'FEATURE_UPGRADE_REQUIRED',
          data: {
            features: features,
            currentPlan: planCode,
            upgradeUrl: '/mobile/admin/subscription'
          }
        });
      }
      
      req.availableFeatures = accessibleFeatures;
      next();
      
    } catch (error) {
      console.error('[FEATURE ACCESS] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify feature access'
      });
    }
  };
};

/**
 * Middleware to get available features for current user
 */
const getAvailableFeatures = async (req, res, next) => {
  try {
    const organizationId = req.user?.organization_id;
    
    if (!organizationId) {
      req.availableFeatures = [];
      return next();
    }
    
    const billing = await subscriptionService.getBillingInfo(organizationId);
    const planCode = billing?.plan?.code || 'free';
    const subscription = await OrganizationSubscription.getWithPlan(organizationId);
    
    const available = [];
    const limits = {};
    
    for (const [feature, requirement] of Object.entries(FEATURE_REQUIREMENTS)) {
      const userLevel = PLAN_LEVELS[planCode] || 0;
      const requiredLevel = PLAN_LEVELS[requirement.minPlan] || 0;
      
      if (userLevel >= requiredLevel) {
        available.push(feature);
        
        // Get limit if applicable
        if (requirement.limitField && subscription) {
          limits[feature] = subscription[requirement.limitField];
        }
      }
    }
    
    req.availableFeatures = available;
    req.featureLimits = limits;
    req.subscriptionInfo = {
      plan: planCode,
      ...billing
    };
    
    next();
    
  } catch (error) {
    console.error('[FEATURE ACCESS] Error getting available features:', error);
    req.availableFeatures = [];
    next();
  }
};

/**
 * Middleware to block API access for non-Professional plans
 */
const requireApiAccess = async (req, res, next) => {
  try {
    const organizationId = req.user?.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }
    
    const billing = await subscriptionService.getBillingInfo(organizationId);
    const planCode = billing?.plan?.code || 'free';
    
    const access = checkFeatureAccess('api_access', planCode);
    
    if (!access.hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'API access requires Professional plan or higher',
        code: 'API_ACCESS_DENIED',
        data: {
          currentPlan: planCode,
          requiredPlan: 'professional',
          upgradeUrl: '/mobile/admin/subscription'
        }
      });
    }
    
    // Attach API limits to request
    req.apiLimits = {
      maxApiKeys: billing?.plan?.max_api_keys || 0
    };
    
    next();
    
  } catch (error) {
    console.error('[API ACCESS] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify API access'
    });
  }
};

/**
 * Middleware to check custom fields limit
 */
const checkCustomFieldLimit = (entityType) => {
  return async (req, res, next) => {
    try {
      const organizationId = req.user?.organization_id;
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'User must belong to an organization'
        });
      }
      
      // First check if feature is available
      const billing = await subscriptionService.getBillingInfo(organizationId);
      const planCode = billing?.plan?.code || 'free';
      
      const access = checkFeatureAccess('custom_fields', planCode);
      if (!access.hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Custom fields require Professional plan or higher',
          code: 'FEATURE_UPGRADE_REQUIRED',
          data: {
            feature: 'custom_fields',
            currentPlan: planCode,
            requiredPlan: 'professional',
            upgradeUrl: '/mobile/admin/subscription'
          }
        });
      }
      
      // Check limit
      const subscription = await OrganizationSubscription.getWithPlan(organizationId);
      const maxFields = subscription?.max_custom_fields;
      
      if (maxFields !== null && maxFields !== undefined) {
        const { CustomField } = require('../models');
        const currentCount = await CustomField.countByEntityType(organizationId, entityType);
        
        if (currentCount >= maxFields) {
          return res.status(403).json({
            success: false,
            message: `Maximum number of custom fields (${maxFields}) reached for ${entityType}`,
            code: 'CUSTOM_FIELD_LIMIT_REACHED',
            data: {
              entity_type: entityType,
              limit: maxFields,
              usage: currentCount
            }
          });
        }
      }
      
      next();
      
    } catch (error) {
      console.error('[CUSTOM FIELDS] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify custom field limit'
      });
    }
  };
};

/**
 * Middleware to check SSO limit
 */
const checkSSOLimit = async (req, res, next) => {
  try {
    const organizationId = req.user?.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }
    
    // Check if feature is available
    const billing = await subscriptionService.getBillingInfo(organizationId);
    const planCode = billing?.plan?.code || 'free';
    
    const access = checkFeatureAccess('sso', planCode);
    if (!access.hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'SSO requires Enterprise plan',
        code: 'FEATURE_UPGRADE_REQUIRED',
        data: {
          feature: 'sso',
          currentPlan: planCode,
          requiredPlan: 'enterprise',
          upgradeUrl: '/mobile/admin/subscription'
        }
      });
    }
    
    // Check limit
    const subscription = await OrganizationSubscription.getWithPlan(organizationId);
    const maxProviders = subscription?.max_sso_providers;
    
    if (maxProviders !== null && maxProviders !== undefined) {
      const { pool } = require('../config/database');
      const [rows] = await pool.execute(
        'SELECT COUNT(*) as count FROM sso_configurations WHERE organization_id = ?',
        [organizationId]
      );
      
      if (rows[0].count >= maxProviders) {
        return res.status(403).json({
          success: false,
          message: `Maximum number of SSO providers (${maxProviders}) reached`,
          code: 'SSO_LIMIT_REACHED',
          data: {
            limit: maxProviders,
            usage: rows[0].count
          }
        });
      }
    }
    
    next();
    
  } catch (error) {
    console.error('[SSO] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify SSO limit'
    });
  }
};

/**
 * Check API key limit
 */
const checkApiKeyLimit = async (req, res, next) => {
  try {
    const organizationId = req.user?.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }
    
    // Check if feature is available
    const billing = await subscriptionService.getBillingInfo(organizationId);
    const planCode = billing?.plan?.code || 'free';
    
    const access = checkFeatureAccess('api_access', planCode);
    if (!access.hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'API access requires Professional plan or higher',
        code: 'FEATURE_UPGRADE_REQUIRED',
        data: {
          feature: 'api_access',
          currentPlan: planCode,
          requiredPlan: 'professional',
          upgradeUrl: '/mobile/admin/subscription'
        }
      });
    }
    
    // Check limit
    const subscription = await OrganizationSubscription.getWithPlan(organizationId);
    const maxKeys = subscription?.max_api_keys;
    
    if (maxKeys !== null && maxKeys !== undefined) {
      const { ApiKey } = require('../models');
      const currentCount = await ApiKey.countForOrganization(organizationId);
      
      if (currentCount >= maxKeys) {
        return res.status(403).json({
          success: false,
          message: `Maximum number of API keys (${maxKeys}) reached`,
          code: 'API_KEY_LIMIT_REACHED',
          data: {
            limit: maxKeys,
            usage: currentCount
          }
        });
      }
    }
    
    next();
    
  } catch (error) {
    console.error('[API KEY] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify API key limit'
    });
  }
};

module.exports = {
  requireFeature,
  requireAnyFeature,
  getAvailableFeatures,
  requireApiAccess,
  checkCustomFieldLimit,
  checkSSOLimit,
  checkApiKeyLimit,
  checkFeatureAccess,
  FEATURE_REQUIREMENTS,
  PLAN_LEVELS
};
