/**
 * Equipment Controller
 * Multi-tenant aware equipment management
 */

const { Equipment } = require('../models');

/**
 * Get all equipment (organization-aware)
 */
const getAll = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    
    const filters = {
      facility_id: req.query.facility_id,
      status: req.query.status,
      category: req.query.category,
      criticality: req.query.criticality
    };

    const equipment = await Equipment.getAllWithFacility(organizationId, filters);
    res.json({
      success: true,
      data: { equipment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get equipment by ID (organization-aware)
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    const equipment = await Equipment.getWithDetails(id, organizationId);
    
    if (!equipment) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }

    res.json({
      success: true,
      data: { equipment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new equipment (organization-aware)
 */
const create = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }

    const data = {
      ...req.body,
      organization_id: organizationId,
      created_by: req.user.id
    };

    const equipment = await Equipment.create(data);
    res.status(201).json({
      success: true,
      message: 'Equipment created successfully',
      data: { equipment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update equipment (organization-aware)
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    // Verify equipment belongs to user's organization
    const belongs = await Equipment.belongsToOrganization(id, organizationId);
    if (!belongs) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }
    
    const equipment = await Equipment.update(id, req.body);
    
    res.json({
      success: true,
      message: 'Equipment updated successfully',
      data: { equipment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete equipment (organization-aware)
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    // Verify equipment belongs to user's organization
    const belongs = await Equipment.belongsToOrganization(id, organizationId);
    if (!belongs) {
      return res.status(404).json({
        success: false,
        message: 'Equipment not found'
      });
    }
    
    await Equipment.delete(id);
    
    res.json({
      success: true,
      message: 'Equipment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get equipment statistics (organization-aware)
 * Admin sees all org stats, Supervisor sees only their facility's stats
 */
const getStats = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { role, facility_id } = req.user;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }
    
    let stats;
    if (role === 'supervisor' && facility_id) {
      stats = await Equipment.getStatsByFacility(facility_id, organizationId);
    } else {
      stats = await Equipment.getStats(organizationId);
    }
    
    const categories = await Equipment.getCategories(organizationId);
    
    res.json({
      success: true,
      data: { stats, categories }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search equipment (organization-aware)
 */
const search = async (req, res, next) => {
  try {
    const { q } = req.query;
    const organizationId = req.user.organization_id;
    
    const equipment = await Equipment.search(q, organizationId);
    
    res.json({
      success: true,
      data: { equipment }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getStats,
  search
};
