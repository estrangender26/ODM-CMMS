-- =====================================================
-- MIGRATION: Add Maintenance Plans Table
-- Separates schedules from templates
-- =====================================================

-- Create maintenance_plans table
CREATE TABLE IF NOT EXISTS maintenance_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    task_template_id INT NOT NULL,
    equipment_id INT,  -- NULL = applies to all equipment of this type
    plan_code VARCHAR(50),
    plan_name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Schedule Configuration
    frequency_type ENUM('daily', 'weekly', 'monthly', 'yearly') NOT NULL,
    frequency_interval INT DEFAULT 1,
    day_of_week TINYINT,  -- 0=Sunday, 1=Monday, etc. (for weekly)
    day_of_month TINYINT, -- 1-31 (for monthly)
    month_of_year TINYINT, -- 1-12 (for yearly)
    start_date DATE NOT NULL,
    end_date DATE,  -- NULL = no end date
    
    -- Execution Settings
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    assigned_to INT,  -- Default assignee (can be overridden)
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_run_date DATE,
    next_run_date DATE,
    
    -- Metadata
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (task_template_id) REFERENCES task_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_plan_org (organization_id),
    INDEX idx_plan_template (task_template_id),
    INDEX idx_plan_equipment (equipment_id),
    INDEX idx_plan_active (is_active),
    INDEX idx_plan_next_run (next_run_date),
    UNIQUE KEY unique_plan_code_per_org (organization_id, plan_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration: Move schedule data from task_templates to maintenance_plans
-- Create a maintenance plan for each task template that has schedule settings

INSERT INTO maintenance_plans (
    organization_id,
    task_template_id,
    plan_code,
    plan_name,
    description,
    frequency_type,
    frequency_interval,
    day_of_week,
    day_of_month,
    start_date,
    priority,
    is_active,
    created_at
)
SELECT 
    COALESCE(tt.organization_id, 1),  -- Use default org if NULL
    tt.id,
    CONCAT('PLAN-', tt.template_code),
    CONCAT('Schedule for ', tt.template_name),
    CONCAT('Auto-generated plan for ', tt.template_name),
    COALESCE(tt.frequency_type, 'daily'),
    COALESCE(tt.frequency_interval, 1),
    tt.day_of_week,
    tt.day_of_month,
    COALESCE(tt.start_date, CURDATE()),
    COALESCE(tt.priority, 'medium'),
    tt.is_active,
    tt.created_at
FROM task_templates tt
WHERE tt.frequency_type IS NOT NULL;

-- Create plan_equipment linking table for equipment-specific plans
CREATE TABLE IF NOT EXISTS plan_equipment (
    id INT AUTO_INCREMENT PRIMARY KEY,
    maintenance_plan_id INT NOT NULL,
    equipment_id INT NOT NULL,
    custom_frequency_type ENUM('daily', 'weekly', 'monthly', 'yearly'),
    custom_frequency_interval INT,
    custom_priority ENUM('low', 'medium', 'high', 'urgent'),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (maintenance_plan_id) REFERENCES maintenance_plans(id) ON DELETE CASCADE,
    FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
    UNIQUE KEY unique_plan_equipment (maintenance_plan_id, equipment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add maintenance_plan_id to work_orders
ALTER TABLE work_orders 
ADD COLUMN IF NOT EXISTS maintenance_plan_id INT NULL AFTER task_template_id,
ADD CONSTRAINT IF NOT EXISTS fk_work_order_plan 
    FOREIGN KEY (maintenance_plan_id) REFERENCES maintenance_plans(id) ON DELETE SET NULL;

-- Add index for plan lookup
CREATE INDEX IF NOT EXISTS idx_wo_plan ON work_orders(maintenance_plan_id);

SELECT 'Maintenance plans migration completed' AS status;
