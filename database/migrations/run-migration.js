/**
 * Run migration to add facility_id to users table
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Read .env file
  const envPath = path.join(__dirname, '../../.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const env = {};
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      env[key.trim()] = value.trim();
    }
  });

  const pool = mysql.createPool({
    host: env.DB_HOST || 'localhost',
    user: env.DB_USER || 'root',
    password: env.DB_PASSWORD || '',
    database: env.DB_NAME || 'odm_cmms',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  try {
    console.log('Running migration: Add facility_id to users table...');
    
    // Check if column already exists
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'facility_id'
    `);
    
    if (columns.length > 0) {
      console.log('Column facility_id already exists. Skipping migration.');
      return;
    }
    
    // Add the column
    await pool.execute(`
      ALTER TABLE users 
      ADD COLUMN facility_id INT NULL AFTER role
    `);
    
    // Add foreign key
    await pool.execute(`
      ALTER TABLE users 
      ADD CONSTRAINT fk_user_facility 
      FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE SET NULL
    `);
    
    // Add index
    await pool.execute(`
      ALTER TABLE users 
      ADD INDEX idx_user_facility (facility_id)
    `);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
