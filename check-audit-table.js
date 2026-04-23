require('dotenv').config();
const { pool } = require('./src/config/database');

(async () => {
  try {
    const [rows] = await pool.query(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'equipment_mapping_change_log'"
    );
    console.log(rows.length ? 'Table exists' : 'Table missing');
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
