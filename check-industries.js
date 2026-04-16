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
  
  const [[totalEt]] = await conn.execute('SELECT COUNT(*) as count FROM equipment_types');
  const [[totalInd]] = await conn.execute('SELECT COUNT(*) as count FROM industries WHERE is_active = TRUE');
  const [[mappedEtInd]] = await conn.execute('SELECT COUNT(DISTINCT equipment_type_id) as count FROM equipment_type_industries');
  const [[totalMappings]] = await conn.execute('SELECT COUNT(*) as count FROM equipment_type_industries');
  
  console.log('Equipment types:', totalEt.count);
  console.log('Industries:', totalInd.count);
  console.log('Equipment types with industry mapping:', mappedEtInd.count);
  console.log('Total equipment_type_industries mappings:', totalMappings.count);
  
  const [perIndustry] = await conn.execute(`
    SELECT i.code, i.name, COUNT(eti.equipment_type_id) as et_count
    FROM industries i
    LEFT JOIN equipment_type_industries eti ON i.id = eti.industry_id
    WHERE i.is_active = TRUE
    GROUP BY i.id, i.code, i.name
    ORDER BY i.code
  `);
  console.log('\nPer industry equipment types:');
  perIndustry.forEach(row => console.log(' ', row.code, '-', row.et_count));
  
  await conn.end();
})();
