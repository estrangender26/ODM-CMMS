/**
 * Import SMPs from Excel Workbook
 * Reads .xlsx files and converts to database entries
 * Usage: node import-excel-workbook.js <excel-file.xlsx>
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Simple XLSX parser (XLSX is a ZIP file with XML inside)
function parseXLSX(filePath) {
  const AdmZip = require('adm-zip');
  const zip = new AdmZip(filePath);
  
  // Get shared strings
  let sharedStrings = [];
  try {
    const stringsXml = zip.readAsText('xl/sharedStrings.xml');
    const matches = stringsXml.match(/<t>([^<]*)<\/t>/g);
    if (matches) {
      sharedStrings = matches.map(m => m.replace(/<\/?t>/g, ''));
    }
  } catch (e) {
    // No shared strings
  }
  
  // Get sheet data
  const sheetXml = zip.readAsText('xl/worksheets/sheet1.xml');
  
  // Parse rows
  const rows = [];
  const rowMatches = sheetXml.match(/<row[^>]*>(.*?)<\/row>/gs);
  
  if (rowMatches) {
    for (const rowXml of rowMatches) {
      const cells = [];
      const cellMatches = rowXml.match(/<c[^>]*>(.*?)<\/c>/gs);
      
      if (cellMatches) {
        for (const cellXml of cellMatches) {
          // Check if it's a shared string
          const isShared = cellXml.includes('t="s"');
          const valueMatch = cellXml.match(/<v>(\d+)<\/v>/);
          
          if (valueMatch) {
            const value = valueMatch[1];
            if (isShared && sharedStrings[value]) {
              cells.push(sharedStrings[value]);
            } else {
              cells.push(value);
            }
          } else {
            cells.push('');
          }
        }
      }
      
      rows.push(cells);
    }
  }
  
  return rows;
}

// Alternative: Parse as CSV-like text
function parseExcelAsText(filePath) {
  const content = fs.readFileSync(filePath);
  
  // Try to extract readable text
  const text = content.toString('utf8');
  
  // Look for patterns
  const rows = [];
  
  // Extract all readable strings (min 3 chars, alphanumeric)
  const strings = [...text.matchAll(/[A-Za-z0-9][A-Za-z0-9\s\-_.]{2,50}/g)];
  
  // Group into rows (every 5-10 items is likely a row)
  let currentRow = [];
  for (const str of strings) {
    currentRow.push(str[0].trim());
    if (currentRow.length >= 8) {
      rows.push(currentRow);
      currentRow = [];
    }
  }
  
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }
  
  return rows;
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

async function importWorkbook(filePath) {
  console.log(`\n📊 Importing Excel Workbook: ${path.basename(filePath)}\n`);
  
  let rows = [];
  
  // Try to use adm-zip if available
  try {
    rows = parseXLSX(filePath);
    console.log(`✓ Parsed XLSX format: ${rows.length} rows\n`);
  } catch (e) {
    console.log('⚠ XLSX parsing failed, trying text extraction...\n');
    rows = parseExcelAsText(filePath);
    console.log(`✓ Text extraction: ${rows.length} rows\n`);
  }
  
  if (rows.length < 2) {
    console.log('❌ Could not extract data from workbook');
    console.log('\nAlternative: Save Excel as CSV and use:');
    console.log('  npm run import:csv <table-name> <csv-file>');
    return;
  }
  
  // Display first few rows for verification
  console.log('First 5 rows detected:');
  rows.slice(0, 5).forEach((row, i) => {
    console.log(`  Row ${i + 1}: ${row.slice(0, 5).join(' | ')}`);
  });
  console.log('');
  
  const conn = await getConnection();
  let imported = 0;
  
  // Try to detect format and import
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 3) continue;
    
    try {
      // Detect columns
      const smpNumber = row[0] || `SMP-${i}`;
      const title = row[1] || 'Untitled';
      const equipment = row[2] || 'Generic Equipment';
      const equipmentCode = row[3] || `EQ-${Date.now()}-${i}`;
      const frequency = (row[4] || 'monthly').toLowerCase();
      
      // Create facility
      const [facResult] = await conn.execute(
        'INSERT IGNORE INTO facilities (name, code, status) VALUES (?, ?, "active")',
        ['Main Facility', 'FAC-001']
      );
      const facilityId = facResult.insertId || 1;
      
      // Create equipment
      const [eqResult] = await conn.execute(
        `INSERT INTO equipment (facility_id, name, code, status, criticality) 
         VALUES (?, ?, ?, 'operational', 'medium')`,
        [facilityId, equipment, equipmentCode]
      );
      const equipmentId = eqResult.insertId;
      
      // Create task
      const [taskResult] = await conn.execute(
        `INSERT INTO task_master (task_code, title, description, task_type, estimated_duration, is_active)
         VALUES (?, ?, ?, 'inspection', 30, TRUE)`,
        [smpNumber, title, `${title} procedure`]
      );
      const taskId = taskResult.insertId;
      
      // Create inspection points from remaining columns
      for (let j = 5; j < row.length && j < 10; j++) {
        if (row[j]) {
          await conn.execute(
            `INSERT INTO inspection_points (task_master_id, point_code, description, input_type, sort_order, is_active)
             VALUES (?, ?, ?, 'boolean', ?, TRUE)`,
            [taskId, `STEP-${j - 4}`, row[j], j - 4]
          );
        }
      }
      
      // Create schedule
      await conn.execute(
        `INSERT INTO schedules (schedule_code, equipment_id, task_master_id, title, frequency_type, start_date, next_due_date, is_active)
         VALUES (?, ?, ?, ?, ?, CURDATE(), CURDATE() + INTERVAL 1 MONTH, TRUE)`,
        [`SCH-${Date.now()}-${i}`, equipmentId, taskId, `${title} Schedule`, frequency]
      );
      
      // Create work order
      await conn.execute(
        `INSERT INTO work_orders (wo_number, equipment_id, task_master_id, title, wo_type, priority, status, assigned_to, scheduled_start)
         VALUES (?, ?, ?, ?, 'preventive', 'medium', 'assigned', 2, CURDATE())`,
        [`WO-${Date.now()}-${i}`, equipmentId, taskId, title]
      );
      
      imported++;
      process.stdout.write('.');
      
    } catch (err) {
      console.log(`\n  ✗ Row ${i}: ${err.message}`);
    }
  }
  
  await conn.end();
  
  console.log(`\n\n✅ Import Complete!`);
  console.log(`   Imported: ${imported} SMPs\n`);
}

const filePath = process.argv[2];

if (!filePath) {
  console.log('Usage: node import-excel-workbook.js <excel-file.xlsx>');
  console.log('\nExamples:');
  console.log('  node import-excel-workbook.js "SMP Folder/my-workbook.xlsx"');
  console.log('\nOr save Excel as CSV and use:');
  console.log('  npm run import:csv equipment my-data.csv');
  process.exit(1);
}

if (!fs.existsSync(filePath)) {
  console.log(`File not found: ${filePath}`);
  process.exit(1);
}

importWorkbook(filePath).catch(console.error);
