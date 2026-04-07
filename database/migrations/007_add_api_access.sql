-- =====================================================
-- MIGRATION: Add API Access Control
-- For Professional+ plans
-- =====================================================

-- =====================================================
-- PART 1: API KEYS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS api_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    api_key_hash VARCHAR(255) NOT NULL,
    api_key_prefix VARCHAR(8) NOT NULL COMMENT 'First 8 chars of key for identification',
    scopes JSON NULL COMMENT 'Array of allowed scopes',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 2: API USAGE LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS api_usage_logs (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 3: API RATE LIMIT TRACKING
-- =====================================================
CREATE TABLE IF NOT EXISTS api_rate_limit_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    api_key_id INT NOT NULL,
    window_start TIMESTAMP NOT NULL,
    request_count INT DEFAULT 0,
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE,
    INDEX idx_api_key_window (api_key_id, window_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 4: UPDATE SUBSCRIPTION PLANS WITH API LIMITS
-- =====================================================

-- Add max_api_keys column
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS max_api_keys INT DEFAULT 0;

-- Set limits per plan
UPDATE subscription_plans SET max_api_keys = 0 WHERE plan_code IN ('free', 'starter');
UPDATE subscription_plans SET max_api_keys = 5 WHERE plan_code = 'professional';
UPDATE subscription_plans SET max_api_keys = 25 WHERE plan_code = 'enterprise';

-- Add to organization_subscriptions
ALTER TABLE organization_subscriptions 
ADD COLUMN IF NOT EXISTS max_api_keys INT DEFAULT 0;

-- =====================================================
-- PART 5: UPDATE FEATURES JSON TO INCLUDE api_access
-- =====================================================
UPDATE subscription_plans 
SET features = '["work_orders", "equipment", "basic_reports"]'
WHERE plan_code = 'free';

UPDATE subscription_plans 
SET features = '["work_orders", "equipment", "schedules", "inspections", "standard_reports", "email_notifications"]'
WHERE plan_code = 'starter';

UPDATE subscription_plans 
SET features = '["work_orders", "equipment", "schedules", "inspections", "advanced_reports", "custom_fields", "api_access", "priority_support"]'
WHERE plan_code = 'professional';

UPDATE subscription_plans 
SET features = '["all_features", "custom_fields", "sso", "audit_logs", "api_access", "dedicated_support", "sla", "custom_integrations", "data_retention"]'
WHERE plan_code = 'enterprise';

SELECT 'API Access migration completed successfully' AS message;
