const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDuplicates() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'odm_cmms'
  });
  
  console.log('=== Checking for duplicate facilities ===\n');
  
  // Find duplicates by code
  const [duplicates] = await conn.execute(`
    SELECT code, COUNT(*) as count 
    FROM facilities 
    GROUP BY code 
    HAVING count > 1
  `);
  
  if (duplicates.length === 0) {
    console.log('No duplicates found by code.');
  } else {
    console.log('Duplicate facilities by code:');
    duplicates.forEach(d => {
      console.log('  Code:', d.code, '- Count:', d.count);
    });
  }
  
  // Show all facilities
  console.log('\n=== All facilities ===');
  const [facilities] = await conn.execute('SELECT id, code, name, organization_id FROM facilities ORDER BY code');
  facilities.forEach(f => {
    console.log('ID:', f.id, '| Code:', f.code, '| Name:', f.name, '| Org:', f.organization_id);
  });
  
  await conn.end();
}

checkDuplicates().catch(console.error);
