const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDuplicates() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'odm_cmms'
  });
  
  console.log('=== Fixing facility duplicates ===\n');
  
  // Find duplicates by code within same organization
  const [duplicates] = await conn.execute(`
    SELECT code, organization_id, COUNT(*) as count, GROUP_CONCAT(id) as ids
    FROM facilities 
    GROUP BY code, organization_id
    HAVING count > 1
  `);
  
  if (duplicates.length === 0) {
    console.log('No duplicate facilities found by code + organization.');
  } else {
    console.log('Found duplicates:', duplicates.length);
    
    for (const dup of duplicates) {
      const ids = dup.ids.split(',').map(Number);
      const keepId = Math.min(...ids); // Keep the lowest ID
      const deleteIds = ids.filter(id => id !== keepId);
      
      console.log(`\nCode: ${dup.code} (Org: ${dup.organization_id})`);
      console.log(`  Keeping ID: ${keepId}`);
      console.log(`  Deleting IDs: ${deleteIds.join(', ')}`);
      
      // Delete duplicate facilities
      for (const deleteId of deleteIds) {
        await conn.execute('DELETE FROM facilities WHERE id = ?', [deleteId]);
        console.log(`  Deleted facility ID ${deleteId}`);
      }
    }
  }
  
  // Add unique constraint on (organization_id, code) to prevent future duplicates
  console.log('\n=== Adding unique constraint ===');
  try {
    // Check if constraint already exists
    const [constraints] = await conn.execute(`
      SELECT COUNT(*) as count FROM information_schema.TABLE_CONSTRAINTS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'facilities' 
      AND CONSTRAINT_NAME = 'uniq_facility_code_org'
    `, [process.env.DB_NAME || 'odm_cmms']);
    
    if (constraints[0].count === 0) {
      await conn.execute(`
        ALTER TABLE facilities 
        ADD CONSTRAINT uniq_facility_code_org 
        UNIQUE KEY (organization_id, code)
      `);
      console.log('✅ Unique constraint added on (organization_id, code)');
    } else {
      console.log('Unique constraint already exists.');
    }
  } catch (error) {
    console.error('Error adding constraint:', error.message);
  }
  
  // Show remaining facilities
  console.log('\n=== Facilities after cleanup ===');
  const [facilities] = await conn.execute(`
    SELECT id, code, name, organization_id 
    FROM facilities 
    ORDER BY organization_id, code
  `);
  facilities.forEach(f => {
    console.log(`Org ${f.organization_id} | ${f.code} | ${f.name}`);
  });
  
  await conn.end();
  console.log('\n✅ Done!');
}

fixDuplicates().catch(console.error);
