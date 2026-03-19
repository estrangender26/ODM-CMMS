/**
 * Batch SMP Import - Process all SMP files in a folder
 * Usage: node batch-import-smps.js <folder-path>
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Parse different file formats
function parseSMPFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const content = fs.readFileSync(filePath, 'utf8');
  
  const smps = [];
  
  if (ext === '.json') {
    // JSON format
    const data = JSON.parse(content);
    return data.smps || [data];
  }
  
  if (ext === '.csv') {
    // CSV format
    const lines = content.split('\n').filter(l => l.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const smp = {};
      headers.forEach((h, idx) => {
        smp[h] = values[idx] || '';
      });
      smps.push(smp);
    }
    return smps;
  }
  
  if (ext === '.txt' || ext === '.doc' || ext === '.docx') {
    // Text format - try to extract structure
    const sections = content.split(/\n\n+|\r\n\r\n+/);
    
    const smp = {
      smpNumber: extractValue(content, /SMP[\s-]*(?:Number|#)?[\s:]*([A-Z0-9-]+)/i) || `SMP-${Date.now()}`,
      title: extractValue(content, /Title[\s:]*(.+)/i) || sections[0].substring(0, 50),
      description: sections[1] || sections[0],
      equipmentName: extractValue(content, /Equipment[\s:]*(.+)/i) || 'Generic Equipment',
      equipmentCode: extractValue(content, /Equipment\s*(?:Code|Number)[\s:]*([A-Z0-9-]+)/i) || `EQ-${Date.now()}`,
      frequency: extractValue(content, /Frequency[\s:]*(\w+)/i) || 'monthly',
      steps: extractSteps(content)
    };
    
    return [smp];
  }
  
  return [];
}

function extractValue(text, regex) {
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

function extractSteps(content) {
  const steps = [];
  const stepMatches = content.matchAll(/(?:Step|Check|Item)\s*(\d+|[A-Z])[\s:)-]+(.+?)(?=\n\s*(?:Step|Check|Item)\s*\d+|\n\n|$)/gi);
  
  for (const match of stepMatches) {
    steps.push({
      description: match[2].trim(),
      inputType: 'boolean',
      isCritical: match[2].toLowerCase().includes('critical') || match[2].toLowerCase().includes('safety')
    });
  }
  
  if (steps.length === 0) {
    // Try bullet points
    const bullets = content.match(/[•\-\*]\s*(.+)/g);
    if (bullets) {
      bullets.slice(0, 10).forEach(b => {
        steps.push({
          description: b.replace(/[•\-\*]\s*/, '').trim(),
          inputType: 'boolean',
          isCritical: false
        });
      });
    }
  }
  
  return steps.length > 0 ? steps : [
    { description: 'Visual inspection completed', inputType: 'boolean', isCritical: true },
    { description: 'Equipment operational', inputType: 'boolean', isCritical: true },
    { description: 'Safety checks passed', inputType: 'boolean', isCritical: true }
  ];
}

// Database functions
async function getConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    database: process.env.DB_NAME || 'odm_cmms'
  });
}

