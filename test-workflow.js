/**
 * ODM Workflow Validation Tests
 */

const http = require('http');

function request(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

async function runTests() {
  const base = 'http://localhost:3000';
  const results = [];
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  ODM Workflow Validation');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const tests = [
    { name: 'Mobile Login', url: '/mobile/login' },
    { name: 'Mobile Home', url: '/mobile/home' },
    { name: 'Work Order List', url: '/mobile/work-orders' },
    { name: 'Work Order Detail', url: '/mobile/work-orders/WO-2026-0042' },
    { name: 'Inspection', url: '/mobile/inspection/WO-2026-0042' },
    { name: 'Asset Context', url: '/mobile/asset?code=TEST' },
    { name: 'Profile', url: '/mobile/profile' },
    { name: 'Calendar', url: '/mobile/calendar' },
    { name: 'Admin Facilities', url: '/mobile/admin/facilities' },
    { name: 'Admin Assets', url: '/mobile/admin/assets' },
    { name: 'Admin Templates', url: '/mobile/admin/templates' },
    { name: 'Dashboard WO', url: '/mobile/dashboard/work-orders' },
    { name: 'Dashboard Findings', url: '/mobile/dashboard/findings' }
  ];
  
  for (const test of tests) {
    try {
      const result = await request(base + test.url);
      const ok = result.status === 200;
      const icon = ok ? '✅' : '❌';
      console.log(`${icon} ${test.name.padEnd(25)} ${result.status}`);
      
      if (!ok) {
        results.push({ test: test.name, status: result.status, issue: 'Non-200 status' });
      }
    } catch (err) {
      console.log(`❌ ${test.name.padEnd(25)} ERROR: ${err.message}`);
      results.push({ test: test.name, status: 'ERROR', issue: err.message });
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════════');
  
  if (results.length === 0) {
    console.log('✅ All routes responding correctly');
  } else {
    console.log(`❌ ${results.length} issue(s) found:`);
    results.forEach(r => console.log(`  - ${r.test}: ${r.issue}`));
  }
  
  console.log('═══════════════════════════════════════════════════════════');
}

runTests().catch(console.error);
