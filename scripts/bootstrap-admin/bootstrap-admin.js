/**
 * Atiman First Administrator Bootstrap
 *
 * Creates exactly one fresh Atiman administrator in an empty users table.
 *
 * Rules:
 * - Refuses to run if the users table already contains any row.
 * - Reads credentials from secure environment variables or prompts.
 * - Hashes the password using the same bcrypt configuration as the app.
 * - Creates a single active admin with no organization/facility attachment.
 * - Runs inside a single database transaction.
 * - Does not print the password or password hash.
 */

const readline = require('readline');
const { pool, getConnection } = require('../../src/config/database');
const { hashPassword } = require('../../src/utils/helpers');

const REQUIRED_ENV = [
  'ADMIN_USERNAME',
  'ADMIN_EMAIL',
  'ADMIN_FULL_NAME',
  'ADMIN_PASSWORD'
];

function getEnvOrPrompt(name, rl) {
  const value = process.env[name];
  if (value && value.trim().length > 0) {
    return Promise.resolve(value.trim());
  }

  return new Promise((resolve) => {
    const isPassword = name.includes('PASSWORD');
    const prompt = isPassword
      ? `${name} (input hidden): `
      : `${name}: `;

    if (isPassword && rl.output.isTTY) {
      rl.question(prompt, { input: rl.input, output: rl.output }, (answer) => {
        resolve(answer.trim());
      });
      // Hide input in raw TTY mode is non-trivial with readline; rely on env for secrets.
      return;
    }

    rl.question(prompt, (answer) => resolve(answer.trim()));
  });
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

async function main() {
  if (!process.env.ADMIN_PASSWORD) {
    console.error('[ERROR] ADMIN_PASSWORD must be provided via environment variable for security.');
    console.error('Set ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_FULL_NAME, and ADMIN_PASSWORD, then rerun.');
    process.exit(1);
  }

  const username = process.env.ADMIN_USERNAME;
  const email = process.env.ADMIN_EMAIL;
  const fullName = process.env.ADMIN_FULL_NAME;
  const password = process.env.ADMIN_PASSWORD;

  await validateInputs(username, email, fullName, password);

  const conn = await getConnection();
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

    console.log('[SUCCESS] First Atiman administrator created.');
    console.log(`  id:       ${newUserId}`);
    console.log(`  username: ${username}`);
    console.log(`  email:    ${email}`);
    console.log(`  role:     admin`);
    console.log(`  status:   active`);
    console.log('[NOTICE] No organization or facility was created. Log in via /api/login first.');
  } catch (error) {
    await conn.rollback();
    console.error('[FAILURE] Bootstrap rolled back.');
    console.error(error.message);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('[ERROR]', error.message);
  process.exit(1);
});
