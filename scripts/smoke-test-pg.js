#!/usr/bin/env node
'use strict';

const { Pool } = require('pg');

const sslModes = new Set(['require', 'verify-ca', 'verify-full']);
const sslEnabled = process.env.DB_SSL === 'true' || sslModes.has(process.env.PGSSLMODE);

const pool = new Pool({
  host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.PGPORT || process.env.DB_PORT, 10) || 5432,
  database: process.env.PGDATABASE || process.env.DB_NAME || 'odm_cmms',
  user: process.env.PGUSER || process.env.DB_USER || 'postgres',
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
  ssl: sslEnabled
    ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
    : false,
  connectionTimeoutMillis: 5000
});

async function smokeTest() {
  let client;

  try {
    client = await pool.connect();
    await client.query('SELECT 1');

    const usersTableResult = await client.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'users'
          AND table_type = 'BASE TABLE'
      ) AS exists
    `);

    if (!usersTableResult.rows[0].exists) {
      throw new Error('Required public.users table was not found. Run scripts/deploy-render-supabase.sh to apply the PostgreSQL schema.');
    }

    const tableCountResult = await client.query(`
      SELECT COUNT(*)::integer AS count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `);
    const viewCountResult = await client.query(`
      SELECT COUNT(*)::integer AS count
      FROM information_schema.views
      WHERE table_schema = 'public'
    `);

    console.log(`PostgreSQL schema: ${tableCountResult.rows[0].count} base tables, ${viewCountResult.rows[0].count} views in public.`);

    client.release();
    client = null;
    await pool.end();
    console.log('PostgreSQL smoke test PASSED.');
  } catch (error) {
    if (client) {
      client.release();
    }
    await pool.end().catch(() => {});
    console.error(`PostgreSQL smoke test FAILED: ${error.message}`);
    process.exit(1);
  }
}

smokeTest();
