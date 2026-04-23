require('dotenv').config();
const { pool } = require('./src/config/database');

(async () => {
  try {
    const [rows] = await pool.query(`
      SELECT e.id, e.name, e.code, et.type_name as type
      FROM equipment e
      JOIN equipment_types et ON e.equipment_type_id = et.id
      WHERE e.organization_id = 1 AND e.status IN ('operational', 'active')
      ORDER BY e.name
    `);
    console.log('With JOIN:', rows.length);
    console.log(rows);
    
    const [rows2] = await pool.query(`
      SELECT e.id, e.name, e.code, e.equipment_type_id, et.id as et_id, et.type_name
      FROM equipment e
      LEFT JOIN equipment_types et ON e.equipment_type_id = et.id
      WHERE e.organization_id = 1 AND e.status IN ('operational', 'active')
      ORDER BY e.name
    `);
    console.log('\nWith LEFT JOIN:', rows2.length);
    console.log(rows2);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
