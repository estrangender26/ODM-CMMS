/**
 * Verify ISO 14224 Data Migration
 */

const { pool } = require('./src/config/database');

async function verify() {
  console.log('========================================');
  console.log('Verifying ISO 14224 Migration');
  console.log('========================================\n');
  
  // Check equipment categories
  const [categories] = await pool.execute('SELECT COUNT(*) as count FROM equipment_categories');
  console.log(`✓ Equipment Categories: ${categories[0].count}`);
  
  // Check equipment classes
  const [classes] = await pool.execute('SELECT COUNT(*) as count FROM equipment_classes');
  console.log(`✓ Equipment Classes: ${classes[0].count}`);
  
  // Check equipment types
  const [types] = await pool.execute('SELECT COUNT(*) as count FROM equipment_types');
  console.log(`✓ Equipment Types: ${types[0].count}`);
  
  // Check failure modes
  const [failureModes] = await pool.execute('SELECT COUNT(*) as count FROM failure_modes');
  console.log(`✓ Failure Modes: ${failureModes[0].count}`);
  
  // Check task_templates table exists
  const [taskTemplates] = await pool.execute(`
    SELECT COUNT(*) as count FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
    AND table_name = 'task_templates'
  `);
  console.log(`✓ Task Templates Table: ${taskTemplates[0].count > 0 ? 'Exists' : 'Missing'}`);
  
  // Check task_template_steps table exists
  const [steps] = await pool.execute(`
    SELECT COUNT(*) as count FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
    AND table_name = 'task_template_steps'
  `);
  console.log(`✓ Task Template Steps Table: ${steps[0].count > 0 ? 'Exists' : 'Missing'}`);
  
  // Check equipment has new columns
  const [cols] = await pool.execute(`
    SELECT COLUMN_NAME 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'equipment'
    AND COLUMN_NAME IN ('equipment_category_id', 'equipment_class_id', 'equipment_type_id')
  `);
  console.log(`✓ Equipment ISO Columns: ${cols.length}/3 added`);
  
  // Sample data
  console.log('\n--- Sample Data ---');
  const [sampleCats] = await pool.execute('SELECT category_code, category_name FROM equipment_categories LIMIT 5');
  console.log('\nSample Categories:');
  sampleCats.forEach(c => console.log(`  - ${c.category_code}: ${c.category_name}`));
  
  const [sampleTypes] = await pool.execute(`
    SELECT et.type_code, et.type_name, ec.class_name, ecat.category_name
    FROM equipment_types et
    JOIN equipment_classes ec ON et.class_id = ec.id
    JOIN equipment_categories ecat ON ec.category_id = ecat.id
    LIMIT 5
  `);
  console.log('\nSample Equipment Types:');
  sampleTypes.forEach(t => console.log(`  - ${t.type_code}: ${t.type_name} (${t.class_name} > ${t.category_name})`));
  
  await pool.end();
  console.log('\n========================================');
  console.log('Verification complete!');
  console.log('========================================');
}

verify().catch(console.error);
