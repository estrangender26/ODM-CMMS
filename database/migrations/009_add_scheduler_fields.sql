-- =====================================================
-- MIGRATION: Add Scheduler Fields for ODM Auto-WO Generation
-- =====================================================

-- Add frequency scheduling fields to task_templates
ALTER TABLE task_templates 
ADD COLUMN IF NOT EXISTS frequency_type ENUM('daily', 'weekly', 'monthly') NULL 
COMMENT 'Simple ODM frequency: daily, weekly, monthly' AFTER frequency_unit;

ALTER TABLE task_templates 
ADD COLUMN IF NOT EXISTS frequency_interval INT DEFAULT 1 
COMMENT 'Every N days/weeks/months' AFTER frequency_type;

ALTER TABLE task_templates 
ADD COLUMN IF NOT EXISTS day_of_week TINYINT NULL 
COMMENT '0-6 for weekly schedules (Sunday=0)' AFTER frequency_interval;

ALTER TABLE task_templates 
ADD COLUMN IF NOT EXISTS day_of_month TINYINT NULL 
COMMENT '1-31 for monthly schedules' AFTER day_of_week;

ALTER TABLE task_templates 
ADD COLUMN IF NOT EXISTS start_date DATE NULL 
COMMENT 'When scheduling begins' AFTER day_of_month;

ALTER TABLE task_templates 
ADD COLUMN IF NOT EXISTS priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium' 
COMMENT 'WO priority' AFTER start_date;

-- Add task_template_id to work_orders if not exists (link to template)
SET @dbname = DATABASE();
SET @tablename = 'work_orders';
SET @columnname = 'task_template_id';

SET @sql = CONCAT(
    'SELECT COUNT(*) INTO @exists FROM information_schema.columns 
    WHERE table_schema = ? AND table_name = ? AND column_name = ?'
);
PREPARE stmt FROM @sql;
SET @db = @dbname;
SET @tbl = @tablename;
SET @col = @columnname;
EXECUTE stmt USING @db, @tbl, @col;
DEALLOCATE PREPARE stmt;

SET @addcol = IF(@exists = 0, 
    'ALTER TABLE work_orders ADD COLUMN task_template_id INT NULL AFTER task_master_id',
    'SELECT "Column already exists" as message'
);
PREPARE stmt FROM @addcol;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add scheduled_date to work_orders
SET @columnname2 = 'scheduled_date';
SET @sql2 = CONCAT(
    'SELECT COUNT(*) INTO @exists2 FROM information_schema.columns 
    WHERE table_schema = ? AND table_name = ? AND column_name = ?'
);
PREPARE stmt FROM @sql2;
SET @col2 = @columnname2;
EXECUTE stmt USING @db, @tbl, @col2;
DEALLOCATE PREPARE stmt;

SET @addcol2 = IF(@exists2 = 0, 
    'ALTER TABLE work_orders ADD COLUMN scheduled_date DATE NULL AFTER requested_date',
    'SELECT "Column already exists" as message'
);
PREPARE stmt FROM @addcol2;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key for task_template_id
ALTER TABLE work_orders 
ADD CONSTRAINT IF NOT EXISTS fk_work_order_template 
FOREIGN KEY (task_template_id) REFERENCES task_templates(id) ON DELETE SET NULL;

-- Add index for duplicate prevention query
CREATE INDEX IF NOT EXISTS idx_wo_template_date 
ON work_orders(equipment_id, task_template_id, scheduled_date);

-- Update existing status enum to include 'scheduled' if using string status
-- Note: This assumes status is stored as string/VARCHAR
-- If using ENUM, manual ALTER TYPE may be needed

-- Add default_operator_id to facilities if not exists
SET @tablename2 = 'facilities';
SET @columnname3 = 'default_operator_id';
SET @sql3 = CONCAT(
    'SELECT COUNT(*) INTO @exists3 FROM information_schema.columns 
    WHERE table_schema = ? AND table_name = ? AND column_name = ?'
);
PREPARE stmt FROM @sql3;
SET @tbl2 = @tablename2;
SET @col3 = @columnname3;
EXECUTE stmt USING @db, @tbl2, @col3;
DEALLOCATE PREPARE stmt;

SET @addcol3 = IF(@exists3 = 0, 
    'ALTER TABLE facilities ADD COLUMN default_operator_id INT NULL AFTER organization_id',
    'SELECT "Column already exists" as message'
);
PREPARE stmt FROM @addcol3;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key for default operator
ALTER TABLE facilities 
ADD CONSTRAINT IF NOT EXISTS fk_facility_default_operator 
FOREIGN KEY (default_operator_id) REFERENCES users(id) ON DELETE SET NULL;

-- =====================================================
-- SEED SAMPLE DATA FOR TESTING
-- =====================================================

-- Create sample daily inspection template if none exist
INSERT INTO task_templates (
    organization_id,
    equipment_type_id, 
    template_code,
    template_name,
    maintenance_type,
    description,
    frequency_type,
    frequency_interval,
    start_date,
    priority,
    is_active
)
SELECT 
    NULL, -- Global template
    et.id,
    CONCAT('DAILY-', et.type_code),
    CONCAT('Daily ', et.type_name, ' Inspection'),
    'inspection',
    CONCAT('Standard daily inspection for ', et.type_name),
    'daily',
    1,
    CURDATE(),
    'medium',
    TRUE
FROM equipment_types et
WHERE et.type_code = 'CENTRIFUGAL_PUMP'
AND NOT EXISTS (
    SELECT 1 FROM task_templates 
    WHERE equipment_type_id = et.id 
    AND frequency_type = 'daily'
);

-- Create sample weekly template
INSERT INTO task_templates (
    organization_id,
    equipment_type_id, 
    template_code,
    template_name,
    maintenance_type,
    description,
    frequency_type,
    frequency_interval,
    day_of_week,
    start_date,
    priority,
    is_active
)
SELECT 
    NULL,
    et.id,
    CONCAT('WEEKLY-', et.type_code),
    CONCAT('Weekly ', et.type_name, ' Maintenance'),
    'preventive',
    CONCAT('Weekly maintenance for ', et.type_name),
    'weekly',
    1,
    1, -- Monday
    CURDATE(),
    'medium',
    TRUE
FROM equipment_types et
WHERE et.type_code = 'CENTRIFUGAL_PUMP'
AND NOT EXISTS (
    SELECT 1 FROM task_templates 
    WHERE equipment_type_id = et.id 
    AND frequency_type = 'weekly'
);

SELECT 'Scheduler fields migration complete' as status;
