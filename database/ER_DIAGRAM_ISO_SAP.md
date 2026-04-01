# ISO 14224 + SAP S/4HANA PM Catalog - ER Diagram

## Overview
This document describes the extended database schema that supports:
- **ISO 14224**: Equipment hierarchy and reliability data
- **SAP S/4HANA PM**: Standard catalog coding structure

## Equipment Hierarchy (5 Levels)

```
equipment_categories (Level 1)
    ├── equipment_classes (Level 2)
    │       ├── equipment_types (Level 3)
    │       │       ├── equipment_subunits (Level 4)
    │       │       │       └── maintainable_items (Level 5)
    │       │       │
    │       │       └── work_orders (linked)
    │       │
    │       ├── object_parts (SAP Catalog A)
    │       ├── damage_codes (SAP Catalog B)
    │       └── cause_codes (SAP Catalog C)
    │
    └── equipment (Assets) - linked to types
```

## SAP Catalog Structure

### Catalog A - Object Parts (Bauteil)
Components where damage occurs:
- Bearing
- Seal
- Impeller
- Shaft
- Motor winding
- Coupling
- Gear
- etc.

### Catalog B - Damage Codes (Schaden)
Failure modes aligned with ISO 14224:
- Overheating
- Leakage
- Vibration
- Corrosion
- Erosion
- Fatigue
- Cracking
- Short circuit
- Open circuit
- etc.

### Catalog C - Cause Codes (Ursache)
Root causes aligned with ISO 14224:
- Aging (material)
- Corrosion (material)
- Wear (material)
- Fatigue (material)
- Overload (operation)
- Lubrication failure (maintenance)
- Installation error (human error)
- Design deficiency (design)
- Contamination (environmental)
- etc.

### Catalog 5 - Activity Codes (Tätigkeit)
Maintenance actions:
- Inspect (inspection)
- Measure (inspection)
- Test (inspection)
- Lubricate (preventive)
- Clean (preventive)
- Adjust (preventive)
- Replace (corrective)
- Repair (corrective)
- Overhaul (corrective)
- Analyze (predictive)
- etc.

## Table Relationships

### Core Tables

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `equipment_categories` | ISO Level 1 | Root of hierarchy |
| `equipment_classes` | ISO Level 2 | FK to categories |
| `equipment_types` | ISO Level 3 | FK to classes |
| `equipment_subunits` | ISO Level 4 | FK to types |
| `maintainable_items` | ISO Level 5 | FK to subunits |
| `equipment` | Assets | FK to type, class, category |

### SAP Catalog Tables

| Table | Catalog | Purpose | Key Relationships |
|-------|---------|---------|-------------------|
| `object_parts` | A | Components | FK to equipment_classes |
| `damage_codes` | B | Failure modes | FK to equipment_classes |
| `cause_codes` | C | Root causes | Optional FK to equipment_classes |
| `activity_codes` | 5 | Maintenance actions | Standalone (shared) |

### Transaction Tables

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `work_order_failures` | Failure reporting | Links WO, Asset, ISO hierarchy, SAP catalogs |
| `task_templates` | Maintenance templates | Links to activity_codes |
| `task_template_steps` | Template steps | Links to activity_codes |
| `inspection_readings` | Inspection results | Links to object_parts, damage_codes, cause_codes |

## Key Indexes

### Equipment Hierarchy Indexes
- `equipment_subunits`: type_id, code
- `maintainable_items`: subunit_id, code, criticality

### Catalog Indexes
- `object_parts`: class_id, code, is_active
- `damage_codes`: class_id, code, iso_ref, is_active
- `cause_codes`: code, category, iso_ref, is_active
- `activity_codes`: code, category, iso_ref, is_active

### Transaction Indexes
- `work_order_failures`: wo_id, asset_id, org_id, equip_type_id, detected_at
- Extended columns indexed: object_part_id, damage_code_id, cause_code_id

## ISO 14224 Terminology Mapping

| ISO 14224 Term | Database Table | SAP Catalog |
|----------------|----------------|-------------|
| Equipment Category | equipment_categories | - |
| Equipment Class | equipment_classes | - |
| Equipment Type | equipment_types | - |
| Subunit | equipment_subunits | - |
| Maintainable Item | maintainable_items | - |
| Failure Mode | damage_codes | Catalog B |
| Failure Cause | cause_codes | Catalog C |
| Object Part | object_parts | Catalog A |
| Maintenance Action | activity_codes | Catalog 5 |

## Multi-Tenant Design

### Organization-Scoped Tables:
- `equipment` (assets)
- `work_orders`
- `work_order_failures`
- `inspection_readings`

### Global Reference Tables (Shared):
- `equipment_categories`
- `equipment_classes`
- `equipment_types`
- `equipment_subunits`
- `maintainable_items`
- `object_parts`
- `damage_codes`
- `cause_codes`
- `activity_codes`

## Usage Examples

### Report Failure on Work Order:
```sql
INSERT INTO work_order_failures (
    work_order_id, asset_id, organization_id,
    equipment_type_id, object_part_id, damage_code_id, cause_code_id,
    failure_description, detected_by_user_id
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
```

### Get Equipment with Full Hierarchy:
```sql
SELECT * FROM v_equipment_hierarchy_full 
WHERE item_id = ?;
```

### Get Failure Analysis:
```sql
SELECT * FROM v_work_order_failures_full 
WHERE organization_id = ? 
AND detected_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH);
```

### Reliability KPIs:
```sql
SELECT * FROM v_reliability_kpis 
ORDER BY failure_count DESC;
```

## Migration Safety

This migration:
- Creates new tables only (no drops)
- Adds nullable columns only
- Seeds standard reference data
- Creates views for simplified queries
- Maintains all existing relationships
- Preserves backward compatibility
