/**
 * CSV Import Utility
 * Imports data from CSV files into database
 * Usage: node src/utils/import-csv.js <table_name> <csv_file>
 * Example: node src/utils/import-csv.js equipment equipment.csv
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Parse CSV line (handles quoted values)
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

// Parse CSV file
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV file must have header and at least one data row');
  }
  
  const headers = parseCSVLine(lines[0]);
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || null;
    });
    data.push(row);
  }
  
  return { headers, data };
}

// Import data to database
async function importCSV(tableName, csvFile) {
  console.log(`Importing ${csvFile} into ${tableName}...\n`);
  
  // Parse CSV
  const { headers, data } = parseCSV(csvFile);
  console.log(`Found ${data.length} rows to import`);
  console.log(`Columns: ${headers.join(', ')}\n`);
  
  // Connect to database
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'odm_cmms'
  });
  
  console.log('Connected to database\n');
  
  // Get existing columns from table
  const [columns] = await connection.execute(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
    [process.env.DB_NAME || 'odm_cmms', tableName]
  );
  
  const validColumns = columns.map(c => c.COLUMN_NAME);
  const importColumns = headers.filter(h => validColumns.includes(h));
  
  if (importColumns.length === 0) {
    throw new Error('No matching columns found between CSV and table');
  }
  
  console.log(`Matching columns: ${importColumns.join(', ')}\n`);
  
  // Prepare insert statement
  const placeholders = importColumns.map(() => '?').join(', ');
  const insertSQL = `INSERT INTO ${tableName} (${importColumns.join(', ')}) VALUES (${placeholders})`;
  
  let successCount = 0;
  let errorCount = 0;
  
  // Insert each row
  for (const row of data) {
    try {
      const values = importColumns.map(col => {
        const val = row[col];
        if (val === null || val === '' || val === 'NULL') return null;
        if (val === 'TRUE' || val === 'true') return 1;
        if (val === 'FALSE' || val === 'false') return 0;
        return val;
      });
      
      await connection.execute(insertSQL, values);
      successCount++;
      process.stdout.write('.');
    } catch (err) {
      errorCount++;
      process.stdout.write('X');
      if (errorCount <= 3) {
        console.error(`\n  Error on row:`, err.message);
      }
    }
  }
  
  console.log(`\n\n✓ Import complete!`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Failed: ${errorCount}`);
  
  await connection.end();
}

// Main
const tableName = process.argv[2];
const csvFile = process.argv[3];

if (!tableName || !csvFile) {
  console.log('Usage: node import-csv.js <table_name> <csv_file>');
  console.log('Example: node import-csv.js equipment equipment.csv');
  console.log('\nAvailable tables:');
  console.log('  - facilities');
  console.log('  - equipment');
  console.log('  - task_master');
  console.log('  - users (be careful!)');
  process.exit(1);
}

importCSV(tableName, csvFile).catch(err => {
  console.error('\n✗ Import failed:', err.message);
  process.exit(1);
});
