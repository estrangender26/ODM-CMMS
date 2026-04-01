-- =====================================================
-- ISO 14224 Equipment Hierarchy Migration
-- ODM-CMMS Multi-Tenant CMMS
-- =====================================================

-- PART 1: Create Global ISO Equipment Reference Tables
-- These tables are NOT tenant-specific (global reference data)

-- Equipment Categories (ISO 14224 top level)
CREATE TABLE IF NOT EXISTS equipment_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_code VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Equipment Classes (ISO 14224 second level)
CREATE TABLE IF NOT EXISTS equipment_classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    class_code VARCHAR(50) NOT NULL,
    class_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES equipment_categories(id) ON DELETE CASCADE,
    UNIQUE KEY unique_class_per_category (category_id, class_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Equipment Types (ISO 14224 third level - most specific)
CREATE TABLE IF NOT EXISTS equipment_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    class_id INT NOT NULL,
    type_code VARCHAR(50) NOT NULL,
    type_name VARCHAR(255) NOT NULL,
    description TEXT,
    typical_components TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES equipment_classes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_type_per_class (class_id, type_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PART 2: Extend Equipment Table with ISO Classification
-- Add columns to link assets to ISO equipment taxonomy

-- Check and add equipment_category_id column
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() 
               AND table_name = 'equipment' 
               AND column_name = 'equipment_category_id');

SET @sql = IF(@exists = 0, 
    'ALTER TABLE equipment ADD COLUMN equipment_category_id INT NULL AFTER criticality',
    'SELECT "Column equipment_category_id already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add equipment_class_id column
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() 
               AND table_name = 'equipment' 
               AND column_name = 'equipment_class_id');

SET @sql = IF(@exists = 0, 
    'ALTER TABLE equipment ADD COLUMN equipment_class_id INT NULL AFTER equipment_category_id',
    'SELECT "Column equipment_class_id already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add equipment_type_id column
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() 
               AND table_name = 'equipment' 
               AND column_name = 'equipment_type_id');

SET @sql = IF(@exists = 0, 
    'ALTER TABLE equipment ADD COLUMN equipment_type_id INT NULL AFTER equipment_class_id',
    'SELECT "Column equipment_type_id already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign keys (ignore errors if they already exist)
-- Using ALTER TABLE with DROP FOREIGN KEY first to avoid duplicate key errors
-- This is a bit complex, so we'll try to add and ignore errors

-- Add index for equipment_category_id
CREATE INDEX idx_equip_category ON equipment(equipment_category_id);

-- Add index for equipment_class_id
CREATE INDEX idx_equip_class ON equipment(equipment_class_id);

-- Add index for equipment_type_id
CREATE INDEX idx_equip_type ON equipment(equipment_type_id);

-- Try to add foreign keys (will fail if already exist, which is OK)
-- We'll handle this by catching errors in the migration runner
ALTER TABLE equipment
ADD CONSTRAINT fk_equip_category 
    FOREIGN KEY (equipment_category_id) REFERENCES equipment_categories(id) ON DELETE SET NULL;

ALTER TABLE equipment
ADD CONSTRAINT fk_equip_class 
    FOREIGN KEY (equipment_class_id) REFERENCES equipment_classes(id) ON DELETE SET NULL;

ALTER TABLE equipment
ADD CONSTRAINT fk_equip_type 
    FOREIGN KEY (equipment_type_id) REFERENCES equipment_types(id) ON DELETE SET NULL;

-- PART 3: Create Task Template Engine
-- Task templates linked directly to ISO equipment types

CREATE TABLE IF NOT EXISTS task_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NULL, -- NULL = global system template, NOT NULL = org-specific
    equipment_type_id INT NOT NULL,
    template_code VARCHAR(100),
    template_name VARCHAR(255) NOT NULL,
    maintenance_type VARCHAR(50) NOT NULL, -- inspection, preventive, corrective, predictive
    task_scope VARCHAR(100), -- mechanical, electrical, instrumentation, etc.
    description TEXT,
    frequency_value INT NULL,
    frequency_unit VARCHAR(50) NULL, -- hours, days, weeks, months, years, cycles
    estimated_duration_minutes INT NULL,
    required_skills TEXT,
    required_tools TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (equipment_type_id) REFERENCES equipment_types(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_template_org (organization_id, equipment_type_id),
    INDEX idx_template_equip_type (equipment_type_id),
    INDEX idx_template_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PART 4: Task Template Steps
-- Structured steps within each template

CREATE TABLE IF NOT EXISTS task_template_steps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_template_id INT NOT NULL,
    step_no INT NOT NULL,
    step_type VARCHAR(50) NOT NULL, -- inspection, measurement, cleaning, adjustment, lubrication, safety_check, functional_test, minor_repair, verification
    instruction TEXT NOT NULL,
    data_type VARCHAR(50), -- text, number, boolean, dropdown, photo, signature, date
    expected_value TEXT NULL,
    min_value DECIMAL(12,4) NULL,
    max_value DECIMAL(12,4) NULL,
    unit VARCHAR(50) NULL,
    is_required BOOLEAN DEFAULT TRUE,
    options JSON NULL, -- for dropdown data type: ["option1", "option2"]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_template_id) REFERENCES task_templates(id) ON DELETE CASCADE,
    INDEX idx_step_template (task_template_id, step_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PART 5: Task Template Safety Controls
-- Safety requirements for tasks

CREATE TABLE IF NOT EXISTS task_template_safety_controls (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_template_id INT NOT NULL,
    safety_type VARCHAR(50) NOT NULL, -- PPE, LOTO, permit, gas_test, confined_space, electrical_isolation
    description TEXT NOT NULL,
    is_mandatory BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_template_id) REFERENCES task_templates(id) ON DELETE CASCADE,
    INDEX idx_safety_template (task_template_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PART 6: Failure Modes Structure (ISO 14224 Compatible)
-- For reliability analytics and RCA

CREATE TABLE IF NOT EXISTS failure_modes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_type_id INT NOT NULL,
    failure_mode VARCHAR(255) NOT NULL,
    failure_cause VARCHAR(255),
    failure_mechanism VARCHAR(255),
    typical_symptoms TEXT,
    recommended_action TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (equipment_type_id) REFERENCES equipment_types(id) ON DELETE CASCADE,
    INDEX idx_failure_equip_type (equipment_type_id),
    INDEX idx_failure_mode (failure_mode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migration complete
SELECT 'ISO 14224 Equipment Hierarchy migration completed successfully' AS status;
