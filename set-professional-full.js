require('dotenv').config();
const subscriptionService = require('./src/services/subscription.service');

(async () => {
  try {
    const billing = await subscriptionService.changePlan(1, 'professional', { billingCycle: 'monthly' });
    console.log('Subscription upgraded to professional:', billing);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
