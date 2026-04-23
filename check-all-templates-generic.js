require('dotenv').config();
const { pool } = require('./src/config/database');

(async () => {
  try {
    // Find templates with generic "Check item N for X" steps
    const [genericRows] = await pool.query(`
      SELECT DISTINCT tt.id, tt.template_name, tt.template_code, tt.task_kind, et.type_name, COUNT(tts.id) as step_count
      FROM task_template_steps tts
      JOIN task_templates tt ON tts.task_template_id = tt.id
      LEFT JOIN equipment_types et ON tt.equipment_type_id = et.id
      WHERE tts.instruction REGEXP '^Check item [0-9]+ for '
      GROUP BY tt.id
      ORDER BY tt.id
    `);
    console.log('Templates with generic steps:', genericRows.length);
    console.log(genericRows);

    // Also find templates with other placeholder patterns
    const [otherGeneric] = await pool.query(`
      SELECT DISTINCT tt.id, tt.template_name, tt.template_code, tts.instruction
      FROM task_template_steps tts
      JOIN task_templates tt ON tts.task_template_id = tt.id
      WHERE tts.instruction LIKE '%Placeholder%'
         OR tts.instruction LIKE '%Generic step%'
         OR tts.instruction LIKE '%TODO%'
      ORDER BY tt.id
    `);
    console.log('\nOther placeholder steps:', otherGeneric.length);
    console.log(otherGeneric);

    // Get total template count for context
    const [total] = await pool.query('SELECT COUNT(*) as total FROM task_templates');
    console.log('\nTotal templates in DB:', total[0].total);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
