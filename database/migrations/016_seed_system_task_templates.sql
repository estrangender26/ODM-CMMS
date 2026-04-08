-- =====================================================
-- Migration: Seed System Task Templates
-- Step 3: Populate immutable system templates for all equipment types
-- 
-- This migration:
-- 1. Verifies required columns exist
-- 2. Runs the family-based template seeding
-- 3. Logs results
-- =====================================================

-- Verify task_kind column exists (added in Step 2)
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

-- Verify is_system column exists (added in Step 2)
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

-- Verify is_editable column exists (added in Step 2)
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

-- Verify safety metadata columns exist in task_template_steps (added in Step 2)
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

-- Migration marker
-- The actual seeding is done via JavaScript: database/seeds/003_system_task_templates.js
SELECT 'Step 3 Migration: System task template columns verified' AS status;
SELECT 'Run: node database/seeds/003_system_task_templates.js' AS next_step;
