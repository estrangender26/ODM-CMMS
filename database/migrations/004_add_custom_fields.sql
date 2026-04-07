-- =====================================================
-- MIGRATION: Add Custom Fields Feature
-- For Professional+ plans
-- =====================================================

-- =====================================================
-- PART 1: CUSTOM FIELD DEFINITIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS custom_field_definitions (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 2: CUSTOM FIELD VALUES
-- =====================================================
CREATE TABLE IF NOT EXISTS custom_field_values (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 3: CUSTOM FIELD HISTORY (for audit)
-- =====================================================
CREATE TABLE IF NOT EXISTS custom_field_history (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 4: ENABLE CUSTOM FIELDS IN SUBSCRIPTION PLANS
-- =====================================================
-- Update Professional and Enterprise plans to include custom_fields
UPDATE subscription_plans 
SET features = '["work_orders", "equipment", "schedules", "inspections", "advanced_reports", "custom_fields", "api_access", "priority_support"]'
WHERE plan_code = 'professional';

UPDATE subscription_plans 
SET features = '["all_features", "custom_fields", "sso", "audit_logs", "dedicated_support", "sla", "custom_integrations", "data_retention"]'
WHERE plan_code = 'enterprise';

-- Add max_custom_fields limit to plans
ALTER TABLE subscription_plans 
ADD COLUMN max_custom_fields INT DEFAULT NULL COMMENT 'NULL = unlimited';

-- Set limits per plan
UPDATE subscription_plans SET max_custom_fields = 0 WHERE plan_code = 'free';
UPDATE subscription_plans SET max_custom_fields = 10 WHERE plan_code = 'starter';
UPDATE subscription_plans SET max_custom_fields = 50 WHERE plan_code = 'professional';
UPDATE subscription_plans SET max_custom_fields = NULL WHERE plan_code = 'enterprise';

-- Add to organization_subscriptions for tracking
ALTER TABLE organization_subscriptions 
ADD COLUMN max_custom_fields INT DEFAULT NULL;

SELECT 'Custom Fields migration completed successfully' AS message;
