/**
 * ODM-CMMS Application Tests
 * 
 * Test suite for the application using Node.js built-in test runner.
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const { createServer } = require('../src/app');

describe('ODM-CMMS API', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = createServer();
    await new Promise((resolve) => {
      server.listen(0, 'localhost', () => {
        const { port } = server.address();
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await new Promise((resolve, reject) => {
        http.get(`${baseUrl}/`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        }).on('error', reject);
      });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.name, 'ODM-CMMS API');
      assert.strictEqual(response.body.version, '1.0.0');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await new Promise((resolve, reject) => {
        http.get(`${baseUrl}/health`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        }).on('error', reject);
      });

      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.status, 'healthy');
      assert.ok(response.body.timestamp);
      assert.ok(response.body.service);
    });
  });

  describe('GET /unknown-route', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await new Promise((resolve, reject) => {
        http.get(`${baseUrl}/unknown-route`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(data) }));
        }).on('error', reject);
      });

      assert.strictEqual(response.status, 404);
      assert.ok(response.body.error);
    });
  });
});
