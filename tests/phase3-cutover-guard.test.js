/**
 * Phase 3 - PostgreSQL Cutover Guard
 *
 * Enforces that:
 *   1. `pg` is declared the primary runtime driver in src/config/database.js.
 *   2. The application runtime (src/ code reachable by the HTTP server) does
 *      not `require('mysql2')` / `require('mysql2/promise')`, except for the
 *      explicitly documented legacy import/migration utilities on
 *      LEGACY_MYSQL2_ALLOWLIST.
 *   3. Booting src/app.js does not load mysql2 into the module cache.
 *
 * This guard intentionally does NOT touch models, controllers, services,
 * routes, middleware, schema, auth, RBAC, or business logic; it only
 * verifies the runtime/driver boundary declared in Phase 3.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const SRC_ROOT = path.join(REPO_ROOT, 'src');

const dbConfig = require('../src/config/database');

/**
 * Walk a directory and return absolute paths for every .js file.
 * Skips node_modules and any nested test/snapshot directories.
 */
function listJsFiles(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'tests' || entry.name === '__tests__') continue;
      out.push(...listJsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Return true when the source text statically requires mysql2 or
 * mysql2/promise (the two entry points the legacy utilities use).
 */
function requiresMysql2(source) {
  return /require\(\s*['"]mysql2(?:\/promise)?['"]\s*\)/.test(source);
}

describe('Phase 3 - PostgreSQL primary runtime declaration', () => {
  it('declares pg as the primary runtime driver with a documented legacy mysql2 allowlist', () => {
    assert.strictEqual(dbConfig.PRIMARY_RUNTIME_DRIVER, 'pg');
    assert.ok(Array.isArray(dbConfig.LEGACY_MYSQL2_ALLOWLIST));
    assert.ok(dbConfig.LEGACY_MYSQL2_ALLOWLIST.length > 0);
    assert.ok(Object.isFrozen(dbConfig.LEGACY_MYSQL2_ALLOWLIST));
    for (const rel of dbConfig.LEGACY_MYSQL2_ALLOWLIST) {
      assert.strictEqual(typeof rel, 'string');
      assert.ok(!path.isAbsolute(rel), `allowlist entry must be repo-relative: ${rel}`);
      const abs = path.join(REPO_ROOT, rel);
      assert.ok(fs.existsSync(abs), `allowlisted legacy utility must exist: ${rel}`);
    }
  });
});

describe('Phase 3 - mysql2 runtime boundary', () => {
  it('does not require mysql2 anywhere in the src runtime outside the legacy allowlist', () => {
    const allowed = new Set(
      dbConfig.LEGACY_MYSQL2_ALLOWLIST.map((rel) => path.normalize(path.join(REPO_ROOT, rel)))
    );

    const offenders = [];
    for (const file of listJsFiles(SRC_ROOT)) {
      // The config module may mention mysql2 in comments/strings but never require it.
      const source = fs.readFileSync(file, 'utf8');
      if (requiresMysql2(source) && !allowed.has(path.normalize(file))) {
        offenders.push(path.relative(REPO_ROOT, file));
      }
    }

    assert.deepStrictEqual(
      offenders,
      [],
      `mysql2 must not be required by runtime code outside LEGACY_MYSQL2_ALLOWLIST. Offenders: ${offenders.join(', ')}`
    );
  });

  it('boots the Express app without loading mysql2 into the module cache', () => {
    // Run in a child process so we can monkeypatch Module._load before app
    // boot and assert mysql2 is never pulled in. We deliberately point the
    // database at an unreachable port so testConnection() fails fast instead
    // of hanging; app boot itself must still succeed.
    const script = `
      const assert = require('node:assert');
      const Module = require('node:module');
      const originalLoad = Module._load;
      let mysql2Loaded = false;
      Module._load = function (request, parent, isMain) {
        if (request === 'mysql2' || request === 'mysql2/promise') {
          mysql2Loaded = true;
        }
        return originalLoad.apply(this, arguments);
      };
      require('../src/app');
      assert.strictEqual(mysql2Loaded, false, 'mysql2 was loaded during application boot');
      process.exit(0);
    `;

    const result = spawnSync(process.execPath, ['-e', script], {
      cwd: __dirname,
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_ENV: 'test',
        DB_HOST: '127.0.0.1',
        DB_PORT: '1',
        PGPORT: '1',
        PGHOST: '127.0.0.1'
      },
      timeout: 15000
    });

    assert.strictEqual(
      result.status,
      0,
      `App boot guard failed (status ${result.status}):\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`
    );
  });
});
