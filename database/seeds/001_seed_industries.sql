-- =====================================================
-- Seed: Industries Master Data
-- Step 2: Industry Layer Initialization
-- =====================================================

INSERT INTO industries (code, name, description, is_active) VALUES
('WATER_WASTEWATER_UTILITIES', 'Water & Wastewater Utilities', 'Municipal and industrial water treatment, distribution, and wastewater processing facilities', TRUE),
('BUILDINGS_FACILITIES', 'Buildings & Facilities', 'Commercial buildings, campuses, hospitals, schools, and facility management operations', TRUE),
('MANUFACTURING', 'Manufacturing', 'Industrial manufacturing plants including discrete and process manufacturing', TRUE),
('POWER_UTILITIES', 'Power Utilities', 'Power generation, transmission, and distribution facilities', TRUE),
('OIL_GAS', 'Oil & Gas', 'Upstream, midstream, and downstream oil and gas operations', TRUE)
ON DUPLICATE KEY UPDATE 
    name = VALUES(name),
    description = VALUES(description),
    is_active = VALUES(is_active);

-- Verify seed
SELECT 'Industries seeded successfully' AS status;
SELECT * FROM industries ORDER BY code;
