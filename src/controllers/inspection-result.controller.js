/**
 * Inspection Result Controller
 * Structured inspection response recording
 */

const { InspectionResult, Equipment } = require('../models');

/**
 * Create inspection result
 */
const create = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    
    const {
      facility_id,
      asset_id,
      task_template_id,
      task_template_step_id,
      recorded_value_text,
      recorded_value_number,
      recorded_value_boolean,
      recorded_value_json,
      unit,
      remarks,
      photo_url
    } = req.body;
    
    // Validate required fields
    if (!facility_id || !asset_id || !task_template_id || !task_template_step_id) {
      return res.status(400).json({
        success: false,
        message: 'facility_id, asset_id, task_template_id, and task_template_step_id are required'
      });
    }
    
    // Verify asset belongs to organization
    const asset = await Equipment.findById(asset_id);
    if (!asset || asset.organization_id !== organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    // Verify asset belongs to facility
    if (asset.facility_id !== parseInt(facility_id)) {
      return res.status(400).json({
        success: false,
        message: 'Asset does not belong to specified facility'
      });
    }
    
    const result = await InspectionResult.createResult({
      facility_id,
      asset_id,
      task_template_id,
      task_template_step_id,
      recorded_value_text,
      recorded_value_number,
      recorded_value_boolean,
      recorded_value_json,
      unit,
      remarks,
      photo_url,
      recorded_by_user_id: userId
    }, organizationId);
    
    res.status(201).json({
      success: true,
      message: 'Inspection result recorded successfully',
      data: { result }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get inspection result by ID
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    const result = await InspectionResult.getResultWithDetails(id, organizationId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Inspection result not found'
      });
    }
    
    res.json({
      success: true,
      data: { result }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get inspection results for an asset
 */
const getByAsset = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const organizationId = req.user.organization_id;
    const { task_template_id, from_date, to_date, limit } = req.query;
    
    // Verify asset belongs to organization
    const asset = await Equipment.findById(assetId);
    if (!asset || asset.organization_id !== organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    const filters = {};
    if (task_template_id) filters.task_template_id = parseInt(task_template_id);
    if (from_date) filters.from_date = from_date;
    if (to_date) filters.to_date = to_date;
    if (limit) filters.limit = parseInt(limit);
    
    const results = await InspectionResult.getByAsset(assetId, organizationId, filters);
    
    res.json({
      success: true,
      data: { 
        results,
        asset: {
          id: asset.id,
          name: asset.name,
          code: asset.code
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get inspection results for a facility
 */
const getByFacility = async (req, res, next) => {
  try {
    const { facilityId } = req.params;
    const organizationId = req.user.organization_id;
    const { asset_id, task_template_id, limit } = req.query;
    
    const filters = {};
    if (asset_id) filters.asset_id = parseInt(asset_id);
    if (task_template_id) filters.task_template_id = parseInt(task_template_id);
    if (limit) filters.limit = parseInt(limit);
    
    const results = await InspectionResult.getByFacility(facilityId, organizationId, filters);
    
    res.json({
      success: true,
      data: { results }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get inspection results for a template
 */
const getByTemplate = async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const organizationId = req.user.organization_id;
    const { asset_id, from_date, to_date } = req.query;
    
    const filters = {};
    if (asset_id) filters.asset_id = parseInt(asset_id);
    if (from_date) filters.from_date = from_date;
    if (to_date) filters.to_date = to_date;
    
    const results = await InspectionResult.getByTemplate(templateId, organizationId, filters);
    
    res.json({
      success: true,
      data: { results }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get latest inspection results for an asset
 */
const getLatestForAsset = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const organizationId = req.user.organization_id;
    
    // Verify asset belongs to organization
    const asset = await Equipment.findById(assetId);
    if (!asset || asset.organization_id !== organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    const results = await InspectionResult.getLatestForAsset(assetId, organizationId);
    
    res.json({
      success: true,
      data: { 
        results,
        asset: {
          id: asset.id,
          name: asset.name,
          code: asset.code
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get inspection statistics for an asset
 */
const getStatsForAsset = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const organizationId = req.user.organization_id;
    
    // Verify asset belongs to organization
    const asset = await Equipment.findById(assetId);
    if (!asset || asset.organization_id !== organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    const stats = await InspectionResult.getStatsForAsset(assetId, organizationId);
    
    res.json({
      success: true,
      data: { 
        stats,
        asset: {
          id: asset.id,
          name: asset.name,
          code: asset.code
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get inspection statistics for organization
 */
const getStats = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { facility_id, from_date, to_date } = req.query;
    
    const filters = {};
    if (facility_id) filters.facility_id = parseInt(facility_id);
    if (from_date) filters.from_date = from_date;
    if (to_date) filters.to_date = to_date;
    
    const stats = await InspectionResult.getStats(organizationId, filters);
    
    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create bulk inspection results
 */
const createBulk = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    const { results } = req.body;
    
    if (!results || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'results array is required'
      });
    }
    
    const createdResults = [];
    const errors = [];
    
    for (const resultData of results) {
      try {
        const result = await InspectionResult.createResult({
          ...resultData,
          recorded_by_user_id: userId
        }, organizationId);
        createdResults.push(result);
      } catch (error) {
        errors.push({
          data: resultData,
          error: error.message
        });
      }
    }
    
    res.status(201).json({
      success: true,
      message: `Created ${createdResults.length} inspection results${errors.length > 0 ? `, ${errors.length} errors` : ''}`,
      data: { 
        results: createdResults,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  getById,
  getByAsset,
  getByFacility,
  getByTemplate,
  getLatestForAsset,
  getStatsForAsset,
  getStats,
  createBulk
};
