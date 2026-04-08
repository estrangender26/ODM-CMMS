# Step 5: Admin Coverage Management UI Screens

## Screen Overview

### 1. Coverage Dashboard
**Route:** `/admin/coverage/dashboard`

**Purpose:** High-level coverage overview with key metrics

**Components:**
- Stats Cards:
  - Total Equipment Types
  - With Family Mapping (%)
  - With Industry Mapping (%)
  - With System Templates (%)
  - Overall Coverage %
- Gap Summary (3 categories)
- Recent Changes Feed (last 10)
- Quick Actions Buttons

**Data Source:** `GET /api/admin/coverage-ui/dashboard`

---

### 2. Equipment Browser
**Route:** `/admin/coverage/equipment`

**Purpose:** Browse and filter all equipment types with coverage info

**Filters:**
- Search (type_name, type_code)
- Family (dropdown + 'None')
- Industry (dropdown + 'None')
- Status (complete, mapped_no_templates, unmapped, missing_industry, missing_templates)
- Category (dropdown)
- Class (dropdown)
- Sort column and direction

**Table Columns:**
| Column | Description |
|--------|-------------|
| Type Name | equipment_types.type_name |
| Type Code | equipment_types.type_code |
| Class | equipment_classes.class_name |
| Category | equipment_categories.category_name |
| Family | template_families.family_name or "—" |
| Industries | List of industry names or "—" |
| Templates | Count of system templates |
| Status | Badge: complete, warning, error |
| Actions | Edit mapping button |

**Pagination:** 50 items per page

**Data Source:** `GET /api/admin/coverage-ui/equipment-with-filters`

---

### 3. Gap Resolution
**Route:** `/admin/coverage/gaps`

**Purpose:** Actionable list of coverage gaps

**Tabs/Filters:**
- All Gaps
- Unmapped (no family)
- Missing Industry
- Missing Templates

**Table Columns:**
| Column | Description |
|--------|-------------|
| Equipment | type_name + type_code |
| Current Family | family_code or "—" |
| Gap Type | unmapped / missing_industry / missing_templates |
| Action Required | Human-readable action |
| Quick Action | Button to resolve |

**Actions:**
- Assign Family (modal)
- Assign Industry (modal)
- Generate Templates (link to seed script)

**Data Source:** `GET /api/admin/coverage-ui/gap-resolution`

---

### 4. Template Browser
**Route:** `/admin/coverage/templates`

**Purpose:** Browse system templates with filtering

**Filters:**
- Equipment Type (dropdown)
- Family (dropdown)
- Industry (dropdown)
- Task Kind (dropdown)
- Search (template name/code)

**Table Columns:**
| Column | Description |
|--------|-------------|
| Template Code | tt.template_code |
| Name | tt.template_name |
| Task Kind | tt.task_kind |
| Equipment | type_name |
| Family | family_name |
| Industry | industry_name or "Global" |
| Steps | Count of steps |
| Safety Controls | Count of controls |
| Frequency | value + unit |

**Data Source:** `GET /api/admin/coverage-ui/template-browser`

---

### 5. Audit Log
**Route:** `/admin/coverage/audit`

**Purpose:** View all mapping changes

**Filters:**
- Equipment Type (dropdown)
- Change Type (dropdown)
- Start Date
- End Date

**Table Columns:**
| Column | Description |
|--------|-------------|
| Timestamp | changed_at |
| User | changed_by_name |
| Equipment | type_name + type_code |
| Change Type | family_assigned, industry_added, etc. |
| Old Value | old_value or "—" |
| New Value | new_value |
| Reason | change_reason or "—" |

**Data Source:** `GET /api/admin/coverage-ui/audit-log`

---

## Shared Components

### Status Badge
```
complete            → green badge
mapped_no_templates → yellow badge
unmapped            → red badge
missing_industry    → orange badge
missing_templates   → yellow badge
```

### Mapping Editor Modal
**Used in:** Equipment Browser, Gap Resolution

**Fields:**
- Equipment Type (read-only)
- Family (dropdown, required)
- Industries (multi-select)

**Actions:**
- Save
- Cancel

### Invariant Indicators

**Exactly One Family:**
- Shows checkmark if family assigned
- Shows warning if missing
- Shows error if duplicate (shouldn't happen)

**At Least One Industry:**
- Shows count of industries
- Shows warning if zero

**Template Coverage:**
- Shows checkmark if templates exist
- Shows warning with count missing

---

## API Integration Summary

| Screen | Endpoint | Method |
|--------|----------|--------|
| Dashboard | /api/admin/coverage-ui/dashboard | GET |
| Equipment | /api/admin/coverage-ui/equipment-with-filters | GET |
| Gaps | /api/admin/coverage-ui/gap-resolution | GET |
| Templates | /api/admin/coverage-ui/template-browser | GET |
| Audit | /api/admin/coverage-ui/audit-log | GET |
| Map Family | /api/admin/coverage/map-equipment-to-family | POST |
| Map Industry | /api/admin/coverage/map-equipment-to-industry | POST |

---

## Access Control

All screens require:
- Authentication (valid JWT)
- Admin role (role = 'admin' or 'super_admin')

---

## Responsive Design Notes

**Desktop:**
- Full table views
- Side-by-side filters
- All columns visible

**Tablet:**
- Collapsible filters
- Priority columns visible
- Horizontal scroll for tables

**Mobile:**
- Card view instead of tables
- Filter drawer
- Stacked layout
