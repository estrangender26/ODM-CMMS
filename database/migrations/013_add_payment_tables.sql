-- =====================================================
-- MIGRATION: Add Payment Tables for Stripe Integration
-- =====================================================

-- Table for storing Stripe customer IDs
CREATE TABLE IF NOT EXISTS stripe_customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL UNIQUE,
    stripe_customer_id VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    INDEX idx_stripe_customer (stripe_customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for storing payment history
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add Stripe subscription ID to organization_subscriptions
ALTER TABLE organization_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR(100) DEFAULT NULL;

SELECT 'Payment tables created successfully' as message;
