/**
 * Finding Controller
 * ODM Findings / Defects management with SAP catalog coding
 */

const { Finding, Equipment, SapCatalogService } = require('../models');

/**
 * Get all findings for organization
 */
const getAll = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { facility_id, asset_id, severity, status, requires_sap, has_sap, limit } = req.query;
    
    const filters = {};
    if (facility_id) filters.facility_id = parseInt(facility_id);
    if (asset_id) filters.asset_id = parseInt(asset_id);
    if (severity) filters.severity = severity;
    if (status) filters.status = status;
    if (requires_sap !== undefined) filters.requires_sap_notification = requires_sap === 'true';
    if (has_sap !== undefined) filters.has_sap_notification = has_sap === 'true';
    if (limit) filters.limit = parseInt(limit);
    
    const findings = await Finding.getFindingsWithDetails(organizationId, filters);
    
    res.json({
      success: true,
      data: { findings }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get finding by ID
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    const finding = await Finding.getFindingWithDetails(id, organizationId);
    
    if (!finding) {
      return res.status(404).json({
        success: false,
        message: 'Finding not found'
      });
    }
    
    res.json({
      success: true,
      data: { finding }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new finding
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
      object_part_id,
      damage_code_id,
      cause_code_id,
      activity_code_id,
      finding_description,
      severity,
      status,
      equipment_function_impact,
      operating_condition,
      recommendation,
      requires_sap_notification
    } = req.body;
    
    // Validate required fields
    if (!facility_id || !asset_id || !finding_description) {
      return res.status(400).json({
        success: false,
        message: 'facility_id, asset_id, and finding_description are required'
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
    
    const finding = await Finding.createFinding({
      facility_id,
      asset_id,
      task_template_id,
      task_template_step_id,
      object_part_id,
      damage_code_id,
      cause_code_id,
      activity_code_id,
      finding_description,
      severity: severity || 'medium',
      status: status || 'open',
      equipment_function_impact,
      operating_condition,
      recommendation,
      requires_sap_notification: requires_sap_notification !== undefined ? requires_sap_notification : true,
      reported_by_user_id: userId
    }, organizationId);
    
    res.status(201).json({
      success: true,
      message: 'Finding created successfully',
      data: { finding }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Link SAP notification to finding
 */
const linkSapNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    const { sap_notification_no } = req.body;
    
    if (!sap_notification_no) {
      return res.status(400).json({
        success: false,
        message: 'sap_notification_no is required'
      });
    }
    
    // Verify finding belongs to organization
    const belongs = await Finding.belongsToOrganization(id, organizationId);
    if (!belongs) {
      return res.status(404).json({
        success: false,
        message: 'Finding not found'
      });
    }
    
    const finding = await Finding.linkSapNotification(id, sap_notification_no, organizationId);
    
    res.json({
      success: true,
      message: 'SAP notification linked successfully',
      data: { finding }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update finding status
 */
const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'status is required'
      });
    }
    
    const validStatuses = ['open', 'notified', 'in_progress', 'closed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }
    
    // Verify finding belongs to organization
    const belongs = await Finding.belongsToOrganization(id, organizationId);
    if (!belongs) {
      return res.status(404).json({
        success: false,
        message: 'Finding not found'
      });
    }
    
    const finding = await Finding.updateStatus(id, status, organizationId);
    
    res.json({
      success: true,
      message: 'Finding status updated successfully',
      data: { finding }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get findings statistics
 */
const getStats = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { facility_id, asset_id } = req.query;
    
    const filters = {};
    if (facility_id) filters.facility_id = parseInt(facility_id);
    if (asset_id) filters.asset_id = parseInt(asset_id);
    
    const stats = await Finding.getStats(organizationId, filters);
    
    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get findings requiring SAP notification
 */
const getPendingSapNotifications = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    
    const findings = await Finding.getPendingSapNotifications(organizationId);
    
    res.json({
      success: true,
      data: { findings }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get findings for an asset
 */
const getByAsset = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const organizationId = req.user.organization_id;
    const { status, severity } = req.query;
    
    // Verify asset belongs to organization
    const asset = await Equipment.findById(assetId);
    if (!asset || asset.organization_id !== organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    const filters = {};
    if (status) filters.status = status;
    if (severity) filters.severity = severity;
    
    const findings = await Finding.getByAsset(assetId, organizationId);
    
    // Apply additional filters
    let filteredFindings = findings;
    if (status) {
      filteredFindings = filteredFindings.filter(f => f.status === status);
    }
    if (severity) {
      filteredFindings = filteredFindings.filter(f => f.severity === severity);
    }
    
    res.json({
      success: true,
      data: { 
        findings: filteredFindings,
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
 * Search findings
 */
const search = async (req, res, next) => {
  try {
    const { q } = req.query;
    const organizationId = req.user.organization_id;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search term must be at least 2 characters'
      });
    }
    
    const findings = await Finding.search(q, organizationId);
    
    res.json({
      success: true,
      data: { findings }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get SAP catalog options for finding creation
 */
const getCatalogOptions = async (req, res, next) => {
  try {
    const { equipmentClassId } = req.params;
    
    const catalogs = await SapCatalogService.getCatalogOptionsForFinding(equipmentClassId);
    
    res.json({
      success: true,
      data: { catalogs }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  linkSapNotification,
  updateStatus,
  getStats,
  getPendingSapNotifications,
  getByAsset,
  search,
  getCatalogOptions
};
