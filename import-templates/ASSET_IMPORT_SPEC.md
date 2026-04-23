# ODM Asset Bulk Import Specification

## Overview
Structured CSV import for facilities and assets with automatic template inheritance.

## CSV Structure

### Required Fields
| Field | Type | Description |
|-------|------|-------------|
| organization_id | STRING | Organization identifier (e.g., ORG-001) |
| facility_name | STRING | Facility name (created if not exists) |
| asset_name | STRING | Unique asset name within facility |
| equipment_type_code | STRING | ISO 14224 equipment type code |

### Optional Fields
| Field | Type | Description |
|-------|------|-------------|
| asset_description | STRING | Asset description |
| manufacturer | STRING | Equipment manufacturer |
| model | STRING | Model number |
| serial_number | STRING | Serial number |
| commission_date | DATE | Commissioning date (YYYY-MM-DD) |
| criticality | ENUM | low, medium, high, critical |

## CSV Format
```csv
organization_id,facility_name,asset_name,equipment_type_code,asset_description,manufacturer,model,serial_number,commission_date,criticality
ORG-001,North Plant,Pump P-101,END_SUCT,Process cooling pump,Grundfos,CR 32-160,SN123456,2020-01-15,high
ORG-001,North Plant,Motor M-205,TEFC,Main drive motor,ABB,M3BP 160L,SN789012,2019-06-20,medium
ORG-001,South Plant,Compressor C-01,OIL_INJ,Air compressor,Atlas Copco,GA 75,SN345678,2021-03-10,high
```

## Field Validation Rules

### organization_id
- Must match existing organization
- Multi-tenant isolation enforced
- Error if not found: "Organization not found"

### facility_name
- Maps to existing facility OR creates new facility
- Case-insensitive match for existing
- New facility: status='active', organization_id from row
- Required: cannot be empty

### asset_name
- Required: cannot be empty
- Unique within facility (case-insensitive)
- Duplicate error: "Asset '{name}' already exists in facility '{facility}'"
- Max length: 100 characters

### equipment_type_code
- Must exist in ISO 14224 master taxonomy
- Case-insensitive match
- Error if not found: "Equipment type '{code}' not in taxonomy"
- Examples: END_SUCT, TEFC, OIL_INJ, ELEC_MAG, GAUGE, BAGHOUSE

### commission_date
- Format: YYYY-MM-DD
- Must be valid date
- Cannot be future date
- Error: "Invalid date format or future date"

### criticality
- Values: low, medium, high, critical
- Default: medium
- Case-insensitive
- Error: "Invalid criticality level"

## Facility Mapping Logic

```javascript
async function getOrCreateFacility(facilityName, organizationId) {
  // 1. Try to find existing facility (case-insensitive)
  let facility = await Facility.findOne({
    where: {
      name: { [Op.iLike]: facilityName },
      organization_id: organizationId
    }
  });
  
  // 2. Create new facility if not found
  if (!facility) {
    facility = await Facility.create({
      name: facilityName,
      organization_id: organizationId,
      code: generateFacilityCode(facilityName),
      status: 'active',
      created_by: importUserId
    });
    console.log(`Created new facility: ${facility.name} (${facility.code})`);
  }
  
  return facility;
}
```

## Template Inheritance Logic

After asset import, system automatically links templates:

```javascript
async function inheritTemplates(asset, equipmentTypeId) {
  // Find all active templates for this equipment type
  const templates = await TaskTemplate.findAll({
    where: {
      equipment_type_id: equipmentTypeId,
      is_active: true,
      [Op.or]: [
        { organization_id: null },      // Global templates
        { organization_id: asset.organization_id }  // Org-specific
      ]
    }
  });
  
  // Create asset_template_links for tracking
  for (const template of templates) {
    await AssetTemplateLink.findOrCreate({
      where: {
        asset_id: asset.id,
        template_id: template.id
      },
      defaults: {
        inherited_at: new Date(),
        inherited_from: 'equipment_type'
      }
    });
  }
  
  console.log(`Asset ${asset.name} linked to ${templates.length} templates`);
}
```

## Scheduler Impact

Imported assets are **immediately eligible** for work order generation:

- Status defaults to 'operational'
- equipment_type_id is set
- Templates are linked
- Next scheduler run will create WOs based on template frequencies

## Import Process Flow

```
1. Validate CSV headers
2. For each row:
   a. Validate organization_id
   b. Get or create facility
   c. Validate asset_name uniqueness
   d. Validate equipment_type_code
   e. Validate optional fields
   f. Generate asset_id and qr_code
   g. Create asset record
   h. Link templates via equipment_type
3. Generate import report
```

## Auto-Generated Fields

| Field | Generation Rule |
|-------|-----------------|
| asset_id | Auto-increment (DB) |
| qr_code | `ODM-{org_code}-{facility_code}-{asset_code}` |
| asset_code | Auto-generated from asset_name (slug) |
| status | Default: 'operational' |
| created_at | Current timestamp |

## Error Handling

### Row-Level Errors
- Continue processing other rows
- Log error with row number
- Include in import report

### Fatal Errors
- Stop import process
- Rollback created records
- Return error response

## Import Report Format

```json
{
  "success": true,
  "summary": {
    "total_rows": 150,
    "successful": 147,
    "failed": 3,
    "facilities_created": 2,
    "assets_created": 147,
    "templates_linked": 294
  },
  "errors": [
    {
      "row": 45,
      "asset_name": "Pump P-102",
      "error": "Equipment type 'INVALID_TYPE' not in taxonomy"
    },
    {
      "row": 89,
      "asset_name": "Motor M-210",
      "error": "Asset 'Motor M-210' already exists in facility 'North Plant'"
    }
  ],
  "created_facilities": ["South Plant", "East Wing"]
}
```

## No SAP Hierarchy Replication

ODM uses **flat facility grouping only**:

✅ ODM Structure:
```
Organization
  └── Facility
        └── Asset (linked to equipment_type)
```

❌ NOT SAP Structure:
```
Functional Location Hierarchy
  └── Plant
        └── Area
              └── Unit
                    └── Equipment
```

Assets are directly associated with facilities, not nested in complex location hierarchies.

## Example Import File

See: `import-templates/asset-import-example.csv`
