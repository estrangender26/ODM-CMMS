# ODM-CMMS Quick Start Guide

## 🚀 Start From Scratch

### Step 1: Complete Reset
```bash
reset-and-rebuild.bat
```
This will:
- Stop any running server
- Delete and recreate database
- Build all tables
- Set default passwords
- Import SMP files (if in 'SMP Folder')

### Step 2: Start Server
```bash
start-server.bat
```

### Step 3: Access App
- URL: http://localhost:3000
- Login: admin / admin123

---

## 📥 Import Your SMPs

### Option 1: Place Files in Folder
1. Create folder: `SMP Folder`
2. Copy your SMP files there (JSON, CSV, TXT, DOC)
3. Run: `reset-and-rebuild.bat`

### Option 2: Manual Import
```bash
npm run import:smps "SMP Folder"
```

---

## 📋 SMP File Formats

### JSON Format (Recommended)
```json
{
  "smps": [
    {
      "smpNumber": "SMP-001",
      "title": "Pump Inspection",
      "equipmentName": "Pump A",
      "equipmentCode": "PUMP-001",
      "frequency": "monthly",
      "steps": [
        {
          "description": "Check pressure",
          "inputType": "numeric",
          "minValue": 40,
          "maxValue": 60,
          "unit": "PSI"
        }
      ]
    }
  ]
}
```

### CSV Format
```csv
smpNumber,title,equipmentName,equipmentCode,frequency,step1,step2,step3
SMP-001,Pump Inspection,Pump A,PUMP-001,monthly,Check pressure,Check leaks,Check vibration
```

### Text Format
The system will try to extract:
- SMP Number
- Title
- Equipment name
- Steps from bullet points

---

## 🔧 Troubleshooting

### Database connection error
- Check MySQL is running
- Verify password in .env file

### Import fails
- Check file format
- Look at error messages
- Try simpler format (JSON)

### Server won't start
- Check if port 3000 is free
- Try: `taskkill /F /IM node.exe` then restart

---

## 📁 File Structure

```
ODM-CMMS/
├── SMP Folder/           ← Put your SMP files here
│   ├── pump-smp.json
│   ├── conveyor-smp.csv
│   └── motor-inspection.txt
├── smp-import-template.json
├── SMP-EXAMPLE.json
├── reset-and-rebuild.bat ← Run this to start fresh
├── start-server.bat      ← Run this to start server
└── QUICK-START.md        ← This file
```

---

## ✅ Checklist

- [ ] MySQL installed and running
- [ ] Database created
- [ ] SMP files in 'SMP Folder'
- [ ] Run reset-and-rebuild.bat
- [ ] Server started
- [ ] Can login as admin
- [ ] Can see imported equipment/tasks

---

## 🆘 Need Help?

1. Check server window for error messages
2. Verify database: `mysql -u root -p`
3. Check tables: `USE odm_cmms; SHOW TABLES;`
4. Review this guide
