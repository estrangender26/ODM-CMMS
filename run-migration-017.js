require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'odm_cmms',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  });

  const sql = fs.readFileSync(path.join(__dirname, 'database/migrations/017_create_template_family_mapping.sql'), 'utf8');
  await conn.query(sql);
  console.log('Migration 017 applied');

  const [families] = await conn.execute('SELECT family_code FROM template_families');
  console.log('Families:', families.length);
  const [rules] = await conn.execute('SELECT family_code, task_kind FROM template_family_rules');
  console.log('Rules:', rules.length);

  await conn.end();
})();
