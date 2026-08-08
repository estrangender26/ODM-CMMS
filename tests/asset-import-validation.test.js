const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const controller = require('../src/controllers/asset-import.controller');

describe('asset import validation limits', () => {
  it('applies the CSV row limit to validation uploads and removes the temporary file', async () => {
    const original = process.env.ASSET_IMPORT_MAX_ROWS;
    const filePath = path.join(os.tmpdir(), `odm-csv-limit-${Date.now()}.csv`);
    fs.writeFileSync(filePath, 'organization_id,facility_name,asset_name,equipment_type_code\nORG,Main,A1,PUMP\nORG,Main,A2,PUMP\n');
    process.env.ASSET_IMPORT_MAX_ROWS = '1';
    let response;
    const res = {
      status(code) { response = { code }; return this; },
      json(body) { response.body = body; return this; }
    };
    try {
      await controller.validateImport({ file: { path: filePath } }, res);
      assert.strictEqual(response.code, 400);
      assert.match(response.body.message, /1-row import limit/);
      assert.strictEqual(fs.existsSync(filePath), false);
    } finally {
      if (original === undefined) delete process.env.ASSET_IMPORT_MAX_ROWS;
      else process.env.ASSET_IMPORT_MAX_ROWS = original;
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  });
});
