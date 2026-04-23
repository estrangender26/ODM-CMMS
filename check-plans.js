require('dotenv').config();
const { pool } = require('./src/config/database');

(async () => {
  try {
    const [plans] = await pool.query(
      'SELECT id, plan_code, plan_name, is_active, is_public, sort_order FROM subscription_plans ORDER BY sort_order'
    );
    console.log('All plans:', plans);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
