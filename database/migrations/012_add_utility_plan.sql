-- =====================================================
-- MIGRATION: Add Utility Plan for Water/Infrastructure
-- For organizations with high asset counts
-- =====================================================

-- Add new columns for explicit asset limits (separate from user-based limits)
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS max_facilities INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_equipment INT DEFAULT NULL;

-- Update existing plans with reasonable defaults
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
  END;

-- Add Utility plan for water/infrastructure companies
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
  '["work_orders", "equipment", "schedules", "inspections", "advanced_reports", "custom_fields", "api_access", "priority_support", "gis_integration", "scada_integration", "compliance_reporting", "unlimited_storage", "dedicated_support", "sla", "audit_logs", "data_retention"]',
  TRUE,
  TRUE,
  5
) ON DUPLICATE KEY UPDATE
  max_facilities = 500,
  max_equipment = 20000;

-- Also add these columns to organization_subscriptions for tracking
ALTER TABLE organization_subscriptions 
ADD COLUMN IF NOT EXISTS max_facilities INT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS max_equipment INT DEFAULT NULL;

SELECT 'Utility plan added successfully' as message;
