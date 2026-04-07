/**
 * Subscription-based Report Access Middleware
 * 
 * Enforces plan-based access to different report types
 */

const subscriptionService = require('../services/subscription.service');

// Plan hierarchy levels
const PLAN_LEVELS = {
  'free': 0,
  'starter': 1,
  'professional': 2,
  'enterprise': 3,
  'utility': 3
};

// Report requirements by plan
const REPORT_REQUIREMENTS = {
  // Free plan reports
  'work-orders/summary': { minPlan: 'free', feature: 'basic_reports' },
  
  // Starter plan reports
  'equipment': { minPlan: 'starter', feature: 'standard_reports' },
  
  // Professional plan reports
  'technicians': { minPlan: 'professional', feature: 'advanced_reports' },
  'schedule-compliance': { minPlan: 'professional', feature: 'advanced_reports' },
  'trends': { minPlan: 'professional', feature: 'advanced_reports' },
  
  // Enterprise only
  'export': { minPlan: 'enterprise', feature: 'custom_reports' }
};

/**
 * Check if user's plan can access a specific report
 * @param {string} reportType - The report endpoint/type
 * @param {string} userPlanCode - User's current plan code
 * @returns {boolean}
 */
function canAccessReport(reportType, userPlanCode) {
  const requirement = REPORT_REQUIREMENTS[reportType];
  if (!requirement) return false;
  
  const userLevel = PLAN_LEVELS[userPlanCode] || 0;
  const requiredLevel = PLAN_LEVELS[requirement.minPlan] || 0;
  
  return userLevel >= requiredLevel;
}

/**
 * Middleware to check report access based on subscription
 * @param {string} reportType - The report type to check
 */
const requireReportAccess = (reportType) => {
  return async (req, res, next) => {
    try {
      const organizationId = req.user?.organization_id;
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'User must belong to an organization'
        });
      }
      
      // Get user's subscription
      const billing = await subscriptionService.getBillingInfo(organizationId);
      
      if (!billing) {
        return res.status(403).json({
          success: false,
          message: 'No active subscription found',
          code: 'NO_SUBSCRIPTION'
        });
      }
      
      const planCode = billing.plan?.code || 'free';
      
      // Check if user can access this report
      if (!canAccessReport(reportType, planCode)) {
        const requirement = REPORT_REQUIREMENTS[reportType];
        return res.status(403).json({
          success: false,
          message: `This report requires ${requirement.minPlan} plan or higher`,
          code: 'PLAN_UPGRADE_REQUIRED',
          data: {
            currentPlan: planCode,
            requiredPlan: requirement.minPlan,
            upgradeUrl: '/mobile/admin/subscription'
          }
        });
      }
      
      // Add subscription info to request for later use
      req.subscription = billing;
      next();
      
    } catch (error) {
      console.error('Report access check error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to verify subscription access'
      });
    }
  };
};

/**
 * Middleware to get available reports for current user
 */
const getAvailableReports = async (req, res, next) => {
  try {
    const organizationId = req.user?.organization_id;
    
    if (!organizationId) {
      req.availableReports = [];
      return next();
    }
    
    const billing = await subscriptionService.getBillingInfo(organizationId);
    const planCode = billing?.plan?.code || 'free';
    const userLevel = PLAN_LEVELS[planCode] || 0;
    
    // Filter available reports
    const available = Object.entries(REPORT_REQUIREMENTS)
      .filter(([_, req]) => {
        const requiredLevel = PLAN_LEVELS[req.minPlan] || 0;
        return userLevel >= requiredLevel;
      })
      .map(([reportType, req]) => ({
        type: reportType,
        minPlan: req.minPlan,
        feature: req.feature
      }));
    
    req.availableReports = available;
    req.subscription = billing;
    next();
    
  } catch (error) {
    console.error('Get available reports error:', error);
    req.availableReports = [];
    next();
  }
};

module.exports = {
  requireReportAccess,
  getAvailableReports,
  canAccessReport,
  REPORT_REQUIREMENTS,
  PLAN_LEVELS
};
