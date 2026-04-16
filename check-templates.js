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
  
  const [[totalTemplates]] = await conn.execute('SELECT COUNT(*) as c FROM task_templates WHERE is_system = TRUE');
  const [[templatesWithIndustry]] = await conn.execute('SELECT COUNT(*) as c FROM task_templates WHERE is_system = TRUE AND industry_id IS NOT NULL');
  const [[templatesWithEquip]] = await conn.execute('SELECT COUNT(*) as c FROM task_templates WHERE is_system = TRUE AND equipment_type_id IS NOT NULL');
  
  console.log('System templates:', totalTemplates.c);
  console.log('System templates with industry_id:', templatesWithIndustry.c);
  console.log('System templates with equipment_type_id:', templatesWithEquip.c);
  
  const [industryDist] = await conn.execute(`
    SELECT i.code, COUNT(tt.id) as template_count
    FROM task_templates tt
    JOIN industries i ON tt.industry_id = i.id
    WHERE tt.is_system = TRUE
    GROUP BY i.code
    ORDER BY i.code
  `);
  console.log('\nTemplates per industry:');
  industryDist.forEach(row => console.log(' ', row.code, '-', row.template_count));
  
  const [equipIndustries] = await conn.execute(`
    SELECT i.code, COUNT(DISTINCT tt.equipment_type_id) as et_count
    FROM task_templates tt
    JOIN industries i ON tt.industry_id = i.id
    WHERE tt.is_system = TRUE AND tt.equipment_type_id IS NOT NULL
    GROUP BY i.code
    ORDER BY i.code
  `);
  console.log('\nEquipment types per industry (from templates):');
  equipIndustries.forEach(row => console.log(' ', row.code, '-', row.et_count));
  
  await conn.end();
})();
