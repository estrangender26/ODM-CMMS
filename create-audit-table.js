require('dotenv').config();
const { pool } = require('./src/config/database');

(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS equipment_mapping_change_log (
        id INT AUTO_INCREMENT PRIMARY KEY,
        equipment_type_id INT NOT NULL,
        change_type VARCHAR(50) NOT NULL,
        old_value VARCHAR(100),
        new_value VARCHAR(100),
        changed_by INT,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        change_reason TEXT,
        batch_id VARCHAR(100),
        INDEX idx_equip_type (equipment_type_id),
        INDEX idx_change_type (change_type),
        INDEX idx_changed_at (changed_at),
        INDEX idx_batch (batch_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('equipment_mapping_change_log table created');
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
