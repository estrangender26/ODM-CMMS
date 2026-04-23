require('dotenv').config();
const { pool } = require('./src/config/database');

(async () => {
  try {
    const [rows] = await pool.query(`
      SELECT DISTINCT tt.id, tt.template_name, tt.template_code, tt.task_kind, et.type_name
      FROM task_template_steps tts
      JOIN task_templates tt ON tts.task_template_id = tt.id
      LEFT JOIN equipment_types et ON tt.equipment_type_id = et.id
      WHERE tts.instruction LIKE 'Check item%for%'
      ORDER BY tt.id
    `);
    console.log('Templates with generic steps:', rows.length);
    console.log(rows);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
