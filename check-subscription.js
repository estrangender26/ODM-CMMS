require('dotenv').config();
const { pool } = require('./src/config/database');

(async () => {
  try {
    const [orgs] = await pool.query('SELECT id, organization_name FROM organizations LIMIT 5');
    console.log('Organizations:', orgs);

    const [subs] = await pool.query(`
      SELECT os.id, os.organization_id, o.organization_name, os.plan_id, os.status, sp.plan_code
      FROM organization_subscriptions os
      JOIN organizations o ON os.organization_id = o.id
      JOIN subscription_plans sp ON os.plan_id = sp.id
      LIMIT 5
    `);
    console.log('Subscriptions:', subs);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
