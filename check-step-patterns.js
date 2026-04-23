require('dotenv').config();
const { pool } = require('./src/config/database');

(async () => {
  try {
    // Find most common step instructions to spot generic/repeated patterns
    const [patterns] = await pool.query(`
      SELECT instruction, COUNT(*) as occurrence_count
      FROM task_template_steps
      GROUP BY instruction
      ORDER BY occurrence_count DESC
      LIMIT 30
    `);
    console.log('Most repeated step instructions:');
    console.log(patterns);

    // Find templates with very short steps (less than 30 chars) which might be generic
    const [shortSteps] = await pool.query(`
      SELECT DISTINCT tt.id, tt.template_name, tt.template_code, tts.instruction
      FROM task_template_steps tts
      JOIN task_templates tt ON tts.task_template_id = tt.id
      WHERE LENGTH(tts.instruction) < 40
      ORDER BY tt.id
      LIMIT 30
    `);
    console.log('\nTemplates with very short step instructions:');
    console.log(shortSteps);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
