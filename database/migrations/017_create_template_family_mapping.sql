-- =====================================================
-- Migration: Create Template Family Mapping Tables
-- Step 3 Patch: Explicit deterministic equipment type to family mapping
-- =====================================================

-- =====================================================
-- PART 1: Template Families Master Table
-- Canonical family model with 13 families
-- =====================================================

CREATE TABLE IF NOT EXISTS template_families (
    id INT AUTO_INCREMENT PRIMARY KEY,
    family_code VARCHAR(50) UNIQUE NOT NULL,
    family_name VARCHAR(100) NOT NULL,
    description TEXT,
    applicable_industries JSON, -- Array of industry codes
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_family_code (family_code),
    INDEX idx_family_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 2: Equipment Type to Family Mapping
-- Explicit deterministic mapping (no runtime keyword matching)
-- =====================================================

CREATE TABLE IF NOT EXISTS equipment_type_family_mappings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_type_id INT NOT NULL,
    family_code VARCHAR(50) NOT NULL,
    mapping_source VARCHAR(50) DEFAULT 'seed', -- 'seed', 'manual', 'import'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_equip_family (equipment_type_id),
    FOREIGN KEY (equipment_type_id) REFERENCES equipment_types(id) ON DELETE CASCADE,
    FOREIGN KEY (family_code) REFERENCES template_families(family_code) ON DELETE CASCADE,
    INDEX idx_equip_type (equipment_type_id),
    INDEX idx_family_code (family_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 3: Template Family Rules
-- Task kinds and frequencies per family
-- =====================================================

CREATE TABLE IF NOT EXISTS template_family_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    family_code VARCHAR(50) NOT NULL,
    task_kind VARCHAR(50) NOT NULL,
    frequency_value INT NOT NULL,
    frequency_unit VARCHAR(50) NOT NULL, -- days, weeks, months, years
    estimated_duration_minutes INT NOT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (family_code) REFERENCES template_families(family_code) ON DELETE CASCADE,
    UNIQUE KEY unique_family_task (family_code, task_kind),
    INDEX idx_family (family_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 4: Seed Batch Tracking
-- For safe rollback of specific seed batches
-- =====================================================

CREATE TABLE IF NOT EXISTS seed_batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id VARCHAR(100) UNIQUE NOT NULL,
    batch_name VARCHAR(255) NOT NULL,
    batch_version VARCHAR(20) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'task_template', 'equipment_mapping', etc.
    entity_count INT DEFAULT 0,
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    INDEX idx_batch_id (batch_id),
    INDEX idx_entity_type (entity_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 5: Entity to Seed Batch Link
-- Tracks which entities were created by which seed batch
-- =====================================================

CREATE TABLE IF NOT EXISTS seed_batch_entities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    batch_id VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_batch_entity (batch_id, entity_type, entity_id),
    FOREIGN KEY (batch_id) REFERENCES seed_batches(batch_id) ON DELETE CASCADE,
    INDEX idx_batch (batch_id),
    INDEX idx_entity (entity_type, entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 6: Add seed_batch_id to task_templates
-- For rollback identification
-- =====================================================

SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_templates' 
               AND column_name = 'seed_batch_id');

SET @sql = IF(@exists = 0, 
    'ALTER TABLE task_templates ADD COLUMN seed_batch_id VARCHAR(100) NULL AFTER parent_template_id',
    'SELECT "Column seed_batch_id already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key for seed_batch_id
SET @exists = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_templates' 
               AND constraint_name = 'fk_task_template_seed_batch');

SET @sql = IF(@exists = 0,
    'ALTER TABLE task_templates ADD CONSTRAINT fk_task_template_seed_batch FOREIGN KEY (seed_batch_id) REFERENCES seed_batches(batch_id) ON DELETE SET NULL',
    'SELECT "Foreign key already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for seed_batch_id
SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'task_templates' 
               AND index_name = 'idx_template_seed_batch');
SET @sql = IF(@exists = 0,
    'CREATE INDEX idx_template_seed_batch ON task_templates(seed_batch_id)',
    'SELECT "Index already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- PART 7: Insert Canonical Template Families
-- 13 families as specified
-- =====================================================

INSERT INTO template_families (family_code, family_name, description, applicable_industries) VALUES
('PUMP_FAMILY', 'Pump Family', 'Centrifugal pumps, positive displacement pumps, and pumping systems', '["WATER_WASTEWATER_UTILITIES", "OIL_GAS", "POWER_UTILITIES", "MANUFACTURING"]'),
('AIR_SYSTEM_FAMILY', 'Air System Family', 'Compressors, blowers, fans, and pneumatic systems', '["WATER_WASTEWATER_UTILITIES", "BUILDINGS_FACILITIES", "MANUFACTURING", "OIL_GAS"]'),
('MIXER_FAMILY', 'Mixer Family', 'Agitators, mixers, blenders, and stirring equipment', '["WATER_WASTEWATER_UTILITIES", "MANUFACTURING", "OIL_GAS"]'),
('VALVE_FAMILY', 'Valve Family', 'Control valves, isolation valves, relief valves, and valve assemblies', '["OIL_GAS", "WATER_WASTEWATER_UTILITIES", "POWER_UTILITIES", "MANUFACTURING"]'),
('PIPELINE_FAMILY', 'Pipeline Family', 'Pipelines, piping systems, and distribution networks', '["OIL_GAS", "WATER_WASTEWATER_UTILITIES", "POWER_UTILITIES"]'),
('PIPING_COMPONENT_FAMILY', 'Piping Component Family', 'Fittings, flanges, expansion joints, and piping accessories', '["OIL_GAS", "WATER_WASTEWATER_UTILITIES", "POWER_UTILITIES", "MANUFACTURING"]'),
('STATIC_CONTAINMENT_FAMILY', 'Static Containment Family', 'Tanks, vessels, silos, bins, and storage containers', '["OIL_GAS", "WATER_WASTEWATER_UTILITIES", "MANUFACTURING"]'),
('TREATMENT_UNIT_FAMILY', 'Treatment Unit Family', 'Filters, clarifiers, separators, scrubbers, and treatment equipment', '["WATER_WASTEWATER_UTILITIES", "OIL_GAS", "MANUFACTURING"]'),
('INSTRUMENT_FAMILY', 'Instrument Family', 'Process instruments, analyzers, transmitters, and sensors', '["ALL"]'),
('ELECTRICAL_FAMILY', 'Electrical Family', 'Motors, transformers, switchgear, UPS, and electrical distribution', '["ALL"]'),
('STRUCTURE_FAMILY', 'Structure Family', 'Buildings, foundations, supports, and civil structures', '["BUILDINGS_FACILITIES", "MANUFACTURING", "POWER_UTILITIES"]'),
('SAFETY_EQUIPMENT_FAMILY', 'Safety Equipment Family', 'Fire protection, gas detection, safety systems, and emergency equipment', '["ALL"]'),
('MECHANICAL_HANDLING_FAMILY', 'Mechanical Handling Family', 'Conveyors, elevators, cranes, and material handling equipment', '["MANUFACTURING", "OIL_GAS", "BUILDINGS_FACILITIES"]')
ON DUPLICATE KEY UPDATE 
    family_name = VALUES(family_name),
    description = VALUES(description),
    applicable_industries = VALUES(applicable_industries),
    is_active = TRUE;

-- =====================================================
-- PART 8: Insert Template Family Rules
-- Define task kinds and frequencies for each family
-- =====================================================

INSERT INTO template_family_rules (family_code, task_kind, frequency_value, frequency_unit, estimated_duration_minutes, sort_order) VALUES
-- PUMP_FAMILY
('PUMP_FAMILY', 'inspection', 1, 'weeks', 20, 1),
('PUMP_FAMILY', 'measurement', 1, 'months', 30, 2),
('PUMP_FAMILY', 'lubrication', 3, 'months', 45, 3),
('PUMP_FAMILY', 'safety_check', 1, 'months', 15, 4),
('PUMP_FAMILY', 'testing', 6, 'months', 60, 5),

-- AIR_SYSTEM_FAMILY
('AIR_SYSTEM_FAMILY', 'inspection', 1, 'weeks', 15, 1),
('AIR_SYSTEM_FAMILY', 'measurement', 1, 'months', 25, 2),
('AIR_SYSTEM_FAMILY', 'cleaning', 3, 'months', 60, 3),
('AIR_SYSTEM_FAMILY', 'lubrication', 3, 'months', 40, 4),
('AIR_SYSTEM_FAMILY', 'safety_check', 1, 'months', 15, 5),

-- MIXER_FAMILY
('MIXER_FAMILY', 'inspection', 1, 'weeks', 20, 1),
('MIXER_FAMILY', 'measurement', 1, 'months', 30, 2),
('MIXER_FAMILY', 'lubrication', 3, 'months', 45, 3),
('MIXER_FAMILY', 'adjustment', 6, 'months', 60, 4),
('MIXER_FAMILY', 'safety_check', 1, 'months', 15, 5),

-- VALVE_FAMILY
('VALVE_FAMILY', 'inspection', 1, 'months', 15, 1),
('VALVE_FAMILY', 'measurement', 3, 'months', 25, 2),
('VALVE_FAMILY', 'adjustment', 6, 'months', 45, 3),
('VALVE_FAMILY', 'safety_check', 1, 'months', 10, 4),
('VALVE_FAMILY', 'testing', 12, 'months', 30, 5),

-- PIPELINE_FAMILY
('PIPELINE_FAMILY', 'inspection', 1, 'months', 30, 1),
('PIPELINE_FAMILY', 'measurement', 3, 'months', 45, 2),
('PIPELINE_FAMILY', 'safety_check', 1, 'months', 15, 3),

-- PIPING_COMPONENT_FAMILY
('PIPING_COMPONENT_FAMILY', 'inspection', 3, 'months', 20, 1),
('PIPING_COMPONENT_FAMILY', 'measurement', 6, 'months', 30, 2),
('PIPING_COMPONENT_FAMILY', 'tightening', 12, 'months', 45, 3),
('PIPING_COMPONENT_FAMILY', 'safety_check', 1, 'months', 10, 4),

-- STATIC_CONTAINMENT_FAMILY
('STATIC_CONTAINMENT_FAMILY', 'inspection', 1, 'weeks', 20, 1),
('STATIC_CONTAINMENT_FAMILY', 'measurement', 1, 'months', 30, 2),
('STATIC_CONTAINMENT_FAMILY', 'cleaning', 6, 'months', 120, 3),
('STATIC_CONTAINMENT_FAMILY', 'safety_check', 1, 'months', 15, 4),

-- TREATMENT_UNIT_FAMILY
('TREATMENT_UNIT_FAMILY', 'inspection', 1, 'weeks', 25, 1),
('TREATMENT_UNIT_FAMILY', 'measurement', 1, 'months', 35, 2),
('TREATMENT_UNIT_FAMILY', 'cleaning', 3, 'months', 90, 3),
('TREATMENT_UNIT_FAMILY', 'safety_check', 1, 'months', 20, 4),
('TREATMENT_UNIT_FAMILY', 'testing', 6, 'months', 60, 5),

-- INSTRUMENT_FAMILY
('INSTRUMENT_FAMILY', 'inspection', 1, 'months', 15, 1),
('INSTRUMENT_FAMILY', 'measurement', 1, 'months', 20, 2),
('INSTRUMENT_FAMILY', 'cleaning', 3, 'months', 20, 3),
('INSTRUMENT_FAMILY', 'calibration', 6, 'months', 60, 4),
('INSTRUMENT_FAMILY', 'safety_check', 1, 'months', 10, 5),

-- ELECTRICAL_FAMILY
('ELECTRICAL_FAMILY', 'inspection', 1, 'months', 20, 1),
('ELECTRICAL_FAMILY', 'measurement', 3, 'months', 30, 2),
('ELECTRICAL_FAMILY', 'cleaning', 6, 'months', 45, 3),
('ELECTRICAL_FAMILY', 'testing', 12, 'months', 60, 4),
('ELECTRICAL_FAMILY', 'safety_check', 1, 'months', 15, 5),

-- STRUCTURE_FAMILY
('STRUCTURE_FAMILY', 'inspection', 3, 'months', 30, 1),
('STRUCTURE_FAMILY', 'measurement', 6, 'months', 45, 2),
('STRUCTURE_FAMILY', 'safety_check', 1, 'months', 15, 3),

-- SAFETY_EQUIPMENT_FAMILY
('SAFETY_EQUIPMENT_FAMILY', 'inspection', 1, 'weeks', 10, 1),
('SAFETY_EQUIPMENT_FAMILY', 'cleaning', 1, 'months', 15, 2),
('SAFETY_EQUIPMENT_FAMILY', 'testing', 3, 'months', 30, 3),
('SAFETY_EQUIPMENT_FAMILY', 'safety_check', 1, 'months', 10, 4),

-- MECHANICAL_HANDLING_FAMILY
('MECHANICAL_HANDLING_FAMILY', 'inspection', 1, 'weeks', 20, 1),
('MECHANICAL_HANDLING_FAMILY', 'measurement', 1, 'months', 30, 2),
('MECHANICAL_HANDLING_FAMILY', 'lubrication', 1, 'months', 45, 3),
('MECHANICAL_HANDLING_FAMILY', 'adjustment', 6, 'months', 60, 4),
('MECHANICAL_HANDLING_FAMILY', 'safety_check', 1, 'months', 15, 5)
ON DUPLICATE KEY UPDATE 
    frequency_value = VALUES(frequency_value),
    frequency_unit = VALUES(frequency_unit),
    estimated_duration_minutes = VALUES(estimated_duration_minutes),
    is_active = TRUE;

-- Migration complete
SELECT 'Template family mapping tables created successfully' AS status;
SELECT 'Canonical 13 families inserted' AS families;
SELECT 'Family rules inserted' AS rules;
