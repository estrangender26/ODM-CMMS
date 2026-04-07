-- =====================================================
-- MIGRATION: Asset Import Support Tables
-- =====================================================

-- Asset to Template Link Table
-- Tracks which templates are inherited by each asset
CREATE TABLE IF NOT EXISTS asset_template_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    asset_id INT NOT NULL,
    template_id INT NOT NULL,
    inherited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    inherited_from ENUM('equipment_type', 'manual', 'bulk_import') DEFAULT 'equipment_type',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (asset_id) REFERENCES equipment(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES task_templates(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicates
    UNIQUE KEY unique_asset_template (asset_id, template_id),
    
    -- Indexes
    INDEX idx_asset (asset_id),
    INDEX idx_template (template_id),
    INDEX idx_inherited (inherited_at)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Links assets to their inherited inspection templates';

-- Add qr_code to equipment if not exists
SET @dbname = DATABASE();
SET @tablename = 'equipment';
SET @columnname = 'qr_code';

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
    'ALTER TABLE equipment ADD COLUMN qr_code VARCHAR(100) UNIQUE AFTER status',
    'SELECT "Column qr_code already exists" as message'
);
PREPARE stmt FROM @addcol;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add equipment_type_id index if not exists
-- (Assuming equipment_type_id was added in previous migration)
-- If not present, add it:
SET @columnname2 = 'equipment_type_id';
SET @sql2 = CONCAT(
    'SELECT COUNT(*) INTO @exists2 FROM information_schema.columns 
    WHERE table_schema = ? AND table_name = ? AND column_name = ?'
);
PREPARE stmt FROM @sql2;
SET @col2 = @columnname2;
EXECUTE stmt USING @db, @tbl, @col2;
DEALLOCATE PREPARE stmt;

-- Note: If equipment_type_id doesn't exist, you need migration 005 or 007
-- This migration assumes it's already present

-- Create index on equipment_type_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_equip_type ON equipment(equipment_type_id);

-- Create index on facility_id + name for duplicate checking
CREATE INDEX IF NOT EXISTS idx_facility_name ON equipment(facility_id, name);

-- Import Log Table (optional - for tracking import history)
CREATE TABLE IF NOT EXISTS asset_import_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    imported_by INT NOT NULL,
    filename VARCHAR(255),
    total_rows INT DEFAULT 0,
    success_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    facilities_created INT DEFAULT 0,
    assets_created INT DEFAULT 0,
    errors_json JSON,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_org_time (organization_id, started_at)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Log of asset import operations';

-- View for assets with their inherited template count
CREATE OR REPLACE VIEW v_asset_template_summary AS
SELECT 
    e.id AS asset_id,
    e.name AS asset_name,
    e.code AS asset_code,
    e.qr_code,
    f.name AS facility_name,
    et.type_name AS equipment_type,
    COUNT(atl.template_id) AS template_count,
    GROUP_CONCAT(tt.template_name SEPARATOR ', ') AS template_names
FROM equipment e
JOIN facilities f ON e.facility_id = f.id
LEFT JOIN equipment_types et ON e.equipment_type_id = et.id
LEFT JOIN asset_template_links atl ON e.id = atl.asset_id AND atl.is_active = TRUE
LEFT JOIN task_templates tt ON atl.template_id = tt.id
GROUP BY e.id, e.name, e.code, e.qr_code, f.name, et.type_name;

SELECT 'Asset import tables migration complete' as status;
