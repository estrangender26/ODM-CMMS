require('dotenv').config();
const { TaskTemplate } = require('./src/models');

(async () => {
  try {
    const equipment = await TaskTemplate.query(`
      SELECT e.id, e.name, e.code, COALESCE(et.type_name, 'Unknown') as type
      FROM equipment e
      LEFT JOIN equipment_types et ON e.equipment_type_id = et.id
      WHERE e.organization_id = ? AND e.status IN ('operational', 'active')
      ORDER BY e.name
    `, [1]);
    console.log('Equipment returned after fix:', equipment.length);
    console.log(equipment);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
