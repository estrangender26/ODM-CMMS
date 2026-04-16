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

  const [perIndustry] = await conn.execute(`
    SELECT i.code, i.name, COUNT(DISTINCT et.id) as et_count
    FROM industries i
    JOIN equipment_type_industries eti ON i.id = eti.industry_id
    JOIN equipment_types et ON eti.equipment_type_id = et.id
    WHERE i.is_active = TRUE
    GROUP BY i.id, i.code, i.name
    ORDER BY et_count DESC
  `);

  console.log('Equipment types per industry:');
  perIndustry.forEach(row => console.log(`  ${row.code}: ${row.et_count}`));

  const [[totalEt]] = await conn.execute('SELECT COUNT(*) as c FROM equipment_types');
  const [[totalTemplates]] = await conn.execute('SELECT COUNT(*) as c FROM task_templates WHERE is_system = TRUE');
  console.log(`\nTotal equipment types: ${totalEt.c}`);
  console.log(`Total system templates: ${totalTemplates.c}`);

  await conn.end();
})();
