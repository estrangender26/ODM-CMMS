-- =====================================================
-- Migration: Add Industry Layer and Template Architecture
-- Step 2: Safe Schema Extensions
-- Compatible with MySQL 5.7+
-- =====================================================

-- =====================================================
-- PART 1: INDUSTRIES MASTER TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS industries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_industry_code (code),
    INDEX idx_industry_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 2: EQUIPMENT TYPE TO INDUSTRY MAPPING
-- Allows one equipment type to belong to multiple industries
-- =====================================================

CREATE TABLE IF NOT EXISTS equipment_type_industries (
    equipment_type_id INT NOT NULL,
    industry_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (equipment_type_id, industry_id),
    FOREIGN KEY (equipment_type_id) REFERENCES equipment_types(id) ON DELETE CASCADE,
    FOREIGN KEY (industry_id) REFERENCES industries(id) ON DELETE CASCADE,
    INDEX idx_equip_type (equipment_type_id),
    INDEX idx_industry (industry_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 3: ORGANIZATION TO INDUSTRY MAPPING
-- Allows organizations to enable one or more industries
-- =====================================================

CREATE TABLE IF NOT EXISTS organization_industries (
    organization_id INT NOT NULL,
    industry_id INT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (organization_id, industry_id),
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (industry_id) REFERENCES industries(id) ON DELETE CASCADE,
    INDEX idx_org (organization_id),
    INDEX idx_industry (industry_id),
    INDEX idx_default (organization_id, is_default)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 4: EXTEND TASK TEMPLATES WITH ARCHITECTURE FIELDS
-- =====================================================

-- Add industry_id
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_templates' 
               AND column_name = 'industry_id');

SET @sql = IF(@exists = 0, 
    'ALTER TABLE task_templates ADD COLUMN industry_id INT NULL AFTER equipment_type_id',
    'SELECT "Column industry_id already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add task_kind
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_templates' 
               AND column_name = 'task_kind');

SET @sql = IF(@exists = 0, 
    'ALTER TABLE task_templates ADD COLUMN task_kind VARCHAR(50) NULL AFTER maintenance_type',
    'SELECT "Column task_kind already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add is_system
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_templates' 
               AND column_name = 'is_system');

SET @sql = IF(@exists = 0, 
    'ALTER TABLE task_templates ADD COLUMN is_system BOOLEAN DEFAULT FALSE AFTER task_kind',
    'SELECT "Column is_system already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add is_editable
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_templates' 
               AND column_name = 'is_editable');

SET @sql = IF(@exists = 0, 
    'ALTER TABLE task_templates ADD COLUMN is_editable BOOLEAN DEFAULT TRUE AFTER is_system',
    'SELECT "Column is_editable already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add parent_template_id (self-reference for cloning)
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_templates' 
               AND column_name = 'parent_template_id');

SET @sql = IF(@exists = 0, 
    'ALTER TABLE task_templates ADD COLUMN parent_template_id INT NULL AFTER is_editable',
    'SELECT "Column parent_template_id already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key for parent_template_id (try to add, ignore if exists)
SET @exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_templates' 
               AND constraint_name = 'fk_task_template_parent');

SET @sql = IF(@exists = 0,
    'ALTER TABLE task_templates ADD CONSTRAINT fk_task_template_parent FOREIGN KEY (parent_template_id) REFERENCES task_templates(id) ON DELETE SET NULL',
    'SELECT "Foreign key already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key for industry_id (try to add, ignore if exists)
SET @exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_templates' 
               AND constraint_name = 'fk_task_template_industry');

SET @sql = IF(@exists = 0,
    'ALTER TABLE task_templates ADD CONSTRAINT fk_task_template_industry FOREIGN KEY (industry_id) REFERENCES industries(id) ON DELETE SET NULL',
    'SELECT "Foreign key already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add indexes
SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_templates' 
               AND index_name = 'idx_template_industry');
SET @sql = IF(@exists = 0,
    'CREATE INDEX idx_template_industry ON task_templates(industry_id)',
    'SELECT "Index already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_templates' 
               AND index_name = 'idx_template_task_kind');
SET @sql = IF(@exists = 0,
    'CREATE INDEX idx_template_task_kind ON task_templates(task_kind)',
    'SELECT "Index already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_templates' 
               AND index_name = 'idx_template_system');
SET @sql = IF(@exists = 0,
    'CREATE INDEX idx_template_system ON task_templates(is_system)',
    'SELECT "Index already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_templates' 
               AND index_name = 'idx_template_parent');
SET @sql = IF(@exists = 0,
    'CREATE INDEX idx_template_parent ON task_templates(parent_template_id)',
    'SELECT "Index already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- PART 5: EXTEND TASK TEMPLATE STEPS WITH SAFETY METADATA
-- =====================================================

-- Add safety_note
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_template_steps' 
               AND column_name = 'safety_note');

SET @sql = IF(@exists = 0, 
    'ALTER TABLE task_template_steps ADD COLUMN safety_note TEXT NULL AFTER options',
    'SELECT "Column safety_note already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add is_visual_only
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_template_steps' 
               AND column_name = 'is_visual_only');

SET @sql = IF(@exists = 0, 
    'ALTER TABLE task_template_steps ADD COLUMN is_visual_only BOOLEAN DEFAULT TRUE AFTER safety_note',
    'SELECT "Column is_visual_only already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add requires_equipment_stopped
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_template_steps' 
               AND column_name = 'requires_equipment_stopped');

SET @sql = IF(@exists = 0, 
    'ALTER TABLE task_template_steps ADD COLUMN requires_equipment_stopped BOOLEAN DEFAULT FALSE AFTER is_visual_only',
    'SELECT "Column requires_equipment_stopped already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add prohibit_if_running
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_template_steps' 
               AND column_name = 'prohibit_if_running');

SET @sql = IF(@exists = 0, 
    'ALTER TABLE task_template_steps ADD COLUMN prohibit_if_running BOOLEAN DEFAULT FALSE AFTER requires_equipment_stopped',
    'SELECT "Column prohibit_if_running already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add prohibit_opening_covers
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_template_steps' 
               AND column_name = 'prohibit_opening_covers');

SET @sql = IF(@exists = 0, 
    'ALTER TABLE task_template_steps ADD COLUMN prohibit_opening_covers BOOLEAN DEFAULT FALSE AFTER prohibit_if_running',
    'SELECT "Column prohibit_opening_covers already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Migration complete
SELECT 'Industry layer and template architecture migration completed successfully' AS status;
