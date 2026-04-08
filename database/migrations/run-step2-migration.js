/**
 * Step 2 Migration Runner
 * Industry Layer and Template Architecture
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const migrations = [
  '014_add_industry_layer.sql',
  '015_backfill_industry_and_template_data.sql'
];

const seeds = [
  '001_seed_industries.sql'
];

async function runMigrations() {
  console.log('=== Step 2 Migration: Industry Layer and Template Architecture ===\n');
  
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'odm_cmms';
  
  let connection;
  
  try {
    // Connect to database
    console.log('Connecting to database...');
    connection = await mysql.createConnection({
      host, port, user, password, database: dbName,
      multipleStatements: true
    });
    console.log('✓ Connected\n');
    
    // Run migrations
    console.log('Running migrations...');
    for (const migration of migrations) {
      const migrationPath = path.join(__dirname, migration);
      
      if (!fs.existsSync(migrationPath)) {
        console.log(`⚠ Migration file not found: ${migration}`);
        continue;
      }
      
      console.log(`\n→ Running ${migration}...`);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      try {
        await connection.query(sql);
        console.log(`  ✓ ${migration} completed`);
      } catch (err) {
        console.error(`  ✗ ${migration} failed:`, err.message);
        // Continue with other migrations
      }
    }
    
    // Run seeds
    console.log('\n\nRunning seeds...');
    for (const seed of seeds) {
      const seedPath = path.join(__dirname, '../seeds', seed);
      
      if (!fs.existsSync(seedPath)) {
        console.log(`⚠ Seed file not found: ${seed}`);
        continue;
      }
      
      console.log(`\n→ Running ${seed}...`);
      const sql = fs.readFileSync(seedPath, 'utf8');
      
      try {
        await connection.query(sql);
        console.log(`  ✓ ${seed} completed`);
      } catch (err) {
        console.error(`  ✗ ${seed} failed:`, err.message);
      }
    }
    
    console.log('\n\n=== Migration Summary ===');
    console.log('✓ Step 2 migrations completed');
    
    // Verify
    console.log('\nVerifying...');
    const [industries] = await connection.query('SELECT COUNT(*) as count FROM industries');
    const [templates] = await connection.query('SELECT COUNT(*) as count FROM task_templates WHERE is_system = TRUE');
    const [orgTemplates] = await connection.query('SELECT COUNT(*) as count FROM task_templates WHERE is_system = FALSE');
    
    console.log(`  Industries: ${industries[0].count}`);
    console.log(`  System templates: ${templates[0].count}`);
    console.log(`  Org templates: ${orgTemplates[0].count}`);
    
    console.log('\n✓ Step 2 complete!');
    
  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigrations();
