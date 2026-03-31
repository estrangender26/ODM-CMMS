const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUsers() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'odm_cmms'
  });
  
  console.log('=== Checking users after facility deletion ===\n');
  
  // Check all users
  const [users] = await conn.execute(`
    SELECT u.id, u.username, u.role, u.facility_id, u.is_active, u.password_hash
    FROM users u
  `);
  
  console.log('Users:');
  users.forEach(u => {
    console.log(`  ID: ${u.id} | Username: ${u.username} | Role: ${u.role} | Facility: ${u.facility_id} | Active: ${u.is_active}`);
  });
  
  // Check if any users reference non-existent facilities
  const [orphanedUsers] = await conn.execute(`
    SELECT u.id, u.username, u.facility_id
    FROM users u
    LEFT JOIN facilities f ON u.facility_id = f.id
    WHERE u.facility_id IS NOT NULL AND f.id IS NULL
  `);
  
  if (orphanedUsers.length > 0) {
    console.log('\n⚠️  Users with invalid facility_id:');
    orphanedUsers.forEach(u => {
      console.log(`  - ${u.username} (facility_id: ${u.facility_id})`);
    });
    
    // Fix orphaned users
    console.log('\nFixing orphaned users...');
    for (const user of orphanedUsers) {
      await conn.execute('UPDATE users SET facility_id = NULL WHERE id = ?', [user.id]);
      console.log(`  Set facility_id to NULL for ${user.username}`);
    }
  } else {
    console.log('\n✅ No orphaned users found');
  }
  
  // Check facilities
  const [facilities] = await conn.execute('SELECT id, code, name FROM facilities');
  console.log(`\nRemaining facilities (${facilities.length}):`);
  facilities.forEach(f => {
    console.log(`  ID: ${f.id} | ${f.code} | ${f.name}`);
  });
  
  await conn.end();
  console.log('\n✅ Check complete');
}

checkUsers().catch(console.error);
