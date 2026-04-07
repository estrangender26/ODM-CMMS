/**
 * ODM Work Order Scheduler Service
 * Auto-generates work orders from inspection templates based on frequency
 * Simple, SAP-free scheduling model
 */

const { WorkOrder, Equipment } = require('../models');
const { TaskTemplate } = require('../models/task-template.model');
const { getDb } = require('../config/database');
const db = getDb();

class SchedulerService {
  constructor() {
    this.workOrderModel = WorkOrder; // Already instantiated
    this.taskTemplateModel = TaskTemplate; // Already instantiated
    this.equipmentModel = Equipment; // Already instantiated
  }

  /**
   * Main scheduler entry point - runs daily
   * Creates work orders for templates that are due today
   * 
   * @param {number} organizationId - Organization to process
   * @returns {Promise<Object>} Summary of created work orders
   */
  async runDailySchedule(organizationId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log(`[Scheduler] Starting daily run for org ${organizationId} on ${today.toISOString().split('T')[0]}`);
    
    const summary = {
      processed: 0,
      created: 0,
      skipped: 0,
      errors: []
    };

    try {
      // 1. Get active assets with their equipment_type
      const assets = await this.getActiveAssets(organizationId);
      console.log(`[Scheduler] Found ${assets.length} active assets`);

      for (const asset of assets) {
        try {
          // 2. Find templates linked to this equipment_type
          const templates = await this.taskTemplateModel.findByEquipmentType(
            asset.equipment_type_id, 
            organizationId,
            { is_active: true }
          );

          for (const template of templates) {
            // 3. Evaluate if work order is due
            if (this.isWorkOrderDue(template, today)) {
              // 4. Check for duplicates
              const exists = await this.checkDuplicateExists(
                asset.id, 
                template.id, 
                today,
                organizationId
              );

              if (!exists) {
                // 5. Create work order
                await this.createWorkOrder(asset, template, today, organizationId);
                summary.created++;
              } else {
                summary.skipped++;
                console.log(`[Scheduler] Skipped duplicate WO for asset ${asset.id}, template ${template.id}`);
              }
            }
          }
          summary.processed++;
        } catch (assetError) {
          console.error(`[Scheduler] Error processing asset ${asset.id}:`, assetError.message);
          summary.errors.push({ asset: asset.id, error: assetError.message });
        }
      }

    } catch (error) {
      console.error('[Scheduler] Fatal error:', error.message);
      summary.errors.push({ fatal: true, error: error.message });
    }

    console.log(`[Scheduler] Complete: ${summary.created} created, ${summary.skipped} skipped, ${summary.errors.length} errors`);
    return summary;
  }

  /**
   * Get active assets with equipment_type
   * Only assets with status = 'operational' or 'active'
   */
  async getActiveAssets(organizationId) {
    // Try with default_operator_id first (if migration has been run)
    const sqlWithOperator = `
      SELECT 
        e.id,
        e.name,
        e.code,
        e.facility_id,
        e.equipment_type_id,
        f.name as facility_name,
        f.default_operator_id
      FROM equipment e
      JOIN facilities f ON e.facility_id = f.id
      WHERE e.organization_id = ?
        AND e.status IN ('operational', 'active')
        AND e.equipment_type_id IS NOT NULL
      ORDER BY e.id
    `;
    
    // Fallback without default_operator_id
    const sqlWithoutOperator = `
      SELECT 
        e.id,
        e.name,
        e.code,
        e.facility_id,
        e.equipment_type_id,
        f.name as facility_name,
        NULL as default_operator_id
      FROM equipment e
      JOIN facilities f ON e.facility_id = f.id
      WHERE e.organization_id = ?
        AND e.status IN ('operational', 'active')
        AND e.equipment_type_id IS NOT NULL
      ORDER BY e.id
    `;
    
    try {
      return await db.query(sqlWithOperator, [organizationId]);
    } catch (error) {
      // If column doesn't exist, use fallback
      if (error.message?.includes('default_operator_id')) {
        return await db.query(sqlWithoutOperator, [organizationId]);
      }
      throw error;
    }
  }

