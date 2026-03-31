-- =====================================================
-- MIGRATION: Add Seat-Based Subscription System
-- Phase 2: Subscription Management
-- Run with: node run-subscription-migration.js
-- =====================================================

-- =====================================================
-- PART 1: CREATE SUBSCRIPTION PLANS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    plan_code VARCHAR(50) NOT NULL UNIQUE,
    plan_name VARCHAR(100) NOT NULL,
    description TEXT,
    included_users INT NOT NULL DEFAULT 5,
    max_users INT DEFAULT NULL,
    base_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    price_per_additional_user DECIMAL(10, 2) DEFAULT 0.00,
    features TEXT COMMENT 'JSON array of features',
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (is_active),
    INDEX idx_public (is_public),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 2: CREATE ORGANIZATION SUBSCRIPTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS organization_subscriptions (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 3: SEED DEFAULT SUBSCRIPTION PLANS
-- =====================================================

INSERT IGNORE INTO subscription_plans (plan_code, plan_name, description, included_users, max_users, base_price, price_per_additional_user, features, is_active, is_public, sort_order) VALUES
('free', 'Free', 'Basic maintenance management for small teams', 3, 5, 0.00, 0.00, '["work_orders", "equipment", "basic_reports"]', TRUE, TRUE, 1),
('starter', 'Starter', 'Perfect for small maintenance teams', 5, 25, 49.00, 10.00, '["work_orders", "equipment", "schedules", "inspections", "standard_reports", "email_notifications"]', TRUE, TRUE, 2),
('professional', 'Professional', 'Advanced features for growing organizations', 15, 100, 149.00, 8.00, '["work_orders", "equipment", "schedules", "inspections", "advanced_reports", "custom_fields", "api_access", "priority_support"]', TRUE, TRUE, 3),
('enterprise', 'Enterprise', 'Unlimited users and premium features', 50, NULL, 499.00, 5.00, '["all_features", "dedicated_support", "sla", "custom_integrations", "sso", "audit_logs", "data_retention"]', TRUE, FALSE, 4);
