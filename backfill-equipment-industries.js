require('dotenv').config();
const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'odm_cmms',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  });

  console.log('Backfilling equipment_type_industries from system templates...');

  // Get distinct equipment_type_id + industry_id combinations from system templates
  const [mappings] = await conn.execute(`
    SELECT DISTINCT 
      tt.equipment_type_id, 
      tt.industry_id,
      i.code as industry_code
    FROM task_templates tt
    JOIN industries i ON tt.industry_id = i.id
    WHERE tt.is_system = TRUE 
      AND tt.equipment_type_id IS NOT NULL 
      AND tt.industry_id IS NOT NULL
  `);

  console.log(`Found ${mappings.length} equipment type -> industry mappings from templates`);

  let inserted = 0;
  let skipped = 0;

  for (const m of mappings) {
    try {
      await conn.execute(
        'INSERT INTO equipment_type_industries (equipment_type_id, industry_id) VALUES (?, ?)',
        [m.equipment_type_id, m.industry_id]
      );
      inserted++;
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        skipped++;
      } else {
        console.error('Error inserting:', err.message);
      }
    }
  }

  console.log(`Inserted: ${inserted}, Skipped (already exist): ${skipped}`);

  // Show per-industry counts after backfill
  const [perIndustry] = await conn.execute(`
    SELECT i.code, COUNT(eti.equipment_type_id) as et_count
    FROM industries i
    JOIN equipment_type_industries eti ON i.id = eti.industry_id
    GROUP BY i.id, i.code
    ORDER BY i.code
  `);
  console.log('\nEquipment types per industry after backfill:');
  perIndustry.forEach(row => console.log(' ', row.code, '-', row.et_count));

  await conn.end();
})();
