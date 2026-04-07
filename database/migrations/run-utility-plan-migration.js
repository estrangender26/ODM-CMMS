/**
 * Migration: Add Utility Plan for Water/Infrastructure
 * Run with: node database/migrations/run-utility-plan-migration.js
 */

const { pool } = require('../../src/config/database');

async function runMigration() {
  console.log('[MIGRATION] Starting utility plan migration...');
  
  try {
    // Add new columns for explicit asset limits (check if they exist first)
    console.log('[MIGRATION] Adding max_facilities and max_equipment columns...');
    try {
      await pool.execute(`ALTER TABLE subscription_plans ADD COLUMN max_facilities INT DEFAULT NULL`);
      console.log('[MIGRATION]   - Added max_facilities to subscription_plans');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('[MIGRATION]   - max_facilities already exists');
      } else throw e;
    }
    
    try {
      await pool.execute(`ALTER TABLE subscription_plans ADD COLUMN max_equipment INT DEFAULT NULL`);
      console.log('[MIGRATION]   - Added max_equipment to subscription_plans');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('[MIGRATION]   - max_equipment already exists');
      } else throw e;
    }
    
    // Update existing plans with reasonable defaults
    console.log('[MIGRATION] Updating existing plans...');
    await pool.execute(`
      UPDATE subscription_plans SET 
        max_facilities = CASE 
          WHEN plan_code = 'free' THEN 1
          WHEN plan_code = 'starter' THEN 3
          WHEN plan_code = 'professional' THEN 10
          WHEN plan_code = 'enterprise' THEN NULL
        END,
        max_equipment = CASE 
          WHEN plan_code = 'free' THEN 10
          WHEN plan_code = 'starter' THEN 100
          WHEN plan_code = 'professional' THEN 500
          WHEN plan_code = 'enterprise' THEN NULL
        END
    `);
    
    // Add Utility plan
    console.log('[MIGRATION] Adding Utility plan...');
    await pool.execute(`
      INSERT INTO subscription_plans (
        plan_code, 
        plan_name, 
        description, 
        included_users, 
        max_users, 
        max_facilities,
        max_equipment,
        base_price, 
        price_per_additional_user, 
        features, 
        is_active, 
        is_public, 
        sort_order
      ) VALUES (
        'utility',
        'Utility & Infrastructure',
        'Designed for water utilities, power companies, and large infrastructure operators with thousands of assets',
        50,
        200,
        500,
        20000,
        999.00,
        3.00,
        '["work_orders", "equipment", "inspections", "findings", "qr_labels", "schedules", "maintenance_plans", "task_templates", "asset_import", "custom_reports", "dedicated_support", "sla", "api_access", "mobile_app"]',
        TRUE,
        TRUE,
        5
      ) ON DUPLICATE KEY UPDATE
        max_facilities = 500,
        max_equipment = 20000,
        max_users = 200,
        base_price = 999.00
    `);
    
    // Add columns to organization_subscriptions
    console.log('[MIGRATION] Adding columns to organization_subscriptions...');
    try {
      await pool.execute(`ALTER TABLE organization_subscriptions ADD COLUMN max_facilities INT DEFAULT NULL`);
      console.log('[MIGRATION]   - Added max_facilities to organization_subscriptions');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('[MIGRATION]   - max_facilities already exists in organization_subscriptions');
      } else throw e;
    }
    
    try {
      await pool.execute(`ALTER TABLE organization_subscriptions ADD COLUMN max_equipment INT DEFAULT NULL`);
      console.log('[MIGRATION]   - Added max_equipment to organization_subscriptions');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('[MIGRATION]   - max_equipment already exists in organization_subscriptions');
      } else throw e;
    }
    
    console.log('[MIGRATION] ✅ Utility plan migration completed successfully!');
    console.log('[MIGRATION] New plan available: Utility & Infrastructure');
    console.log('  - Up to 200 users');
    console.log('  - Up to 500 facilities');
    console.log('  - Up to 20,000 equipment/assets');
    console.log('  - $999/month');
    
  } catch (error) {
    console.error('[MIGRATION] ❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
