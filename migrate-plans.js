/**
 * Run maintenance plans migration
 */
const { pool } = require('./src/config/database');
const fs = require('fs');

async function migrate() {
  const connection = await pool.getConnection();
  
  try {
    console.log('[MIGRATE] Running maintenance plans migration...');
    
    const sql = fs.readFileSync('./database/migrations/011_add_maintenance_plans.sql', 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sql.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim() && !statement.includes('--')) {
        try {
          await connection.execute(statement);
        } catch (err) {
          // Ignore "already exists" errors
          if (!err.message.includes('Duplicate') && !err.message.includes('already exists')) {
            console.log('[MIGRATE] Note:', err.message);
          }
        }
      }
    }
    
    console.log('[MIGRATE] ✓ Migration completed');
    
  } catch (error) {
    console.error('[MIGRATE] ✗ Error:', error.message);
  } finally {
    connection.release();
    await pool.end();
  }
}

migrate();
