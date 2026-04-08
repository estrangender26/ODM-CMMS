-- =====================================================
-- Migration: Enforce Exactly One Family Mapping Per Equipment Type
-- Step 4 Patch: Add database-level enforcement
-- =====================================================

-- =====================================================
-- PART 1: Add Unique Constraint on Equipment Type Family Mappings
-- This enforces exactly one family per equipment type at DB level
-- =====================================================

-- First, remove any existing duplicates
-- Keep only the most recent mapping for each equipment type
DELETE etm1 FROM equipment_type_family_mappings etm1
INNER JOIN equipment_type_family_mappings etm2 
WHERE etm1.id < etm2.id 
AND etm1.equipment_type_id = etm2.equipment_type_id;

-- Add unique index on equipment_type_id
SET @exists = (SELECT COUNT(*) FROM information_schema.STATISTICS 
               WHERE table_schema = DATABASE() 
               AND table_name = 'equipment_type_family_mappings' 
               AND index_name = 'idx_unique_equip_family');

SET @sql = IF(@exists = 0,
    'ALTER TABLE equipment_type_family_mappings ADD UNIQUE INDEX idx_unique_equip_family (equipment_type_id)',
    'SELECT "Unique index already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- PART 2: Create Proposed Mappings Table for Review
-- Stores proposed mappings before they are approved/applied
-- =====================================================

CREATE TABLE IF NOT EXISTS equipment_type_family_proposals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_type_id INT NOT NULL,
    proposed_family_code VARCHAR(50) NOT NULL,
    proposal_source VARCHAR(50) NOT NULL, -- 'heuristic', 'manual', 'import'
    proposal_reason TEXT, -- Explanation of why this mapping is proposed
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    proposed_by INT,
    proposed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    review_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    reviewed_by INT,
    reviewed_at TIMESTAMP NULL,
    review_notes TEXT,
    applied_at TIMESTAMP NULL,
    UNIQUE KEY unique_equip_proposal (equipment_type_id, proposed_family_code),
    FOREIGN KEY (equipment_type_id) REFERENCES equipment_types(id) ON DELETE CASCADE,
    FOREIGN KEY (proposed_family_code) REFERENCES template_families(family_code) ON DELETE CASCADE,
    FOREIGN KEY (proposed_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_equip_type (equipment_type_id),
    INDEX idx_status (review_status),
    INDEX idx_proposed_at (proposed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 3: Create Mapping Change Log Table
-- Audit trail for all mapping changes
-- =====================================================

CREATE TABLE IF NOT EXISTS equipment_mapping_change_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    equipment_type_id INT NOT NULL,
    change_type VARCHAR(50) NOT NULL, -- 'family_assigned', 'family_changed', 'family_removed', 'industry_added', 'industry_removed'
    old_value VARCHAR(100),
    new_value VARCHAR(100),
    changed_by INT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_reason TEXT,
    batch_id VARCHAR(100), -- For seed batch tracking
    FOREIGN KEY (equipment_type_id) REFERENCES equipment_types(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_equip_type (equipment_type_id),
    INDEX idx_change_type (change_type),
    INDEX idx_changed_at (changed_at),
    INDEX idx_batch (batch_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- PART 4: Create Industry-Aware Template Coverage View
-- For efficient validation queries
-- =====================================================

CREATE OR REPLACE VIEW v_industry_aware_template_coverage AS
SELECT 
    et.id as equipment_type_id,
    et.type_name,
    et.type_code,
    etm.family_code,
    eti.industry_id,
    i.code as industry_code,
    i.name as industry_name,
    COUNT(DISTINCT tt.id) as template_count,
    GROUP_CONCAT(DISTINCT tt.task_kind ORDER BY tt.task_kind) as task_kinds,
    CASE 
        WHEN COUNT(DISTINCT tt.id) > 0 THEN 'covered'
        WHEN etm.family_code IS NOT NULL THEN 'mapped_no_templates'
        ELSE 'unmapped'
    END as coverage_status
FROM equipment_types et
LEFT JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
LEFT JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
LEFT JOIN industries i ON eti.industry_id = i.id
LEFT JOIN task_templates tt ON et.id = tt.equipment_type_id 
    AND tt.is_system = TRUE 
    AND (tt.industry_id = eti.industry_id OR tt.industry_id IS NULL)
GROUP BY et.id, et.type_name, et.type_code, etm.family_code, eti.industry_id, i.code, i.name;

-- =====================================================
-- PART 5: Create Trigger to Prevent Duplicate Family Mappings
-- Additional safeguard at application level
-- =====================================================

DELIMITER $$

CREATE TRIGGER IF NOT EXISTS trg_prevent_duplicate_family_mapping
BEFORE INSERT ON equipment_type_family_mappings
FOR EACH ROW
BEGIN
    DECLARE existing_count INT;
    
    SELECT COUNT(*) INTO existing_count 
    FROM equipment_type_family_mappings 
    WHERE equipment_type_id = NEW.equipment_type_id;
    
    IF existing_count > 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Equipment type already has a family mapping. Use UPDATE instead.';
    END IF;
END$$

CREATE TRIGGER IF NOT EXISTS trg_log_family_mapping_change
AFTER INSERT ON equipment_type_family_mappings
FOR EACH ROW
BEGIN
    INSERT INTO equipment_mapping_change_log 
        (equipment_type_id, change_type, new_value, changed_at, change_reason)
    VALUES 
        (NEW.equipment_type_id, 'family_assigned', NEW.family_code, NOW(), 
         CONCAT('Source: ', NEW.mapping_source));
END$$

CREATE TRIGGER IF NOT EXISTS trg_log_family_mapping_update
AFTER UPDATE ON equipment_type_family_mappings
FOR EACH ROW
BEGIN
    INSERT INTO equipment_mapping_change_log 
        (equipment_type_id, change_type, old_value, new_value, changed_at, change_reason)
    VALUES 
        (OLD.equipment_type_id, 'family_changed', OLD.family_code, NEW.family_code, NOW(),
         CONCAT('Source: ', NEW.mapping_source));
END$$

CREATE TRIGGER IF NOT EXISTS trg_log_family_mapping_delete
AFTER DELETE ON equipment_type_family_mappings
FOR EACH ROW
BEGIN
    INSERT INTO equipment_mapping_change_log 
        (equipment_type_id, change_type, old_value, changed_at, change_reason)
    VALUES 
        (OLD.equipment_type_id, 'family_removed', OLD.family_code, NOW(), 'Mapping removed');
END$$

DELIMITER ;

-- Migration complete
SELECT 'Family mapping uniqueness enforcement added' AS status;
SELECT 'Proposed mappings table created' AS proposals;
SELECT 'Change log table created' AS audit;
SELECT 'Industry-aware coverage view created' AS view;
