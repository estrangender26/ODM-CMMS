#!/usr/bin/env node
/**
 * Multi-Tenant Migration Runner
 * Safely migrates existing ODM-CMMS database to multi-tenant architecture
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'odm_cmms',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || ''
};

// Tables that need organization_id column
const TABLES_TO_ALTER = [
  { table: 'users', columns: [
    { name: 'organization_id', definition: 'INT' },
    { name: 'is_organization_admin', definition: 'BOOLEAN DEFAULT FALSE' }
  ]},
  { table: 'facilities', columns: [{ name: 'organization_id', definition: 'INT' }] },
  { table: 'equipment', columns: [{ name: 'organization_id', definition: 'INT' }] },
  { table: 'task_master', columns: [{ name: 'organization_id', definition: 'INT' }] },
  { table: 'schedules', columns: [{ name: 'organization_id', definition: 'INT' }] },
  { table: 'work_orders', columns: [{ name: 'organization_id', definition: 'INT' }] },
  { table: 'work_order_notes', columns: [{ name: 'organization_id', definition: 'INT' }] },
  { table: 'inspection_points', columns: [{ name: 'organization_id', definition: 'INT' }] },
  { table: 'inspection_readings', columns: [{ name: 'organization_id', definition: 'INT' }] },
  { table: 'attachments', columns: [{ name: 'organization_id', definition: 'INT' }] },
  { table: 'audit_log', columns: [{ name: 'organization_id', definition: 'INT' }] }
];

async function runMigration() {
  let connection;
  
  try {
    console.log('='.repeat(60));
    console.log('ODM-CMMS Multi-Tenant Migration');
    console.log('='.repeat(60));
    console.log('');
    console.log('Database:', dbConfig.database);
    console.log('Host:', dbConfig.host);
    console.log('');

    // Connect to database
    console.log('Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected successfully.\n');

    // Check if already migrated
    const [tables] = await connection.execute(
      "SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = ? AND table_name = 'organizations'",
      [dbConfig.database]
    );
    
    if (tables[0].count > 0) {
      console.log('⚠️  Organizations table already exists.');
      const [orgCount] = await connection.execute('SELECT COUNT(*) as count FROM organizations');
      console.log(`   Found ${orgCount[0].count} organization(s).`);
      
      // Check if all columns exist
      const [userCols] = await connection.execute(
        "SELECT COUNT(*) as count FROM information_schema.columns WHERE table_schema = ? AND table_name = 'users' AND column_name = 'organization_id'",
        [dbConfig.database]
      );
      
      if (userCols[0].count > 0) {
        console.log('   organization_id columns already exist in tables.');
        console.log('Migration already completed.\n');
        return;
      }
      console.log('');
    }

    // Run Part 1: Create organizations table
    console.log('Running Part 1: Creating organizations table...');
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS organizations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        organization_name VARCHAR(255) NOT NULL,
        subscription_plan VARCHAR(50) DEFAULT 'basic',
        subscription_status VARCHAR(50) DEFAULT 'active',
        billing_email VARCHAR(100),
        billing_address TEXT,
        max_users INT DEFAULT 10,
        max_facilities INT DEFAULT 5,
        max_equipment INT DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_subscription_status (subscription_status),
        INDEX idx_subscription_plan (subscription_plan)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Organizations table created.\n');

    // Create new tables
    console.log('Creating new tables...');
    
    // SMP Families table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS smp_families (
        id INT AUTO_INCREMENT PRIMARY KEY,
        organization_id INT NOT NULL,
        family_code VARCHAR(50) NOT NULL,
        family_name VARCHAR(200) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_family_code_org (organization_id, family_code),
        INDEX idx_organization_id (organization_id),
        INDEX idx_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   smp_families table created');

    // SMP Tasks table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS smp_tasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        organization_id INT NOT NULL,
        family_id INT NOT NULL,
        task_code VARCHAR(50) NOT NULL,
        task_name VARCHAR(200) NOT NULL,
        description TEXT,
        frequency_type ENUM('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'hours_based') NOT NULL,
        frequency_value INT DEFAULT 1,
        estimated_duration INT,
        priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
        is_active BOOLEAN DEFAULT TRUE,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_task_code_org (organization_id, task_code),
        INDEX idx_organization_id (organization_id),
        INDEX idx_family_id (family_id),
        INDEX idx_active (is_active),
        FOREIGN KEY (family_id) REFERENCES smp_families(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   smp_tasks table created');

    // Notifications table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        organization_id INT NOT NULL,
        user_id INT NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT,
        notification_type VARCHAR(50) DEFAULT 'info',
        entity_type VARCHAR(50),
        entity_id INT,
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_organization_id (organization_id),
        INDEX idx_user_id (user_id),
        INDEX idx_is_read (is_read),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   notifications table created');

    // Dashboard widgets table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS dashboard_widgets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        organization_id INT NOT NULL,
        user_id INT NOT NULL,
        widget_type VARCHAR(50) NOT NULL,
        widget_config JSON,
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_organization_id (organization_id),
        INDEX idx_user_id (user_id),
        INDEX idx_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   dashboard_widgets table created');

    // Uploaded files table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS uploaded_files (
        id INT AUTO_INCREMENT PRIMARY KEY,
        organization_id INT NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INT,
        mime_type VARCHAR(100),
        entity_type VARCHAR(50),
        entity_id INT,
        uploaded_by INT,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_organization_id (organization_id),
        INDEX idx_entity (entity_type, entity_id),
        INDEX idx_uploaded_by (uploaded_by)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('   uploaded_files table created');
    console.log('✅ Part 1 completed.\n');

    // Run Part 2: Add organization_id columns to existing tables
    console.log('Running Part 2: Adding organization_id columns to existing tables...');
    for (const { table, columns } of TABLES_TO_ALTER) {
      for (const column of columns) {
        // Check if column exists
        const [exists] = await connection.execute(
          "SELECT COUNT(*) as count FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = ?",
          [dbConfig.database, table, column.name]
        );
        
        if (exists[0].count === 0) {
          console.log(`   Adding ${column.name} to ${table}...`);
          await connection.execute(`ALTER TABLE ${table} ADD COLUMN ${column.name} ${column.definition}`);
          
          // Add index for organization_id columns
          if (column.name === 'organization_id') {
            await connection.execute(`ALTER TABLE ${table} ADD INDEX idx_organization_id (${column.name})`);
          }
        } else {
          console.log(`   ${column.name} already exists in ${table}, skipping...`);
        }
      }
    }
    console.log('✅ Part 2 completed.\n');

    // Run Part 3: Create default organization and migrate data
    console.log('Running Part 3: Creating default organization and migrating data...');
    
    // Create default organization if none exists
    const [orgExists] = await connection.execute('SELECT id FROM organizations ORDER BY id ASC LIMIT 1');
    let defaultOrgId;
    
    if (orgExists.length === 0) {
      const [result] = await connection.execute(
        "INSERT INTO organizations (organization_name, subscription_plan, subscription_status, max_users, max_facilities, max_equipment) VALUES (?, ?, ?, ?, ?, ?)",
        ['Default Organization', 'internal', 'active', 100, 20, 1000]
      );
      defaultOrgId = result.insertId;
      console.log(`   Created default organization (ID: ${defaultOrgId})`);
    } else {
      defaultOrgId = orgExists[0].id;
      console.log(`   Using existing organization (ID: ${defaultOrgId})`);
    }

    // Migrate existing data
    console.log('   Migrating existing data to default organization...');
    for (const { table } of TABLES_TO_ALTER) {
      const [result] = await connection.execute(
        `UPDATE ${table} SET organization_id = ? WHERE organization_id IS NULL`,
        [defaultOrgId]
      );
      if (result.affectedRows > 0) {
        console.log(`     ${table}: ${result.affectedRows} rows updated`);
      }
    }
    console.log('✅ Part 3 completed.\n');

    // Run Part 4: Make organization_id NOT NULL and add foreign keys
    console.log('Running Part 4: Adding constraints and foreign keys...');
    
    for (const { table } of TABLES_TO_ALTER) {
      // Check if column is already NOT NULL
      const [colInfo] = await connection.execute(
        "SELECT is_nullable FROM information_schema.columns WHERE table_schema = ? AND table_name = ? AND column_name = 'organization_id'",
        [dbConfig.database, table]
      );
      
      if (colInfo.length > 0 && colInfo[0].is_nullable === 'YES') {
        console.log(`   Making organization_id NOT NULL in ${table}...`);
        await connection.execute(`ALTER TABLE ${table} MODIFY COLUMN organization_id INT NOT NULL`);
      }
      
      // Check if foreign key exists
      const fkName = `fk_${table}_organization`;
      const [fkExists] = await connection.execute(
        "SELECT COUNT(*) as count FROM information_schema.table_constraints WHERE table_schema = ? AND table_name = ? AND constraint_name = ?",
        [dbConfig.database, table, fkName]
      );
      
      if (fkExists[0].count === 0) {
        console.log(`   Adding foreign key to ${table}...`);
        try {
          await connection.execute(
            `ALTER TABLE ${table} ADD CONSTRAINT ${fkName} FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE`
          );
        } catch (fkError) {
          console.log(`     Warning: Could not add FK to ${table}: ${fkError.message}`);
        }
      }
    }
    console.log('✅ Part 4 completed.\n');

    // Run Part 5: Set first admin as organization admin
    console.log('Running Part 5: Setting up organization admin...');
    try {
      await connection.execute(
        "UPDATE users SET is_organization_admin = TRUE WHERE role = 'admin' AND organization_id = ? ORDER BY id ASC LIMIT 1",
        [defaultOrgId]
      );
      console.log('   Organization admin set.');
    } catch (adminError) {
      console.log('   Warning: Could not set organization admin:', adminError.message);
    }
    console.log('✅ Part 5 completed.\n');

    // Verify migration
    console.log('='.repeat(60));
    console.log('Verifying Migration...');
    console.log('='.repeat(60));
    console.log('');

    // Check organizations
    const [orgs] = await connection.execute('SELECT * FROM organizations');
    console.log(`✅ Organizations: ${orgs.length} created`);
    orgs.forEach(org => {
      console.log(`   - ${org.organization_name} (ID: ${org.id}, Plan: ${org.subscription_plan})`);
    });

    // Check users
    const [userCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM users WHERE organization_id IS NOT NULL'
    );
    console.log(`✅ Users migrated: ${userCount[0].count}`);

    // Check facilities
    const [facilityCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM facilities WHERE organization_id IS NOT NULL'
    );
    console.log(`✅ Facilities migrated: ${facilityCount[0].count}`);

    // Check equipment
    const [equipmentCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM equipment WHERE organization_id IS NOT NULL'
    );
    console.log(`✅ Equipment migrated: ${equipmentCount[0].count}`);

    // Check work orders
    const [woCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM work_orders WHERE organization_id IS NOT NULL'
    );
    console.log(`✅ Work Orders migrated: ${woCount[0].count}`);

    console.log('');
    console.log('='.repeat(60));
    console.log('🎉 Multi-Tenant Migration Completed Successfully!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Next Steps:');
    console.log('1. Restart your application server');
    console.log('2. Login with existing credentials');
    console.log('3. All existing data is now assigned to the default organization');
    console.log('4. New organizations can be created via API');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('='.repeat(60));
    console.error('❌ Migration Failed!');
    console.error('='.repeat(60));
    console.error('Error:', error.message);
    if (error.sqlMessage) {
      console.error('SQL Error:', error.sqlMessage);
    }
    console.error('');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migration
runMigration();
