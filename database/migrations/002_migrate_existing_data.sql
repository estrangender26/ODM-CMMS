-- =====================================================
-- MIGRATION: Migrate Existing Data to Multi-Tenant
-- Phase 1 Part 3: Safe Data Migration
-- Compatible with MySQL 5.7+
-- =====================================================

DELIMITER $$

-- Helper procedure to safely add foreign key
CREATE PROCEDURE IF NOT EXISTS AddForeignKeyIfNotExists(
    IN p_table VARCHAR(64),
    IN p_fk_name VARCHAR(64),
    IN p_column VARCHAR(64),
    IN p_ref_table VARCHAR(64),
    IN p_ref_column VARCHAR(64)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_schema = DATABASE() 
        AND table_name = p_table 
        AND constraint_name = p_fk_name
    ) THEN
        SET @sql = CONCAT('ALTER TABLE ', p_table, 
            ' ADD CONSTRAINT ', p_fk_name,
            ' FOREIGN KEY (', p_column, ')',
            ' REFERENCES ', p_ref_table, '(', p_ref_column, ')',
            ' ON DELETE CASCADE');
        PREPARE stmt FROM @sql;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
    END IF;
END$$

-- Helper procedure to modify column to NOT NULL
CREATE PROCEDURE IF NOT EXISTS ModifyColumnNotNull(
    IN p_table VARCHAR(64),
    IN p_column VARCHAR(64),
    IN p_type VARCHAR(64)
)
BEGIN
    SET @sql = CONCAT('ALTER TABLE ', p_table, ' MODIFY COLUMN ', p_column, ' ', p_type, ' NOT NULL');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
END$$

DELIMITER ;

-- =====================================================
-- STEP 1: CREATE DEFAULT ORGANIZATION
-- =====================================================

INSERT INTO organizations (organization_name, subscription_plan, subscription_status, max_users, max_facilities, max_equipment)
SELECT 'Default Organization', 'internal', 'active', 100, 20, 1000
WHERE NOT EXISTS (SELECT 1 FROM organizations LIMIT 1);

-- Get the default organization ID
SET @default_org_id = (SELECT id FROM organizations ORDER BY id ASC LIMIT 1);

-- =====================================================
-- STEP 2: ASSIGN EXISTING RECORDS TO DEFAULT ORGANIZATION
-- =====================================================

-- Update users (only if organization_id is NULL)
UPDATE users SET organization_id = @default_org_id WHERE organization_id IS NULL;

-- Update facilities
UPDATE facilities SET organization_id = @default_org_id WHERE organization_id IS NULL;

-- Update equipment
UPDATE equipment SET organization_id = @default_org_id WHERE organization_id IS NULL;

-- Update task_master
UPDATE task_master SET organization_id = @default_org_id WHERE organization_id IS NULL;

-- Update schedules
UPDATE schedules SET organization_id = @default_org_id WHERE organization_id IS NULL;

-- Update work_orders
UPDATE work_orders SET organization_id = @default_org_id WHERE organization_id IS NULL;

-- Update work_order_notes
UPDATE work_order_notes SET organization_id = @default_org_id WHERE organization_id IS NULL;

-- Update inspection_points
UPDATE inspection_points SET organization_id = @default_org_id WHERE organization_id IS NULL;

-- Update inspection_readings
UPDATE inspection_readings SET organization_id = @default_org_id WHERE organization_id IS NULL;

-- Update attachments
UPDATE attachments SET organization_id = @default_org_id WHERE organization_id IS NULL;

-- Update audit_log
UPDATE audit_log SET organization_id = @default_org_id WHERE organization_id IS NULL;

-- =====================================================
-- STEP 3: MAKE organization_id NOT NULL
-- =====================================================

DELIMITER $$

CALL ModifyColumnNotNull('users', 'organization_id', 'INT');
CALL ModifyColumnNotNull('facilities', 'organization_id', 'INT');
CALL ModifyColumnNotNull('equipment', 'organization_id', 'INT');
CALL ModifyColumnNotNull('task_master', 'organization_id', 'INT');
CALL ModifyColumnNotNull('schedules', 'organization_id', 'INT');
CALL ModifyColumnNotNull('work_orders', 'organization_id', 'INT');
CALL ModifyColumnNotNull('work_order_notes', 'organization_id', 'INT');
CALL ModifyColumnNotNull('inspection_points', 'organization_id', 'INT');
CALL ModifyColumnNotNull('inspection_readings', 'organization_id', 'INT');
CALL ModifyColumnNotNull('attachments', 'organization_id', 'INT');
CALL ModifyColumnNotNull('audit_log', 'organization_id', 'INT');

-- =====================================================
-- STEP 4: ADD FOREIGN KEY CONSTRAINTS
-- =====================================================

CALL AddForeignKeyIfNotExists('users', 'fk_users_organization', 'organization_id', 'organizations', 'id');
CALL AddForeignKeyIfNotExists('facilities', 'fk_facilities_organization', 'organization_id', 'organizations', 'id');
CALL AddForeignKeyIfNotExists('equipment', 'fk_equipment_organization', 'organization_id', 'organizations', 'id');
CALL AddForeignKeyIfNotExists('task_master', 'fk_task_master_organization', 'organization_id', 'organizations', 'id');
CALL AddForeignKeyIfNotExists('schedules', 'fk_schedules_organization', 'organization_id', 'organizations', 'id');
CALL AddForeignKeyIfNotExists('work_orders', 'fk_work_orders_organization', 'organization_id', 'organizations', 'id');
CALL AddForeignKeyIfNotExists('work_order_notes', 'fk_work_order_notes_organization', 'organization_id', 'organizations', 'id');
CALL AddForeignKeyIfNotExists('inspection_points', 'fk_inspection_points_organization', 'organization_id', 'organizations', 'id');
CALL AddForeignKeyIfNotExists('inspection_readings', 'fk_inspection_readings_organization', 'organization_id', 'organizations', 'id');
CALL AddForeignKeyIfNotExists('attachments', 'fk_attachments_organization', 'organization_id', 'organizations', 'id');
CALL AddForeignKeyIfNotExists('audit_log', 'fk_audit_log_organization', 'organization_id', 'organizations', 'id');

DROP PROCEDURE IF EXISTS AddForeignKeyIfNotExists;
DROP PROCEDURE IF EXISTS ModifyColumnNotNull;

DELIMITER ;

-- =====================================================
-- STEP 5: SET FIRST USER AS ORGANIZATION ADMIN
-- =====================================================

UPDATE users 
SET is_organization_admin = TRUE 
WHERE id = (SELECT MIN(id) FROM users WHERE role = 'admin' AND organization_id = @default_org_id);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT 'Data migration completed successfully' AS message;
SELECT @default_org_id AS default_organization_id;
