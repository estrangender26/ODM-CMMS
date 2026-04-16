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

  const [rows] = await conn.execute(`
    SELECT i.code, i.name, et.type_code, et.type_name
    FROM equipment_type_industries eti
    JOIN industries i ON eti.industry_id = i.id
    JOIN equipment_types et ON eti.equipment_type_id = et.id
    WHERE i.code IN ('mining', 'oil_gas', 'power_gen')
    ORDER BY i.code, et.type_code
  `);

  console.log('Equipment types for mining/oil_gas/power_gen:');
  rows.forEach(r => console.log(`  ${r.code}: ${r.type_code} - ${r.type_name}`));

  await conn.end();
})();
