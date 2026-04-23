/**
 * ODM Workflow Validation Tests
 * Tests all mobile UI routes respond correctly
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('./src/app');
const { pool } = require('./src/config/database');

function request(baseUrl, path) {
  return new Promise((resolve, reject) => {
    http.get(baseUrl + path, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}

describe('ODM Workflow Validation', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => {
      server.listen(0, 'localhost', () => {
        const { port } = server.address();
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  });

  const uiRoutes = [
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

  for (const route of uiRoutes) {
    it(`${route.name} should respond`, async () => {
      const result = await request(baseUrl, route.url);
      
      // Login page should return 200
      // Auth-required routes may return 401 (unauthenticated JSON) or 302 (redirect)
      const isOk = result.status === 200 || result.status === 302 || result.status === 401 || result.status === 403;
      
      assert.ok(isOk, `Expected 200/302/401/403 but got ${result.status} for ${route.url}`);
    });
  }
});
