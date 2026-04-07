/**
 * Create maintenance plans table
 */
const { pool } = require('./src/config/database');

async function createTable() {
  const connection = await pool.getConnection();
  
  try {
    console.log('[TABLE] Creating maintenance_plans table...');
    
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS maintenance_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        organization_id INT NOT NULL,
        task_template_id INT NOT NULL,
        equipment_id INT,
        plan_code VARCHAR(50),
        plan_name VARCHAR(255) NOT NULL,
        description TEXT,
        frequency_type ENUM('daily', 'weekly', 'monthly', 'yearly') NOT NULL,
        frequency_interval INT DEFAULT 1,
        day_of_week TINYINT,
        day_of_month TINYINT,
        month_of_year TINYINT,
        start_date DATE NOT NULL,
        end_date DATE,
        priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
        assigned_to INT,
        is_active BOOLEAN DEFAULT TRUE,
        last_run_date DATE,
        next_run_date DATE,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    
    console.log('[TABLE] ✓ Table created');
    
    // Check if data already exists
    const [existing] = await connection.execute('SELECT COUNT(*) as count FROM maintenance_plans');
    
    if (existing[0].count === 0) {
      console.log('[TABLE] Migrating data from templates...');
      
      await connection.execute(`
        INSERT INTO maintenance_plans (
          organization_id, task_template_id, plan_code, plan_name, description,
          frequency_type, frequency_interval, day_of_week, day_of_month, start_date,
          priority, is_active
        )
        SELECT 
          COALESCE(tt.organization_id, 1),
          tt.id,
          CONCAT('PLAN-', tt.template_code),
          CONCAT('Schedule for ', tt.template_name),
          CONCAT('Auto-generated plan for ', tt.template_name),
          COALESCE(tt.frequency_type, 'daily'),
          COALESCE(tt.frequency_interval, 1),
          tt.day_of_week,
          tt.day_of_month,
          COALESCE(tt.start_date, CURDATE()),
          COALESCE(tt.priority, 'medium'),
          tt.is_active
        FROM task_templates tt
        WHERE tt.frequency_type IS NOT NULL
      `);
      
      console.log('[TABLE] ✓ Data migrated');
    } else {
      console.log('[TABLE] Data already exists, skipping migration');
    }
    
    // Show count
    const [count] = await connection.execute('SELECT COUNT(*) as count FROM maintenance_plans');
    console.log(`[TABLE] Total maintenance plans: ${count[0].count}`);
    
  } catch (error) {
    console.error('[TABLE] ✗ Error:', error.message);
  } finally {
    connection.release();
    await pool.end();
  }
}

createTable();
