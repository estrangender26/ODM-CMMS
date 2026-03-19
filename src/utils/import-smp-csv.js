/**
 * Import SMPs from CSV (Book1 format)
 * Usage: node import-smp-csv.js "SMP Folder/smps.csv"
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function getConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'odm_cmms'
  });
}

async function importSMPs(csvFile) {
  console.log(`\n📊 Importing SMPs from: ${csvFile}\n`);
  
  const content = fs.readFileSync(csvFile, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  
  // Skip first row (junk), use second row as headers
  const headers = parseCSVLine(lines[1]);
  console.log(`Headers: ${headers.slice(0, 6).join(', ')}...\n`);
  
  const conn = await getConnection();
  let imported = 0;
  let errors = 0;
  
  // Track created entities
  const createdEquipment = new Map();
  const createdTasks = new Map();
  
  for (let i = 2; i < lines.length; i++) {
    const row = parseCSVLine(lines[i]);
    if (row.length < 5) continue;
    
    try {
      const system = row[0];           // Equipment type
      const smpNo = row[1];            // SMP Number
      const equipmentName = row[2];    // Equipment name
      const category = row[3];         // Category
      const taskDesc = row[4];         // Task description
      const frequency = row[5];        // Frequency
      const capture1Label = row[6];    // Inspection label 1
      const capture1Value = row[7];    // Expected value 1
      const capture2Label = row[8];    // Inspection label 2
      const capture3Label = row[10];   // Inspection label 3
      const escalation = row[14];      // Escalation trigger
      const notes = row[15];           // Notes
      
      // Skip if no SMP number
      if (!smpNo) continue;
      
      // 1. Create/Get Facility
      let facilityId = 1;
      
      // 2. Create/Get Equipment
      let equipmentId;
      const equipKey = equipmentName || system;
      
      if (createdEquipment.has(equipKey)) {
        equipmentId = createdEquipment.get(equipKey);
      } else {
        const equipCode = `EQ-${equipmentName?.replace(/\s+/g, '-').substring(0, 20) || system}-${Date.now()}`;
        const [eqResult] = await conn.execute(
          `INSERT INTO equipment (facility_id, name, code, category, status, criticality)
           VALUES (?, ?, ?, ?, 'operational', 'medium')`,
          [facilityId, equipmentName || system, equipCode, system]
        );
        equipmentId = eqResult.insertId;
        createdEquipment.set(equipKey, equipmentId);
        console.log(`✓ Equipment: ${equipmentName || system}`);
      }
      
      // 3. Create Task Master (SMP)
      let taskId;
      const taskKey = smpNo;
      
      if (createdTasks.has(taskKey)) {
        taskId = createdTasks.get(taskKey);
      } else {
        const [taskResult] = await conn.execute(
          `INSERT INTO task_master (task_code, title, description, task_type, estimated_duration, safety_instructions, is_active)
           VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
          [
            smpNo,
            `${smpNo} - ${category}`,
            taskDesc,
            category?.toLowerCase().includes('inspect') ? 'inspection' : 
              category?.toLowerCase().includes('clean') ? 'cleaning' : 
              category?.toLowerCase().includes('repair') ? 'repair' : 'maintenance',
            30,
            escalation || notes || 'Follow standard safety procedures'
          ]
        );
        taskId = taskResult.insertId;
        createdTasks.set(taskKey, taskId);
        console.log(`  ✓ Task: ${smpNo} - ${category}`);
      }
      
      // 4. Create Inspection Point for this task
      if (capture1Label) {
        const inputType = detectInputType(capture1Label, capture1Value);
        await conn.execute(
          `INSERT INTO inspection_points (task_master_id, point_code, description, input_type, expected_value, is_critical, sort_order, help_text, is_active)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
          [
            taskId,
            `STEP-${i}`,
            taskDesc,
            inputType,
            capture1Value || getDefaultExpected(inputType),
            escalation?.toLowerCase().includes('escalate'),
            i,
            capture1Label
          ]
        );
      }
      
      // 5. Create Schedule (use shorter codes)
      const freqMap = {
        'daily': 'daily',
        'weekly': 'weekly',
        'monthly': 'monthly',
        'per shift': 'daily',
        'as needed': 'custom'
      };
      const freq = freqMap[frequency?.toLowerCase()] || 'monthly';
      const shortSmpNo = smpNo.replace(/MW-ENGG-/, '').replace(/-/g, '');
      
      await conn.execute(
        `INSERT INTO schedules (schedule_code, equipment_id, task_master_id, title, frequency_type, start_date, next_due_date, is_active)
         VALUES (?, ?, ?, ?, ?, CURDATE(), CURDATE() + INTERVAL 1 MONTH, TRUE)`,
        [
          `SCH-${shortSmpNo}-${i}`,
          equipmentId,
          taskId,
          `${smpNo} Schedule`,
          freq
        ]
      );
      
      // 6. Create Work Order (use shorter codes)
      await conn.execute(
        `INSERT INTO work_orders (wo_number, equipment_id, task_master_id, title, description, wo_type, priority, status, assigned_to, scheduled_start)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'assigned', 2, CURDATE())`,
        [
          `WO-${shortSmpNo}-${i}`,
          equipmentId,
          taskId,
          `${smpNo}: ${taskDesc?.substring(0, 50) || category}`,
          taskDesc,
          category?.toLowerCase().includes('inspect') ? 'preventive' : 'corrective',
          escalation?.toLowerCase().includes('immediately') ? 'urgent' : 'medium'
        ]
      );
      
      imported++;
      process.stdout.write('.');
      
    } catch (err) {
      errors++;
      if (errors <= 3) {
        console.log(`\n  ✗ Row ${i}: ${err.message}`);
      }
    }
  }
  
  await conn.end();
  
  console.log(`\n\n✅ Import Complete!`);
  console.log(`   Imported: ${imported} SMPs`);
  console.log(`   Equipment: ${createdEquipment.size}`);
  console.log(`   Tasks: ${createdTasks.size}`);
  if (errors > 0) console.log(`   Errors: ${errors}`);
  console.log('');
}

function detectInputType(label, value) {
  const lower = label?.toLowerCase() || '';
  
  if (lower.includes('temperature') || lower.includes('pressure') || 
      lower.includes('vibration') || lower.includes('flow') ||
      lower.includes('current') || lower.includes('level') ||
      lower.includes('rate')) {
    return 'numeric';
  }
  
  if (lower.includes('condition') || lower.includes('status') || lower.includes('type')) {
    return 'select';
  }
  
  if (lower.includes('completed') || lower.includes('safe')) {
    return 'boolean';
  }
  
  return 'text';
}

function getDefaultExpected(inputType) {
  if (inputType === 'boolean') return 'true';
  if (inputType === 'numeric') return 'normal';
  return 'checked';
}

const csvFile = process.argv[2] || 'SMP Folder/smps.csv';

if (!fs.existsSync(csvFile)) {
  console.log(`File not found: ${csvFile}`);
  process.exit(1);
}

importSMPs(csvFile).catch(console.error);
