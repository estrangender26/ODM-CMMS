#!/usr/bin/env node
/**
 * ISO 14224 + SAP S/4HANA PM Catalog Migration Runner
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
  console.log('ISO 14224 + SAP S/4HANA PM Migration');
  console.log('========================================\n');
  
  const connection = await createConnection();
  console.log('✓ Database connected\n');
  
  const sql = fs.readFileSync(
    path.join(__dirname, 'migrations', '006_iso_sap_reliability_structure.sql'),
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
      'equipment_subunits', 'maintainable_items',
      'object_parts', 'damage_codes', 'cause_codes', 'activity_codes',
      'work_order_failures'
    )
  `);
  
  console.log('\nCreated tables:');
  tables.forEach(t => console.log(`  ✓ ${t.TABLE_NAME}`));
  
  // Verify activity codes seeded
  const [activities] = await connection.execute(
    'SELECT COUNT(*) as count FROM activity_codes'
  );
  console.log(`\n  ✓ Activity codes seeded: ${activities[0].count}`);
  
  const [causes] = await connection.execute(
    'SELECT COUNT(*) as count FROM cause_codes'
  );
  console.log(`  ✓ Cause codes seeded: ${causes[0].count}`);
  
  await connection.end();
  
  console.log('\n========================================');
  console.log('Migration complete!');
  console.log('========================================');
}

runMigration().catch(error => {
  console.error('\n[ERROR]', error.message);
  process.exit(1);
});
