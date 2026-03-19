# CSV Import Templates

## How to Import Your Data

### Step 1: Prepare Your Excel File

1. Open your Excel file
2. Make sure column names match the database table columns
3. Save as CSV: **File → Save As → CSV (Comma delimited)**

### Step 2: Required Columns by Table

#### Equipment Table
| Column | Required | Description |
|--------|----------|-------------|
| name | Yes | Equipment name |
| code | Yes | Unique equipment code |
| description | No | Description |
| category | No | Category (Production, HVAC, etc.) |
| manufacturer | No | Manufacturer name |
| model | No | Model number |
| location | No | Physical location |
| status | No | operational/maintenance/out_of_order/retired |
| criticality | No | low/medium/high/critical |
| facility_id | Yes | ID of facility (1, 2, etc.) |

#### Facilities Table
| Column | Required | Description |
|--------|----------|-------------|
| name | Yes | Facility name |
| code | Yes | Unique facility code |
| description | No | Description |
| address | No | Street address |
| city | No | City |
| state | No | State |
| country | No | Country |
| status | No | active/inactive/under_maintenance |

### Step 3: Run Import Command

```bash
npm run import:csv <table_name> <csv_file>
```

Examples:
```bash
npm run import:csv equipment my-equipment.csv
npm run import:csv facilities my-facilities.csv
```

### Step 4: Verify Import

Check in MySQL:
```sql
USE odm_cmms;
SELECT * FROM equipment;
```

## Tips

- **Back up first**: Run `npm run db:init` to reset if needed
- **ID columns**: Don't include `id` column (auto-generated)
- **Dates**: Use format YYYY-MM-DD
- **Booleans**: Use TRUE/FALSE or 1/0
- **Empty values**: Leave blank or use NULL
