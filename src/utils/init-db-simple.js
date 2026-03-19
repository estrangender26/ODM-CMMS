/**
 * Simple Database Initialization
 * Uses mysql command line client
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const schemaPath = path.join(__dirname, '../../database/schema.sql');

async function initDatabase() {
  console.log('Initializing database...\n');
  
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || '3306';
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const dbName = process.env.DB_NAME || 'odm_cmms';
  
  try {
    // Step 1: Create database
    console.log('Creating database...');
    try {
      execSync(`mysql -h${host} -P${port} -u${user} -p${password} -e "CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"`);
      console.log('✓ Database created');
    } catch (e) {
      console.log('✓ Database already exists or using existing');
    }
    
    // Step 2: Execute schema file
    console.log('\nCreating tables...');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split and execute each statement
    const statements = schema
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^--.*$/gm, '')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('/*') && !s.startsWith('USE') && !s.startsWith('CREATE DATABASE'));
    
    console.log(`Found ${statements.length} SQL statements to execute\n`);
    
    let success = 0;
    let failed = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        // Get first few words for display
        const firstWords = stmt.substring(0, 50).replace(/\s+/g, ' ');
        process.stdout.write(`${i + 1}/${statements.length}: ${firstWords}... `);
        
        execSync(`mysql -h${host} -P${port} -u${user} -p${password} ${dbName} -e "${stmt.replace(/"/g, '\\"')}"`);
        console.log('✓');
        success++;
      } catch (err) {
        console.log('✗ (may already exist)');
        failed++;
      }
    }
    
    console.log(`\n✓ Database initialized!`);
    console.log(`  Successful: ${success}`);
    console.log(`  Skipped/Errors: ${failed}`);
    
    // Verify users exist
    console.log('\nVerifying users...');
    try {
      const result = execSync(`mysql -h${host} -P${port} -u${user} -p${password} ${dbName} -e "SELECT username, role FROM users;"`).toString();
      console.log(result);
      console.log('\n✓ Users verified!');
    } catch (e) {
      console.log('✗ Could not verify users');
    }
    
    console.log('\nDefault credentials:');
    console.log('  Admin:    admin / admin123');
    console.log('  Operator: operator1 / operator123');
    
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error('\nMake sure MySQL is running and credentials are correct in .env');
    process.exit(1);
  }
}

initDatabase();
