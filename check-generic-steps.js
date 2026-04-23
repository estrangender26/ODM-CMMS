require('dotenv').config();
const { pool } = require('./src/config/database');

(async () => {
  try {
    const [rows] = await pool.query(`
      SELECT tts.id, tts.task_template_id, tts.instruction, tt.template_name, tt.template_code
      FROM task_template_steps tts
      JOIN task_templates tt ON tts.task_template_id = tt.id
      WHERE tts.instruction LIKE 'Check item%Critical Check'
      LIMIT 20
    `);
    console.log('Generic steps found:', rows.length);
    console.log(rows);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
