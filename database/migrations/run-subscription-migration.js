#!/usr/bin/env node
/**
 * Subscription System Migration Runner
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

async function columnExists(conn, table, column) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) as count FROM information_schema.columns 
     WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
    [dbConfig.database, table, column]
  );
  return rows[0].count > 0;
}

async function tableExists(conn, table) {
  const [rows] = await conn.execute(
    `SELECT COUNT(*) as count FROM information_schema.tables 
     WHERE table_schema = ? AND table_name = ?`,
    [dbConfig.database, table]
  );
  return rows[0].count > 0;
}

async function runMigration() {
  let connection;
  
  try {
    console.log('='.repeat(60));
    console.log('ODM-CMMS Subscription System Migration');
    console.log('='.repeat(60));
    console.log();

    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database:', dbConfig.database);
    console.log();

    // Part 1: Create subscription_plans table
    console.log('Part 1: Creating subscription_plans table...');
    
    if (!(await tableExists(connection, 'subscription_plans'))) {
      await connection.execute(`
        CREATE TABLE subscription_plans (
          id INT AUTO_INCREMENT PRIMARY KEY,
          plan_code VARCHAR(50) NOT NULL UNIQUE,
          plan_name VARCHAR(100) NOT NULL,
          description TEXT,
          included_users INT NOT NULL DEFAULT 5,
          max_users INT DEFAULT NULL,
          base_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          price_per_additional_user DECIMAL(10, 2) DEFAULT 0.00,
          features TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          is_public BOOLEAN DEFAULT TRUE,
          sort_order INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_active (is_active),
          INDEX idx_public (is_public),
          INDEX idx_sort_order (sort_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  Created: subscription_plans');
    } else {
      console.log('  Table already exists: subscription_plans');
    }
    console.log();

    // Part 2: Create organization_subscriptions table
    console.log('Part 2: Creating organization_subscriptions table...');
    
    if (!(await tableExists(connection, 'organization_subscriptions'))) {
      await connection.execute(`
        CREATE TABLE organization_subscriptions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT NOT NULL UNIQUE,
          plan_id INT NOT NULL,
          included_users INT NOT NULL DEFAULT 5,
          extra_users INT DEFAULT 0,
          max_users INT DEFAULT NULL,
          base_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
          price_per_additional_user DECIMAL(10, 2) DEFAULT 0.00,
          status ENUM('trial', 'active', 'past_due', 'cancelled', 'suspended') DEFAULT 'trial',
          billing_cycle ENUM('monthly', 'annual') DEFAULT 'monthly',
          current_period_start DATE,
          current_period_end DATE,
          payment_method_id VARCHAR(100),
          stripe_subscription_id VARCHAR(100),
          stripe_customer_id VARCHAR(100),
          cancel_at_period_end BOOLEAN DEFAULT FALSE,
          cancelled_at TIMESTAMP NULL,
          cancellation_reason TEXT,
          seats_used INT DEFAULT 0,
          seats_available INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
          FOREIGN KEY (plan_id) REFERENCES subscription_plans(id),
          INDEX idx_organization (organization_id),
          INDEX idx_status (status),
          INDEX idx_period_end (current_period_end)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  Created: organization_subscriptions');
    } else {
      console.log('  Table already exists: organization_subscriptions');
    }
    console.log();

    // Part 3: Seed subscription plans
    console.log('Part 3: Seeding subscription plans...');
    
    const plans = [
      ['free', 'Free', 'Basic maintenance management for small teams', 3, 5, 0.00, 0.00, '["work_orders", "equipment", "basic_reports"]', true, true, 1],
      ['starter', 'Starter', 'Perfect for small maintenance teams', 5, 25, 49.00, 10.00, '["work_orders", "equipment", "schedules", "inspections", "standard_reports", "email_notifications"]', true, true, 2],
      ['professional', 'Professional', 'Advanced features for growing organizations', 15, 100, 149.00, 8.00, '["work_orders", "equipment", "schedules", "inspections", "advanced_reports", "custom_fields", "api_access", "priority_support"]', true, true, 3],
      ['enterprise', 'Enterprise', 'Unlimited users and premium features', 50, null, 499.00, 5.00, '["all_features", "dedicated_support", "sla", "custom_integrations", "sso", "audit_logs", "data_retention"]', true, false, 4]
    ];
    
    for (const plan of plans) {
      try {
        await connection.execute(`
          INSERT INTO subscription_plans 
          (plan_code, plan_name, description, included_users, max_users, base_price, price_per_additional_user, features, is_active, is_public, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, plan);
        console.log(`  Added plan: ${plan[0]}`);
      } catch (e) {
        if (e.code === 'ER_DUP_ENTRY') {
          console.log(`  Plan exists: ${plan[0]}`);
        } else {
          throw e;
        }
      }
    }
    console.log();

    // Part 4: Add columns to users table
    console.log('Part 4: Updating users table...');
    
    if (!(await columnExists(connection, 'users', 'status'))) {
      await connection.execute(`ALTER TABLE users ADD COLUMN status ENUM('invited', 'active', 'suspended', 'archived') DEFAULT 'active' AFTER is_active`);
      console.log('  Added: status');
    } else {
      console.log('  Already exists: status');
    }
    
    if (!(await columnExists(connection, 'users', 'is_billable'))) {
      await connection.execute(`ALTER TABLE users ADD COLUMN is_billable BOOLEAN DEFAULT TRUE AFTER status`);
      console.log('  Added: is_billable');
    } else {
      console.log('  Already exists: is_billable');
    }
    
    if (!(await columnExists(connection, 'users', 'invited_by'))) {
      await connection.execute(`ALTER TABLE users ADD COLUMN invited_by INT NULL AFTER is_billable`);
      console.log('  Added: invited_by');
    } else {
      console.log('  Already exists: invited_by');
    }
    
    if (!(await columnExists(connection, 'users', 'invited_at'))) {
      await connection.execute(`ALTER TABLE users ADD COLUMN invited_at TIMESTAMP NULL AFTER invited_by`);
      console.log('  Added: invited_at');
    } else {
      console.log('  Already exists: invited_at');
    }
    console.log();

    // Part 5: Add subscription_id to organizations
    console.log('Part 5: Updating organizations table...');
    
    if (!(await columnExists(connection, 'organizations', 'subscription_id'))) {
      await connection.execute(`ALTER TABLE organizations ADD COLUMN subscription_id INT NULL AFTER id`);
      console.log('  Added: subscription_id');
    } else {
      console.log('  Already exists: subscription_id');
    }
    console.log();

    // Part 6: Create subscriptions for existing organizations
    console.log('Part 6: Creating subscriptions for existing organizations...');
    
    const [professionalPlan] = await connection.execute(`SELECT id FROM subscription_plans WHERE plan_code = 'professional'`);
    const professionalPlanId = professionalPlan[0]?.id;
    
    if (!professionalPlanId) {
      throw new Error('Professional plan not found');
    }
    
    // Get organizations without subscriptions
    const [orgsWithoutSubs] = await connection.execute(`
      SELECT o.id FROM organizations o
      LEFT JOIN organization_subscriptions os ON o.id = os.organization_id
      WHERE os.id IS NULL
    `);
    
    console.log(`  Found ${orgsWithoutSubs.length} organizations without subscriptions`);
    
    for (const org of orgsWithoutSubs) {
      // Count existing users
      const [userCount] = await connection.execute(`
        SELECT COUNT(*) as count FROM users WHERE organization_id = ? 
        AND (is_billable = TRUE OR is_billable IS NULL)
        AND (status IN ('active', 'invited') OR status IS NULL)
      `, [org.id]);
      
      const [result] = await connection.execute(`
        INSERT INTO organization_subscriptions 
        (organization_id, plan_id, included_users, extra_users, max_users, base_price, price_per_additional_user, status, billing_cycle, current_period_start, current_period_end, seats_used, seats_available)
        VALUES (?, ?, 15, 0, 100, 149.00, 8.00, 'active', 'monthly', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 MONTH), ?, 15)
      `, [org.id, professionalPlanId, userCount[0].count]);
      
      // Link organization to subscription
      await connection.execute(`UPDATE organizations SET subscription_id = ? WHERE id = ?`, [result.insertId, org.id]);
      
      console.log(`  Created subscription for org ${org.id} (${userCount[0].count} users)`);
    }
    
    if (orgsWithoutSubs.length === 0) {
      console.log('  All organizations already have subscriptions');
    }
    console.log();

    // Part 7: Update existing users
    console.log('Part 7: Updating existing users...');
    
    const [updatedUsers] = await connection.execute(`
      UPDATE users SET status = 'active', is_billable = TRUE WHERE status IS NULL
    `);
    console.log(`  Updated ${updatedUsers.affectedRows} users with default status`);
    
    // Recalculate seats
    await connection.execute(`
      UPDATE organization_subscriptions os
      SET seats_used = (
        SELECT COUNT(*) FROM users u 
        WHERE u.organization_id = os.organization_id 
        AND (u.is_billable = TRUE OR u.is_billable IS NULL)
        AND (u.status IN ('active', 'invited'))
      ),
      seats_available = included_users + extra_users - (
        SELECT COUNT(*) FROM users u 
        WHERE u.organization_id = os.organization_id 
        AND (u.is_billable = TRUE OR u.is_billable IS NULL)
        AND (u.status IN ('active', 'invited'))
      )
    `);
    console.log('  Recalculated seat usage for all subscriptions');
    console.log();

    // Verification
    console.log('='.repeat(60));
    console.log('Verification');
    console.log('='.repeat(60));
    console.log();
    
    const [plansResult] = await connection.execute('SELECT plan_code, plan_name FROM subscription_plans');
    console.log('Subscription Plans:', plansResult.length);
    plansResult.forEach(p => console.log(`  - ${p.plan_code}: ${p.plan_name}`));
    
    const [subs] = await connection.execute('SELECT COUNT(*) as count FROM organization_subscriptions');
    console.log(`\nOrganization Subscriptions: ${subs[0].count}`);
    
    const [usersWithStatus] = await connection.execute('SELECT COUNT(*) as count FROM users WHERE status IS NOT NULL');
    console.log(`Users with status: ${usersWithStatus[0].count}`);
    
    console.log();
    console.log('='.repeat(60));
    console.log('🎉 Subscription System Migration Completed!');
    console.log('='.repeat(60));
    console.log();
    console.log('Next Steps:');
    console.log('1. Restart your application server');
    console.log('2. Check subscription plans at GET /api/subscriptions/plans');
    console.log('3. View current subscription at GET /api/subscriptions/current');
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
