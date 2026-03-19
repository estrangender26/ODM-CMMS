# SMP Import from Excel Workbook

## Method 1: Excel Workbook (Recommended)

### Format Your Excel Like This:

| Column A | Column B | Column C | Column D | Column E | Column F+ |
|----------|----------|----------|----------|----------|-----------|
| SMP-001 | Monthly Pump Inspection | Main Pump A | PUMP-001 | monthly | Check pressure |
| SMP-002 | Conveyor Check | Belt Conveyor | CONV-001 | weekly | Check belt tension |

### Columns:
- **A**: SMP Number
- **B**: Title/Description
- **C**: Equipment Name
- **D**: Equipment Code
- **E**: Frequency (daily/weekly/monthly)
- **F+**: Inspection Steps (one per column)

### Run Import:
```bash
node src/utils/import-excel-workbook.js "SMP Folder/your-file.xlsx"
```

## Method 2: Save as CSV (Easiest)

### Step 1: Save Excel as CSV
1. Open Excel
2. File → Save As
3. Choose "CSV (Comma delimited)"
4. Save as `smps.csv`

### Step 2: Import
```bash
npm run import:csv facilities smps.csv
```

## Method 3: Manual Entry (Fallback)

Login to web app and manually add:
1. Facilities
2. Equipment
3. Task Templates
4. Inspection Points

## Troubleshooting

### "Cannot parse XLSX"
- Install adm-zip: `npm install adm-zip`
- Or use Method 2 (CSV)

### "Data looks wrong"
- Check Excel format matches example above
- Try Method 2 (CSV) instead

### Import fails
- Check database connection
- Verify MySQL is running
- Check .env file credentials
