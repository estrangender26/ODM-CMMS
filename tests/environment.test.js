const { describe, it } = require('node:test');
const assert = require('node:assert');
const { validateProductionConfig } = require('../src/config/environment');

const valid = {
  NODE_ENV: 'production',
  JWT_SECRET: 'r4nd0m-Looking-Production-JWT-Secret-8f2a9c4e7b1d',
  DB_PASSWORD: 'database-password-valid-non-placeholder'
};

describe('production configuration validation', () => {
  it('accepts a random-looking secret of at least 32 characters', () => {
    assert.doesNotThrow(() => validateProductionConfig(valid));
  });

  it('rejects exact template secrets and common intentional placeholders', () => {
    for (const secret of [
      '',
      'replace-with-a-long-random-secret',
      'replace-with-a-secret',
      'change-me-now',
      'changeme',
      'your-production-secret',
      'example-secret',
      'placeholder-value',
      'default-secret-value'
    ]) {
      assert.throws(() => validateProductionConfig({ ...valid, JWT_SECRET: secret }), /JWT_SECRET/);
    }
    assert.throws(() => validateProductionConfig({ ...valid, JWT_SECRET: 'short' }), /JWT_SECRET/);
    assert.throws(() => validateProductionConfig({ ...valid, DB_PASSWORD: 'your_password_here' }), /DB_PASSWORD/);
  });
});
