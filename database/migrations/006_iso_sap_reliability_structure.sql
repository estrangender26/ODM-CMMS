-- =====================================================
-- ISO 14224 + SAP S/4HANA PM Catalog Structure Migration
-- =====================================================

-- =====================================================
-- PART 1 — EXTEND ISO EQUIPMENT HIERARCHY
-- =====================================================

CREATE TABLE IF NOT EXISTS equipment_subunits (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS maintainable_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    subunit_id INT NOT NULL,
    item_code VARCHAR(50) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    description TEXT,
    typical_components TEXT,
    spare_part_reference VARCHAR(100),
    criticality VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subunit_id) REFERENCES equipment_subunits(id) ON DELETE CASCADE,
    UNIQUE KEY unique_item_per_subunit (subunit_id, item_code),
    INDEX idx_item_subunit (subunit_id),
    INDEX idx_item_code (item_code),
    INDEX idx_item_criticality (criticality)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 2 — SAP S/4HANA PM CATALOG STRUCTURE
-- =====================================================

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
    INDEX idx_damage_iso_ref (iso_failure_mode_reference),
    INDEX idx_damage_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
    INDEX idx_cause_iso_ref (iso_failure_cause_reference),
    INDEX idx_cause_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    activity_code VARCHAR(20) NOT NULL UNIQUE,
    activity_name VARCHAR(255) NOT NULL,
    description TEXT,
    iso_maintenance_reference VARCHAR(50),
    activity_category ENUM('inspection', 'preventive', 'corrective', 'predictive', 'modification', 'overhaul') NOT NULL,
    typical_duration_minutes INT,
    required_skills TEXT,
    safety_precautions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_activity_code (activity_code),
    INDEX idx_activity_category (activity_category),
    INDEX idx_activity_iso_ref (iso_maintenance_reference),
    INDEX idx_activity_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 3 — LINK FAILURE DATA TO WORK ORDERS
-- =====================================================

