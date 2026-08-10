/**
 * BaseModel.query() result-shape regression test
 * Ensures the PostgreSQL [rows, fields] tuple returned by the patched pool
 * is unwrapped to the plain rows array, with metadata preserved.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const BaseModel = require('../src/models/base.model');

describe('BaseModel.query result shape', () => {
  it('unwraps [rows, fields] tuple and preserves insertId/affectedRows', async () => {
    const model = new BaseModel('users');

    const fakeRows = [{ id: 1, username: 'admin' }];
    fakeRows.insertId = 1;
    fakeRows.affectedRows = 1;
    const fakeTuple = [fakeRows, { /* fields stub */ }];

    const originalExecute = model.pool.execute;
    model.pool.execute = async () => fakeTuple;

    try {
      const result = await model.query('SELECT * FROM users WHERE id = ?', [1]);

      assert.ok(Array.isArray(result), 'BaseModel.query should return a plain array');
      assert.strictEqual(result.length, 1, 'rows array should contain one row');
      assert.strictEqual(result[0].id, 1);
      assert.strictEqual(result[0].username, 'admin');
      assert.strictEqual(result.insertId, 1, 'insertId metadata should be preserved');
      assert.strictEqual(result.affectedRows, 1, 'affectedRows metadata should be preserved');
    } finally {
      model.pool.execute = originalExecute;
    }
  });
});
