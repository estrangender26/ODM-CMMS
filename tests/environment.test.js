const { describe, it } = require('node:test');
const assert = require('node:assert');
const { validateProductionConfig } = require('../src/config/environment');

const valid = {
  NODE_ENV: 'production',
  JWT_SECRET: 'jwt-secret-abcdefghijklmnopqrstuvwxyz-123456',
  SESSION_SECRET: 'session-secret-abcdefghijklmnopqrstuvwxyz-123456',
  DB_PASSWORD: 'database-password-valid-non-placeholder'
};

describe('production configuration validation', () => {
  it('accepts non-placeholder production secrets', () => {
    assert.doesNotThrow(() => validateProductionConfig(valid));
  });

  it('rejects missing, placeholder, and weak signing secrets', () => {
    assert.throws(() => validateProductionConfig({ ...valid, JWT_SECRET: '' }), /JWT_SECRET/);
    assert.throws(() => validateProductionConfig({ ...valid, JWT_SECRET: 'replace-with-a-secret' }), /JWT_SECRET/);
    assert.throws(() => validateProductionConfig({ ...valid, SESSION_SECRET: 'short' }), /SESSION_SECRET/);
    assert.throws(() => validateProductionConfig({ ...valid, DB_PASSWORD: 'password' }), /DB_PASSWORD/);
  });
});
