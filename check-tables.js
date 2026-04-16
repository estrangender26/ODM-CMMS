require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'odm_cmms',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });
  
  const tables = [
    'equipment_types',
    'equipment_type_family_mappings',
    'equipment_type_industries',
    'template_families',
    'task_templates',
    'industries'
  ];
  
  for (const t of tables) {
    try {
      const [rows] = await conn.execute(`SHOW TABLES LIKE '${t}'`);
      if (rows.length > 0) {
        const [[count]] = await conn.execute(`SELECT COUNT(*) as c FROM ${t}`);
        console.log(`${t}: exists, ${count.c} rows`);
      } else {
        console.log(`${t}: MISSING`);
      }
    } catch (e) {
      console.log(`${t}: ERROR - ${e.message}`);
    }
  }
  
  await conn.end();
})();
