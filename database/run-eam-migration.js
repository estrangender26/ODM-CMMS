#!/usr/bin/env node
/**
 * EAM ISO 14224 + SAP S/4HANA PM Migration Runner
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function createConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'odm_cmms',
    multipleStatements: true
  });
}

async function runMigration() {
  console.log('========================================');
  console.log('EAM ISO 14224 + SAP S/4HANA Migration');
  console.log('========================================\n');
  
  const connection = await createConnection();
  console.log('✓ Database connected\n');
  
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations', '007_iso_sap_eam_complete.sql'),
    'utf8'
  );
  
  console.log('Running migration...');
  try {
    await connection.query(sql);
    console.log('✓ Migration completed successfully\n');
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    throw error;
  }
  
  // Verify tables created
  console.log('Verifying tables...');
  const [tables] = await connection.execute(`
    SELECT TABLE_NAME FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME IN (
      'facilities', 'equipment_categories', 'equipment_classes', 
      'equipment_types', 'subunits', 'maintainable_items',
      'object_parts', 'damage_codes', 'cause_codes', 'activity_codes',
      'findings', 'task_templates', 'task_template_steps', 'inspection_results'
    )
    ORDER BY TABLE_NAME
  `);
  
  console.log('\nCreated/Verified tables:');
  tables.forEach(t => console.log(`  ✓ ${t.TABLE_NAME}`));
  
  // Verify seeded data
  const [activities] = await connection.execute(
    'SELECT COUNT(*) as count FROM activity_codes'
  );
  console.log(`\n  ✓ Activity codes (Catalog 5): ${activities[0].count}`);
  
  const [causes] = await connection.execute(
    'SELECT COUNT(*) as count FROM cause_codes'
  );
  console.log(`  ✓ Cause codes (Catalog C): ${causes[0].count}`);
  
  // Verify columns added to equipment
  const [columns] = await connection.execute(`
    SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipment'
    AND COLUMN_NAME IN ('facility_id', 'equipment_category_id', 'equipment_class_id', 
    'equipment_type_id', 'subunit_id', 'maintainable_item_id', 
    'sap_equipment_reference', 'sap_floc_hint')
  `);
  console.log(`\n  ✓ Equipment table columns added: ${columns.length}/8`);
  
  await connection.end();
  
  console.log('\n========================================');
  console.log('Migration complete!');
  console.log('========================================');
}

runMigration().catch(error => {
  console.error('\n[ERROR]', error.message);
  process.exit(1);
});
