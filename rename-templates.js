/**
 * Remove "Daily" prefix from template names
 * Templates should not imply schedule - that's for Maintenance Plans
 */
const { pool } = require('./src/config/database');

async function renameTemplates() {
  const connection = await pool.getConnection();
  
  try {
    console.log('[RENAME] Removing "Daily" prefix from template names...');
    
    // Get all templates with "Daily" in the name
    const [templates] = await connection.execute(`
      SELECT id, template_name
      FROM task_templates
      WHERE template_name LIKE 'Daily %'
    `);
    
    console.log(`[RENAME] Found ${templates.length} templates to rename`);
    
    for (const template of templates) {
      const newName = template.template_name.replace(/^Daily\s+/, '');
      
      await connection.execute(`
        UPDATE task_templates
        SET template_name = ?
        WHERE id = ?
      `, [newName, template.id]);
      
      console.log(`[RENAME] "${template.template_name}" → "${newName}"`);
    }
    
    console.log('[RENAME] ✓ All templates renamed');
    
    // Also update maintenance plan names
    console.log('[RENAME] Updating maintenance plan names...');
    const [plans] = await connection.execute(`
      SELECT id, plan_name
      FROM maintenance_plans
      WHERE plan_name LIKE '%Daily%'
    `);
    
    for (const plan of plans) {
      const newPlanName = plan.plan_name.replace(/Schedule for Daily\s+/i, 'Schedule for ');
      await connection.execute(`
        UPDATE maintenance_plans
        SET plan_name = ?
        WHERE id = ?
      `, [newPlanName, plan.id]);
    }
    console.log(`[RENAME] Updated ${plans.length} maintenance plans`);
    
  } catch (error) {
    console.error('[RENAME] ✗ Error:', error.message);
  } finally {
    connection.release();
    await pool.end();
  }
}

renameTemplates();
