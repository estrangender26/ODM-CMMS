require('dotenv').config();
const { pool } = require('./src/config/database');

(async () => {
  try {
    const [rows] = await pool.query(`
      SELECT tt.*, et.type_name, ec.class_name, c.category_name
      FROM task_templates tt
      LEFT JOIN equipment_types et ON tt.equipment_type_id = et.id
      LEFT JOIN equipment_classes ec ON et.class_id = ec.id
      LEFT JOIN equipment_categories c ON ec.category_id = c.id
      WHERE tt.id = 79
    `);
    console.log('Template 79:', rows[0]);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
