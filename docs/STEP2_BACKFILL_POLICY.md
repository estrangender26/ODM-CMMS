# Step 2 Industry Backfill Policy

## Overview

When migrating existing organizations to Step 2, we need to assign industries to:
1. Existing organizations (that have no industries assigned)
2. Existing equipment types (map to relevant industries)
3. Existing task templates (classify by industry)

## Policy Principles

### 1. Safe Defaults
- **Never leave an organization without an industry**
- **Default fallback**: `WATER_WASTEWATER_UTILITIES`
- Admin can correct assignment post-migration

### 2. Heuristic Mapping (When Confident)

#### Equipment Type → Industry Mapping
```javascript
const equipmentIndustryHints = {
  // Water & Wastewater Utilities
  'pump': 'WATER_WASTEWATER_UTILITIES',
  'blower': 'WATER_WASTEWATER_UTILITIES',
  'aerator': 'WATER_WASTEWATER_UTILITIES',
  'clarifier': 'WATER_WASTEWATER_UTILITIES',
  'filter': 'WATER_WASTEWATER_UTILITIES',
  
  // Power Utilities
  'turbine': 'POWER_UTILITIES',
  'generator': 'POWER_UTILITIES',
  'transformer': 'POWER_UTILITIES',
  'switchgear': 'POWER_UTILITIES',
  
  // Manufacturing
  'cnc': 'MANUFACTURING',
  'lathe': 'MANUFACTURING',
  'mill': 'MANUFACTURING',
  'robot': 'MANUFACTURING',
  'conveyor': 'MANUFACTURING',
  
  // Oil & Gas
  'compressor': 'OIL_GAS',
  'separator': 'OIL_GAS',
  'heat_exchanger': 'OIL_GAS',
  
  // Buildings & Facilities
  'hvac': 'BUILDINGS_FACILITIES',
  'elevator': 'BUILDINGS_FACILITIES',
  'ups': 'BUILDINGS_FACILITIES'
};
```

#### Confidence Threshold
- **High confidence**: Match keyword in type_name or type_code → Auto-assign
- **Low confidence**: No match → Assign default industry
- **Multiple matches**: Assign all matching industries, set first as default

### 3. Organization Backfill

```sql
-- Assign default industry to organizations with no industries
INSERT INTO organization_industries (organization_id, industry_id, is_default)
SELECT 
    o.id,
    i.id,
    TRUE
FROM organizations o
CROSS JOIN industries i
WHERE i.code = 'WATER_WASTEWATER_UTILITIES'
AND NOT EXISTS (
    SELECT 1 FROM organization_industries oi 
    WHERE oi.organization_id = o.id
);
```

### 4. Equipment Type Backfill

```sql
-- Example: Assign Pump equipment types to Water industry
INSERT INTO equipment_type_industries (equipment_type_id, industry_id)
SELECT et.id, i.id
FROM equipment_types et
CROSS JOIN industries i
WHERE i.code = 'WATER_WASTEWATER_UTILITIES'
AND (et.type_name LIKE '%pump%' OR et.type_code LIKE '%pump%')
AND NOT EXISTS (
    SELECT 1 FROM equipment_type_industries eti 
    WHERE eti.equipment_type_id = et.id
);
```

### 5. Template Backfill

```sql
-- Set industry on templates based on equipment type's industry
UPDATE task_templates tt
SET industry_id = (
    SELECT i.id 
    FROM equipment_type_industries eti
    JOIN industries i ON eti.industry_id = i.id
    WHERE eti.equipment_type_id = tt.equipment_type_id
    LIMIT 1
)
WHERE industry_id IS NULL;
```

## Migration Script

See: `database/migrations/016_backfill_industries.sql`

```sql
-- Step 1: Ensure all organizations have at least one industry
-- (with WATER_WASTEWATER_UTILITIES as fallback)

-- Step 2: Heuristic mapping for equipment types
-- (based on type_name/type_code keywords)

-- Step 3: Propagate to templates via equipment_type_id

-- Step 4: Log all assignments for admin review
```

## Post-Migration Admin Action

### Review Interface
```
[Industry Assignment Review]

Organizations with fallback assignment:
- Acme Corp → Water & Wastewater Utilities (fallback)
  [Change to: ▼]
  
Equipment types with fallback assignment:
- Mystery Machine → Water & Wastewater Utilities (fallback)
  [Change to: ▼]

[Confirm Assignments] [Re-run Heuristic]
```

### Correction API
```javascript
// Bulk reassign organization industry
POST /api/admin/industries/reassign
{
  organization_id: 123,
  from_industry_id: 1,  // WATER_WASTEWATER
  to_industry_id: 3     // MANUFACTURING
}

// Reclassify equipment type
PUT /api/equipment-types/456/industries
{
  industry_ids: [2, 3],  // BUILDINGS_FACILITIES, MANUFACTURING
  default_industry_id: 3
}
```

## Audit Trail

All backfill actions are logged:
```sql
CREATE TABLE industry_backfill_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,  -- 'organization', 'equipment_type', 'template'
    entity_id INT NOT NULL,
    assigned_industry_id INT NOT NULL,
    assignment_method VARCHAR(50),  -- 'heuristic', 'fallback', 'manual'
    confidence_score DECIMAL(3,2),   -- 0.00 to 1.00
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Summary

| Scenario | Action | Confidence |
|----------|--------|------------|
| Clear keyword match | Auto-assign to matching industry | High |
| Ambiguous/no match | Assign WATER_WASTEWATER_UTILITIES | N/A (fallback) |
| Multiple matches | Assign all, first as default | Medium |
| Post-migration | Admin reviews and corrects | Human |
