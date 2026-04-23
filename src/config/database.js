/**
 * Database Configuration
 * Uses MySQL2 with connection pooling
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const createPool = () => mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  database: process.env.DB_NAME || 'odm_cmms',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  waitForConnections: true,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

const pool = createPool();

// Test connection
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

// Get database connection (for raw queries in controllers)
const getDb = () => ({
  query: async (sql, params) => {
    const [results] = await pool.execute(sql, params);
    return results;
  }
});

module.exports = {
  pool,
  createPool,
  testConnection,
  getDb
};
