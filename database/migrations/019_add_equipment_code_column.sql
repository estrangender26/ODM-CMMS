-- =====================================================
-- MIGRATION: Add missing code column to equipment table
-- Fixes: Unknown column 'code' in 'field list' during asset import
-- =====================================================

-- Add code column if not exists
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() AND table_name = 'equipment' AND column_name = 'code');
SET @sql = IF(@exists = 0, 
    'ALTER TABLE equipment ADD COLUMN code VARCHAR(50) NULL AFTER name',
    'SELECT "code column already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add unique index on code if not exists
SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
               WHERE table_schema = DATABASE() AND table_name = 'equipment' AND index_name = 'idx_code');
SET @sql = IF(@exists = 0, 
    'CREATE UNIQUE INDEX idx_code ON equipment(code)',
    'SELECT "idx_code already exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Backfill: generate codes from existing equipment names
-- Uses id to guarantee uniqueness
UPDATE equipment 
SET code = CONCAT(
    LOWER(REPLACE(REPLACE(REPLACE(REPLACE(name, ' ', '-'), '_', '-'), '/', '-'), '\\', '-')),
    '-',
    id
)
WHERE code IS NULL OR code = '';

-- Make code NOT NULL after backfill
SET @sql = 'ALTER TABLE equipment MODIFY COLUMN code VARCHAR(50) NOT NULL';
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'equipment.code column added and backfilled successfully' AS status;
