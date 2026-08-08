/**
 * Database Configuration
 * Uses MySQL2 with connection pooling.
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const isIntegrationTest = () => process.env.NODE_ENV === 'test' && process.env.RUN_DB_TESTS === 'true';

const getDatabaseConfig = () => {
  if (isIntegrationTest()) {
    const required = ['TEST_DB_HOST', 'TEST_DB_PORT', 'TEST_DB_NAME', 'TEST_DB_USER', 'TEST_DB_PASSWORD'];
    const missing = required.filter((name) => !process.env[name]);
    const name = process.env.TEST_DB_NAME || '';
    if (missing.length || !/(?:^|[_-])test(?:$|[_-])/i.test(name)) {
      throw new Error(`Refusing destructive integration tests: configure ${required.join(', ')} and use a clearly disposable TEST_DB_NAME.`);
    }
    return {
      host: process.env.TEST_DB_HOST,
      port: parseInt(process.env.TEST_DB_PORT, 10),
      database: name,
      user: process.env.TEST_DB_USER,
      password: process.env.TEST_DB_PASSWORD
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    database: process.env.DB_NAME || 'odm_cmms',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  };
};

const createPool = () => mysql.createPool({
  ...getDatabaseConfig(),
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

const pool = createPool();

const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    return false;
  }
};

const getDb = () => ({
  query: async (sql, params) => {
    const [results] = await pool.execute(sql, params);
    return results;
  }
});

module.exports = { pool, createPool, testConnection, getDb, getDatabaseConfig, isIntegrationTest };
