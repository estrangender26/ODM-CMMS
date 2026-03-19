/**
 * Facility Controller
 */

const { Facility } = require('../models');

/**
 * Get all facilities
 */
const getAll = async (req, res, next) => {
  try {
    const facilities = await Facility.getAllWithManager();
    res.json({
      success: true,
      data: { facilities }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get facility by ID
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const facility = await Facility.getWithStats(id);
    
    if (!facility) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }

    res.json({
      success: true,
      data: { facility }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new facility
 */
const create = async (req, res, next) => {
  try {
    const facility = await Facility.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Facility created successfully',
      data: { facility }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update facility
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const facility = await Facility.update(id, req.body);
    
    res.json({
      success: true,
      message: 'Facility updated successfully',
      data: { facility }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete facility
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Facility.delete(id);
    
    res.json({
      success: true,
      message: 'Facility deleted successfully'
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
  remove
};
