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

  // Add parent_template_id if missing
  try {
    await conn.execute("ALTER TABLE task_templates ADD COLUMN parent_template_id INT NULL AFTER is_editable");
    console.log('Added parent_template_id');
  } catch (e) {
    console.log('parent_template_id:', e.message);
  }

  // Add seed_batch_id if missing
  try {
    await conn.execute("ALTER TABLE task_templates ADD COLUMN seed_batch_id VARCHAR(100) NULL AFTER parent_template_id");
    console.log('Added seed_batch_id');
  } catch (e) {
    console.log('seed_batch_id:', e.message);
  }

  await conn.end();
})();
