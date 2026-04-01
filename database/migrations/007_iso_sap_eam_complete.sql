-- =====================================================
-- ISO 14224 + SAP S/4HANA PM EAM Structure Migration
-- ODM-CMMS Multi-Tenant CMMS
--
-- Supports:
-- - ISO 14224 equipment taxonomy (5 levels)
-- - SAP S/4HANA PM catalog coding (A, B, C, 5)
-- - Facility-based grouping (NOT functional location hierarchy)
-- - Inspection templates per equipment type
-- - Findings with SAP notification traceability
-- =====================================================

-- =====================================================
-- PART 1 — FACILITIES TABLE EXTENSION
-- Add SAP reference and facility type to existing table
-- =====================================================

-- Add facility_type if not exists
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() AND table_name = 'facilities' AND column_name = 'facility_type');
SET @sql = IF(@exists = 0, 
    "ALTER TABLE facilities ADD COLUMN facility_type ENUM('WTP', 'WWTP', 'WPS', 'WWLS', 'RESERVOIR', 'BOOSTER_STATION', 'ADMIN_BUILDING', 'OTHER') NOT NULL DEFAULT 'OTHER'",
    'SELECT "facility_type exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add sap_reference_code if not exists
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() AND table_name = 'facilities' AND column_name = 'sap_reference_code');
SET @sql = IF(@exists = 0, 
    "ALTER TABLE facilities ADD COLUMN sap_reference_code VARCHAR(50) NULL COMMENT 'SAP functional location reference for manual notification creation'",
    'SELECT "sap_reference_code exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add is_active if not exists
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() AND table_name = 'facilities' AND column_name = 'is_active');
SET @sql = IF(@exists = 0, 
    "ALTER TABLE facilities ADD COLUMN is_active BOOLEAN DEFAULT TRUE",
    'SELECT "is_active exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add indexes
SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
               WHERE table_schema = DATABASE() AND table_name = 'facilities' AND index_name = 'idx_facility_type');
SET @sql = IF(@exists = 0, 'CREATE INDEX idx_facility_type ON facilities(facility_type)', 'SELECT "Index exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
               WHERE table_schema = DATABASE() AND table_name = 'facilities' AND index_name = 'idx_facility_sap');