async function importSMP(conn, smp, index) {
  console.log(`\n  Processing SMP ${index + 1}: ${smp.title || smp.smpNumber || 'Untitled'}`);
  
  try {
    // 1. Create/Get Facility
    const facilityName = smp.facilityName || smp.Facility || 'Main Facility';
    const facilityCode = smp.facilityCode || `FAC-${String(index + 1).padStart(3, '0')}`;
    
    let [facility] = await conn.execute('SELECT id FROM facilities WHERE code = ?', [facilityCode]);
    let facilityId;
    
    if (facility.length === 0) {
      const [result] = await conn.execute(
        'INSERT INTO facilities (name, code, status) VALUES (?, ?, "active")',
        [facilityName, facilityCode]
      );
      facilityId = result.insertId;
      console.log(`    ✓ Facility: ${facilityName}`);
    } else {
      facilityId = facility[0].id;
    }
    
    // 2. Create Equipment
    const equipName = smp.equipmentName || smp.Equipment || smp.title || `Equipment ${index + 1}`;
    const equipCode = smp.equipmentCode || smp.EquipmentCode || `EQ-${Date.now()}-${index}`;
    
    let [equipment] = await conn.execute('SELECT id FROM equipment WHERE code = ?', [equipCode]);
    let equipmentId;
    
    if (equipment.length === 0) {
      const [result] = await conn.execute(
        `INSERT INTO equipment 
         (facility_id, name, code, category, status, criticality) 
         VALUES (?, ?, ?, ?, 'operational', ?)`,
        [
          facilityId,
          equipName,
          equipCode,
          smp.category || smp.Category || 'General',
          smp.criticality || smp.Criticality || 'medium'
        ]
      );
      equipmentId = result.insertId;
      console.log(`    ✓ Equipment: ${equipName}`);
    } else {
      equipmentId = equipment[0].id;
    }
    
    // 3. Create Task Master
    const taskCode = `SMP-${smp.smpNumber || index + 1}`;
    const [taskResult] = await conn.execute(
      `INSERT INTO task_master 
       (task_code, title, description, task_type, estimated_duration, is_active)
       VALUES (?, ?, ?, ?, ?, TRUE)`,
      [
        taskCode,
        smp.title || `SMP ${index + 1}`,
        smp.description || smp.procedure || 'Standard maintenance procedure',
        smp.taskType || smp.type || 'inspection',
        parseInt(smp.estimatedTime) || parseInt(smp.duration) || 30
      ]
    );
    const taskId = taskResult.insertId;
    console.log(`    ✓ Task: ${taskCode}`);
    
    // 4. Create Inspection Points
    const steps = smp.steps || [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      await conn.execute(
        `INSERT INTO inspection_points 
         (task_master_id, point_code, description, input_type, is_critical, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [
          taskId,
          `STEP-${String(i + 1).padStart(2, '0')}`,
          step.description || step.Description || `Step ${i + 1}`,
          step.inputType || step.type || 'boolean',
          step.isCritical || step.critical || false,
          i + 1
        ]
      );
    }
    console.log(`    ✓ ${steps.length} inspection points`);
    
    // 5. Create Schedule
    const [schedResult] = await conn.execute(
      `INSERT INTO schedules 
       (schedule_code, equipment_id, task_master_id, title, frequency_type, 
        start_date, next_due_date, is_active)
       VALUES (?, ?, ?, ?, ?, CURDATE(), CURDATE() + INTERVAL 1 MONTH, TRUE)`,
      [
        `SCH-${Date.now()}-${index}`,
        equipmentId,
        taskId,
        `${smp.title} Schedule`,
        smp.frequency || smp.Frequency || 'monthly'
      ]
    );
    console.log(`    ✓ Schedule created`);
    
    // 6. Create Work Order
    await conn.execute(
      `INSERT INTO work_orders 
       (wo_number, equipment_id, task_master_id, title, wo_type, priority, 
        status, assigned_to, scheduled_start, completion_percentage)
       VALUES (?, ?, ?, ?, ?, ?, 'assigned', 2, CURDATE(), 0)`,
      [
        `WO-${Date.now()}-${index}`,
        equipmentId,
        taskId,
        smp.title || `Work Order ${index + 1}`,
        smp.taskType || 'preventive',
        smp.priority || 'medium'
      ]
    );
    console.log(`    ✓ Work order created`);
    
    return true;
  } catch (err) {
    console.log(`    ✗ Error: ${err.message}`);
    return false;
  }
}

async function batchImport(folderPath) {
  console.log(`\n📁 Importing SMPs from: ${folderPath}\n`);
  
  const files = fs.readdirSync(folderPath)
    .filter(f => ['.json', '.csv', '.txt', '.doc', '.docx'].includes(path.extname(f).toLowerCase()))
    .map(f => path.join(folderPath, f));
  
  console.log(`Found ${files.length} SMP files\n`);
  
  if (files.length === 0) {
    console.log('No SMP files found. Supported formats: .json, .csv, .txt, .doc, .docx');
    return;
  }
  
  const conn = await getConnection();
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`\n[${i + 1}/${files.length}] ${path.basename(file)}`);
    
    try {
      const smps = parseSMPFile(file);
      
      for (let j = 0; j < smps.length; j++) {
        const result = await importSMP(conn, smps[j], j);
        if (result) success++; else failed++;
      }
    } catch (err) {
      console.log(`  ✗ Failed to parse: ${err.message}`);
      failed++;
    }
  }
  
  await conn.end();
  
  console.log(`\n✅ Import Complete!`);
  console.log(`   Success: ${success}`);
  console.log(`   Failed: ${failed}\n`);
}

const folderPath = process.argv[2] || 'SMP Folder';

if (!fs.existsSync(folderPath)) {
  console.log(`Folder not found: ${folderPath}`);
  console.log('Creating SMP Folder... Please place your SMP files there.');
  fs.mkdirSync(folderPath, { recursive: true });
  process.exit(0);
}

batchImport(folderPath).catch(console.error);
