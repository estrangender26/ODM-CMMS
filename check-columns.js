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
  const [cols] = await conn.execute("SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = 'odm_cmms' AND table_name = 'task_templates'");
  console.log(cols.map(c => c.COLUMN_NAME).join(', '));
  await conn.end();
})();