  /**
   * Check if work order is due based on template schedule
   * Simple logic: daily, weekly, monthly with interval
   */
  isWorkOrderDue(template, today) {
    // Support both frequency_type/frequency_interval and legacy frequency_value/frequency_unit
    let frequencyType = template.frequency_type;
    let interval = template.frequency_interval || 1;
    
    // Fallback to legacy fields if new fields not set
    if (!frequencyType && template.frequency_unit) {
      const unitMap = {
        'days': 'daily',
        'weeks': 'weekly',
        'months': 'monthly'
      };
      frequencyType = unitMap[template.frequency_unit];
      interval = template.frequency_value || 1;
    }
    
    const startDate = template.start_date ? new Date(template.start_date) : null;

    if (!frequencyType) {
      console.log(`[Scheduler] Template ${template.id} has no frequency, skipping`);
      return false;
    }

    // If no start date, assume it's due
    if (!startDate) return true;

    // Don't create if before start date
    if (today < startDate) return false;

    const dayOfWeek = today.getDay(); // 0=Sunday, 6=Saturday
    const dayOfMonth = today.getDate();

    switch (frequencyType) {
      case 'daily':
        // Every N days from start date
        const daysDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
        return daysDiff % interval === 0;

      case 'weekly':
        // Check day of week matches
        const templateDayOfWeek = template.day_of_week !== null && template.day_of_week !== undefined 
          ? template.day_of_week 
          : 1; // Default Monday
        if (dayOfWeek !== templateDayOfWeek) return false;
        
        // Check interval (every N weeks)
        const weeksDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24 * 7));
        return weeksDiff % interval === 0;

      case 'monthly':
        // Check day of month matches
        const templateDayOfMonth = template.day_of_month !== null && template.day_of_month !== undefined
          ? template.day_of_month 
          : 1;
        if (dayOfMonth !== templateDayOfMonth) return false;
        
        // Check interval (every N months)
        const monthsDiff = (today.getFullYear() - startDate.getFullYear()) * 12 + 
                          (today.getMonth() - startDate.getMonth());
        return monthsDiff % interval === 0;

      default:
        return false;
    }
  }

  /**
   * Check if work order already exists for same asset/template/date
   * Duplicate prevention rule
   */
  async checkDuplicateExists(assetId, templateId, scheduledDate, organizationId) {
    const dateStr = scheduledDate.toISOString().split('T')[0];
    
    const sql = `
      SELECT COUNT(*) as count 
      FROM work_orders 
      WHERE organization_id = ?
        AND equipment_id = ?
        AND task_template_id = ?
        AND DATE(scheduled_date) = ?
        AND status != 'cancelled'
    `;
    
    const [result] = await db.query(sql, [
      organizationId, 
      assetId, 
      templateId, 
      dateStr
    ]);
    
    return result.count > 0;
  }

  /**
   * Create work order from template
   */
  async createWorkOrder(asset, template, scheduledDate, organizationId) {
    // Generate WO number: WO-YYYY-NNNN
    const year = scheduledDate.getFullYear();
    const woNumber = await this.generateWONumber(year, organizationId);

    // Determine assignee (facility default or null)
    const assignedTo = asset.default_operator_id || null;

    const workOrderData = {
      organization_id: organizationId,
      wo_number: woNumber,
      equipment_id: asset.id,
      facility_id: asset.facility_id,
      task_template_id: template.id,
      title: template.template_name || template.task_title || 'Scheduled Inspection',
      description: template.description || template.scope_of_work,
      wo_type: 'preventive',
      priority: template.priority || 'medium',
      status: 'scheduled',
      assigned_to: assignedTo,
      scheduled_date: scheduledDate,
      created_by: null // System generated
    };

    const result = await this.workOrderModel.create(workOrderData);
    
    console.log(`[Scheduler] Created WO ${woNumber} for asset ${asset.code}, template ${template.template_name}`);
    
    return result;
  }

  /**
   * Generate unique work order number
   */
  async generateWONumber(year, organizationId) {
    // Get next sequence number for this year
    const sql = `
      SELECT COUNT(*) as count 
      FROM work_orders 
      WHERE organization_id = ? 
        AND wo_number LIKE ?
    `;
    const [result] = await db.query(sql, [organizationId, `WO-${year}-%`]);
    
    const nextNum = (result.count + 1).toString().padStart(4, '0');
    return `WO-${year}-${nextNum}`;
  }

  /**
   * Preview what work orders would be created (dry run)
   */
  async previewSchedule(organizationId, targetDate = new Date()) {
    targetDate.setHours(0, 0, 0, 0);
    
    const preview = [];
    const assets = await this.getActiveAssets(organizationId);

    for (const asset of assets) {
      const templates = await this.taskTemplateModel.findByEquipmentType(
        asset.equipment_type_id,
        organizationId,
        { is_active: true }
      );

      for (const template of templates) {
        if (this.isWorkOrderDue(template, targetDate)) {
          const exists = await this.checkDuplicateExists(
            asset.id,
            template.id,
            targetDate,
            organizationId
          );

          preview.push({
            asset: { id: asset.id, name: asset.name, code: asset.code },
            template: { id: template.id, name: template.template_name },
            facility: asset.facility_name,
            scheduled_date: targetDate.toISOString().split('T')[0],
            would_create: !exists,
            reason: exists ? 'duplicate' : 'new'
          });
        }
      }
    }

    return preview;
  }
}

module.exports = new SchedulerService();
