/**
 * Industry Controller
 * Master data and organization industry management
 */

const { Industry } = require('../models');

/**
 * Get all active industries (public)
 */
const getAll = async (req, res, next) => {
  try {
    const industries = await Industry.getAllActive();
    
    res.json({
      success: true,
      data: { industries }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get industries for current user's organization
 */
const getByOrganization = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }
    
    const industries = await Industry.getByOrganization(organizationId);
    const defaultIndustry = await Industry.getDefaultForOrganization(organizationId);
    
    res.json({
      success: true,
      data: { 
        industries,
        default: defaultIndustry
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get default industry for organization
 */
const getDefault = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }
    
    const industry = await Industry.getDefaultForOrganization(organizationId);
    
    if (!industry) {
      return res.status(404).json({
        success: false,
        message: 'No default industry set for organization'
      });
    }
    
    res.json({
      success: true,
      data: { industry }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign industry to organization (admin only)
 * ENFORCES INVARIANT: If first industry, automatically sets as default
 */
const assignToOrganization = async (req, res, next) => {
  try {
    const { industry_id, is_default = false } = req.body;
    const organizationId = req.user.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }
    
    if (!industry_id) {
      return res.status(400).json({
        success: false,
        message: 'industry_id is required'
      });
    }
    
    // Check if this is the first industry being assigned
    const currentIndustries = await Industry.getByOrganization(organizationId);
    const isFirstIndustry = currentIndustries.length === 0;
    
    // INVARIANT: First industry automatically becomes default
    const shouldBeDefault = isFirstIndustry || is_default;
    
    await Industry.assignToOrganization(organizationId, industry_id, shouldBeDefault);
    
    res.json({
      success: true,
      message: 'Industry assigned to organization',
      data: {
        is_default: shouldBeDefault
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove industry from organization (admin only)
 * ENFORCES INVARIANT: Organization must always have at least one industry
 * ENFORCES INVARIANT: Exactly one default industry must exist
 */
const removeFromOrganization = async (req, res, next) => {
  try {
    const { industry_id } = req.params;
    const organizationId = req.user.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }
    
    // Get current industries
    const industries = await Industry.getByOrganization(organizationId);
    
    // INVARIANT: Must have at least one industry
    if (industries.length <= 1) {
      return res.status(403).json({
        success: false,
        message: 'Cannot remove the last industry. Organization must have at least one industry assigned.',
        code: 'INDUSTRY_INVARIANT_VIOLATION'
      });
    }
    
    // Check if trying to remove the default industry
    const targetIndustry = industries.find(i => i.id === parseInt(industry_id));
    if (targetIndustry && targetIndustry.is_default) {
      // INVARIANT: Must have another default set first
      return res.status(403).json({
        success: false,
        message: 'Cannot remove the default industry. Set another industry as default first.',
        code: 'DEFAULT_INDUSTRY_PROTECTED'
      });
    }
    
    await Industry.removeFromOrganization(organizationId, industry_id);
    
    res.json({
      success: true,
      message: 'Industry removed from organization'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get equipment types by industry
 */
const getEquipmentTypes = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const equipmentTypes = await Industry.getEquipmentTypesByIndustry(id);
    
    res.json({
      success: true,
      data: { equipment_types: equipmentTypes }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Set default industry for organization (admin only)
 * ENFORCES INVARIANT: Exactly one default industry
 */
const setDefault = async (req, res, next) => {
  try {
    const { industry_id } = req.body;
    const organizationId = req.user.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }
    
    if (!industry_id) {
      return res.status(400).json({
        success: false,
        message: 'industry_id is required'
      });
    }
    
    // Verify industry is assigned to organization
    const industries = await Industry.getByOrganization(organizationId);
    const targetIndustry = industries.find(i => i.id === parseInt(industry_id));
    
    if (!targetIndustry) {
      return res.status(400).json({
        success: false,
        message: 'Industry must be assigned to organization before setting as default'
      });
    }
    
    await Industry.setDefaultForOrganization(organizationId, industry_id);
    
    res.json({
      success: true,
      message: 'Default industry updated'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getByOrganization,
  getDefault,
  assignToOrganization,
  removeFromOrganization,
  setDefault,
  getEquipmentTypes
};
