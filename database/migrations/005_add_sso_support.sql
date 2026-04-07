-- =====================================================
-- MIGRATION: Add SSO (Single Sign-On) Support
-- For Enterprise plans
-- =====================================================

-- =====================================================
-- PART 1: SSO CONFIGURATION
-- =====================================================
CREATE TABLE IF NOT EXISTS sso_configurations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL UNIQUE,
    provider_type ENUM('saml', 'oidc', 'azure_ad', 'google_workspace', 'okta') NOT NULL,
    provider_name VARCHAR(100) NOT NULL,
    
    -- SAML 2.0 Settings
    saml_entity_id VARCHAR(500) NULL,
    saml_idp_sso_url VARCHAR(500) NULL,
    saml_idp_slo_url VARCHAR(500) NULL,
    saml_idp_certificate TEXT NULL,
    saml_sp_entity_id VARCHAR(500) NULL,
    saml_sp_acs_url VARCHAR(500) NULL,
    saml_name_id_format VARCHAR(100) DEFAULT 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    
    -- OIDC/OAuth 2.0 Settings
    oidc_client_id VARCHAR(200) NULL,
    oidc_client_secret VARCHAR(500) NULL,
    oidc_authorization_endpoint VARCHAR(500) NULL,
    oidc_token_endpoint VARCHAR(500) NULL,
    oidc_userinfo_endpoint VARCHAR(500) NULL,
    oidc_jwks_uri VARCHAR(500) NULL,
    oidc_scopes VARCHAR(200) DEFAULT 'openid email profile',
    
    -- Attribute Mapping
    email_attribute VARCHAR(100) DEFAULT 'email',
    first_name_attribute VARCHAR(100) DEFAULT 'firstName',
    last_name_attribute VARCHAR(100) DEFAULT 'lastName',
    groups_attribute VARCHAR(100) NULL,
    role_attribute VARCHAR(100) NULL,
    
    -- Security Settings
    require_signed_assertions BOOLEAN DEFAULT TRUE,
    require_encrypted_assertions BOOLEAN DEFAULT FALSE,
    signature_algorithm VARCHAR(50) DEFAULT 'rsa-sha256',
    
    -- Auto-provisioning
    auto_provision_users BOOLEAN DEFAULT FALSE,
    default_role VARCHAR(20) DEFAULT 'operator',
    default_facility_id INT NULL,
    
    -- Session Settings
    session_duration_minutes INT DEFAULT 480,
    enforce_sso_only BOOLEAN DEFAULT FALSE COMMENT 'If true, disable password login',
    
    -- Status
    is_enabled BOOLEAN DEFAULT FALSE,
    is_configured BOOLEAN DEFAULT FALSE,
    last_tested_at TIMESTAMP NULL,
    last_test_result JSON NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (default_facility_id) REFERENCES facilities(id) ON DELETE SET NULL,
    INDEX idx_enabled (is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 2: SSO USER MAPPINGS
-- =====================================================
CREATE TABLE IF NOT EXISTS sso_user_mappings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    user_id INT NOT NULL,
    external_user_id VARCHAR(200) NOT NULL COMMENT 'ID from IdP',
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 3: SSO LOGIN SESSIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS sso_sessions (
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
    ended_reason VARCHAR(50) NULL COMMENT 'logout, timeout, forced',
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sso_config_id) REFERENCES sso_configurations(id) ON DELETE CASCADE,
    INDEX idx_session_token (session_token),
    INDEX idx_user (user_id),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 4: ENABLE SSO IN SUBSCRIPTION PLANS
-- =====================================================
-- Enterprise plan already has SSO in features
-- Update to ensure it's there
UPDATE subscription_plans 
SET features = '["all_features", "custom_fields", "sso", "audit_logs", "dedicated_support", "sla", "custom_integrations", "data_retention"]'
WHERE plan_code = 'enterprise';

-- Add SSO provider limit (enterprise = unlimited)
ALTER TABLE subscription_plans 
ADD COLUMN max_sso_providers INT DEFAULT 0;

UPDATE subscription_plans SET max_sso_providers = 0 WHERE plan_code IN ('free', 'starter', 'professional');
UPDATE subscription_plans SET max_sso_providers = 5 WHERE plan_code = 'enterprise';

-- Add to organization_subscriptions
ALTER TABLE organization_subscriptions 
ADD COLUMN max_sso_providers INT DEFAULT 0;

-- =====================================================
-- PART 5: ADD SSO METADATA TO USERS
-- =====================================================
ALTER TABLE users 
ADD COLUMN is_sso_user BOOLEAN DEFAULT FALSE,
ADD COLUMN sso_provider VARCHAR(50) NULL,
ADD COLUMN last_sso_login_at TIMESTAMP NULL;

CREATE INDEX idx_sso_user ON users(is_sso_user);

SELECT 'SSO Support migration completed successfully' AS message;
