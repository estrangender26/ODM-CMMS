/**
 * Migration: Add Payment Tables
 * Run with: node database/migrations/run-payment-migration.js
 */

const { pool } = require('../../src/config/database');

async function runMigration() {
  console.log('[MIGRATION] Starting payment tables migration...');
  
  try {
    // Create stripe_customers table
    console.log('[MIGRATION] Creating stripe_customers table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS stripe_customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        organization_id INT NOT NULL UNIQUE,
        stripe_customer_id VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        INDEX idx_stripe_customer (stripe_customer_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Create payments table
    console.log('[MIGRATION] Creating payments table...');
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        organization_id INT NOT NULL,
        stripe_payment_intent_id VARCHAR(100),
        stripe_invoice_id VARCHAR(100),
        amount DECIMAL(10, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'USD',
        status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
        type ENUM('subscription', 'extra_seats', 'one_time') DEFAULT 'subscription',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
        INDEX idx_organization (organization_id),
        INDEX idx_status (status),
        INDEX idx_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    
    // Add Stripe columns to organization_subscriptions
    console.log('[MIGRATION] Adding Stripe columns...');
    try {
      await pool.execute(`ALTER TABLE organization_subscriptions ADD COLUMN stripe_subscription_id VARCHAR(100) DEFAULT NULL`);
      console.log('[MIGRATION]   - Added stripe_subscription_id');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('[MIGRATION]   - stripe_subscription_id already exists');
      } else throw e;
    }
    
    try {
      await pool.execute(`ALTER TABLE organization_subscriptions ADD COLUMN stripe_price_id VARCHAR(100) DEFAULT NULL`);
      console.log('[MIGRATION]   - Added stripe_price_id');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('[MIGRATION]   - stripe_price_id already exists');
      } else throw e;
    }
    
    console.log('[MIGRATION] ✅ Payment tables migration completed!');
    
  } catch (error) {
    console.error('[MIGRATION] ❌ Error:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
