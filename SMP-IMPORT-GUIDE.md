# SMP Import Guide

Import your Standard Maintenance Procedures (SMPs) into the CMMS system.

## Quick Start

### 1. Prepare Your SMP Data

Create a JSON file with your SMP data using the template format.

### 2. Run Import

```bash
npm run import:smp your-smp-file.json
```

### 3. Verify Import

Check in the app or MySQL:
```sql
USE odm_cmms;
SELECT * FROM task_master;
SELECT * FROM inspection_points;
```

## SMP JSON Format

```json
{
  "smps": [
    {
      "smpNumber": "SMP-001",
      "title": "Monthly Pump Inspection",
      "description": "Standard monthly inspection procedure",
      
      "facilityName": "Main Plant",
      "facilityCode": "PLANT-01",
      "facilityCity": "Industrial City",
      "facilityState": "CA",
      
      "equipmentName": "Main Pump A",
      "equipmentCode": "PUMP-001",
      "equipmentCategory": "Pump",
      "manufacturer": "Grundfos",
      "model": "CR-10-10",
      "equipmentLocation": "Pump House",
      "criticality": "high",
      
      "taskType": "inspection",
      "frequency": "monthly",
      "frequencyValue": 1,
      "estimatedTime": 45,
      "priority": "high",
      "assignedTo": 2,
      
      "toolsRequired": "Pressure gauge, vibration meter",
      "safetyNotes": "Lock out before inspection",
      
      "steps": [
        {
          "description": "Check pump pressure",
          "inputType": "numeric",
          "minValue": 40,
          "maxValue": 60,
          "unit": "PSI",
          "isCritical": true
        }
      ]
    }
  ]
}
```

## Field Reference

### SMP Header Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| smpNumber | Yes | - | Unique SMP identifier |
| title | Yes | - | SMP title |
| description | No | Same as title | Procedure description |

### Facility Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| facilityName | No | "Main Facility" | Facility name |
| facilityCode | No | "FAC-001" | Unique facility code |
| facilityCity | No | "Unknown" | City |
| facilityState | No | "Unknown" | State |

### Equipment Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| equipmentName | Yes | - | Equipment name |
| equipmentCode | Yes | Auto-generated | Unique equipment code |
| equipmentCategory | No | "General" | Category |
| manufacturer | No | "Unknown" | Manufacturer |
| model | No | "Unknown" | Model number |
| equipmentLocation | No | "Main Area" | Location |
| criticality | No | "medium" | low/medium/high/critical |

### Task Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| taskType | No | "inspection" | inspection/maintenance/repair/etc |
| frequency | No | "monthly" | daily/weekly/monthly/quarterly/yearly |
| frequencyValue | No | 1 | How often (e.g., every 1 month) |
| estimatedTime | No | 30 | Minutes |
| priority | No | "medium" | low/medium/high/urgent |
| assignedTo | No | 2 | User ID (2=operator1) |

### Step Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| description | Yes | - | Inspection step description |
| inputType | No | "boolean" | numeric/boolean/select/photo |
| minValue | No | null | For numeric inputs |
| maxValue | No | null | For numeric inputs |
| unit | No | null | Unit of measure |
| expectedValue | No | null | Expected result |
| isCritical | No | false | Is this a critical check? |
| options | No | null | For select type: ["opt1", "opt2"] |
| helpText | No | description | Help text for operator |

## Automatic Data Generation

For missing data, the system will auto-generate:

- **Equipment codes**: Auto-generated if not provided
- **Facility**: Creates "Main Facility" if not specified
- **Inspection points**: Default safety checks if no steps provided
- **Schedules**: Creates schedule based on frequency
- **Work orders**: Creates initial work order for each SMP

## Input Types

### numeric
For measurements (pressure, temperature, etc.)
```json
{
  "description": "Check pressure",
  "inputType": "numeric",
  "minValue": 40,
  "maxValue": 60,
  "unit": "PSI"
}
```

### boolean
Yes/No checks
```json
{
  "description": "Check for leaks",
  "inputType": "boolean"
}
```

### select
Multiple choice
```json
{
  "description": "Overall condition",
  "inputType": "select",
  "options": ["excellent", "good", "fair", "poor"]
}
```

### photo
Photo required
```json
{
  "description": "Take photo of gauge reading",
  "inputType": "photo"
}
```

## Example SMPs

See `smp-import-template.json` for complete examples.

## Excel to JSON Conversion

If your SMPs are in Excel:

1. Save each sheet as CSV
2. Use online converter (csvjson.com) or
3. Send me the Excel and I'll convert it

## Verification After Import

1. Login as operator
2. Check "Tasks" tab
3. Click on imported work order
4. Verify inspection points match your SMP steps
5. Test submitting inspection

## Troubleshooting

### Import fails
- Check JSON syntax (use jsonlint.com)
- Verify all required fields
- Check database connection

### Missing data
- System auto-generates missing optional fields
- Check console output for what was created

### Wrong assignments
- Update `assignedTo` field (user ID from users table)
- Default is 2 (operator1)
