/**
 * First Administrator Bootstrap Tests
 *
 * Validates the bootstrap logic without executing against a real database.
 * Proves:
 *   - empty users table → one admin created
 *   - non-empty users table → refused and rolled back
 *   - forced insert failure → rolled back
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');

const helpers = require('../src/utils/helpers');
const { main } = require('../scripts/bootstrap-admin/bootstrap-admin.js');

function createMockConnection(scenario = 'empty') {
  let rolledBack = false;
  let committed = false;
  const rows = [];

  return {
    // getConnection() already started a transaction; beginTransaction is a no-op in the bootstrap.
    beginTransaction: async () => {},
    query: async (sql, params) => {
      if (sql.match(/SELECT COUNT\(\*\) AS count FROM users/i)) {
        if (scenario === 'empty') return [{ count: '0' }];
        if (scenario === 'already-has-user') return [{ count: '1' }];
      }

      if (sql.match(/INSERT INTO users/i)) {
        if (scenario === 'insert-fails') {
          throw new Error('forced insert failure');
        }
        const id = 1;
        rows.push({ id });
        return [{ id }];
      }

      return [];
    },
    commit: async () => {
      committed = true;
    },
    rollback: async () => {
      rolledBack = true;
    },
    release: () => {},
    _committed: () => committed,
    _rolledBack: () => rolledBack,
    _rows: () => rows
  };
}

function setEnv(values) {
  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }
}

function clearEnv(keys) {
  for (const key of keys) {
    delete process.env[key];
  }
}

describe('First Administrator Bootstrap', () => {
  it('creates exactly one admin on an empty users table', async () => {
    const envKeys = ['ADMIN_USERNAME', 'ADMIN_EMAIL', 'ADMIN_FULL_NAME', 'ADMIN_PASSWORD'];
    setEnv({
      ADMIN_USERNAME: 'admin',
      ADMIN_EMAIL: 'admin@example.com',
      ADMIN_FULL_NAME: 'Atiman Admin',
      ADMIN_PASSWORD: 'SecurePass123!'
    });

    const mockConn = createMockConnection('empty');
    const originalHashPassword = helpers.hashPassword;
    helpers.hashPassword = async (pw) => `hashed:${pw}`;

    let exitCode = null;

    try {
      await main({
        getConnection: async () => mockConn,
        closePool: async () => {},
        exit: (code) => {
          exitCode = code;
        }
      });
    } finally {
      helpers.hashPassword = originalHashPassword;
      clearEnv(envKeys);
    }

    assert.strictEqual(exitCode, null);
    assert.strictEqual(mockConn._committed(), true);
    assert.strictEqual(mockConn._rolledBack(), false);
    assert.strictEqual(mockConn._rows().length, 1);
    assert.strictEqual(mockConn._rows()[0].id, 1);
  });

  it('refuses to run when users table already has rows', async () => {
    const envKeys = ['ADMIN_USERNAME', 'ADMIN_EMAIL', 'ADMIN_FULL_NAME', 'ADMIN_PASSWORD'];
    setEnv({
      ADMIN_USERNAME: 'admin',
      ADMIN_EMAIL: 'admin@example.com',
      ADMIN_FULL_NAME: 'Atiman Admin',
      ADMIN_PASSWORD: 'SecurePass123!'
    });

    const mockConn = createMockConnection('already-has-user');
    const originalHashPassword = helpers.hashPassword;
    helpers.hashPassword = async (pw) => `hashed:${pw}`;

    let exitCode = null;
    let thrownError = null;

    try {
      await main({
        getConnection: async () => mockConn,
        closePool: async () => {},
        exit: (code) => {
          exitCode = code;
          throw new Error(`exit:${code}`);
        }
      });
    } catch (err) {
      if (!err.message.startsWith('exit:')) {
        thrownError = err;
      }
    } finally {
      helpers.hashPassword = originalHashPassword;
      clearEnv(envKeys);
    }

    assert.strictEqual(exitCode, 1);
    assert.strictEqual(thrownError, null);
    assert.strictEqual(mockConn._committed(), false);
    assert.strictEqual(mockConn._rolledBack(), true);
    assert.strictEqual(mockConn._rows().length, 0);
  });

  it('rolls back if the insert fails', async () => {
    const envKeys = ['ADMIN_USERNAME', 'ADMIN_EMAIL', 'ADMIN_FULL_NAME', 'ADMIN_PASSWORD'];
    setEnv({
      ADMIN_USERNAME: 'admin',
      ADMIN_EMAIL: 'admin@example.com',
      ADMIN_FULL_NAME: 'Atiman Admin',
      ADMIN_PASSWORD: 'SecurePass123!'
    });

    const mockConn = createMockConnection('insert-fails');
    const originalHashPassword = helpers.hashPassword;
    helpers.hashPassword = async (pw) => `hashed:${pw}`;

    let exitCode = null;
    let thrownError = null;

    try {
      await main({
        getConnection: async () => mockConn,
        closePool: async () => {},
        exit: (code) => {
          exitCode = code;
          throw new Error(`exit:${code}`);
        }
      });
    } catch (err) {
      if (!err.message.startsWith('exit:')) {
        thrownError = err;
      }
    } finally {
      helpers.hashPassword = originalHashPassword;
      clearEnv(envKeys);
    }

    assert.strictEqual(exitCode, 1);
    assert.strictEqual(thrownError, null);
    assert.strictEqual(mockConn._committed(), false);
    assert.strictEqual(mockConn._rolledBack(), true);
    assert.strictEqual(mockConn._rows().length, 0);
  });
});