SET @sql = IF(@exists = 0, 'CREATE INDEX idx_facility_sap ON facilities(sap_reference_code)', 'SELECT "Index exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================
-- PART 2 — ISO 14224 EQUIPMENT HIERARCHY
-- 5-level taxonomy for reliability analytics
-- =====================================================

-- Level 1: Equipment Categories
CREATE TABLE IF NOT EXISTS equipment_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_code VARCHAR(50) UNIQUE NOT NULL,
    category_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category_code (category_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ISO 14224 Level 1 - Equipment Categories';

-- Level 2: Equipment Classes
CREATE TABLE IF NOT EXISTS equipment_classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category_id INT NOT NULL,
    class_code VARCHAR(50) NOT NULL,
    class_name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES equipment_categories(id) ON DELETE CASCADE,
    UNIQUE KEY unique_class_per_category (category_id, class_code),
    INDEX idx_class_category (category_id),
    INDEX idx_class_code (class_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ISO 14224 Level 2 - Equipment Classes';

-- Level 3: Equipment Types
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
    UNIQUE KEY unique_type_per_class (class_id, type_code),
    INDEX idx_type_class (class_id),
    INDEX idx_type_code (type_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ISO 14224 Level 3 - Equipment Types';

-- Level 4: Subunits (Functional assemblies)
CREATE TABLE IF NOT EXISTS subunits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_type_id INT NOT NULL,
    subunit_code VARCHAR(50) NOT NULL,
    subunit_name VARCHAR(255) NOT NULL,
    description TEXT,
    typical_failures TEXT,
    maintenance_instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (equipment_type_id) REFERENCES equipment_types(id) ON DELETE CASCADE,
    UNIQUE KEY unique_subunit_per_type (equipment_type_id, subunit_code),
    INDEX idx_subunit_type (equipment_type_id),
    INDEX idx_subunit_code (subunit_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ISO 14224 Level 4 - Subunits/Functional assemblies';

-- Level 5: Maintainable Items (Components)
CREATE TABLE IF NOT EXISTS maintainable_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subunit_id INT NOT NULL,
    item_code VARCHAR(50) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    typical_components TEXT,
    spare_part_reference VARCHAR(100),
    criticality ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subunit_id) REFERENCES subunits(id) ON DELETE CASCADE,
    UNIQUE KEY unique_item_per_subunit (subunit_id, item_code),
    INDEX idx_item_subunit (subunit_id),
    INDEX idx_item_code (item_code),
    INDEX idx_item_criticality (criticality)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ISO 14224 Level 5 - Maintainable items/components';

-- =====================================================
-- PART 3 — ASSETS TABLE EXTENSION
-- Add ISO classification and SAP reference fields
-- =====================================================

-- Add facility_id if not exists (ensure nullable)
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() AND table_name = 'equipment' AND column_name = 'facility_id');
SET @sql = IF(@exists = 0, 
    'ALTER TABLE equipment ADD COLUMN facility_id INT NULL AFTER organization_id',
    'ALTER TABLE equipment MODIFY COLUMN facility_id INT NULL');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add ISO classification columns
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() AND table_name = 'equipment' AND column_name = 'equipment_category_id');
SET @sql = IF(@exists = 0, 
    'ALTER TABLE equipment ADD COLUMN equipment_category_id INT NULL AFTER facility_id',
    'SELECT "equipment_category_id exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() AND table_name = 'equipment' AND column_name = 'equipment_class_id');
SET @sql = IF(@exists = 0, 
    'ALTER TABLE equipment ADD COLUMN equipment_class_id INT NULL AFTER equipment_category_id',
    'SELECT "equipment_class_id exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() AND table_name = 'equipment' AND column_name = 'equipment_type_id');
SET @sql = IF(@exists = 0, 
    'ALTER TABLE equipment ADD COLUMN equipment_type_id INT NULL AFTER equipment_class_id',
    'SELECT "equipment_type_id exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() AND table_name = 'equipment' AND column_name = 'subunit_id');
SET @sql = IF(@exists = 0, 
    'ALTER TABLE equipment ADD COLUMN subunit_id INT NULL AFTER equipment_type_id',
    'SELECT "subunit_id exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() AND table_name = 'equipment' AND column_name = 'maintainable_item_id');
SET @sql = IF(@exists = 0, 
    'ALTER TABLE equipment ADD COLUMN maintainable_item_id INT NULL AFTER subunit_id',
    'SELECT "maintainable_item_id exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add SAP reference columns
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() AND table_name = 'equipment' AND column_name = 'sap_equipment_reference');
SET @sql = IF(@exists = 0, 
    'ALTER TABLE equipment ADD COLUMN sap_equipment_reference VARCHAR(50) NULL COMMENT "SAP equipment number reference"',
    'SELECT "sap_equipment_reference exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() AND table_name = 'equipment' AND column_name = 'sap_floc_hint');
SET @sql = IF(@exists = 0, 
    'ALTER TABLE equipment ADD COLUMN sap_floc_hint VARCHAR(50) NULL COMMENT "SAP functional location hint for notification creation"',
    'SELECT "sap_floc_hint exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add foreign keys to equipment table (one at a time for safety)
SET @exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
               WHERE table_schema = DATABASE() AND table_name = 'equipment' AND constraint_name = 'fk_equip_facility');
SET @sql = IF(@exists = 0, 'ALTER TABLE equipment ADD CONSTRAINT fk_equip_facility FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE SET NULL', 'SELECT "FK exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
               WHERE table_schema = DATABASE() AND table_name = 'equipment' AND constraint_name = 'fk_equip_category');
SET @sql = IF(@exists = 0, 'ALTER TABLE equipment ADD CONSTRAINT fk_equip_category FOREIGN KEY (equipment_category_id) REFERENCES equipment_categories(id) ON DELETE SET NULL', 'SELECT "FK exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
               WHERE table_schema = DATABASE() AND table_name = 'equipment' AND constraint_name = 'fk_equip_class');
SET @sql = IF(@exists = 0, 'ALTER TABLE equipment ADD CONSTRAINT fk_equip_class FOREIGN KEY (equipment_class_id) REFERENCES equipment_classes(id) ON DELETE SET NULL', 'SELECT "FK exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
               WHERE table_schema = DATABASE() AND table_name = 'equipment' AND constraint_name = 'fk_equip_type');
SET @sql = IF(@exists = 0, 'ALTER TABLE equipment ADD CONSTRAINT fk_equip_type FOREIGN KEY (equipment_type_id) REFERENCES equipment_types(id) ON DELETE SET NULL', 'SELECT "FK exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
               WHERE table_schema = DATABASE() AND table_name = 'equipment' AND constraint_name = 'fk_equip_subunit');
SET @sql = IF(@exists = 0, 'ALTER TABLE equipment ADD CONSTRAINT fk_equip_subunit FOREIGN KEY (subunit_id) REFERENCES subunits(id) ON DELETE SET NULL', 'SELECT "FK exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
               WHERE table_schema = DATABASE() AND table_name = 'equipment' AND constraint_name = 'fk_equip_item');
SET @sql = IF(@exists = 0, 'ALTER TABLE equipment ADD CONSTRAINT fk_equip_item FOREIGN KEY (maintainable_item_id) REFERENCES maintainable_items(id) ON DELETE SET NULL', 'SELECT "FK exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add indexes
SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
               WHERE table_schema = DATABASE() AND table_name = 'equipment' AND index_name = 'idx_equip_facility');
SET @sql = IF(@exists = 0, 'CREATE INDEX idx_equip_facility ON equipment(facility_id)', 'SELECT "Index exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
               WHERE table_schema = DATABASE() AND table_name = 'equipment' AND index_name = 'idx_equip_type');
SET @sql = IF(@exists = 0, 'CREATE INDEX idx_equip_type ON equipment(equipment_type_id)', 'SELECT "Index exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================
-- PART 4 — SAP-COMPATIBLE FAILURE CODING STRUCTURE
-- Catalogs A, B, C, and 5
-- =====================================================

-- Catalog A — Object Parts (Bauteil)
CREATE TABLE IF NOT EXISTS object_parts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_class_id INT NOT NULL,
    object_part_code VARCHAR(20) NOT NULL,
    object_part_name VARCHAR(255) NOT NULL,
    description TEXT,
    iso_reference VARCHAR(50),
    typical_location TEXT,
    inspection_points TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (equipment_class_id) REFERENCES equipment_classes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_part_per_class (equipment_class_id, object_part_code),
    INDEX idx_part_class (equipment_class_id),
    INDEX idx_part_code (object_part_code),
    INDEX idx_part_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='SAP Catalog A - Object Part/Component codes (Bauteil)';

-- Catalog B — Damage Codes (Schaden) - Failure Modes
CREATE TABLE IF NOT EXISTS damage_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_class_id INT NOT NULL,
    damage_code VARCHAR(20) NOT NULL,
    damage_name VARCHAR(255) NOT NULL,
    description TEXT,
    iso_failure_mode_reference VARCHAR(50),
    typical_symptoms TEXT,
    severity_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (equipment_class_id) REFERENCES equipment_classes(id) ON DELETE CASCADE,
    UNIQUE KEY unique_damage_per_class (equipment_class_id, damage_code),
    INDEX idx_damage_class (equipment_class_id),
    INDEX idx_damage_code (damage_code),
    INDEX idx_damage_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='SAP Catalog B - Damage codes/Failure modes (Schaden)';

-- Catalog C — Cause Codes (Ursache) - Root Causes
CREATE TABLE IF NOT EXISTS cause_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_class_id INT NULL,
    cause_code VARCHAR(20) NOT NULL,
    cause_name VARCHAR(255) NOT NULL,
    description TEXT,
    iso_failure_cause_reference VARCHAR(50),
    cause_category ENUM('design', 'manufacturing', 'operation', 'maintenance', 'human_error', 'environmental', 'material', 'unknown') DEFAULT 'unknown',
    is_preventable BOOLEAN DEFAULT TRUE,
    prevention_guidelines TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_cause_code (cause_code),
    INDEX idx_cause_class (equipment_class_id),
    INDEX idx_cause_code (cause_code),
    INDEX idx_cause_category (cause_category),
    INDEX idx_cause_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='SAP Catalog C - Cause codes/Root causes (Ursache)';

-- Catalog 5 — Activity Codes (Tätigkeit) - Maintenance Actions
CREATE TABLE IF NOT EXISTS activity_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activity_code VARCHAR(20) NOT NULL UNIQUE,
    activity_name VARCHAR(255) NOT NULL,
    description TEXT,
    iso_reference VARCHAR(50),
    activity_category ENUM('inspection', 'preventive', 'corrective', 'predictive', 'modification', 'overhaul') NOT NULL,
    typical_duration_minutes INT,
    required_skills TEXT,
    safety_precautions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_activity_code (activity_code),
    INDEX idx_activity_category (activity_category),
    INDEX idx_activity_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='SAP Catalog 5 - Activity codes/Maintenance actions (Tätigkeit)';

-- =====================================================
-- PART 5 — FINDINGS TABLE (ODM DEFECTS)
-- Structured findings with SAP notification traceability
-- =====================================================

CREATE TABLE IF NOT EXISTS findings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- Organization and location
    organization_id INT NOT NULL,
    facility_id INT NOT NULL,
    asset_id INT NOT NULL,
    -- Template reference (optional)
    task_template_id INT NULL,
    task_template_step_id INT NULL,
    -- SAP Catalog references
    object_part_id INT NULL,
    damage_code_id INT NULL,
    cause_code_id INT NULL,
    activity_code_id INT NULL,
    -- Finding details
    finding_description TEXT NOT NULL,
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    recommendation TEXT,
    -- SAP notification tracking
    requires_sap_notification BOOLEAN DEFAULT FALSE,
    sap_notification_no VARCHAR(20) NULL COMMENT 'SAP PM notification number for traceability',
    -- Reporting
    reported_by_user_id INT NOT NULL,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Foreign keys
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
    FOREIGN KEY (asset_id) REFERENCES equipment(id) ON DELETE CASCADE,
    FOREIGN KEY (task_template_id) REFERENCES task_templates(id) ON DELETE SET NULL,
    FOREIGN KEY (task_template_step_id) REFERENCES task_template_steps(id) ON DELETE SET NULL,
    FOREIGN KEY (object_part_id) REFERENCES object_parts(id) ON DELETE SET NULL,
    FOREIGN KEY (damage_code_id) REFERENCES damage_codes(id) ON DELETE SET NULL,
    FOREIGN KEY (cause_code_id) REFERENCES cause_codes(id) ON DELETE SET NULL,
    FOREIGN KEY (activity_code_id) REFERENCES activity_codes(id) ON DELETE SET NULL,
    FOREIGN KEY (reported_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    -- Indexes
    INDEX idx_finding_org (organization_id),
    INDEX idx_finding_facility (facility_id),
    INDEX idx_finding_asset (asset_id),
    INDEX idx_finding_reported (reported_at),
    INDEX idx_finding_severity (severity),
    INDEX idx_finding_sap (sap_notification_no),
    INDEX idx_finding_requires_sap (requires_sap_notification)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='ODM findings/defects with structured SAP catalog coding and notification traceability';

-- =====================================================
-- PART 6 — TASK TEMPLATE STRUCTURE VALIDATION
-- Ensure tables support inspection templates
-- =====================================================

-- Validate/create task_templates table
CREATE TABLE IF NOT EXISTS task_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NULL COMMENT 'NULL = global template, NOT NULL = org-specific',
    equipment_type_id INT NOT NULL,
    template_code VARCHAR(100),
    template_name VARCHAR(255) NOT NULL,
    maintenance_type VARCHAR(50) NOT NULL COMMENT 'inspection, preventive, corrective, predictive',
    task_scope VARCHAR(100) COMMENT 'mechanical, electrical, instrumentation, etc.',
    description TEXT,
    frequency_value INT NULL,
    frequency_unit VARCHAR(50) NULL COMMENT 'hours, days, weeks, months, years',
    estimated_duration_minutes INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (equipment_type_id) REFERENCES equipment_types(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_template_org (organization_id),
    INDEX idx_template_equip_type (equipment_type_id),
    INDEX idx_template_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Validate/create task_template_steps table
CREATE TABLE IF NOT EXISTS task_template_steps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_template_id INT NOT NULL,
    step_no INT NOT NULL,
    step_type ENUM('inspection', 'measurement', 'cleaning', 'lubrication', 'adjustment', 'tightening', 'testing', 'calibration', 'functional_check', 'safety_check') NOT NULL,
    instruction TEXT NOT NULL,
    data_type ENUM('text', 'number', 'boolean', 'dropdown', 'photo', 'signature') NOT NULL,
    expected_value TEXT NULL,
    min_value DECIMAL(12,4) NULL,
    max_value DECIMAL(12,4) NULL,
    unit VARCHAR(50) NULL,
    is_required BOOLEAN DEFAULT TRUE,
    options JSON NULL COMMENT 'For dropdown data type',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (task_template_id) REFERENCES task_templates(id) ON DELETE CASCADE,
    INDEX idx_step_template (task_template_id, step_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 7 — INSPECTION RESULTS STRUCTURE
-- Support multiple value types and catalog references
-- =====================================================

CREATE TABLE IF NOT EXISTS inspection_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_id INT NOT NULL,
    facility_id INT NOT NULL,
    asset_id INT NOT NULL,
    task_template_id INT NOT NULL,
    task_template_step_id INT NOT NULL,
    -- Recorded values (multiple types for flexibility)
    recorded_value_text TEXT NULL,
    recorded_value_number DECIMAL(12,4) NULL,
    recorded_value_boolean BOOLEAN NULL,
    recorded_value_json JSON NULL,
    unit VARCHAR(50) NULL,
    remarks TEXT NULL,
    photo_url VARCHAR(500) NULL,
    -- Who and when
    recorded_by_user_id INT NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Foreign keys
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE,
    FOREIGN KEY (asset_id) REFERENCES equipment(id) ON DELETE CASCADE,
    FOREIGN KEY (task_template_id) REFERENCES task_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (task_template_step_id) REFERENCES task_template_steps(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by_user_id) REFERENCES users(id) ON DELETE CASCADE,
    -- Indexes
    INDEX idx_result_org (organization_id),
    INDEX idx_result_facility (facility_id),
    INDEX idx_result_asset (asset_id),
    INDEX idx_result_template (task_template_id),
    INDEX idx_result_recorded (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 8 — VIEWS FOR REPORTING
-- =====================================================

-- Complete equipment hierarchy view
CREATE OR REPLACE VIEW v_equipment_hierarchy AS
SELECT 
    ec.id AS category_id,
    ec.category_code,
    ec.category_name,
    ecl.id AS class_id,
    ecl.class_code,
    ecl.class_name,
    et.id AS type_id,
    et.type_code,
    et.type_name,
    su.id AS subunit_id,
    su.subunit_code,
    su.subunit_name,
    mi.id AS item_id,
    mi.item_code,
    mi.item_name,
    CONCAT(ec.category_name, ' > ', ecl.class_name, ' > ', et.type_name) AS hierarchy_path
FROM equipment_categories ec
LEFT JOIN equipment_classes ecl ON ec.id = ecl.category_id
LEFT JOIN equipment_types et ON ecl.id = et.class_id
LEFT JOIN subunits su ON et.id = su.equipment_type_id
LEFT JOIN maintainable_items mi ON su.id = mi.subunit_id;

-- Findings with catalog descriptions
CREATE OR REPLACE VIEW v_findings_full AS
SELECT 
    f.*,
    fac.name AS facility_name,
    fac.sap_reference_code AS facility_sap_ref,
    eq.name AS asset_name,
    eq.code AS asset_code,
    eq.sap_equipment_reference AS asset_sap_ref,
    eq.sap_floc_hint,
    et.type_name,
    op.object_part_name,
    dc.damage_name,
    cc.cause_name,
    ac.activity_name,
    u.full_name AS reported_by_name
FROM findings f
LEFT JOIN facilities fac ON f.facility_id = fac.id
LEFT JOIN equipment eq ON f.asset_id = eq.id
LEFT JOIN equipment_types et ON eq.equipment_type_id = et.id
LEFT JOIN object_parts op ON f.object_part_id = op.id
LEFT JOIN damage_codes dc ON f.damage_code_id = dc.id
LEFT JOIN cause_codes cc ON f.cause_code_id = cc.id
LEFT JOIN activity_codes ac ON f.activity_code_id = ac.id
LEFT JOIN users u ON f.reported_by_user_id = u.id;

-- Assets with full ISO classification
CREATE OR REPLACE VIEW v_assets_full AS
SELECT 
    e.*,
    f.name AS facility_name,
    f.facility_type,
    f.sap_reference_code AS facility_sap_ref,
    ec.category_name,
    ecl.class_name,
    et.type_name,
    su.subunit_name,
    mi.item_name,
    CONCAT(ec.category_name, ' > ', ecl.class_name, ' > ', et.type_name) AS iso_classification
FROM equipment e
LEFT JOIN facilities f ON e.facility_id = f.id
LEFT JOIN equipment_categories ec ON e.equipment_category_id = ec.id
LEFT JOIN equipment_classes ecl ON e.equipment_class_id = ecl.id
LEFT JOIN equipment_types et ON e.equipment_type_id = et.id
LEFT JOIN subunits su ON e.subunit_id = su.id
LEFT JOIN maintainable_items mi ON e.maintainable_item_id = mi.id;

-- =====================================================
-- PART 9 — SEED STANDARD DATA
-- =====================================================

-- Seed Activity Codes (Catalog 5)
INSERT INTO activity_codes (activity_code, activity_name, description, activity_category, typical_duration_minutes) VALUES
('INSPECT', 'Inspect', 'Visual and functional inspection', 'inspection', 15),
('MEASURE', 'Measure', 'Take readings and measurements', 'inspection', 20),
('TEST', 'Test', 'Functional testing', 'inspection', 30),
('CHECK', 'Check', 'Condition verification', 'inspection', 10),
('LUBRICATE', 'Lubricate', 'Apply lubrication', 'preventive', 25),
('CLEAN', 'Clean', 'Remove dirt and debris', 'preventive', 30),
('TIGHTEN', 'Tighten', 'Tighten fasteners', 'preventive', 15),
('ADJUST', 'Adjust', 'Adjust settings/clearances', 'preventive', 30),
('ALIGN', 'Align', 'Shaft/component alignment', 'preventive', 60),
('CALIBRATE', 'Calibrate', 'Instrument calibration', 'preventive', 45),
('REPLACE', 'Replace', 'Replace component/part', 'corrective', 60),
('REPAIR', 'Repair', 'Repair damaged component', 'corrective', 90),
('OVERHAUL', 'Overhaul', 'Complete rebuild', 'corrective', 240)
ON DUPLICATE KEY UPDATE 
    activity_name = VALUES(activity_name),
    description = VALUES(description);

-- Seed Cause Codes (Catalog C)
INSERT INTO cause_codes (cause_code, cause_name, description, cause_category, is_preventable) VALUES
('AGE', 'Aging', 'Normal aging and wear', 'material', FALSE),
('CORR', 'Corrosion', 'Chemical deterioration', 'material', TRUE),
('WEAR', 'Wear', 'Mechanical wear', 'material', TRUE),
('FATIGUE', 'Fatigue', 'Material fatigue', 'material', TRUE),
('OVERLOAD', 'Overload', 'Beyond design capacity', 'operation', TRUE),
('MISALIGN', 'Misalignment', 'Incorrect alignment', 'maintenance', TRUE),
('LUB_FAIL', 'Lubrication Failure', 'Inadequate lubrication', 'maintenance', TRUE),
('CONTAM', 'Contamination', 'Foreign material', 'environmental', TRUE),
('INSTALL', 'Installation Error', 'Incorrect installation', 'human_error', TRUE),
('DESIGN', 'Design Deficiency', 'Inherent design issue', 'design', FALSE)
ON DUPLICATE KEY UPDATE 
    cause_name = VALUES(cause_name),
    description = VALUES(description);

-- Migration complete
SELECT 'ISO 14224 + SAP S/4HANA PM EAM structure migration completed successfully' AS status;
