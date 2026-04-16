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
  
  await conn.execute("UPDATE organizations SET organization_name = 'Demo Manufacturing Organization' WHERE organization_name = 'Default Organization'");
  await conn.execute("UPDATE organizations SET industry = 'MANUFACTURING' WHERE organization_name = 'Demo Manufacturing Organization'");
  
  const [rows] = await conn.execute("SELECT id, organization_name, industry FROM organizations ORDER BY id ASC LIMIT 1");
  console.log('Organization updated:', rows[0]);
  
  await conn.end();
})();
