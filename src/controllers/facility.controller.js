/**
 * Facility Controller
 * Multi-tenant aware facility management
 */

const { Facility } = require('../models');

/**
 * Get all facilities (organization-aware)
 */
const getAll = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }
    
    const facilities = await Facility.getAllWithManager(organizationId);
    res.json({
      success: true,
      data: { facilities }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get facility by ID (organization-aware)
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    const facility = await Facility.getWithStats(id, organizationId);
    
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
 * Create new facility (organization-aware)
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

    // Check for duplicate facility code in this organization
    const existingCode = await Facility.codeExistsInOrganization(
      req.body.code, 
      organizationId
    );
    
    if (existingCode) {
      return res.status(409).json({
        success: false,
        message: `Facility code '${req.body.code}' already exists in this organization`
      });
    }

    const data = {
      ...req.body,
      organization_id: organizationId
    };
    
    const facility = await Facility.create(data);
    res.status(201).json({
      success: true,
      message: 'Facility created successfully',
      data: { facility }
    });
  } catch (error) {
    // Handle duplicate key error from database
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Facility code already exists in this organization'
      });
    }
    next(error);
  }
};

/**
 * Update facility (organization-aware)
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    // Verify facility belongs to user's organization
    const facility = await Facility.findById(id);
    if (!facility || facility.organization_id !== organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }
    
    // Check for duplicate facility code if code is being changed
    if (req.body.code && req.body.code !== facility.code) {
      const existingCode = await Facility.codeExistsInOrganization(
        req.body.code, 
        organizationId,
        id // Exclude current facility
      );
      
      if (existingCode) {
        return res.status(409).json({
          success: false,
          message: `Facility code '${req.body.code}' already exists in this organization`
        });
      }
    }
    
    const updated = await Facility.update(id, req.body);
    
    res.json({
      success: true,
      message: 'Facility updated successfully',
      data: { facility: updated }
    });
  } catch (error) {
    // Handle duplicate key error from database
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'Facility code already exists in this organization'
      });
    }
    next(error);
  }
};

/**
 * Delete facility (organization-aware)
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    // Verify facility belongs to user's organization
    const facility = await Facility.findById(id);
    if (!facility || facility.organization_id !== organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }
    
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
