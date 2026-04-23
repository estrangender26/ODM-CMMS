require('dotenv').config();
const { pool } = require('./src/config/database');

(async () => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        tt.id,
        tt.template_name,
        tt.template_code,
        tt.is_system,
        COUNT(tts.id) as step_count
      FROM task_templates tt
      LEFT JOIN task_template_steps tts ON tt.id = tts.task_template_id
      GROUP BY tt.id
      ORDER BY step_count ASC, tt.id
      LIMIT 30
    `);
    console.log('Templates with fewest steps:');
    console.log(rows);

    const [stats] = await pool.query(`
      SELECT 
        COUNT(DISTINCT CASE WHEN step_count = 0 THEN id END) as zero_steps,
        COUNT(DISTINCT CASE WHEN step_count > 0 THEN id END) as with_steps,
        AVG(step_count) as avg_steps
      FROM (
        SELECT tt.id, COUNT(tts.id) as step_count
        FROM task_templates tt
        LEFT JOIN task_template_steps tts ON tt.id = tts.task_template_id
        GROUP BY tt.id
      ) t
    `);
    console.log('\nStep statistics:', stats[0]);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
