#!/usr/bin/env node
/**
 * Premium Features Migration Runner
 * Uses mysql2/promise like the existing migration
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

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
    console.log('ODM Premium Features Migration');
    console.log('Custom Fields | SSO | Audit Logs');
    console.log('='.repeat(60));
    console.log();

    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to database:', dbConfig.database);
    console.log();

    // ============================================================
    // PART 1: CUSTOM FIELDS
    // ============================================================
    console.log('PART 1: Custom Fields (Professional+)');
    console.log('-'.repeat(40));

    // Create custom_field_definitions table
    if (!(await tableExists(connection, 'custom_field_definitions'))) {
      await connection.execute(`
        CREATE TABLE custom_field_definitions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT NOT NULL,
          entity_type VARCHAR(50) NOT NULL COMMENT 'work_order, equipment, finding, etc.',
          field_name VARCHAR(100) NOT NULL,
          field_label VARCHAR(200) NOT NULL,
          field_type ENUM('text', 'number', 'date', 'datetime', 'select', 'multiselect', 'checkbox', 'url', 'email') NOT NULL DEFAULT 'text',
          field_options JSON NULL COMMENT 'Options for select/multiselect',
          is_required BOOLEAN DEFAULT FALSE,
          default_value TEXT NULL,
          validation_regex VARCHAR(500) NULL,
          placeholder VARCHAR(200) NULL,
          help_text VARCHAR(500) NULL,
          sort_order INT DEFAULT 0,
          is_active BOOLEAN DEFAULT TRUE,
          created_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
          FOREIGN KEY (created_by) REFERENCES users(id),
          INDEX idx_organization_entity (organization_id, entity_type),
          INDEX idx_active (is_active),
          UNIQUE KEY uk_org_entity_field (organization_id, entity_type, field_name)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  ✓ Created: custom_field_definitions');
    } else {
      console.log('  • Table exists: custom_field_definitions');
    }

    // Create custom_field_values table
    if (!(await tableExists(connection, 'custom_field_values'))) {
      await connection.execute(`
        CREATE TABLE custom_field_values (
          id INT AUTO_INCREMENT PRIMARY KEY,
          field_definition_id INT NOT NULL,
          entity_id INT NOT NULL COMMENT 'ID of the entity (work_order_id, equipment_id, etc.)',
          entity_type VARCHAR(50) NOT NULL,
          value_text TEXT NULL,
          value_number DECIMAL(18,4) NULL,
          value_date DATE NULL,
          value_datetime DATETIME NULL,
          value_json JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (field_definition_id) REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
          INDEX idx_entity (entity_type, entity_id),
          INDEX idx_field (field_definition_id),
          UNIQUE KEY uk_field_entity (field_definition_id, entity_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  ✓ Created: custom_field_values');
    } else {
      console.log('  • Table exists: custom_field_values');
    }

    // Create custom_field_history table
    if (!(await tableExists(connection, 'custom_field_history'))) {
      await connection.execute(`
        CREATE TABLE custom_field_history (
          id INT AUTO_INCREMENT PRIMARY KEY,
          field_definition_id INT NOT NULL,
          action VARCHAR(20) NOT NULL COMMENT 'created, updated, deleted, value_changed',
          old_value JSON NULL,
          new_value JSON NULL,
          changed_by INT NOT NULL,
          changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (field_definition_id) REFERENCES custom_field_definitions(id),
          FOREIGN KEY (changed_by) REFERENCES users(id),
          INDEX idx_field (field_definition_id),
          INDEX idx_changed_at (changed_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  ✓ Created: custom_field_history');
    } else {
      console.log('  • Table exists: custom_field_history');
    }
    console.log();

    // ============================================================
    // PART 2: SSO
    // ============================================================
    console.log('PART 2: SSO/SAML Support (Enterprise)');
    console.log('-'.repeat(40));

    // Create sso_configurations table
    if (!(await tableExists(connection, 'sso_configurations'))) {
      await connection.execute(`
        CREATE TABLE sso_configurations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT NOT NULL UNIQUE,
          provider_type ENUM('saml', 'oidc', 'azure_ad', 'google_workspace', 'okta') NOT NULL,
          provider_name VARCHAR(100) NOT NULL,
          saml_entity_id VARCHAR(500) NULL,
          saml_idp_sso_url VARCHAR(500) NULL,
          saml_idp_slo_url VARCHAR(500) NULL,
          saml_idp_certificate TEXT NULL,
          saml_sp_entity_id VARCHAR(500) NULL,
          saml_sp_acs_url VARCHAR(500) NULL,
          saml_name_id_format VARCHAR(100) DEFAULT 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
          oidc_client_id VARCHAR(200) NULL,
          oidc_client_secret VARCHAR(500) NULL,
          oidc_authorization_endpoint VARCHAR(500) NULL,
          oidc_token_endpoint VARCHAR(500) NULL,
          oidc_userinfo_endpoint VARCHAR(500) NULL,
          oidc_jwks_uri VARCHAR(500) NULL,
          oidc_scopes VARCHAR(200) DEFAULT 'openid email profile',
          email_attribute VARCHAR(100) DEFAULT 'email',
          first_name_attribute VARCHAR(100) DEFAULT 'firstName',
          last_name_attribute VARCHAR(100) DEFAULT 'lastName',
          groups_attribute VARCHAR(100) NULL,
          role_attribute VARCHAR(100) NULL,
          require_signed_assertions BOOLEAN DEFAULT TRUE,
          require_encrypted_assertions BOOLEAN DEFAULT FALSE,
          signature_algorithm VARCHAR(50) DEFAULT 'rsa-sha256',
          auto_provision_users BOOLEAN DEFAULT FALSE,
          default_role VARCHAR(20) DEFAULT 'operator',
          default_facility_id INT NULL,
          session_duration_minutes INT DEFAULT 480,
          enforce_sso_only BOOLEAN DEFAULT FALSE,
          is_enabled BOOLEAN DEFAULT FALSE,
          is_configured BOOLEAN DEFAULT FALSE,
          last_tested_at TIMESTAMP NULL,
          last_test_result JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
          FOREIGN KEY (default_facility_id) REFERENCES facilities(id) ON DELETE SET NULL,
          INDEX idx_enabled (is_enabled)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  ✓ Created: sso_configurations');
    } else {
      console.log('  • Table exists: sso_configurations');
    }

    // Create sso_user_mappings table
    if (!(await tableExists(connection, 'sso_user_mappings'))) {
      await connection.execute(`
        CREATE TABLE sso_user_mappings (
          id INT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT NOT NULL,
          user_id INT NOT NULL,
          external_user_id VARCHAR(200) NOT NULL,
          external_email VARCHAR(200) NOT NULL,
          provider_type VARCHAR(50) NOT NULL,
          last_login_at TIMESTAMP NULL,
          login_count INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          UNIQUE KEY uk_org_external (organization_id, external_user_id),
          INDEX idx_user (user_id),
          INDEX idx_external_email (external_email)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  ✓ Created: sso_user_mappings');
    } else {
      console.log('  • Table exists: sso_user_mappings');
    }

    // Create sso_sessions table
    if (!(await tableExists(connection, 'sso_sessions'))) {
      await connection.execute(`
        CREATE TABLE sso_sessions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT NOT NULL,
          user_id INT NOT NULL,
          sso_config_id INT NOT NULL,
          session_token VARCHAR(500) NOT NULL,
          idp_session_id VARCHAR(200) NULL,
          ip_address VARCHAR(45) NULL,
          user_agent TEXT NULL,
          started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          ended_at TIMESTAMP NULL,
          ended_reason VARCHAR(50) NULL,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
          FOREIGN KEY (sso_config_id) REFERENCES sso_configurations(id) ON DELETE CASCADE,
          INDEX idx_session_token (session_token),
          INDEX idx_user (user_id),
          INDEX idx_expires (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  ✓ Created: sso_sessions');
    } else {
      console.log('  • Table exists: sso_sessions');
    }
    console.log();

    // ============================================================
    // PART 3: AUDIT LOGS
    // ============================================================
    console.log('PART 3: Audit Logs (Enterprise)');
    console.log('-'.repeat(40));

    // Create audit_logs table
    if (!(await tableExists(connection, 'audit_logs'))) {
      await connection.execute(`
        CREATE TABLE audit_logs (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT NOT NULL,
          action VARCHAR(50) NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id INT NULL,
          entity_name VARCHAR(200) NULL,
          user_id INT NULL,
          user_name VARCHAR(100) NULL,
          user_role VARCHAR(20) NULL,
          impersonated_by INT NULL,
          old_values JSON NULL,
          new_values JSON NULL,
          changed_fields JSON NULL,
          ip_address VARCHAR(45) NULL,
          user_agent TEXT NULL,
          session_id VARCHAR(200) NULL,
          request_id VARCHAR(100) NULL,
          api_endpoint VARCHAR(500) NULL,
          http_method VARCHAR(10) NULL,
          export_format VARCHAR(20) NULL,
          export_record_count INT NULL,
          login_method VARCHAR(20) NULL,
          sso_provider VARCHAR(50) NULL,
          mfa_used BOOLEAN NULL,
          login_success BOOLEAN NULL,
          failure_reason VARCHAR(200) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_organization (organization_id),
          INDEX idx_action (action),
          INDEX idx_entity (entity_type, entity_id),
          INDEX idx_user (user_id),
          INDEX idx_created_at (created_at),
          INDEX idx_org_action_date (organization_id, action, created_at),
          INDEX idx_org_entity_date (organization_id, entity_type, created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  ✓ Created: audit_logs');
    } else {
      console.log('  • Table exists: audit_logs');
    }

    // Create audit_retention_policies table
    if (!(await tableExists(connection, 'audit_retention_policies'))) {
      await connection.execute(`
        CREATE TABLE audit_retention_policies (
          id INT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT NOT NULL UNIQUE,
          retention_days INT NOT NULL DEFAULT 365,
          archive_before_delete BOOLEAN DEFAULT FALSE,
          archive_location VARCHAR(500) NULL,
          last_purge_at TIMESTAMP NULL,
          last_purge_count INT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  ✓ Created: audit_retention_policies');
    } else {
      console.log('  • Table exists: audit_retention_policies');
    }

    // Create audit_logs_archive table
    if (!(await tableExists(connection, 'audit_logs_archive'))) {
      await connection.execute(`
        CREATE TABLE audit_logs_archive (
          id BIGINT PRIMARY KEY,
          organization_id INT NOT NULL,
          action VARCHAR(50) NOT NULL,
          entity_type VARCHAR(50) NOT NULL,
          entity_id INT NULL,
          entity_name VARCHAR(200) NULL,
          user_id INT NULL,
          user_name VARCHAR(100) NULL,
          old_values JSON NULL,
          new_values JSON NULL,
          changed_fields JSON NULL,
          ip_address VARCHAR(45) NULL,
          user_agent TEXT NULL,
          created_at TIMESTAMP NOT NULL,
          archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_organization (organization_id),
          INDEX idx_created_at (created_at),
          INDEX idx_archived_at (archived_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  ✓ Created: audit_logs_archive');
    } else {
      console.log('  • Table exists: audit_logs_archive');
    }

    // Create audit_configurations table
    if (!(await tableExists(connection, 'audit_configurations'))) {
      await connection.execute(`
        CREATE TABLE audit_configurations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          organization_id INT NOT NULL UNIQUE,
          log_logins BOOLEAN DEFAULT TRUE,
          log_data_exports BOOLEAN DEFAULT TRUE,
          log_user_changes BOOLEAN DEFAULT TRUE,
          log_work_order_changes BOOLEAN DEFAULT TRUE,
          log_equipment_changes BOOLEAN DEFAULT TRUE,
          log_schedule_changes BOOLEAN DEFAULT TRUE,
          log_settings_changes BOOLEAN DEFAULT TRUE,
          log_level ENUM('minimal', 'standard', 'verbose') DEFAULT 'standard',
          mask_sensitive_data BOOLEAN DEFAULT TRUE,
          sensitive_fields JSON NULL,
          alert_on_failed_logins BOOLEAN DEFAULT TRUE,
          alert_on_data_export BOOLEAN DEFAULT TRUE,
          alert_on_admin_actions BOOLEAN DEFAULT TRUE,
          alert_email VARCHAR(200) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('  ✓ Created: audit_configurations');
    } else {
      console.log('  • Table exists: audit_configurations');
    }
    console.log();

    // ============================================================
    // PART 4: UPDATE SUBSCRIPTION PLANS
    // ============================================================
    console.log('PART 4: Updating Subscription Plans');
    console.log('-'.repeat(40));

    // Add max_custom_fields column
    if (!(await columnExists(connection, 'subscription_plans', 'max_custom_fields'))) {
      await connection.execute(`ALTER TABLE subscription_plans ADD COLUMN max_custom_fields INT DEFAULT NULL`);
      console.log('  ✓ Added: max_custom_fields to subscription_plans');
    } else {
      console.log('  • Column exists: max_custom_fields');
    }

    // Add max_sso_providers column
    if (!(await columnExists(connection, 'subscription_plans', 'max_sso_providers'))) {
      await connection.execute(`ALTER TABLE subscription_plans ADD COLUMN max_sso_providers INT DEFAULT 0`);
      console.log('  ✓ Added: max_sso_providers to subscription_plans');
    } else {
      console.log('  • Column exists: max_sso_providers');
    }

    // Add audit_retention_days column
    if (!(await columnExists(connection, 'subscription_plans', 'audit_retention_days'))) {
      await connection.execute(`ALTER TABLE subscription_plans ADD COLUMN audit_retention_days INT DEFAULT 30`);
      console.log('  ✓ Added: audit_retention_days to subscription_plans');
    } else {
      console.log('  • Column exists: audit_retention_days');
    }

    // Update plan limits
    await connection.execute(`UPDATE subscription_plans SET max_custom_fields = 0 WHERE plan_code = 'free'`);
    await connection.execute(`UPDATE subscription_plans SET max_custom_fields = 10 WHERE plan_code = 'starter'`);
    await connection.execute(`UPDATE subscription_plans SET max_custom_fields = 50 WHERE plan_code = 'professional'`);
    await connection.execute(`UPDATE subscription_plans SET max_custom_fields = NULL WHERE plan_code = 'enterprise'`);
    console.log('  ✓ Updated: max_custom_fields limits');

    await connection.execute(`UPDATE subscription_plans SET max_sso_providers = 0 WHERE plan_code IN ('free', 'starter', 'professional')`);
    await connection.execute(`UPDATE subscription_plans SET max_sso_providers = 5 WHERE plan_code = 'enterprise'`);
    console.log('  ✓ Updated: max_sso_providers limits');

    await connection.execute(`UPDATE subscription_plans SET audit_retention_days = 30 WHERE plan_code IN ('free', 'starter')`);
    await connection.execute(`UPDATE subscription_plans SET audit_retention_days = 90 WHERE plan_code = 'professional'`);
    await connection.execute(`UPDATE subscription_plans SET audit_retention_days = 365 WHERE plan_code = 'enterprise'`);
    console.log('  ✓ Updated: audit_retention_days limits');

    // Update features JSON for each plan
    await connection.execute(`
      UPDATE subscription_plans 
      SET features = '["work_orders", "equipment", "basic_reports"]'
      WHERE plan_code = 'free'
    `);
    await connection.execute(`
      UPDATE subscription_plans 
      SET features = '["work_orders", "equipment", "schedules", "inspections", "standard_reports", "email_notifications"]'
      WHERE plan_code = 'starter'
    `);
    await connection.execute(`
      UPDATE subscription_plans 
      SET features = '["work_orders", "equipment", "schedules", "inspections", "advanced_reports", "custom_fields", "api_access", "priority_support"]'
      WHERE plan_code = 'professional'
    `);
    await connection.execute(`
      UPDATE subscription_plans 
      SET features = '["all_features", "custom_fields", "sso", "audit_logs", "dedicated_support", "sla", "custom_integrations", "data_retention"]'
      WHERE plan_code = 'enterprise'
    `);
    console.log('  ✓ Updated: features JSON for all plans');
    console.log();

    // ============================================================
    // PART 5: UPDATE ORGANIZATION SUBSCRIPTIONS
    // ============================================================
    console.log('PART 5: Updating Organization Subscriptions');
    console.log('-'.repeat(40));

    if (!(await columnExists(connection, 'organization_subscriptions', 'max_custom_fields'))) {
      await connection.execute(`ALTER TABLE organization_subscriptions ADD COLUMN max_custom_fields INT DEFAULT NULL`);
      console.log('  ✓ Added: max_custom_fields');
    } else {
      console.log('  • Column exists: max_custom_fields');
    }

    if (!(await columnExists(connection, 'organization_subscriptions', 'max_sso_providers'))) {
      await connection.execute(`ALTER TABLE organization_subscriptions ADD COLUMN max_sso_providers INT DEFAULT 0`);
      console.log('  ✓ Added: max_sso_providers');
    } else {
      console.log('  • Column exists: max_sso_providers');
    }

    if (!(await columnExists(connection, 'organization_subscriptions', 'audit_retention_days'))) {
      await connection.execute(`ALTER TABLE organization_subscriptions ADD COLUMN audit_retention_days INT DEFAULT 30`);
      console.log('  ✓ Added: audit_retention_days');
    } else {
      console.log('  • Column exists: audit_retention_days');
    }
    console.log();

    // ============================================================
    // PART 6: UPDATE USERS TABLE
    // ============================================================
    console.log('PART 6: Updating Users Table');
    console.log('-'.repeat(40));

    if (!(await columnExists(connection, 'users', 'is_sso_user'))) {
      await connection.execute(`ALTER TABLE users ADD COLUMN is_sso_user BOOLEAN DEFAULT FALSE`);
      console.log('  ✓ Added: is_sso_user');
    } else {
      console.log('  • Column exists: is_sso_user');
    }

    if (!(await columnExists(connection, 'users', 'sso_provider'))) {
      await connection.execute(`ALTER TABLE users ADD COLUMN sso_provider VARCHAR(50) NULL`);
      console.log('  ✓ Added: sso_provider');
    } else {
      console.log('  • Column exists: sso_provider');
    }

    if (!(await columnExists(connection, 'users', 'last_sso_login_at'))) {
      await connection.execute(`ALTER TABLE users ADD COLUMN last_sso_login_at TIMESTAMP NULL`);
      console.log('  ✓ Added: last_sso_login_at');
    } else {
      console.log('  • Column exists: last_sso_login_at');
    }
    console.log();

    // ============================================================
    // PART 7: CREATE DEFAULT CONFIGURATIONS
    // ============================================================
    console.log('PART 7: Creating Default Configurations');
    console.log('-'.repeat(40));

    // Get all organizations
    const [orgs] = await connection.execute('SELECT id FROM organizations');
    console.log(`  Found ${orgs.length} organizations`);

    let auditConfigsCreated = 0;
    let retentionPoliciesCreated = 0;

    for (const org of orgs) {
      // Create audit configuration if not exists
      const [existingAudit] = await connection.execute(
        'SELECT id FROM audit_configurations WHERE organization_id = ?',
        [org.id]
      );
      if (existingAudit.length === 0) {
        await connection.execute(
          'INSERT INTO audit_configurations (organization_id, log_level) VALUES (?, ?)',
          [org.id, 'standard']
        );
        auditConfigsCreated++;
      }

      // Create retention policy if not exists
      const [existingRetention] = await connection.execute(
        'SELECT id FROM audit_retention_policies WHERE organization_id = ?',
        [org.id]
      );
      if (existingRetention.length === 0) {
        await connection.execute(
          'INSERT INTO audit_retention_policies (organization_id, retention_days) VALUES (?, ?)',
          [org.id, 365]
        );
        retentionPoliciesCreated++;
      }
    }

    console.log(`  ✓ Created ${auditConfigsCreated} audit configurations`);
    console.log(`  ✓ Created ${retentionPoliciesCreated} retention policies`);
    console.log();

    // ============================================================
    // VERIFICATION
    // ============================================================
    console.log('='.repeat(60));
    console.log('Verification');
    console.log('='.repeat(60));
    console.log();

    const tables = [
      'custom_field_definitions',
      'custom_field_values',
      'custom_field_history',
      'sso_configurations',
      'sso_user_mappings',
      'sso_sessions',
      'audit_logs',
      'audit_retention_policies',
      'audit_logs_archive',
      'audit_configurations'
    ];

    for (const table of tables) {
      const exists = await tableExists(connection, table);
      console.log(`  ${exists ? '✓' : '✗'} ${table}`);
    }

    console.log();
    console.log('Subscription Plan Limits:');
    const [plans] = await connection.execute(
      'SELECT plan_code, max_custom_fields, max_sso_providers, audit_retention_days FROM subscription_plans ORDER BY id'
    );
    plans.forEach(p => {
      console.log(`  ${p.plan_code}:`);
      console.log(`    max_custom_fields: ${p.max_custom_fields ?? 'unlimited'}`);
      console.log(`    max_sso_providers: ${p.max_sso_providers ?? 'unlimited'}`);
      console.log(`    audit_retention_days: ${p.audit_retention_days}`);
    });

    console.log();
    console.log('='.repeat(60));
    console.log('🎉 Premium Features Migration Completed!');
    console.log('='.repeat(60));
    console.log();
    console.log('Features Enabled:');
    console.log('  • Custom Fields (Professional+): Up to 50 custom fields');
    console.log('  • SSO/SAML (Enterprise): Up to 5 providers');
    console.log('  • Audit Logs (Enterprise): 365 days retention');
    console.log();
    console.log('Next Steps:');
    console.log('  1. Restart your application server');
    console.log('  2. Professional+ users can now configure custom fields');
    console.log('  3. Enterprise users can now configure SSO and view audit logs');
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
