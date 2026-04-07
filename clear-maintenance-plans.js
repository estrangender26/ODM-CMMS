/**
 * Clear auto-generated maintenance plans
 * These were created automatically from template schedule data
 * User should create meaningful plans based on actual equipment and needs
 */
const { pool } = require('./src/config/database');

async function clearPlans() {
  const connection = await pool.getConnection();
  
  try {
    console.log('[CLEAR] Checking maintenance plans...');
    
    // Get count before
    const [before] = await connection.execute('SELECT COUNT(*) as count FROM maintenance_plans');
    console.log(`[CLEAR] Current maintenance plans: ${before[0].count}`);
    
    // Delete all auto-generated plans (those with plan_code starting with 'PLAN-')
    const [result] = await connection.execute(`
      DELETE FROM maintenance_plans 
      WHERE plan_code LIKE 'PLAN-%'
    `);
    
    console.log(`[CLEAR] Deleted ${result.affectedRows} auto-generated maintenance plans`);
    
    // Get count after
    const [after] = await connection.execute('SELECT COUNT(*) as count FROM maintenance_plans');
    console.log(`[CLEAR] Remaining maintenance plans: ${after[0].count}`);
    
    console.log('\n[CLEAR] ✓ Auto-generated plans cleared');
    console.log('[CLEAR] You can now create meaningful maintenance plans:');
    console.log('  - Apply templates to specific equipment');
    console.log('  - Set realistic schedules (daily/weekly/monthly)');
    console.log('  - Different frequencies for different equipment importance');
    
  } catch (error) {
    console.error('[CLEAR] ✗ Error:', error.message);
  } finally {
    connection.release();
    await pool.end();
  }
}

clearPlans();
