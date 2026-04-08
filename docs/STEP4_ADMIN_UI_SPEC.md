# Step 4: Admin UI Specification

## Overview

Admin-safe visibility for coverage validation and equipment type mappings.

## API Endpoints

### Coverage Validation

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/admin/coverage/validate | Full validation report |
| GET | /api/admin/coverage/unmapped-equipment | Equipment without family mapping |
| GET | /api/admin/coverage/missing-industry-mappings | Equipment without industry |
| GET | /api/admin/coverage/missing-templates | Equipment without templates |
| GET | /api/admin/coverage/by-industry | Coverage by industry |
| GET | /api/admin/coverage/by-family | Coverage by family |
| GET | /api/admin/coverage/equipment-mappings | All equipment mappings |
| POST | /api/admin/coverage/map-equipment-to-family | Map equipment to family |
| POST | /api/admin/coverage/map-equipment-to-industry | Map equipment to industry |

## UI Views

### 1. Coverage Dashboard

**Route:** /admin/coverage

**Components:**
- Coverage Summary Cards
  - Total Equipment Types
  - With Family Mapping (%)
  - With Industry Mapping (%)
  - With System Templates (%)
  - Overall Coverage %

- Gap Alerts
  - Unmapped Equipment (count + link)
  - Missing Industry (count + link)
  - Missing Templates (count + link)

- Charts
  - Coverage by Industry (bar chart)
  - Coverage by Family (bar chart)

### 2. Equipment Mapping List

**Route:** /admin/coverage/equipment

**Table Columns:**
| Column | Description |
|--------|-------------|
| Type Name | equipment_types.type_name |
| Type Code | equipment_types.type_code |
| Class | equipment_classes.class_name |
| Category | equipment_categories.category_name |
| Family | template_families.family_name |
| Industries | Comma-separated industry names |
| Templates | Count of system templates |
| Status | complete / mapped_no_templates / unmapped |
| Actions | Edit mapping button |

**Filters:**
- Search (type_name, type_code)
- Family dropdown
- Industry dropdown
- Status dropdown

**Pagination:** 50 items per page

### 3. Mapping Editor Modal

**Triggered by:** Edit button on Equipment Mapping List

**Fields:**
- Equipment Type (read-only)
- Template Family (dropdown)
- Industries (multi-select checkbox)

**Actions:**
- Save Mapping
- Cancel

### 4. Gap Reports

**Routes:**
- /admin/coverage/gaps/unmapped
- /admin/coverage/gaps/missing-industry
- /admin/coverage/gaps/missing-templates

**Features:**
- Export to CSV
- Bulk actions (if applicable)
- Quick map buttons

## Access Control

All endpoints require:
- Authentication (valid JWT)
- Admin role (role = 'admin' or 'super_admin')

## Response Formats

### Validation Report
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_equipment_types": 150,
      "with_family_mapping": 145,
      "with_industry_mapping": 145,
      "with_system_templates": 140,
      "complete_coverage": 140,
      "coverage_percentage": 93
    },
    "gaps": {
      "missing_family_mapping": 5,
      "missing_industry_mapping": 5,
      "missing_system_templates": 10
    },
    "status": "incomplete"
  },
  "generated_at": "2026-04-08T12:00:00Z"
}
```

### Equipment Mappings List
```json
{
  "success": true,
  "data": {
    "mappings": [
      {
        "id": 1,
        "type_name": "Centrifugal Pump",
        "type_code": "CENT_PUMP",
        "class_name": "Rotating Equipment",
        "category_name": "Mechanical",
        "family_code": "PUMP_FAMILY",
        "family_name": "Pump Family",
        "industries": "Water & Wastewater, Oil & Gas",
        "template_count": 4,
        "status": "complete"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "total_pages": 3
    }
  }
}
```

## CLI Validation Tool

```bash
# Check coverage (read-only)
node database/validate-coverage.js

# Check and auto-fix gaps
node database/validate-coverage.js --fix
```

## Idempotent Checks

All validation operations are idempotent:
- Running multiple times produces same results
- No duplicate data created
- Safe to run in CI/CD pipelines
