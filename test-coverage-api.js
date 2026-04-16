require('dotenv').config();
const controller = require('./src/controllers/admin-coverage-ui.controller');

(async () => {
  console.log('=== Global Stats ===');
  const globalStats = await controller.getDashboardStats();
  const globalGaps = await controller.getGapSummary();
  console.log('Dashboard Stats:', globalStats);
  console.log('Gap Summary:', globalGaps);

  console.log('\n=== General Industry Stats ===');
  const generalStats = await controller.getDashboardStats('general');
  const generalGaps = await controller.getGapSummary('general');
  console.log('Dashboard Stats:', generalStats);
  console.log('Gap Summary:', generalGaps);

  console.log('\n=== Mining Industry Stats ===');
  const miningStats = await controller.getDashboardStats('mining');
  const miningGaps = await controller.getGapSummary('mining');
  console.log('Dashboard Stats:', miningStats);
  console.log('Gap Summary:', miningGaps);

  console.log('\n=== Oil & Gas Industry Stats ===');
  const oilStats = await controller.getDashboardStats('oil_gas');
  const oilGaps = await controller.getGapSummary('oil_gas');
  console.log('Dashboard Stats:', oilStats);
  console.log('Gap Summary:', oilGaps);

  // Force exit since mysql pool may keep process alive
  setTimeout(() => process.exit(0), 500);
})();
