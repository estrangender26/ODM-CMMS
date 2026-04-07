/**
 * Scheduler Controller
 * API endpoints for work order auto-generation scheduler
 */

const schedulerService = require('../services/scheduler.service');

class SchedulerController {
  /**
   * POST /api/scheduler/run
   * Run scheduler for an organization (manual trigger)
   */
  async runScheduler(req, res) {
    try {
      const organizationId = req.user?.organization_id || req.body.organization_id;
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required'
        });
      }

      console.log(`[Scheduler API] Manual trigger for org ${organizationId}`);
      const result = await schedulerService.runDailySchedule(organizationId);
      
      res.json({
        success: true,
        message: `Scheduler complete: ${result.created} work orders created`,
        data: result
      });
    } catch (error) {
      console.error('[Scheduler API] Error:', error);
      res.status(500).json({
        success: false,
        message: 'Scheduler failed',
        error: error.message
      });
    }
  }

  /**
   * GET /api/scheduler/preview
   * Preview what work orders would be created (dry run)
   */
  async previewSchedule(req, res) {
    try {
      const organizationId = req.user?.organization_id || req.query.organization_id;
      const targetDate = req.query.date ? new Date(req.query.date) : new Date();
      
      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: 'Organization ID required'
        });
      }

      const preview = await schedulerService.previewSchedule(organizationId, targetDate);
      
      res.json({
        success: true,
        message: `Preview: ${preview.length} potential work orders`,
        data: {
          target_date: targetDate.toISOString().split('T')[0],
          total: preview.length,
          would_create: preview.filter(p => p.would_create).length,
          would_skip: preview.filter(p => !p.would_create).length,
          items: preview
        }
      });
    } catch (error) {
      console.error('[Scheduler API] Preview error:', error);
      res.status(500).json({
        success: false,
        message: 'Preview failed',
        error: error.message
      });
    }
  }

  /**
   * POST /api/scheduler/run-all
   * Run scheduler for all organizations (admin only)
   */
  async runAll(req, res) {
    try {
      // Check if user is admin
      if (req.user?.role !== 'admin' && !req.user?.is_organization_admin) {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      const { Organization } = require('../models');
      const organizations = await Organization.findAll({ is_active: true });
      
      const results = [];
      for (const org of organizations) {
        console.log(`[Scheduler API] Processing org ${org.id}: ${org.name}`);
        const result = await schedulerService.runDailySchedule(org.id);
        results.push({
          organization_id: org.id,
          organization_name: org.name,
          ...result
        });
      }

      const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
      
      res.json({
        success: true,
        message: `All organizations processed: ${totalCreated} total work orders created`,
        data: {
          organizations_processed: results.length,
          total_created: totalCreated,
          details: results
        }
      });
    } catch (error) {
      console.error('[Scheduler API] Run-all error:', error);
      res.status(500).json({
        success: false,
        message: 'Batch scheduler failed',
        error: error.message
      });
    }
  }
}

module.exports = new SchedulerController();
