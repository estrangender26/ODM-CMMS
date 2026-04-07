/**
 * Remove schedule fields from task templates
 * Schedules should only exist in maintenance_plans now
 */
const { pool } = require('./src/config/database');

async function cleanup() {
  const connection = await pool.getConnection();
  
  try {
    console.log('[CLEANUP] Removing schedule fields from task templates...');
    
    // Clear schedule fields from templates - they should only be in maintenance_plans
    await connection.execute(`
      UPDATE task_templates 
      SET frequency_type = NULL,
          frequency_interval = NULL,
          day_of_week = NULL,
          day_of_month = NULL,
          start_date = NULL
    `);
    
    console.log('[CLEANUP] ✓ Schedule fields cleared from templates');
    console.log('[CLEANUP] Templates now only define WHAT to inspect (not WHEN)');
    console.log('[CLEANUP] Schedules are managed in maintenance_plans table');
    
    // Show count of maintenance plans (schedules)
    const [plans] = await connection.execute('SELECT COUNT(*) as count FROM maintenance_plans');
    console.log(`[CLEANUP] Maintenance plans (schedules): ${plans[0].count}`);
    
  } catch (error) {
    console.error('[CLEANUP] ✗ Error:', error.message);
  } finally {
    connection.release();
    await pool.end();
  }
}

cleanup();
