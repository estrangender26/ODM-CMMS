require('dotenv').config();
const { pool } = require('./src/config/database');

(async () => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, code, status FROM equipment WHERE organization_id = 1 AND status IN ('operational', 'active') LIMIT 10"
    );
    console.log('Equipment count for org 1:', rows.length);
    console.log(rows);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
