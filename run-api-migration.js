#!/usr/bin/env node
/**
 * API Access Migration Runner
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'odm_cmms',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root123'
};

async function tableExists(conn, table) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) as count FROM information_schema.tables 
     WHERE table_schema = ? AND table_name = ?`,
    [dbConfig.database, table]
  );
  return rows[0].count > 0;
}

async function columnExists(conn, table, column) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) as count FROM information_schema.columns 
     WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
    [dbConfig.database, table, column]
  );
  return rows[0].count > 0;
}

async function runMigration() {
  let connection;
  
  try {
    console.log('='.repeat(60));
    console.log('ODM API Access Migration');
    console.log('='.repeat(60));
    console.log();

    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database:', dbConfig.database);
    console.log();

    // Create api_keys table
    if (!(await tableExists(connection, 'api_keys'))) {
      await connection.execute(`
        CREATE TABLE api_keys (
          id INT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT NOT NULL,
          user_id INT NOT NULL,
          name VARCHAR(100) NOT NULL,
          api_key_hash VARCHAR(255) NOT NULL,
          api_key_prefix VARCHAR(8) NOT NULL,
          scopes JSON NULL,
          rate_limit_per_minute INT DEFAULT 60,
          last_used_at TIMESTAMP NULL,
          usage_count INT DEFAULT 0,
          expires_at TIMESTAMP NULL,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          INDEX idx_organization (organization_id),
          INDEX idx_user (user_id),
          INDEX idx_api_key_prefix (api_key_prefix),
          INDEX idx_active (is_active)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  ✓ Created: api_keys');
    } else {
      console.log('  • Table exists: api_keys');
    }

    // Create api_usage_logs table
    if (!(await tableExists(connection, 'api_usage_logs'))) {
      await connection.execute(`
        CREATE TABLE api_usage_logs (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT NOT NULL,
          api_key_id INT NULL,
          user_id INT NULL,
          endpoint VARCHAR(500) NOT NULL,
          http_method VARCHAR(10) NOT NULL,
          ip_address VARCHAR(45) NULL,
          user_agent TEXT NULL,
          response_status INT NULL,
          response_time_ms INT NULL,
          error_message TEXT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_organization (organization_id),
          INDEX idx_api_key (api_key_id),
          INDEX idx_created_at (created_at),
          INDEX idx_endpoint (endpoint)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  ✓ Created: api_usage_logs');
    } else {
      console.log('  • Table exists: api_usage_logs');
    }

    // Add max_api_keys to subscription_plans
    if (!(await columnExists(connection, 'subscription_plans', 'max_api_keys'))) {
      await connection.execute(`ALTER TABLE subscription_plans ADD COLUMN max_api_keys INT DEFAULT 0`);
      console.log('  ✓ Added: max_api_keys to subscription_plans');
    } else {
      console.log('  • Column exists: max_api_keys');
    }

    // Add max_api_keys to organization_subscriptions
    if (!(await columnExists(connection, 'organization_subscriptions', 'max_api_keys'))) {
      await connection.execute(`ALTER TABLE organization_subscriptions ADD COLUMN max_api_keys INT DEFAULT 0`);
      console.log('  ✓ Added: max_api_keys to organization_subscriptions');
    } else {
      console.log('  • Column exists: max_api_keys');
    }

    // Update plan limits
    await connection.execute(`UPDATE subscription_plans SET max_api_keys = 0 WHERE plan_code IN ('free', 'starter')`);
    await connection.execute(`UPDATE subscription_plans SET max_api_keys = 5 WHERE plan_code = 'professional'`);
    await connection.execute(`UPDATE subscription_plans SET max_api_keys = 25 WHERE plan_code = 'enterprise'`);
    console.log('  ✓ Updated: API key limits');

    // Update features JSON
    await connection.execute(`
      UPDATE subscription_plans 
      SET features = '["work_orders", "equipment", "schedules", "inspections", "advanced_reports", "custom_fields", "api_access", "priority_support"]'
      WHERE plan_code = 'professional'
    `);
    await connection.execute(`
      UPDATE subscription_plans 
      SET features = '["all_features", "custom_fields", "sso", "audit_logs", "api_access", "dedicated_support", "sla", "custom_integrations", "data_retention"]'
      WHERE plan_code = 'enterprise'
    `);
    console.log('  ✓ Updated: features JSON');

    console.log();
    console.log('='.repeat(60));
    console.log('🎉 API Access Migration Completed!');
    console.log('='.repeat(60));
    console.log();
    console.log('Features Enabled:');
    console.log('  • Free/Starter: 0 API keys');
    console.log('  • Professional: Up to 5 API keys');
    console.log('  • Enterprise: Up to 25 API keys');
    console.log();

  } catch (error) {
    console.error('\n❌ Migration Failed!');
    console.error('Error:', error.message);
    if (error.sqlMessage) {
      console.error('SQL Error:', error.sqlMessage);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runMigration();
