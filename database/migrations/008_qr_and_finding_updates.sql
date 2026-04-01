-- =====================================================
-- QR Code Support and Finding Updates Migration
-- ODM-CMMS Multi-Tenant CMMS
--
-- Adds:
-- - QR token columns to equipment table
-- - Status column to findings table (if missing)
-- - Additional indexes for performance
-- =====================================================

-- =====================================================
-- PART 1 — Add QR Token Columns to Equipment Table
-- =====================================================

-- Add qr_token column if not exists
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() AND table_name = 'equipment' AND column_name = 'qr_token');
SET @sql = IF(@exists = 0, 
    "ALTER TABLE equipment ADD COLUMN qr_token VARCHAR(32) NULL UNIQUE COMMENT 'Unique token for QR code lookup'",
    'SELECT "qr_token exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add qr_token_generated_at column if not exists
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() AND table_name = 'equipment' AND column_name = 'qr_token_generated_at');
SET @sql = IF(@exists = 0, 
    "ALTER TABLE equipment ADD COLUMN qr_token_generated_at TIMESTAMP NULL",
    'SELECT "qr_token_generated_at exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add index on qr_token
SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
               WHERE table_schema = DATABASE() AND table_name = 'equipment' AND index_name = 'idx_equip_qr_token');
SET @sql = IF(@exists = 0, 'CREATE INDEX idx_equip_qr_token ON equipment(qr_token)', 'SELECT "Index exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================
-- PART 2 — Ensure Findings Table Has All Required Columns
-- =====================================================

-- Add status column if not exists
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() AND table_name = 'findings' AND column_name = 'status');
SET @sql = IF(@exists = 0, 
    "ALTER TABLE findings ADD COLUMN status ENUM('open', 'notified', 'in_progress', 'closed', 'cancelled') DEFAULT 'open'",
    'SELECT "status exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add equipment_function_impact column if not exists
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() AND table_name = 'findings' AND column_name = 'equipment_function_impact');
SET @sql = IF(@exists = 0, 
    "ALTER TABLE findings ADD COLUMN equipment_function_impact ENUM('none', 'reduced', 'degraded', 'failed', 'unknown') DEFAULT 'unknown'",
    'SELECT "equipment_function_impact exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add operating_condition column if not exists
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() AND table_name = 'findings' AND column_name = 'operating_condition');
SET @sql = IF(@exists = 0, 
    "ALTER TABLE findings ADD COLUMN operating_condition ENUM('normal', 'abnormal', 'emergency', 'startup', 'shutdown') DEFAULT 'normal'",
    'SELECT "operating_condition exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add sap_notification_created_at column if not exists
SET @exists = (SELECT COUNT(*) FROM information_schema.columns 
               WHERE table_schema = DATABASE() AND table_name = 'findings' AND column_name = 'sap_notification_created_at');
SET @sql = IF(@exists = 0, 
    "ALTER TABLE findings ADD COLUMN sap_notification_created_at TIMESTAMP NULL",
    'SELECT "sap_notification_created_at exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add index on findings status
SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
               WHERE table_schema = DATABASE() AND table_name = 'findings' AND index_name = 'idx_finding_status');
SET @sql = IF(@exists = 0, 'CREATE INDEX idx_finding_status ON findings(status)', 'SELECT "Index exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================
-- PART 3 — Additional Performance Indexes
-- =====================================================

-- Index on inspection_results for mobile queries
SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
               WHERE table_schema = DATABASE() AND table_name = 'inspection_results' AND index_name = 'idx_result_template_step');
SET @sql = IF(@exists = 0, 'CREATE INDEX idx_result_template_step ON inspection_results(task_template_step_id)', 'SELECT "Index exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Index on task_template_steps for ordering
SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
               WHERE table_schema = DATABASE() AND table_name = 'task_template_steps' AND index_name = 'idx_step_order');
SET @sql = IF(@exists = 0, 'CREATE INDEX idx_step_order ON task_template_steps(task_template_id, step_no)', 'SELECT "Index exists"');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================
-- PART 4 — Seed Additional Activity Codes if Missing
-- =====================================================

INSERT INTO activity_codes (activity_code, activity_name, description, activity_category, typical_duration_minutes) VALUES
('REPLACE_FILTER', 'Replace Filter', 'Replace air, oil, or fuel filter', 'preventive', 20),
('REPLACE_SEAL', 'Replace Seal', 'Replace O-ring, gasket, or mechanical seal', 'corrective', 45),
('REPLACE_BEARING', 'Replace Bearing', 'Replace worn or damaged bearing', 'corrective', 90),
('REPLACE_MOTOR', 'Replace Motor', 'Replace electric motor', 'corrective', 120),
('REPLACE_PUMP', 'Replace Pump', 'Replace complete pump unit', 'corrective', 180),
('REPLACE_VALVE', 'Replace Valve', 'Replace valve assembly', 'corrective', 60),
('REPAIR_LEAK', 'Repair Leak', 'Stop and repair fluid leak', 'corrective', 60),
('REPAIR_ELECTRICAL', 'Repair Electrical', 'Fix electrical fault or connection', 'corrective', 45),
('CHECK_ALIGNMENT', 'Check Alignment', 'Verify shaft/component alignment', 'inspection', 30),
('VIBRATION_CHECK', 'Vibration Check', 'Measure and analyze vibration', 'predictive', 30),
('THERMOGRAPHY', 'Thermography', 'Infrared temperature scanning', 'predictive', 30),
('OIL_ANALYSIS', 'Oil Analysis', 'Lubricant condition analysis', 'predictive', 20)
ON DUPLICATE KEY UPDATE 
    activity_name = VALUES(activity_name),
    description = VALUES(description);

-- =====================================================
-- PART 5 — Seed Additional Cause Codes if Missing
-- =====================================================

INSERT INTO cause_codes (cause_code, cause_name, description, cause_category, is_preventable) VALUES
('EROSION', 'Erosion', 'Material removal by fluid flow', 'material', TRUE),
('CAVITATION', 'Cavitation', 'Vapor bubble collapse damage', 'operation', TRUE),
('VIBRATION', 'Vibration', 'Excessive mechanical vibration', 'operation', TRUE),
('THERMAL_STRESS', 'Thermal Stress', 'Damage from temperature cycling', 'operation', TRUE),
('ELECTRICAL_FAULT', 'Electrical Fault', 'Short circuit, overload, or power surge', 'operation', TRUE),
('IMPROPER_OP', 'Improper Operation', 'Operating outside design parameters', 'operation', TRUE),
('LACK_OF_LUBE', 'Lack of Lubrication', 'Insufficient lubrication', 'maintenance', TRUE),
('WRONG_LUBE', 'Wrong Lubricant', 'Incorrect lubricant type or grade', 'maintenance', TRUE),
('FOREIGN_OBJECT', 'Foreign Object', 'Damage from external object ingress', 'environmental', TRUE),
('WATER_INGRESS', 'Water Ingress', 'Water contamination', 'environmental', TRUE)
ON DUPLICATE KEY UPDATE 
    cause_name = VALUES(cause_name),
    description = VALUES(description);

-- Migration complete
SELECT 'QR Code Support and Finding Updates migration completed successfully' AS status;
