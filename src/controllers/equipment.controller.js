/**
 * Equipment Controller
 */

const { Equipment } = require('../models');

/**
 * Get all equipment
 */
const getAll = async (req, res, next) => {
  try {
    const filters = {
      facility_id: req.query.facility_id,
      status: req.query.status,
      category: req.query.category,
      criticality: req.query.criticality
    };

    const equipment = await Equipment.getAllWithFacility(filters);
    res.json({
      success: true,
      data: { equipment }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get equipment by ID
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const equipment = await Equipment.getWithDetails(id);
    
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
 * Create new equipment
 */
const create = async (req, res, next) => {
  try {
    const data = {
      ...req.body,
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
 * Update equipment
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
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
 * Delete equipment
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
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
 * Get equipment statistics
 * Admin sees all stats, Supervisor sees only their facility's stats
 */
const getStats = async (req, res, next) => {
  try {
    const { role, facility_id } = req.user;
    
    let stats;
    if (role === 'supervisor' && facility_id) {
      stats = await Equipment.getStatsByFacility(facility_id);
    } else {
      stats = await Equipment.getStats();
    }
    
    const categories = await Equipment.getCategories();
    
    res.json({
      success: true,
      data: { stats, categories }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Search equipment
 */
const search = async (req, res, next) => {
  try {
    const { q } = req.query;
    const equipment = await Equipment.search(q);
    
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
