/**
 * Migration: Add Invitations Table
 * For organization-specific user invitations
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'odm_cmms',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || ''
};

async function runMigration() {
  let connection;
  
  try {
    console.log('='.repeat(60));
    console.log('ODM-CMMS Invitations Migration');
    console.log('='.repeat(60));
    console.log();

    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database:', dbConfig.database);
    console.log();

    // Check if table exists
    const [tables] = await connection.execute(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = 'invitations'",
      [dbConfig.database]
    );

    if (tables[0].count === 0) {
      console.log('Creating invitations table...');
      
      await connection.execute(`
        CREATE TABLE invitations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT NOT NULL,
          email VARCHAR(255) NOT NULL,
          role ENUM('operator', 'supervisor', 'admin') DEFAULT 'operator',
          invited_by INT NOT NULL,
          token VARCHAR(255) NOT NULL UNIQUE,
          status ENUM('pending', 'accepted', 'expired', 'cancelled') DEFAULT 'pending',
          expires_at TIMESTAMP NOT NULL,
          accepted_at TIMESTAMP NULL,
          accepted_by_user_id INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
          FOREIGN KEY (invited_by) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_organization (organization_id),
          INDEX idx_email (email),
          INDEX idx_token (token),
          INDEX idx_status (status),
          INDEX idx_expires (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      console.log('  ✓ Created invitations table');
    } else {
      console.log('  ✓ Table already exists');
    }
    
    console.log();
    console.log('='.repeat(60));
    console.log('🎉 Invitations Migration Completed!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Migration Failed!');
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
