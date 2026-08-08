const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('node:fs');
const express = require('express');

process.env.CORS_ALLOWED_ORIGINS = 'https://trusted.test';
process.env.REQUEST_BODY_LIMIT = '20b';
const app = require('../src/app');
const { errorHandler } = require('../src/middleware/error-handler');
const { assetImportUpload, handleAssetImportUploadError } = require('../src/middleware/asset-import-upload');

const request = (server, { method = 'GET', path = '/', headers = {}, body } = {}) => new Promise((resolve, reject) => {
  const options = { host: '127.0.0.1', port: server.address().port, path, method, headers };
  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
  });
  req.on('error', reject);
  if (body) req.write(body);
  req.end();
});

const multipart = (filename, contents, type = 'text/csv') => {
  const boundary = '----odm-test-boundary';
  return {
    body: Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${type}\r\n\r\n${contents}\r\n--${boundary}--\r\n`),
    contentType: `multipart/form-data; boundary=${boundary}`
  };
};

describe('Runtime security and Express 5 behavior', () => {
  let server;
  before(async () => {
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  });
  after(async () => new Promise((resolve) => server.close(resolve)));

  it('serves allowed credentialed CORS origins exactly', async () => {
    const response = await request(server, { path: '/api/health', headers: { Origin: 'https://trusted.test' } });
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.headers['access-control-allow-origin'], 'https://trusted.test');
    assert.strictEqual(response.headers['access-control-allow-credentials'], 'true');
    assert.match(response.headers.vary, /Origin/);
  });

  it('does not authorize an untrusted CORS origin', async () => {
    const response = await request(server, { path: '/api/health', headers: { Origin: 'https://untrusted.test' } });
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.headers['access-control-allow-origin'], undefined);
    assert.strictEqual(response.headers['access-control-allow-credentials'], undefined);
  });

  it('handles trusted and untrusted CORS preflights', async () => {
    const trusted = await request(server, { method: 'OPTIONS', path: '/api/health', headers: { Origin: 'https://trusted.test', 'Access-Control-Request-Method': 'GET' } });
    const untrusted = await request(server, { method: 'OPTIONS', path: '/api/health', headers: { Origin: 'https://untrusted.test', 'Access-Control-Request-Method': 'GET' } });
    assert.strictEqual(trusted.status, 204);
    assert.strictEqual(trusted.headers['access-control-allow-origin'], 'https://trusted.test');
    assert.strictEqual(untrusted.status, 403);
    assert.strictEqual(untrusted.headers['access-control-allow-origin'], undefined);
  });

  it('does not treat OPTIONS without Origin as a CORS preflight', async () => {
    const response = await request(server, { method: 'OPTIONS', path: '/api/health' });
    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.headers['access-control-allow-origin'], undefined);
  });

  it('enforces JSON and form request body limits', async () => {
    const json = await request(server, { method: 'POST', path: '/api/auth/login', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'this-is-too-large' }) });
    const form = await request(server, { method: 'POST', path: '/api/auth/login', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'username=this-is-too-large' });
    assert.strictEqual(json.status, 413);
    assert.strictEqual(form.status, 413);
  });

  it('handles representative nested protected, parameterized, redirect, static, and HTML error routes', async () => {
    const protectedRoute = await request(server, { path: '/api/auth/profile' });
    const parameterizedRedirect = await request(server, { path: '/work-orders/WO-1' });
    const staticAsset = await request(server, { path: '/manifest.json' });
    const html404 = await request(server, { path: '/not-a-page', headers: { Accept: 'text/html' } });
    assert.strictEqual(protectedRoute.status, 401);
    assert.strictEqual(parameterizedRedirect.status, 302);
    assert.strictEqual(parameterizedRedirect.headers.location, '/mobile/work-orders/WO-1');
    assert.strictEqual(staticAsset.status, 200);
    assert.match(staticAsset.headers['content-type'], /application\/manifest\+json|application\/json/);
    assert.strictEqual(html404.status, 404);
    assert.match(html404.headers['content-type'], /text\/html/);
  });
});

describe('Express 5 async errors and Multer 2 handling', () => {
  let server;
  before(async () => {
    const uploadApp = express();
    uploadApp.get('/async-error', async () => { throw new Error('intentional async failure'); });
    uploadApp.post('/upload', assetImportUpload.single('file'), handleAssetImportUploadError, (req, res) => {
      if (!req.file) return res.status(400).json({ success: false, message: 'No file' });
      const exists = fs.existsSync(req.file.path);
      fs.unlinkSync(req.file.path);
      return res.status(201).json({ success: true, exists });
    });
    uploadApp.use(errorHandler);
    server = http.createServer(uploadApp);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  });
  after(async () => new Promise((resolve) => server.close(resolve)));

  it('passes rejected async handlers to error middleware', async () => {
    const response = await request(server, { path: '/async-error', headers: { Accept: 'application/json' } });
    assert.strictEqual(response.status, 500);
    assert.match(response.body, /intentional async failure/);
  });

  it('accepts a CSV upload and cleans its temporary file', async () => {
    const payload = multipart('assets.csv', 'asset_code,name\nA-1,Pump');
    const response = await request(server, { method: 'POST', path: '/upload', headers: { 'Content-Type': payload.contentType, 'Content-Length': payload.body.length }, body: payload.body });
    assert.strictEqual(response.status, 201);
    assert.deepStrictEqual(JSON.parse(response.body), { success: true, exists: true });
  });

  it('returns meaningful errors for missing, invalid, and oversized uploads', async () => {
    const missing = await request(server, { method: 'POST', path: '/upload', headers: { 'Content-Type': 'multipart/form-data; boundary=none' }, body: '--none--\r\n' });
    const invalidPayload = multipart('assets.exe', 'not csv', 'application/octet-stream');
    const invalid = await request(server, { method: 'POST', path: '/upload', headers: { 'Content-Type': invalidPayload.contentType, 'Content-Length': invalidPayload.body.length }, body: invalidPayload.body });
    const largePayload = multipart('assets.csv', 'x'.repeat(5 * 1024 * 1024 + 1));
    const oversized = await request(server, { method: 'POST', path: '/upload', headers: { 'Content-Type': largePayload.contentType, 'Content-Length': largePayload.body.length }, body: largePayload.body });
    assert.strictEqual(missing.status, 400);
    assert.strictEqual(invalid.status, 400);
    assert.strictEqual(oversized.status, 413);
  });
});
