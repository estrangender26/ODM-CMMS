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
  await conn.execute("UPDATE organizations SET industry = 'general' WHERE organization_name = 'Demo Manufacturing Organization'");
  const [rows] = await conn.execute("SELECT id, organization_name, industry FROM organizations WHERE organization_name = 'Demo Manufacturing Organization'");
  console.log('Updated:', rows[0]);
  await conn.end();
})();
