/**
 * Mobile Inspection Controller
 * Mobile-first inspection workflow
 * 
 * Flow: Facility → Asset → Inspection Template → Checklist → Finding
 * QR Entry: Scan QR → Asset Page → Inspection/Finding
 */

const { 
  Equipment, 
  Facility, 
  TaskTemplate, 
  Finding, 
  InspectionResult,
  EquipmentType,
  Subunit,
  MaintainableItem,
  SapCatalogService
} = require('../models');

/**
 * Get asset page data for mobile (via QR code)
 * Entry point for QR-based inspection flow
 */
const getAssetPage = async (req, res, next) => {
  try {
    const { token } = req.params;
    const organizationId = req.user?.organization_id;
    
    // Get asset by QR token
    const asset = await Equipment.getByQRToken(token);
    
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Invalid QR code or asset not found'
      });
    }
    
    // Check organization access if user is authenticated
    if (organizationId && asset.organization_id !== organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Get applicable templates for this asset
    let templates = [];
    if (asset.equipment_type_id) {
      templates = await TaskTemplate.getTemplatesForAsset(
        asset.equipment_type_id, 
        asset.organization_id
      );
    }
    
    // Get recent findings for this asset
    const findings = await Finding.getByAsset(asset.id, asset.organization_id);
    const recentFindings = findings.slice(0, 5); // Last 5 findings
    
    // Get recent inspection results
    const inspectionResults = await InspectionResult.getByAsset(
      asset.id, 
      asset.organization_id, 
      { limit: 5 }
    );
    
    res.json({
      success: true,
      data: {
        asset: {
          id: asset.id,
          name: asset.name,
          code: asset.code,
          status: asset.status,
          criticality: asset.criticality,
          location: asset.location,
          facility: {
            id: asset.facility_id,
            name: asset.facility_name,
            facility_type: asset.facility_type
          },
          iso_classification: {
            category: asset.category_name,
            class: asset.class_name,
            type: asset.type_name,
            full: asset.iso_classification
          },
          sap_references: {
            equipment_reference: asset.sap_equipment_reference,
            floc_hint: asset.sap_floc_hint,
            facility_sap_ref: asset.facility_sap_ref
          }
        },
        applicable_templates: templates,
        recent_findings: recentFindings,
        recent_inspections: inspectionResults,
        quick_actions: [
          { action: 'inspect', label: 'Run Inspection', icon: 'clipboard-check' },
          { action: 'finding', label: 'Record Finding', icon: 'exclamation-triangle' },
          { action: 'history', label: 'View History', icon: 'history' }
        ]
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get inspection runner data
 * Template with steps for mobile inspection execution
 */
const getInspectionRunner = async (req, res, next) => {
  try {
    const { assetId, templateId } = req.params;
    const organizationId = req.user.organization_id;
    
    // Verify asset belongs to organization
    const asset = await Equipment.getWithIsoClassification(assetId, organizationId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    // Get template with steps
    const template = await TaskTemplate.getWithDetails(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }
    
    // Check template is applicable to asset
    if (template.equipment_type_id !== asset.equipment_type_id) {
      return res.status(400).json({
        success: false,
        message: 'Template is not applicable to this asset type'
      });
    }
    
    // Get latest inspection results for this template (for reference)
    const latestResults = await InspectionResult.getLatestForAsset(assetId, organizationId);
    const templateLatestResults = latestResults.filter(
      r => r.task_template_id === parseInt(templateId)
    );
    
    // Get subunits for this equipment type (for finding recording)
    const subunits = await Subunit.getByEquipmentType(asset.equipment_type_id);
    
    res.json({
      success: true,
      data: {
        asset: {
          id: asset.id,
          name: asset.name,
          code: asset.code,
          facility_name: asset.facility_name
        },
        template: {
          id: template.id,
          name: template.template_name,
          code: template.template_code,
          maintenance_type: template.maintenance_type,
          description: template.description,
          estimated_duration_minutes: template.estimated_duration_minutes
        },
        steps: template.steps.map(step => ({
          id: step.id,
          step_no: step.step_no,
          step_type: step.step_type,
          instruction: step.instruction,
          data_type: step.data_type,
          expected_value: step.expected_value,
          min_value: step.min_value,
          max_value: step.max_value,
          unit: step.unit,
          is_required: step.is_required,
          options: step.options ? JSON.parse(step.options) : null,
          // Include previous reading if available
          previous_reading: templateLatestResults.find(r => r.task_template_step_id === step.id) || null
        })),
        safety_controls: template.safety_controls || [],
        subunits: subunits,
        can_record_finding: true
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit inspection results from mobile
 */
const submitInspectionResults = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    
    const { template_id, results, started_at, completed_at } = req.body;
    
    if (!template_id || !results || !Array.isArray(results) || results.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'template_id and results array are required'
      });
    }
    
    // Verify asset belongs to organization
    const asset = await Equipment.findById(assetId);
    if (!asset || asset.organization_id !== organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    // Create inspection results
    const createdResults = [];
    for (const result of results) {
      const created = await InspectionResult.createResult({
        facility_id: asset.facility_id,
        asset_id: assetId,
        task_template_id: template_id,
        task_template_step_id: result.step_id,
        recorded_value_text: result.value_text,
        recorded_value_number: result.value_number,
        recorded_value_boolean: result.value_boolean,
        recorded_value_json: result.value_json,
        unit: result.unit,
        remarks: result.remarks,
        photo_url: result.photo_url,
        recorded_by_user_id: userId
      }, organizationId);
      
      createdResults.push(created);
    }
    
    res.status(201).json({
      success: true,
      message: `Recorded ${createdResults.length} inspection results`,
      data: {
        results: createdResults,
        summary: {
          total_steps: results.length,
          completed_at: completed_at || new Date().toISOString()
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get finding form data
 * Prepares data for recording a finding
 */
const getFindingForm = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const organizationId = req.user.organization_id;
    
    // Verify asset belongs to organization
    const asset = await Equipment.getWithIsoClassification(assetId, organizationId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    // Get SAP catalog options if equipment has classification
    let catalogOptions = null;
    if (asset.equipment_class_id) {
      catalogOptions = await SapCatalogService.getCatalogOptionsForFinding(asset.equipment_class_id);
    }
    
    // Get subunits for this equipment type
    let subunits = [];
    if (asset.equipment_type_id) {
      subunits = await Subunit.getByEquipmentType(asset.equipment_type_id);
    }
    
    // Get applicable templates
    let templates = [];
    if (asset.equipment_type_id) {
      templates = await TaskTemplate.getTemplatesForAsset(asset.equipment_type_id, organizationId);
    }
    
    res.json({
      success: true,
      data: {
        asset: {
          id: asset.id,
          name: asset.name,
          code: asset.code,
          facility_id: asset.facility_id,
          facility_name: asset.facility_name,
          equipment_type_id: asset.equipment_type_id,
          equipment_class_id: asset.equipment_class_id,
          equipment_category_id: asset.equipment_category_id,
          sap_floc_hint: asset.sap_floc_hint,
          facility_sap_ref: asset.facility_sap_ref
        },
        catalogs: catalogOptions,
        subunits: subunits,
        templates: templates.map(t => ({
          id: t.id,
          name: t.template_name,
          maintenance_type: t.maintenance_type
        })),
        severity_levels: ['low', 'medium', 'high', 'critical'],
        operating_conditions: ['normal', 'abnormal', 'emergency', 'startup', 'shutdown'],
        equipment_function_impacts: ['none', 'reduced', 'degraded', 'failed', 'unknown']
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit finding from mobile
 */
const submitFinding = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const organizationId = req.user.organization_id;
    const userId = req.user.id;
    
    const {
      finding_description,
      severity,
      object_part_id,
      damage_code_id,
      cause_code_id,
      activity_code_id,
      equipment_function_impact,
      operating_condition,
      recommendation,
      requires_sap_notification,
      task_template_id,
      task_template_step_id
    } = req.body;
    
    // Verify asset belongs to organization
    const asset = await Equipment.findById(assetId);
    if (!asset || asset.organization_id !== organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    // Validate required fields
    if (!finding_description) {
      return res.status(400).json({
        success: false,
        message: 'finding_description is required'
      });
    }
    
    const finding = await Finding.createFinding({
      facility_id: asset.facility_id,
      asset_id: assetId,
      task_template_id: task_template_id || null,
      task_template_step_id: task_template_step_id || null,
      object_part_id: object_part_id || null,
      damage_code_id: damage_code_id || null,
      cause_code_id: cause_code_id || null,
      activity_code_id: activity_code_id || null,
      finding_description,
      severity: severity || 'medium',
      equipment_function_impact: equipment_function_impact || 'unknown',
      operating_condition: operating_condition || 'normal',
      recommendation: recommendation || null,
      requires_sap_notification: requires_sap_notification !== false,
      reported_by_user_id: userId
    }, organizationId);
    
    res.status(201).json({
      success: true,
      message: 'Finding recorded successfully',
      data: { finding }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get asset history (findings + inspection results)
 */
const getAssetHistory = async (req, res, next) => {
  try {
    const { assetId } = req.params;
    const organizationId = req.user.organization_id;
    const { limit = 20 } = req.query;
    
    // Verify asset belongs to organization
    const asset = await Equipment.getWithIsoClassification(assetId, organizationId);
    if (!asset) {
      return res.status(404).json({
        success: false,
        message: 'Asset not found'
      });
    }
    
    // Get findings
    const findings = await Finding.getByAsset(assetId, organizationId);
    
    // Get inspection results
    const inspectionResults = await InspectionResult.getByAsset(assetId, organizationId, {
      limit: parseInt(limit)
    });
    
    // Combine and sort by date
    const history = [
      ...findings.map(f => ({
        type: 'finding',
        date: f.reported_at,
        data: f
      })),
      ...inspectionResults.map(r => ({
        type: 'inspection',
        date: r.recorded_at,
        data: r
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json({
      success: true,
      data: {
        asset: {
          id: asset.id,
          name: asset.name,
          code: asset.code
        },
        history: history.slice(0, parseInt(limit)),
        summary: {
          total_findings: findings.length,
          open_findings: findings.filter(f => f.status === 'open').length,
          total_inspections: inspectionResults.length
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get facilities list for mobile (first step in flow)
 */
const getFacilitiesList = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    
    const facilities = await Facility.getByOrganization(organizationId);
    
    res.json({
      success: true,
      data: {
        facilities: facilities.map(f => ({
          id: f.id,
          name: f.name,
          code: f.code,
          facility_type: f.facility_type,
          location: f.location,
          asset_count: f.asset_count || 0
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get assets list for a facility (second step in flow)
 */
const getAssetsByFacility = async (req, res, next) => {
  try {
    const { facilityId } = req.params;
    const organizationId = req.user.organization_id;
    
    // Verify facility belongs to organization
    const facility = await Facility.findById(facilityId);
    if (!facility || facility.organization_id !== organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Facility not found'
      });
    }
    
    const assets = await Equipment.getAllWithIsoClassification(organizationId, {
      facility_id: facilityId
    });
    
    res.json({
      success: true,
      data: {
        facility: {
          id: facility.id,
          name: facility.name,
          code: facility.code,
          facility_type: facility.facility_type
        },
        assets: assets.map(a => ({
          id: a.id,
          name: a.name,
          code: a.code,
          status: a.status,
          criticality: a.criticality,
          has_qr: !!a.qr_token,
          iso_classification: a.iso_classification,
          location: a.location
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAssetPage,
  getInspectionRunner,
  submitInspectionResults,
  getFindingForm,
  submitFinding,
  getAssetHistory,
  getFacilitiesList,
  getAssetsByFacility
};
