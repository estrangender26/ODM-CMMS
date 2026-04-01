const { pool } = require('./src/config/database');

async function check() {
  const [cols] = await pool.execute(`
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'facilities'
  `);
  
  console.log('Facilities table columns:');
  cols.forEach(c => console.log(`  ${c.COLUMN_NAME} (${c.DATA_TYPE}) ${c.IS_NULLABLE}`));
  
  await pool.end();
}

check().catch(console.error);
