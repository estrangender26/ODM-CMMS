const { testConnection, pool } = require('./src/config/database');

async function checkTables() {
  await testConnection();
  
  // Check existing tables
  const [tables] = await pool.execute(`
    SELECT TABLE_NAME 
    FROM information_schema.TABLES 
    WHERE TABLE_SCHEMA = DATABASE()
    ORDER BY TABLE_NAME
  `);
  
  console.log('\nExisting tables:');
  tables.forEach(t => console.log(' -', t.TABLE_NAME));
  
  // Check equipment table structure
  const [equip] = await pool.execute(`
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'equipment'
  `);
  
  if (equip.length > 0) {
    console.log('\nEquipment table columns:');
    equip.forEach(c => console.log(' -', c.COLUMN_NAME, '(' + c.DATA_TYPE + ')', c.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'));
  }
  
  // Check task_master table if exists
  const [taskMaster] = await pool.execute(`
    SELECT COLUMN_NAME, DATA_TYPE
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'task_master'
  `);
  
  if (taskMaster.length > 0) {
    console.log('\nTask Master table columns:');
    taskMaster.forEach(c => console.log(' -', c.COLUMN_NAME, '(' + c.DATA_TYPE + ')'));
  }
  
  process.exit(0);
}

checkTables().catch(e => { console.error(e); process.exit(1); });
