# EAM ISO 14224 + SAP S/4HANA PM Migration Summary

## Overview
Extended ODM-CMMS database to support ISO 14224 equipment taxonomy and SAP S/4HANA-compatible failure coding catalogs.

**Key Design Decision**: ODM does NOT replicate SAP functional location hierarchy. Findings are recorded in ODM with structured coding, then manually raised as SAP notifications using stored SAP references.

---

## New Tables Created

### ISO 14224 Equipment Hierarchy (5 Levels)

| Table | Level | Purpose |
|-------|-------|---------|
| `equipment_categories` | 1 | Top-level categories (Pump, Motor, etc.) |
| `equipment_classes` | 2 | Equipment classes (Centrifugal Pump, etc.) |
| `equipment_types` | 3 | Specific types (End Suction Pump, etc.) |
| `subunits` | 4 | Functional assemblies (Bearing Housing, etc.) |
| `maintainable_items` | 5 | Components (Bearing, Seal, etc.) |

### SAP S/4HANA PM Catalogs

| Table | Catalog | SAP Name | Purpose |
|-------|---------|----------|---------|
| `object_parts` | A | Bauteil | Components where damage occurs |
| `damage_codes` | B | Schaden | Failure modes |
| `cause_codes` | C | Ursache | Root causes |
| `activity_codes` | 5 | Tätigkeit | Maintenance actions |

### Transaction Tables

| Table | Purpose |
|-------|---------|
| `findings` | ODM defects with SAP catalog coding and notification traceability |
| `inspection_results` | Multi-type inspection data recording |

---

## Modified Tables

### facilities (Extended)
Added columns:
- `facility_type` (ENUM: WTP, WWTP, WPS, WWLS, RESERVOIR, BOOSTER_STATION, ADMIN_BUILDING, OTHER)
- `sap_reference_code` (VARCHAR 50) - SAP functional location for manual notification creation
- `is_active` (BOOLEAN)

### equipment (Extended)
Added columns:
- `facility_id` (INT) - Links to facilities
- `equipment_category_id` (INT) - ISO Level 1
- `equipment_class_id` (INT) - ISO Level 2
- `equipment_type_id` (INT) - ISO Level 3
- `subunit_id` (INT, NULL) - ISO Level 4
- `maintainable_item_id` (INT, NULL) - ISO Level 5
- `sap_equipment_reference` (VARCHAR 50) - SAP equipment number
- `sap_floc_hint` (VARCHAR 50) - SAP functional location hint

### task_templates (Validated)
- Confirmed support for: `equipment_type_id`, `organization_id` (NULLABLE), `maintenance_type`, `task_scope`, frequency fields

### task_template_steps (Validated)
- Confirmed support for: `step_type`, `data_type`, `instruction`, expected/min/max values, `is_required`
- `step_type` ENUM: inspection, measurement, cleaning, lubrication, adjustment, tightening, testing, calibration, functional_check, safety_check
- `data_type` ENUM: text, number, boolean, dropdown, photo, signature

### inspection_results (Validated)
- Confirmed support for: organization_id, facility_id, asset_id, template references
- Multi-type value storage: `recorded_value_text`, `recorded_value_number`, `recorded_value_boolean`, `recorded_value_json`
- Additional: unit, remarks, photo_url, recorded_by_user_id, recorded_at

---

## Foreign Keys Added

### equipment table
- `fk_equip_facility` → facilities(id)
- `fk_equip_category` → equipment_categories(id)
- `fk_equip_class` → equipment_classes(id)
- `fk_equip_type` → equipment_types(id)
- `fk_equip_subunit` → subunits(id)
- `fk_equip_item` → maintainable_items(id)

### findings table
- organization_id → organizations(id)
- facility_id → facilities(id)
- asset_id → equipment(id)
- object_part_id → object_parts(id)
- damage_code_id → damage_codes(id)
- cause_code_id → cause_codes(id)
- activity_code_id → activity_codes(id)

---

## Views Created

| View | Purpose |
|------|---------|
| `v_equipment_hierarchy` | Complete 5-level ISO hierarchy |
| `v_findings_full` | Findings with catalog descriptions and SAP references |
| `v_assets_full` | Assets with facility info and ISO classification |

---

## Seeded Data

### Activity Codes (Catalog 5) - 19 codes
- Inspection: INSPECT, MEASURE, TEST, CHECK
- Preventive: LUBRICATE, CLEAN, TIGHTEN, ADJUST, ALIGN, CALIBRATE
- Corrective: REPLACE, REPAIR, OVERHAUL

### Cause Codes (Catalog C) - 16 codes
- Material: AGE, CORR, WEAR, FATIGUE
- Operation: OVERLOAD, MISALIGN
- Maintenance: LUB_FAIL, PM_MISS
- Human: INSTALL
- Design: DESIGN
- Environmental: CONTAM

---

## Multi-Tenant Compliance

✅ All organization-scoped tables include `organization_id`
✅ All queries filter by `organization_id`
✅ No changes to existing tenant architecture
✅ No changes to subscription logic
✅ No changes to authentication/roles

---

## Backward Compatibility

✅ All new columns are NULLABLE
✅ Existing data preserved
✅ Existing APIs unchanged
✅ Existing UI routing preserved

---

## SAP Integration Strategy

### ODM Responsibility:
- Record findings with structured ISO/SAP catalog coding
- Store SAP equipment reference and functional location hint
- Track if SAP notification is required
- Store SAP notification number when created (manual process)

### SAP Responsibility:
- Functional location hierarchy maintained in SAP only
- Notifications created manually in SAP using ODM data
- Work orders managed in SAP
- ODM stores notification number for traceability only

---

## Usage Examples

### Record Finding:
```sql
INSERT INTO findings (
    organization_id, facility_id, asset_id,
    object_part_id, damage_code_id, cause_code_id,
    finding_description, severity, requires_sap_notification,
    reported_by_user_id
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?);
```

### Link SAP Notification (Manual Process):
```sql
UPDATE findings 
SET sap_notification_no = '10001234'
WHERE id = ?;
```

### Get Assets with ISO Classification:
```sql
SELECT * FROM v_assets_full 
WHERE organization_id = ?;
```

---

## Files Created

```
database/
├── migrations/007_iso_sap_eam_complete.sql
├── run-eam-migration.js
└── EAM_MIGRATION_SUMMARY.md
```

---

## Next Steps

1. **Seed ISO Equipment Hierarchy**: Import categories, classes, types for your equipment
2. **Seed SAP Catalogs**: Add object parts and damage codes per equipment class
3. **Update Asset Records**: Link existing assets to ISO hierarchy
4. **Configure SAP References**: Add sap_reference_code to facilities
5. **UI Development**: Build finding entry forms with catalog selectors
