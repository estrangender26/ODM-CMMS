/**
 * ODM-CMMS Application Tests
 *
 * Test suite for the Express application using Node.js built-in test runner.
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../src/app');
const { pool } = require('../src/config/database');

describe('ODM-CMMS API', () => {
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

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await new Promise((resolve, reject) => {
        http.get(`${baseUrl}/api/health`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        }).on('error', reject);
      });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.success, true);
      assert.ok(response.body.message);
      assert.ok(response.body.timestamp);
    });
  });

  describe('GET /api/unknown-route', () => {
    it('should return 404 for unknown API routes', async () => {
      const response = await new Promise((resolve, reject) => {
        http.get(`${baseUrl}/api/unknown-route`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        }).on('error', reject);
      });

      assert.strictEqual(response.status, 404);
      assert.strictEqual(response.body.success, false);
      assert.ok(response.body.message);
    });
  });

  describe('GET /', () => {
    it('should return HTML homepage', async () => {
      const response = await new Promise((resolve, reject) => {
        http.get(`${baseUrl}/`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, body: data, contentType: res.headers['content-type'] }));
        }).on('error', reject);
      });

      assert.strictEqual(response.status, 200);
      assert.ok(response.contentType.includes('text/html'));
    });
  });
});
