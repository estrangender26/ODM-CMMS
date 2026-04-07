#!/usr/bin/env node
/**
 * ODM Daily Scheduler Script
 * Run this via cron: 0 1 * * * node src/scripts/run-scheduler.js
 * Or use node-cron/PM2 scheduler in production
 */

const schedulerService = require('../services/scheduler.service');
const db = require('../config/database');

async function runScheduler() {
  console.log('[DailyScheduler] Starting...', new Date().toISOString());
  
  try {
    // Get all active organizations
    const sql = `SELECT id, name FROM organizations WHERE is_active = TRUE`;
    const organizations = await db.query(sql);
    
    console.log(`[DailyScheduler] Processing ${organizations.length} organizations`);
    
    const results = [];
    for (const org of organizations) {
      try {
        console.log(`[DailyScheduler] Org ${org.id}: ${org.name}`);
        const result = await schedulerService.runDailySchedule(org.id);
        results.push({
          org: org.name,
          created: result.created,
          skipped: result.skipped,
          errors: result.errors.length
        });
      } catch (orgError) {
        console.error(`[DailyScheduler] Org ${org.id} failed:`, orgError.message);
        results.push({
          org: org.name,
          error: orgError.message
        });
      }
    }
    
    // Summary
    const totalCreated = results.reduce((sum, r) => sum + (r.created || 0), 0);
    console.log('[DailyScheduler] Complete:', totalCreated, 'work orders created');
    console.table(results);
    
  } catch (error) {
    console.error('[DailyScheduler] Fatal error:', error);
    process.exit(1);
  } finally {
    // Close database connection
    await db.end();
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  runScheduler();
}

module.exports = { runScheduler };
