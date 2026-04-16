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

  const cols = [
    { name: 'safety_note', type: 'TEXT NULL' },
    { name: 'is_visual_only', type: 'BOOLEAN DEFAULT TRUE' },
    { name: 'requires_equipment_stopped', type: 'BOOLEAN DEFAULT FALSE' },
    { name: 'prohibit_if_running', type: 'BOOLEAN DEFAULT FALSE' },
    { name: 'prohibit_opening_covers', type: 'BOOLEAN DEFAULT FALSE' }
  ];

  for (const col of cols) {
    try {
      await conn.execute(`ALTER TABLE task_template_steps ADD COLUMN ${col.name} ${col.type}`);
      console.log(`Added ${col.name}`);
    } catch (e) {
      console.log(`${col.name}: ${e.message}`);
    }
  }

  await conn.end();
})();
