#!/usr/bin/env node
/**
 * ISO 14224 Database Migration Runner
 * ODM-CMMS
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const SEEDERS_DIR = path.join(__dirname, 'seeders');

async function createConnection() {
  return await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'odm_cmms',
    multipleStatements: true
  });
}

async function runSqlFile(connection, filePath) {
  console.log(`  Reading file...`);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  console.log(`  Executing SQL...`);
  try {
    await connection.query(sql);
    console.log(`  ✓ Success`);
  } catch (error) {
    // Ignore "already exists" errors for safe re-runs
    const skipErrors = [
      'ER_TABLE_EXISTS_ERROR',
      'ER_DUP_FIELDNAME',
      'ER_DUP_KEYNAME',
      'ER_CANT_DROP_FIELD_OR_KEY',
      'ER_FK_DUP_NAME'
    ];
    
    if (skipErrors.includes(error.code) || 
        error.message.includes('already exists') ||
        error.message.includes('Duplicate')) {
      console.log(`  [SKIP] ${error.message.substring(0, 100)}...`);
    } else {
      throw error;
    }
  }
}

async function runMigrations() {
  console.log('========================================');
  console.log('ODM-CMMS ISO 14224 Migration Runner');
  console.log('========================================\n');
  
  const connection = await createConnection();
  console.log('✓ Database connected\n');
  
  // Run only ISO migration
  console.log('Running ISO 14224 migration...');
  const migrationFile = '005_iso_equipment_hierarchy.sql';
  const filePath = path.join(MIGRATIONS_DIR, migrationFile);
  
  if (fs.existsSync(filePath)) {
    console.log(`\n[Migration] ${migrationFile}`);
    await runSqlFile(connection, filePath);
  } else {
    console.log(`Migration file not found: ${migrationFile}`);
  }
  
  // Run seeders
  console.log('\n\nRunning seeders...');
  const seederFiles = fs.readdirSync(SEEDERS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  for (const file of seederFiles) {
    console.log(`\n[Seeder] ${file}`);
    const seederPath = path.join(SEEDERS_DIR, file);
    await runSqlFile(connection, seederPath);
  }
  
  console.log('\n========================================');
  console.log('ISO 14224 Migration completed!');
  console.log('========================================');
  
  await connection.end();
  process.exit(0);
}

runMigrations().catch(error => {
  console.error('\n[ERROR] Migration failed:', error.message);
  console.error(error.stack);
  process.exit(1);
});