CREATE TABLE IF NOT EXISTS work_order_failures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    work_order_id INT NOT NULL,
    asset_id INT NOT NULL,
    organization_id INT NOT NULL,
    equipment_type_id INT,
    subunit_id INT,
    maintainable_item_id INT,
    object_part_id INT,
    damage_code_id INT,
    cause_code_id INT,
    activity_code_id INT,
    failure_description TEXT,
    failure_mode_text VARCHAR(255),
    cause_description TEXT,
    action_taken TEXT,
    detected_by_user_id INT,
    detected_at TIMESTAMP NULL,
    detection_method ENUM('inspection', 'monitoring', 'operator_report', 'breakdown', 'predictive') DEFAULT 'operator_report',
    severity_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    safety_impact BOOLEAN DEFAULT FALSE,
    environmental_impact BOOLEAN DEFAULT FALSE,
    production_impact_hours DECIMAL(8,2),
    failure_start_at TIMESTAMP NULL,
    failure_end_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (asset_id) REFERENCES equipment(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    FOREIGN KEY (equipment_type_id) REFERENCES equipment_types(id) ON DELETE SET NULL,
    FOREIGN KEY (subunit_id) REFERENCES equipment_subunits(id) ON DELETE SET NULL,
    FOREIGN KEY (maintainable_item_id) REFERENCES maintainable_items(id) ON DELETE SET NULL,
    FOREIGN KEY (object_part_id) REFERENCES object_parts(id) ON DELETE SET NULL,
    FOREIGN KEY (damage_code_id) REFERENCES damage_codes(id) ON DELETE SET NULL,
    FOREIGN KEY (cause_code_id) REFERENCES cause_codes(id) ON DELETE SET NULL,
    FOREIGN KEY (activity_code_id) REFERENCES activity_codes(id) ON DELETE SET NULL,
    FOREIGN KEY (detected_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_failure_wo (work_order_id),
    INDEX idx_failure_asset (asset_id),
    INDEX idx_failure_org (organization_id),
    INDEX idx_failure_equip_type (equipment_type_id),
    INDEX idx_failure_detected (detected_at),
    INDEX idx_failure_severity (severity_level),
    INDEX idx_failure_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 4 — EXTEND TASK TEMPLATE STRUCTURE
-- =====================================================

-- Add columns to task_templates
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_templates' 
               AND column_name = 'activity_code_id');

SET @sql = IF(@exists = 0, 
    'ALTER TABLE task_templates ADD COLUMN activity_code_id INT NULL AFTER equipment_type_id',
    'SELECT "Column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Try to add foreign key (may fail if already exists)
SET @exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_templates' 
               AND constraint_name = 'fk_task_template_activity');

SET @sql = IF(@exists = 0,
    'ALTER TABLE task_templates ADD CONSTRAINT fk_task_template_activity FOREIGN KEY (activity_code_id) REFERENCES activity_codes(id) ON DELETE SET NULL',
    'SELECT "Foreign key already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_templates' 
               AND index_name = 'idx_task_template_activity');
SET @sql = IF(@exists = 0,
    'CREATE INDEX idx_task_template_activity ON task_templates(activity_code_id)',
    'SELECT "Index already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add columns to task_template_steps
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_template_steps' 
               AND column_name = 'activity_code_id');

SET @sql = IF(@exists = 0, 
    'ALTER TABLE task_template_steps ADD COLUMN activity_code_id INT NULL AFTER step_type',
    'SELECT "Column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_template_steps' 
               AND constraint_name = 'fk_step_activity');

SET @sql = IF(@exists = 0,
    'ALTER TABLE task_template_steps ADD CONSTRAINT fk_step_activity FOREIGN KEY (activity_code_id) REFERENCES activity_codes(id) ON DELETE SET NULL',
    'SELECT "Foreign key already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_template_steps' 
               AND index_name = 'idx_step_activity');
SET @sql = IF(@exists = 0,
    'CREATE INDEX idx_step_activity ON task_template_steps(activity_code_id)',
    'SELECT "Index already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- PART 5 — EXTEND INSPECTION RESULTS
-- =====================================================

SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() 
               AND table_name = 'inspection_readings' 
               AND column_name = 'object_part_id');
SET @sql = IF(@exists = 0, 
    'ALTER TABLE inspection_readings ADD COLUMN object_part_id INT NULL AFTER reading_value',
    'SELECT "Column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() 
               AND table_name = 'inspection_readings' 
               AND column_name = 'damage_code_id');
SET @sql = IF(@exists = 0, 
    'ALTER TABLE inspection_readings ADD COLUMN damage_code_id INT NULL AFTER object_part_id',
    'SELECT "Column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() 
               AND table_name = 'inspection_readings' 
               AND column_name = 'cause_code_id');
SET @sql = IF(@exists = 0, 
    'ALTER TABLE inspection_readings ADD COLUMN cause_code_id INT NULL AFTER damage_code_id',
    'SELECT "Column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() 
               AND table_name = 'inspection_readings' 
               AND column_name = 'reading_json');
SET @sql = IF(@exists = 0, 
    'ALTER TABLE inspection_readings ADD COLUMN reading_json JSON NULL AFTER reading_value',
    'SELECT "Column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign keys for inspection catalog references
SET @exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'inspection_readings' 
               AND constraint_name = 'fk_inspection_object_part');
SET @sql = IF(@exists = 0,
    'ALTER TABLE inspection_readings ADD CONSTRAINT fk_inspection_object_part FOREIGN KEY (object_part_id) REFERENCES object_parts(id) ON DELETE SET NULL',
    'SELECT "FK already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'inspection_readings' 
               AND constraint_name = 'fk_inspection_damage');
SET @sql = IF(@exists = 0,
    'ALTER TABLE inspection_readings ADD CONSTRAINT fk_inspection_damage FOREIGN KEY (damage_code_id) REFERENCES damage_codes(id) ON DELETE SET NULL',
    'SELECT "FK already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'inspection_readings' 
               AND constraint_name = 'fk_inspection_cause');
SET @sql = IF(@exists = 0,
    'ALTER TABLE inspection_readings ADD CONSTRAINT fk_inspection_cause FOREIGN KEY (cause_code_id) REFERENCES cause_codes(id) ON DELETE SET NULL',
    'SELECT "FK already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create indexes for inspection readings
SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'inspection_readings' 
               AND index_name = 'idx_inspection_object_part');
SET @sql = IF(@exists = 0,
    'CREATE INDEX idx_inspection_object_part ON inspection_readings(object_part_id)',
    'SELECT "Index already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'inspection_readings' 
               AND index_name = 'idx_inspection_damage');
SET @sql = IF(@exists = 0,
    'CREATE INDEX idx_inspection_damage ON inspection_readings(damage_code_id)',
    'SELECT "Index already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'inspection_readings' 
               AND index_name = 'idx_inspection_cause');
SET @sql = IF(@exists = 0,
    'CREATE INDEX idx_inspection_cause ON inspection_readings(cause_code_id)',
    'SELECT "Index already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- PART 6 — CREATE VIEWS FOR REPORTING
-- =====================================================

CREATE OR REPLACE VIEW v_equipment_hierarchy_full AS
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
    es.id AS subunit_id,
    es.subunit_code,
    es.subunit_name,
    mi.id AS item_id,
    mi.item_code,
    mi.item_name
FROM equipment_categories ec
LEFT JOIN equipment_classes ecl ON ec.id = ecl.category_id
LEFT JOIN equipment_types et ON ecl.id = et.class_id
LEFT JOIN equipment_subunits es ON et.id = es.equipment_type_id
LEFT JOIN maintainable_items mi ON es.id = mi.subunit_id;

CREATE OR REPLACE VIEW v_work_order_failures_full AS
SELECT 
    wof.*,
    eq.name AS asset_name,
    eq.code AS asset_code,
    et.type_name,
    es.subunit_name,
    mi.item_name,
    op.object_part_name,
    dc.damage_name,
    cc.cause_name,
    ac.activity_name,
    u.full_name AS detected_by_name
FROM work_order_failures wof
LEFT JOIN equipment eq ON wof.asset_id = eq.id
LEFT JOIN equipment_types et ON wof.equipment_type_id = et.id
LEFT JOIN equipment_subunits es ON wof.subunit_id = es.id
LEFT JOIN maintainable_items mi ON wof.maintainable_item_id = mi.id
LEFT JOIN object_parts op ON wof.object_part_id = op.id
LEFT JOIN damage_codes dc ON wof.damage_code_id = dc.id
LEFT JOIN cause_codes cc ON wof.cause_code_id = cc.id
LEFT JOIN activity_codes ac ON wof.activity_code_id = ac.id
LEFT JOIN users u ON wof.detected_by_user_id = u.id;

CREATE OR REPLACE VIEW v_reliability_kpis AS
SELECT 
    et.id AS equipment_type_id,
    et.type_name,
    ec.class_name,
    ecat.category_name,
    COUNT(DISTINCT wof.id) AS failure_count,
    COUNT(DISTINCT wof.asset_id) AS affected_assets,
    SUM(wof.production_impact_hours) AS total_downtime_hours,
    AVG(CASE WHEN wof.severity_level = 'critical' THEN 1 ELSE 0 END) AS critical_failure_rate,
    GROUP_CONCAT(DISTINCT dc.damage_name) AS common_failure_modes
FROM equipment_types et
JOIN equipment_classes ec ON et.class_id = ec.id
JOIN equipment_categories ecat ON ec.category_id = ecat.id
LEFT JOIN work_order_failures wof ON et.id = wof.equipment_type_id
LEFT JOIN damage_codes dc ON wof.damage_code_id = dc.id
WHERE wof.created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
GROUP BY et.id, et.type_name, ec.class_name, ecat.category_name;

-- =====================================================
-- PART 7 — SEED SAP CATALOG DATA
-- =====================================================

INSERT INTO activity_codes (activity_code, activity_name, description, activity_category, iso_maintenance_reference, typical_duration_minutes) VALUES
('INSPECT', 'Inspect', 'Visual and functional inspection', 'inspection', 'ISO14224-I', 15),
('MEASURE', 'Measure', 'Take readings and measurements', 'inspection', 'ISO14224-I', 20),
('TEST', 'Test', 'Functional testing and verification', 'inspection', 'ISO14224-I', 30),
('CHECK', 'Check', 'Condition checking and verification', 'inspection', 'ISO14224-I', 10),
('LUBRICATE', 'Lubricate', 'Apply lubrication to moving parts', 'preventive', 'ISO14224-PM', 25),
('CLEAN', 'Clean', 'Remove dirt, debris, and contaminants', 'preventive', 'ISO14224-PM', 30),
('TIGHTEN', 'Tighten', 'Tighten bolts, nuts, and fasteners', 'preventive', 'ISO14224-PM', 15),
('ADJUST', 'Adjust', 'Adjust settings, alignment, or clearances', 'preventive', 'ISO14224-PM', 30),
('ALIGN', 'Align', 'Alignment of shafts, couplings, or components', 'preventive', 'ISO14224-PM', 60),
('CALIBRATE', 'Calibrate', 'Calibration of instruments and sensors', 'preventive', 'ISO14224-PM', 45),
('FLUSH', 'Flush', 'Flush system or components', 'preventive', 'ISO14224-PM', 40),
('REPLACE', 'Replace', 'Replace faulty component or part', 'corrective', 'ISO14224-CM', 60),
('REPAIR', 'Repair', 'Repair damaged or worn component', 'corrective', 'ISO14224-CM', 90),
('OVERHAUL', 'Overhaul', 'Complete disassembly and rebuild', 'corrective', 'ISO14224-CM', 240),
('REWIND', 'Rewind', 'Rewind motor or generator coils', 'corrective', 'ISO14224-CM', 180),
('ANALYZE', 'Analyze', 'Condition analysis and trending', 'predictive', 'ISO14224-PdM', 30),
('MONITOR', 'Monitor', 'Continuous condition monitoring', 'predictive', 'ISO14224-PdM', 15),
('MODIFY', 'Modify', 'Design modification or upgrade', 'modification', 'ISO14224-MOD', 120),
('UPGRADE', 'Upgrade', 'Component or system upgrade', 'modification', 'ISO14224-MOD', 180)
ON DUPLICATE KEY UPDATE 
    activity_name = VALUES(activity_name),
    description = VALUES(description),
    activity_category = VALUES(activity_category);

INSERT INTO cause_codes (cause_code, cause_name, description, cause_category, iso_failure_cause_reference, is_preventable, prevention_guidelines) VALUES
('AGE', 'Aging', 'Normal aging and wear over time', 'material', 'ISO14224-T6', FALSE, 'Scheduled replacement based on life expectancy'),
('CORR', 'Corrosion', 'Chemical or electrochemical deterioration', 'material', 'ISO14224-T6', TRUE, 'Corrosion protection, material selection'),
('WEAR', 'Wear', 'Mechanical wear from friction or abrasion', 'material', 'ISO14224-T6', TRUE, 'Lubrication, preventive maintenance'),
('FATIGUE', 'Fatigue', 'Material fatigue from cyclic loading', 'material', 'ISO14224-T6', TRUE, 'Load management, inspection intervals'),
('OVERLOAD', 'Overload', 'Operation beyond design capacity', 'operation', 'ISO14224-T2', TRUE, 'Operator training, capacity monitoring'),
('MISUSE', 'Misuse', 'Improper operation or handling', 'operation', 'ISO14224-T2', TRUE, 'Training, procedures, supervision'),
('LUB_FAIL', 'Lubrication Failure', 'Inadequate or failed lubrication', 'maintenance', 'ISO14224-T5', TRUE, 'PM schedule, lubrication analysis'),
('PM_MISS', 'Missed Maintenance', 'Preventive maintenance not performed', 'maintenance', 'ISO14224-T5', TRUE, 'Schedule compliance, tracking'),
('INSTALL', 'Installation Error', 'Incorrect installation or assembly', 'human_error', 'ISO14224-T4', TRUE, 'Procedures, training, QA checks'),
('DESIGN', 'Design Deficiency', 'Inherent design weakness', 'design', 'ISO14224-T1', FALSE, 'Design review, modification'),
('DEFECT', 'Manufacturing Defect', 'Factory defect or poor quality', 'manufacturing', 'ISO14224-T3', FALSE, 'Quality control, supplier management'),
('CONTAM', 'Contamination', 'Foreign material or fluid contamination', 'environmental', 'ISO14224-T7', TRUE, 'Sealing, filtration, cleaning'),
('TEMP_HI', 'High Temperature', 'Excessive operating temperature', 'operation', 'ISO14224-T2', TRUE, 'Cooling, ventilation, monitoring'),
('VIB_EXC', 'Excessive Vibration', 'Vibration beyond acceptable limits', 'operation', 'ISO14224-T2', TRUE, 'Balancing, alignment, damping'),
('HUM_ERR', 'Human Error', 'Mistake by operator or maintainer', 'human_error', 'ISO14224-T4', TRUE, 'Training, procedures, automation')
ON DUPLICATE KEY UPDATE 
    cause_name = VALUES(cause_name),
    description = VALUES(description),
    cause_category = VALUES(cause_category);

SELECT 'ISO 14224 + SAP S/4HANA PM Catalog migration completed successfully' AS status;
