-- =====================================================
-- MIGRATION: Add Audit Logs Feature
-- For Enterprise plans
-- =====================================================

-- =====================================================
-- PART 1: AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    
    -- Action Details
    action VARCHAR(50) NOT NULL COMMENT 'create, update, delete, login, logout, export, etc.',
    entity_type VARCHAR(50) NOT NULL COMMENT 'user, work_order, equipment, etc.',
    entity_id INT NULL,
    entity_name VARCHAR(200) NULL COMMENT 'Human-readable name for the entity',
    
    -- User Details
    user_id INT NULL,
    user_name VARCHAR(100) NULL,
    user_role VARCHAR(20) NULL,
    impersonated_by INT NULL COMMENT 'If action was done via impersonation',
    
    -- Change Details
    old_values JSON NULL,
    new_values JSON NULL,
    changed_fields JSON NULL COMMENT 'List of fields that changed',
    
    -- Context
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    session_id VARCHAR(200) NULL,
    request_id VARCHAR(100) NULL,
    api_endpoint VARCHAR(500) NULL,
    http_method VARCHAR(10) NULL,
    
    -- For Data Export tracking
    export_format VARCHAR(20) NULL,
    export_record_count INT NULL,
    
    -- For Login/Security
    login_method VARCHAR(20) NULL COMMENT 'password, sso, api_key',
    sso_provider VARCHAR(50) NULL,
    mfa_used BOOLEAN NULL,
    login_success BOOLEAN NULL,
    failure_reason VARCHAR(200) NULL,
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for efficient querying
    INDEX idx_organization (organization_id),
    INDEX idx_action (action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_user (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_org_action_date (organization_id, action, created_at),
    INDEX idx_org_entity_date (organization_id, entity_type, created_at),
    
    -- Partitioning support (for large datasets)
    INDEX idx_created_at_partition (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
PARTITION BY RANGE (YEAR(created_at)) (
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p2026 VALUES LESS THAN (2027),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);

-- =====================================================
-- PART 2: AUDIT LOG RETENTION POLICY
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_retention_policies (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 3: AUDIT LOG ARCHIVE
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_logs_archive (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 4: AUDIT LOG CONFIGURATION PER ORGANIZATION
-- =====================================================
CREATE TABLE IF NOT EXISTS audit_configurations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL UNIQUE,
    
    -- What to log
    log_logins BOOLEAN DEFAULT TRUE,
    log_data_exports BOOLEAN DEFAULT TRUE,
    log_user_changes BOOLEAN DEFAULT TRUE,
    log_work_order_changes BOOLEAN DEFAULT TRUE,
    log_equipment_changes BOOLEAN DEFAULT TRUE,
    log_schedule_changes BOOLEAN DEFAULT TRUE,
    log_settings_changes BOOLEAN DEFAULT TRUE,
    
    -- Log level
    log_level ENUM('minimal', 'standard', 'verbose') DEFAULT 'standard',
    
    -- Sensitive data handling
    mask_sensitive_data BOOLEAN DEFAULT TRUE,
    sensitive_fields JSON DEFAULT '["password", "ssn", "credit_card", "api_key"]',
    
    -- Real-time alerts
    alert_on_failed_logins BOOLEAN DEFAULT TRUE,
    alert_on_data_export BOOLEAN DEFAULT TRUE,
    alert_on_admin_actions BOOLEAN DEFAULT TRUE,
    alert_email VARCHAR(200) NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 5: ENABLE AUDIT LOGS IN SUBSCRIPTION PLANS
-- =====================================================
-- Enterprise plan already has audit_logs in features
UPDATE subscription_plans 
SET features = '["all_features", "custom_fields", "sso", "audit_logs", "dedicated_support", "sla", "custom_integrations", "data_retention"]'
WHERE plan_code = 'enterprise';

-- Add audit log retention limits
ALTER TABLE subscription_plans 
ADD COLUMN audit_retention_days INT DEFAULT 30;

UPDATE subscription_plans SET audit_retention_days = 30 WHERE plan_code IN ('free', 'starter');
UPDATE subscription_plans SET audit_retention_days = 90 WHERE plan_code = 'professional';
UPDATE subscription_plans SET audit_retention_days = 365 WHERE plan_code = 'enterprise';

-- Add to organization_subscriptions
ALTER TABLE organization_subscriptions 
ADD COLUMN audit_retention_days INT DEFAULT 30;

-- =====================================================
-- PART 6: INSERT DEFAULT CONFIGURATIONS FOR EXISTING ORGS
-- =====================================================
INSERT INTO audit_configurations (organization_id, log_level)
SELECT id, 'standard' FROM organizations
ON DUPLICATE KEY UPDATE organization_id = organization_id;

INSERT INTO audit_retention_policies (organization_id, retention_days)
SELECT id, 365 FROM organizations
ON DUPLICATE KEY UPDATE organization_id = organization_id;

SELECT 'Audit Logs migration completed successfully' AS message;
