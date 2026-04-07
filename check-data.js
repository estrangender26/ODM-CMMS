/**
 * Check if ISO data was imported correctly
 */
const { pool } = require('./src/config/database');

async function checkData() {
  const connection = await pool.getConnection();
  
  try {
    console.log('=== CHECKING DATABASE DATA ===\n');
    
    // Check categories
    const [categories] = await connection.execute('SELECT COUNT(*) as count FROM equipment_categories');
    console.log('Equipment Categories:', categories[0].count);
    
    // Check classes
    const [classes] = await connection.execute('SELECT COUNT(*) as count FROM equipment_classes');
    console.log('Equipment Classes:', classes[0].count);
    
    // Check types
    const [types] = await connection.execute('SELECT COUNT(*) as count FROM equipment_types');
    console.log('Equipment Types:', types[0].count);
    
    // Check templates
    const [templates] = await connection.execute('SELECT COUNT(*) as count FROM task_templates');
    console.log('Task Templates:', templates[0].count);
    
    // Check template steps
    const [steps] = await connection.execute('SELECT COUNT(*) as count FROM task_template_steps');
    console.log('Template Steps:', steps[0].count);
    
    // Show sample templates
    console.log('\n=== SAMPLE TEMPLATES ===');
    const [sampleTemplates] = await connection.execute(`
      SELECT tt.id, tt.template_name, tt.organization_id, et.type_name
      FROM task_templates tt
      JOIN equipment_types et ON tt.equipment_type_id = et.id
      LIMIT 5
    `);
    sampleTemplates.forEach(t => {
      console.log(`- ${t.template_name} (${t.type_name}) - Org: ${t.organization_id}`);
    });
    
    console.log('\n=== CHECK COMPLETE ===');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    connection.release();
    await pool.end();
  }
}

checkData();
