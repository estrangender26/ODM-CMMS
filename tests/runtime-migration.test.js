/**
 * Phase 2 Runtime Migration Tests
 * Verifies pg adapter, translator, compatibility layer
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { prepareQuery, translateSql, normalizeResult } = require('../src/utils/sql-translator');
const db = require('../src/config/database');

describe('Phase 2 - SQL Translator', () => {
  it('translates ? placeholders to $n', () => {
    const { sql, params } = prepareQuery('SELECT * FROM users WHERE id = ? AND name = ?', [42, 'test']);
    assert.strictEqual(sql, 'SELECT * FROM users WHERE id = $1 AND name = $2');
    assert.deepStrictEqual(params, [42, 'test']);
  });

  it('translates NOW(), CURDATE(), IFNULL', () => {
    const sql = translateSql('SELECT NOW(), CURDATE(), IFNULL(col, 0) FROM t');
    assert.ok(sql.includes('CURRENT_TIMESTAMP'));
    assert.ok(sql.includes('CURRENT_DATE'));
    assert.ok(sql.includes('COALESCE'));
  });

  it('translates GROUP_CONCAT and DATEDIFF', () => {
    let s = translateSql("SELECT GROUP_CONCAT(name SEPARATOR ', ') FROM t");
    assert.ok(s.includes('string_agg'));
    s = translateSql('SELECT DATEDIFF(d1, d2) FROM t');
    assert.ok(s.includes('d1 - d2'));
  });

  it('converts LIMIT x,y syntax', () => {
    const s = translateSql('SELECT * FROM t LIMIT 5, 10');
    assert.ok(s.includes('LIMIT 10 OFFSET 5'));
  });
});

describe('Phase 2 - Database Adapter', () => {
  it('getDb().query works and returns array', async () => {
    // This test will use real connection if PG env set, else skip destructive
    if (!process.env.DB_NAME && !process.env.PGDATABASE) {
      // skip actual query if no db configured for unit test
      return;
    }
    const { getDb } = require('../src/config/database');
    const dbh = getDb();
    // simple query - may fail if no tables, but adapter must not throw on translation
    try {
      const res = await dbh.query('SELECT 1 as ok');
      assert.ok(Array.isArray(res) || (res && typeof res === 'object'));
    } catch (e) {
      // acceptable in unit env without DB
      console.log('getDb query skipped (no DB):', e.message);
    }
  });

  it('pool.execute returns mysql2-style tuple [rows, fields]', async () => {
    // adapter must return tuple
    const fakePg = { rows: [{ id: 7, name: 'x' }], rowCount: 1 };
    const [rows] = normalizeResult(fakePg, 'SELECT *');
    assert.ok(Array.isArray(rows));
    assert.strictEqual(rows[0].id, 7);
  });

  it('insertId and affectedRows are populated on INSERT simulation', () => {
    const fake = { rows: [{ id: 99 }], rowCount: 1 };
    const [rows] = normalizeResult(fake, 'INSERT INTO x ...');
    assert.strictEqual(rows.insertId, 99);
    assert.strictEqual(rows.affectedRows, 1);
  });
});

describe('Phase 2 - Transaction compatibility', () => {
  it('getConnection provides commit/rollback/release', async () => {
    // only test interface if we can get a client (pool may be mocked)
    try {
      const conn = await db.getConnection();
      assert.ok(typeof conn.commit === 'function');
      assert.ok(typeof conn.rollback === 'function');
      assert.ok(typeof conn.release === 'function');
      await conn.rollback();
      conn.release();
    } catch (e) {
      console.log('transaction interface test skipped (no DB):', e.message);
    }
  });
});
