require('dotenv').config();
const { pool } = require('./src/config/database');

(async () => {
  try {
    // Find templates where step instruction contains the template name verbatim (placeholder pattern)
    const [nameMatches] = await pool.query(`
      SELECT DISTINCT tt.id, tt.template_name, tts.instruction
      FROM task_templates tt
      JOIN task_template_steps tts ON tt.id = tts.task_template_id
      WHERE tts.instruction LIKE CONCAT('%', tt.template_name, '%')
      ORDER BY tt.id
      LIMIT 50
    `);
    console.log('Steps containing full template name:', nameMatches.length);
    console.log(nameMatches);

    // Find templates with all identical steps (strong placeholder indicator)
    const [identicalSteps] = await pool.query(`
      SELECT tt.id, tt.template_name, COUNT(DISTINCT tts.instruction) as unique_instructions, COUNT(tts.id) as total_steps
      FROM task_templates tt
      JOIN task_template_steps tts ON tt.id = tts.task_template_id
      GROUP BY tt.id
      HAVING unique_instructions = 1 AND total_steps > 1
      ORDER BY tt.id
    `);
    console.log('\nTemplates with ALL identical steps:', identicalSteps.length);
    console.log(identicalSteps);

    // Find templates with very generic "step N" patterns
    const [stepPatterns] = await pool.query(`
      SELECT DISTINCT tt.id, tt.template_name, tts.instruction
      FROM task_templates tt
      JOIN task_template_steps tts ON tt.id = tts.task_template_id
      WHERE tts.instruction REGEXP 'step [0-9]+|item [0-9]+|template|placeholder|generic'
      ORDER BY tt.id
      LIMIT 50
    `);
    console.log('\nSteps with potential placeholder words:', stepPatterns.length);
    console.log(stepPatterns);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
