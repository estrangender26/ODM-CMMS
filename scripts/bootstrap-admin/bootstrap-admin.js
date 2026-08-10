/**
 * Atiman First Administrator Bootstrap
 *
 * Creates exactly one fresh Atiman administrator in an empty users table.
 *
 * Rules:
 * - Refuses to run if the users table already contains any row.
 * - Reads credentials from secure environment variables ONLY.
 * - Hashes the password using the same bcrypt configuration as the app.
 * - Creates a single active admin with no organization/facility attachment.
 * - Runs inside a database transaction started by getConnection() (BEGIN already issued).
 * - Does not print the password or password hash.
 */

const { pool, getConnection } = require('../../src/config/database');
const { hashPassword } = require('../../src/utils/helpers');

const REQUIRED_ENV = [
  'ADMIN_USERNAME',
  'ADMIN_EMAIL',
  'ADMIN_FULL_NAME',
  'ADMIN_PASSWORD'
];

function getEnv(name) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} environment variable is required`);
  }
  return value.trim();
}

async function validateInputs(username, email, fullName, password) {
  if (!username || username.length < 3) {
    throw new Error('ADMIN_USERNAME must be at least 3 characters');
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('ADMIN_EMAIL must be a valid email address');
  }
  if (!fullName || fullName.length < 1) {
    throw new Error('ADMIN_FULL_NAME is required');
  }
  if (!password || password.length < 8) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters');
  }
}

async function main(options = {}) {
  const exitFn = options.exit || process.exit;
  const logSuccess = options.logSuccess || console.log;
  const logError = options.logError || console.error;
  const connectionProvider = options.getConnection || getConnection;
  const closePool = options.closePool || (() => pool.end());

  for (const name of REQUIRED_ENV) {
    if (!process.env[name] || process.env[name].trim().length === 0) {
      logError(`[ERROR] ${name} environment variable is required.`);
      if (!options.noExit) {
        exitFn(1);
      }
      throw new Error(`${name} environment variable is required`);
    }
  }

  const username = getEnv('ADMIN_USERNAME');
  const email = getEnv('ADMIN_EMAIL');
  const fullName = getEnv('ADMIN_FULL_NAME');
  const password = getEnv('ADMIN_PASSWORD');

  await validateInputs(username, email, fullName, password);

  // getConnection() already starts a PostgreSQL transaction (BEGIN).
  const conn = await connectionProvider();

  try {
    // Guard: refuse if any user already exists.
    const [existing] = await conn.query('SELECT COUNT(*) AS count FROM users');
    const existingCount = parseInt(existing.count, 10);
    if (existingCount > 0) {
      throw new Error(
        `Bootstrap refused: users table already contains ${existingCount} row(s). ` +
        'This script creates only the very first administrator.'
      );
    }

    const passwordHash = await hashPassword(password);

    const insertResult = await conn.query(`
      INSERT INTO users (
        username,
        email,
        password_hash,
        full_name,
        role,
        is_active,
        status,
        is_billable,
        is_organization_admin,
        is_sso_user,
        organization_id,
        facility_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, 'admin', TRUE, 'active', TRUE, TRUE, FALSE, NULL, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `, [username, email, passwordHash, fullName]);

    const newUserId = insertResult[0]?.id;

    await conn.commit();

    logSuccess('[SUCCESS] First Atiman administrator created.');
    logSuccess(`  id:       ${newUserId}`);
    logSuccess(`  username: ${username}`);
    logSuccess(`  email:    ${email}`);
    logSuccess(`  role:     admin`);
    logSuccess(`  status:   active`);
    logSuccess('[NOTICE] No organization or facility was created. Log in via /api/login first.');
  } catch (error) {
    await conn.rollback();
    logError('[FAILURE] Bootstrap rolled back.');
    logError(error.message);
    if (options.exit) {
      exitFn(1);
    }
    throw error;
  } finally {
    conn.release();
    await closePool();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[ERROR]', error.message);
    process.exit(1);
  });
}

module.exports = { main };
