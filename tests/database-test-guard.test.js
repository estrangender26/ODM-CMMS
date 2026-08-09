const { describe, it } = require('node:test');
const assert = require('node:assert');
const { getDatabaseConfig } = require('../src/config/database');

const save = (names) => Object.fromEntries(names.map((name) => [name, process.env[name]]));
const restore = (values) => Object.entries(values).forEach(([name, value]) => {
  if (value === undefined) delete process.env[name]; else process.env[name] = value;
});

describe('integration database safety guard', () => {
  const names = ['NODE_ENV', 'RUN_DB_TESTS', 'TEST_DB_HOST', 'TEST_DB_PORT', 'TEST_DB_NAME', 'TEST_DB_USER', 'TEST_DB_PASSWORD'];

  it('refuses destructive test mode without an explicitly named test database', () => {
    const original = save(names);
    try {
      Object.assign(process.env, { NODE_ENV: 'test', RUN_DB_TESTS: 'true' });
      delete process.env.TEST_DB_NAME;
      assert.throws(() => getDatabaseConfig(), /Refusing destructive integration tests/);
      Object.assign(process.env, {
        TEST_DB_HOST: '127.0.0.1', TEST_DB_PORT: '3306', TEST_DB_NAME: 'odm_cmms_test', TEST_DB_USER: 'test', TEST_DB_PASSWORD: 'test-password'
      });
      assert.deepStrictEqual(getDatabaseConfig(), {
        host: '127.0.0.1', port: 3306, database: 'odm_cmms_test', user: 'test', password: 'test-password', ssl: false
      });
    } finally {
      restore(original);
    }
  });
});
