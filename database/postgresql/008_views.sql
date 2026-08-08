-- ODM-CMMS PostgreSQL Schema — 008_views.sql
-- Reporting and Hierarchy Views

-- 1. v_equipment_hierarchy_full
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
LEFT JOIN subunits es ON et.id = es.equipment_type_id
LEFT JOIN maintainable_items mi ON es.id = mi.subunit_id;

-- 2. v_work_order_failures_full
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
LEFT JOIN subunits es ON wof.subunit_id = es.id
LEFT JOIN maintainable_items mi ON wof.maintainable_item_id = mi.id
LEFT JOIN object_parts op ON wof.object_part_id = op.id
LEFT JOIN damage_codes dc ON wof.damage_code_id = dc.id
LEFT JOIN cause_codes cc ON wof.cause_code_id = cc.id
LEFT JOIN activity_codes ac ON wof.activity_code_id = ac.id
LEFT JOIN users u ON wof.detected_by_user_id = u.id;

-- 3. v_reliability_kpis
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
    STRING_AGG(DISTINCT dc.damage_name, ', ') AS common_failure_modes
FROM equipment_types et
JOIN equipment_classes ec ON et.class_id = ec.id
JOIN equipment_categories ecat ON ec.category_id = ecat.id
LEFT JOIN work_order_failures wof ON et.id = wof.equipment_type_id
LEFT JOIN damage_codes dc ON wof.damage_code_id = dc.id
WHERE wof.created_at >= (NOW() - INTERVAL '12 months')
GROUP BY et.id, et.type_name, ec.class_name, ecat.category_name;

-- 4. v_equipment_hierarchy
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
    COALESCE(ec.category_name, '') || ' > ' || COALESCE(ecl.class_name, '') || ' > ' || COALESCE(et.type_name, '') AS hierarchy_path
FROM equipment_categories ec
LEFT JOIN equipment_classes ecl ON ec.id = ecl.category_id
LEFT JOIN equipment_types et ON ecl.id = et.class_id
LEFT JOIN subunits su ON et.id = su.equipment_type_id
LEFT JOIN maintainable_items mi ON su.id = mi.subunit_id;

-- 5. v_findings_full
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

-- 6. v_assets_full
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
    COALESCE(ec.category_name, '') || ' > ' || COALESCE(ecl.class_name, '') || ' > ' || COALESCE(et.type_name, '') AS iso_classification
FROM equipment e
LEFT JOIN facilities f ON e.facility_id = f.id
LEFT JOIN equipment_categories ec ON e.equipment_category_id = ec.id
LEFT JOIN equipment_classes ecl ON e.equipment_class_id = ecl.id
LEFT JOIN equipment_types et ON e.equipment_type_id = et.id
LEFT JOIN subunits su ON e.subunit_id = su.id
LEFT JOIN maintainable_items mi ON e.maintainable_item_id = mi.id;
