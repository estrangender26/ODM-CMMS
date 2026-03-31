/**
 * Organization Controller
 * Multi-tenant organization management
 */

const { Organization, User } = require('../models');
const { hashPassword } = require('../utils/helpers');

/**
 * Get all organizations (system admin only)
 */
const getAll = async (req, res, next) => {
  try {
    const { subscription_status, subscription_plan } = req.query;
    
    const filters = {};
    if (subscription_status) filters.subscription_status = subscription_status;
    if (subscription_plan) filters.subscription_plan = subscription_plan;
    
    const organizations = await Organization.getAllWithStats(filters);
    
    res.json({
      success: true,
      data: { organizations }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get public organizations list (for signup page)
 * Returns organizations with minimal info
 */
const getPublicOrganizations = async (req, res, next) => {
  try {
    // Get all organizations
    const sql = `
      SELECT id, organization_name
      FROM organizations
      ORDER BY organization_name ASC
    `;
    const organizations = await Organization.query(sql);
    
    res.json({
      success: true,
      data: { organizations }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get organization by ID
 * Users can only view their own organization
 * System admins can view any organization
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userOrgId = req.user.organization_id;
    const userRole = req.user.role;
    
    // Only allow viewing own organization unless system admin
    if (parseInt(id) !== userOrgId && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const organization = await Organization.findByIdWithStats(id);
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    res.json({
      success: true,
      data: { organization }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user's organization
 */
const getMyOrganization = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User is not associated with an organization'
      });
    }
    
    const organization = await Organization.findByIdWithStats(organizationId);
    const usage = await Organization.getUsageStats(organizationId);
    
    if (!organization) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    res.json({
      success: true,
      data: { 
        organization: {
          ...organization,
          usage
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new organization (system admin only)
 * Also creates the first admin user for the organization
 */
const create = async (req, res, next) => {
  try {
    const { 
      organization_name, 
      subscription_plan = 'basic',
      subscription_status = 'active',
      billing_email,
      max_users = 10,
      max_facilities = 5,
      max_equipment = 100,
      admin_username,
      admin_email,
      admin_password,
      admin_full_name
    } = req.body;

    // Validate required fields
    if (!organization_name) {
      return res.status(400).json({
        success: false,
        message: 'Organization name is required'
      });
    }

    if (!admin_username || !admin_email || !admin_password || !admin_full_name) {
      return res.status(400).json({
        success: false,
        message: 'Admin details (username, email, password, full_name) are required'
      });
    }

    // Check if admin username exists
    const existingUsername = await User.findByUsername(admin_username);
    if (existingUsername) {
      return res.status(409).json({
        success: false,
        message: 'Admin username already exists'
      });
    }

    // Check if admin email exists
    const existingEmail = await User.findByEmail(admin_email);
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: 'Admin email already exists'
      });
    }

    // Create organization
    const organization = await Organization.create({
      organization_name,
      subscription_plan,
      subscription_status,
      billing_email,
      max_users,
      max_facilities,
      max_equipment
    });

    // Create admin user for the organization
    const passwordHash = await hashPassword(admin_password);
    const admin = await User.create({
      username: admin_username,
      email: admin_email,
      password_hash: passwordHash,
      full_name: admin_full_name,
      role: 'admin',
      organization_id: organization.id,
      is_organization_admin: true,
      is_active: true
    });

    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      data: { 
        organization,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          full_name: admin.full_name
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update organization
 * Organization admins can update their own organization
 * System admins can update any organization
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userOrgId = req.user.organization_id;
    const userRole = req.user.role;
    const isOrgAdmin = req.user.is_organization_admin;
    
    // Only allow updating own organization unless system admin
    if (parseInt(id) !== userOrgId && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Organization admins cannot change subscription plan/status
    // Only system admins can change billing-related fields
    const updateData = { ...req.body };
    if (userRole !== 'admin') {
      delete updateData.subscription_plan;
      delete updateData.subscription_status;
      delete updateData.max_users;
      delete updateData.max_facilities;
      delete updateData.max_equipment;
    }
    
    const organization = await Organization.update(id, updateData);
    
    res.json({
      success: true,
      message: 'Organization updated successfully',
      data: { organization }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update organization subscription (system admin only)
 */
const updateSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { subscription_plan, subscription_status, max_users, max_facilities, max_equipment } = req.body;
    
    const updateData = {};
    if (subscription_plan) updateData.subscription_plan = subscription_plan;
    if (subscription_status) updateData.subscription_status = subscription_status;
    if (max_users) updateData.max_users = max_users;
    if (max_facilities) updateData.max_facilities = max_facilities;
    if (max_equipment) updateData.max_equipment = max_equipment;
    
    const organization = await Organization.update(id, updateData);
    
    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: { organization }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete organization (system admin only)
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Prevent deleting the default organization (id=1)
    if (parseInt(id) === 1) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete the default organization'
      });
    }
    
    await Organization.delete(id);
    
    res.json({
      success: true,
      message: 'Organization deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get organization usage stats
 */
const getUsageStats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userOrgId = req.user.organization_id;
    const userRole = req.user.role;
    
    // Only allow viewing own organization unless system admin
    if (parseInt(id) !== userOrgId && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    const stats = await Organization.getUsageStats(id);
    
    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'Organization not found'
      });
    }

    // Calculate percentages
    const limits = await Organization.findById(id);
    const usagePercentages = {
      users: limits.max_users > 0 ? Math.round((stats.user_count / limits.max_users) * 100) : 0,
      facilities: limits.max_facilities > 0 ? Math.round((stats.facility_count / limits.max_facilities) * 100) : 0,
      equipment: limits.max_equipment > 0 ? Math.round((stats.equipment_count / limits.max_equipment) * 100) : 0
    };

    res.json({
      success: true,
      data: { 
        stats: {
          ...stats,
          limits: {
            max_users: limits.max_users,
            max_facilities: limits.max_facilities,
            max_equipment: limits.max_equipment
          },
          usage_percentages: usagePercentages
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getPublicOrganizations,
  getById,
  getMyOrganization,
  create,
  update,
  updateSubscription,
  remove,
  getUsageStats
};
