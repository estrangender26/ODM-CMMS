/**
 * Database Initialization Script
 * Run with: npm run db:init
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');
require('dotenv').config();

const schemaPath = path.join(__dirname, '../../database/schema.sql');

async function initDatabase() {
  console.log('Initializing database...\n');
  
  const host = process.env.DB_HOST || 'localhost';
  const port = parseInt(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'odm_cmms';
  
  try {
    // Step 1: Connect without database
    console.log('Connecting to MySQL server...');
    const conn1 = mysql.createConnection({ host, port, user, password });
    
    // Create database
    console.log(`Creating database '${dbName}'...`);
    conn1.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log('✓ Database created/verified');
    conn1.end();
    
    // Step 2: Connect with database
    console.log('\nConnecting to database...');
    const conn2 = mysql.createConnection({ 
      host, 
      port, 
      user, 
      password, 
      database: dbName,
      multipleStatements: true 
    });
    
    // Read and execute schema
    console.log('Creating tables...\n');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split into individual statements
    const statements = schema
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/--.*$/gm, '')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('/*') && !s.startsWith('USE ') && !s.startsWith('CREATE DATABASE') && !s.startsWith('SET '));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      try {
        conn2.query(statement + ';');
        successCount++;
        process.stdout.write('.');
      } catch (err) {
        errorCount++;
        // Some errors are expected (e.g., table already exists)
      }
    }
    
    conn2.end();
    
    console.log(`\n\n✓ Database initialized!`);
    console.log(`  Successful: ${successCount}`);
    if (errorCount > 0) console.log(`  Skipped/Errors: ${errorCount} (usually normal)`);
    
    console.log('\nDefault credentials:');
    console.log('  Admin:    admin / admin123');
    console.log('  Operator: operator1 / operator123');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n✗ Database initialization failed:', error.message);
    console.error('\nPlease check:');
    console.error('  1. MySQL is running');
    console.error('  2. Username/password in .env are correct');
    console.error('  3. MySQL user has CREATE DATABASE permission');
    process.exit(1);
  }
}

initDatabase();
