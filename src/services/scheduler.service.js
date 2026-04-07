/**
 * ODM Work Order Scheduler Service
 * Auto-generates work orders from maintenance plans
 * Separates schedules (plans) from templates
 */

const { WorkOrder } = require('../models');
const { getDb } = require('../config/database');
const db = getDb();

class SchedulerService {
  constructor() {
    this.workOrderModel = WorkOrder;
  }

  /**
   * Main scheduler entry point - runs daily
   * Creates work orders from maintenance plans that are due
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
      // Get active maintenance plans
      const plans = await this.getActivePlans(organizationId);
      console.log(`[Scheduler] Found ${plans.length} active maintenance plans`);

      for (const plan of plans) {
        try {
          // Get equipment for this plan
          const equipment = await this.getPlanEquipment(plan);
          
          for (const asset of equipment) {
            // Check if plan is due for this equipment
            if (this.isPlanDue(plan, today)) {
              // Check for duplicates
              const exists = await this.checkDuplicateExists(
                asset.id, 
                plan.id, 
                today,
                organizationId
              );

              if (!exists) {
                // Create work order
                await this.createWorkOrder(asset, plan, today, organizationId);
                summary.created++;
              } else {
                summary.skipped++;
                console.log(`[Scheduler] Skipped duplicate WO for asset ${asset.id}, plan ${plan.id}`);
              }
            }
          }
          summary.processed++;
        } catch (planError) {
          console.error(`[Scheduler] Error processing plan ${plan.id}:`, planError.message);
          summary.errors.push({ plan: plan.id, error: planError.message });
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
   * Get active maintenance plans for organization
   */
  async getActivePlans(organizationId) {
    const sql = `
      SELECT 
        mp.*,
        tt.template_name,
        tt.description as template_description,
        tt.maintenance_type
      FROM maintenance_plans mp
      JOIN task_templates tt ON mp.task_template_id = tt.id
      WHERE mp.organization_id = ?
        AND mp.is_active = TRUE
        AND (mp.end_date IS NULL OR mp.end_date >= CURDATE())
      ORDER BY mp.id
    `;
    return await db.query(sql, [organizationId]);
  }

  /**
   * Get equipment for a maintenance plan
   * If plan.equipment_id is set, returns that specific equipment
   * Otherwise returns all equipment of the template's equipment_type
   */
  async getPlanEquipment(plan) {
    if (plan.equipment_id) {
      // Specific equipment
      const sql = `
        SELECT 
          e.id, e.name, e.code, e.facility_id, e.equipment_type_id,
          f.name as facility_name, f.default_operator_id
        FROM equipment e
        JOIN facilities f ON e.facility_id = f.id
        WHERE e.id = ? AND e.status IN ('operational', 'active')
      `;
      const result = await db.query(sql, [plan.equipment_id]);
      return result;
    } else {
      // All equipment of this type
      const sql = `
        SELECT 
          e.id, e.name, e.code, e.facility_id, e.equipment_type_id,
          f.name as facility_name, f.default_operator_id
        FROM equipment e
        JOIN facilities f ON e.facility_id = f.id
        JOIN task_templates tt ON e.equipment_type_id = tt.equipment_type_id
        WHERE tt.id = ?
          AND e.organization_id = ?
          AND e.status IN ('operational', 'active')
      `;
      return await db.query(sql, [plan.task_template_id, plan.organization_id]);
    }
  }

  /**
   * Check if maintenance plan is due on target date
   */
  isPlanDue(plan, today) {
    const startDate = plan.start_date ? new Date(plan.start_date) : null;
    const frequencyType = plan.frequency_type;
    const interval = plan.frequency_interval || 1;

    if (!frequencyType) {
      console.log(`[Scheduler] Plan ${plan.id} has no frequency, skipping`);
      return false;
    }

    // If no start date, assume it's due
    if (!startDate) return true;

    // Don't create if before start date
    if (today < startDate) return false;

    const dayOfWeek = today.getDay();
    const dayOfMonth = today.getDate();

    switch (frequencyType) {
      case 'daily':
        const daysDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
        return daysDiff % interval === 0;

      case 'weekly':
        const planDayOfWeek = plan.day_of_week !== null ? plan.day_of_week : 1;
        if (dayOfWeek !== planDayOfWeek) return false;
        const weeksDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24 * 7));
        return weeksDiff % interval === 0;

      case 'monthly':
        const planDayOfMonth = plan.day_of_month !== null ? plan.day_of_month : 1;
        if (dayOfMonth !== planDayOfMonth) return false;
        const monthsDiff = (today.getFullYear() - startDate.getFullYear()) * 12 + 
                          (today.getMonth() - startDate.getMonth());
        return monthsDiff % interval === 0;

      default:
        return false;
    }
  }

  /**
   * Check if work order already exists for same asset/plan/date
   */
  async checkDuplicateExists(assetId, planId, scheduledDate, organizationId) {
    const dateStr = scheduledDate.toISOString().split('T')[0];
    
    const sql = `
      SELECT COUNT(*) as count 
      FROM work_orders 
      WHERE organization_id = ?
        AND equipment_id = ?
        AND maintenance_plan_id = ?
        AND DATE(scheduled_date) = ?
        AND status != 'cancelled'
    `;
    
    const [result] = await db.query(sql, [
      organizationId, 
      assetId, 
      planId, 
      dateStr
    ]);
    
    return result.count > 0;
  }

  /**
   * Create work order from maintenance plan
   */
  async createWorkOrder(asset, plan, scheduledDate, organizationId) {
    const year = scheduledDate.getFullYear();
    const woNumber = await this.generateWONumber(year, organizationId);

    const workOrderData = {
      organization_id: organizationId,
      wo_number: woNumber,
      equipment_id: asset.id,
      facility_id: asset.facility_id,
      task_template_id: plan.task_template_id,
      maintenance_plan_id: plan.id,
      title: plan.plan_name,
      description: plan.description || plan.template_description,
      wo_type: plan.maintenance_type || 'preventive',
      priority: plan.priority || 'medium',
      status: 'scheduled',
      assigned_to: plan.assigned_to || asset.default_operator_id || null,
      scheduled_date: scheduledDate,
      created_by: null
    };

    const result = await this.workOrderModel.create(workOrderData);
    
    // Update plan's last/next run dates
    await this.updatePlanRunDates(plan.id, scheduledDate);
    
    console.log(`[Scheduler] Created WO ${woNumber} for asset ${asset.code}, plan ${plan.plan_name}`);
    
    return result;
  }

  /**
   * Update plan's run dates
   */
  async updatePlanRunDates(planId, runDate) {
    const sql = `
      UPDATE maintenance_plans 
      SET last_run_date = ?, next_run_date = DATE_ADD(?, INTERVAL frequency_interval DAY)
      WHERE id = ?
    `;
    await db.query(sql, [runDate, runDate, planId]);
  }

  /**
   * Generate unique work order number
   */
  async generateWONumber(year, organizationId) {
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
    const plans = await this.getActivePlans(organizationId);

    for (const plan of plans) {
      const equipment = await this.getPlanEquipment(plan);

      for (const asset of equipment) {
        if (this.isPlanDue(plan, targetDate)) {
          const exists = await this.checkDuplicateExists(
            asset.id,
            plan.id,
            targetDate,
            organizationId
          );

          preview.push({
            asset: { id: asset.id, name: asset.name, code: asset.code },
            plan: { id: plan.id, name: plan.plan_name },
            template: { id: plan.task_template_id, name: plan.template_name },
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
