require('dotenv').config();
const { pool } = require('./src/config/database');

(async () => {
  try {
    // Get professional plan id
    const [plans] = await pool.query("SELECT id, plan_code FROM subscription_plans WHERE plan_code = 'professional'");
    if (!plans.length) {
      console.error('Professional plan not found');
      process.exit(1);
    }
    const professionalPlanId = plans[0].id;

    // Update Demo Manufacturing Organization (id=1) to professional
    const [result] = await pool.query(
      'UPDATE organization_subscriptions SET plan_id = ? WHERE organization_id = ?',
      [professionalPlanId, 1]
    );
    console.log('Updated subscription for Demo Manufacturing Organization to professional:', result);

    // Verify
    const [subs] = await pool.query(`
      SELECT os.id, os.organization_id, o.organization_name, sp.plan_code
      FROM organization_subscriptions os
      JOIN organizations o ON os.organization_id = o.id
      JOIN subscription_plans sp ON os.plan_id = sp.id
      WHERE os.organization_id = 1
    `);
    console.log('Current subscription:', subs[0]);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
