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
  
  const [rows] = await conn.execute("SELECT ec.id, ec.class_code, ec.class_name, ec.category_id, c.category_code, c.category_name FROM equipment_classes ec JOIN equipment_categories c ON ec.category_id = c.id WHERE ec.class_code = 'CHILLER'");
  console.log('CHILLER classes found:', rows.length);
  rows.forEach(r => console.log(r));
  
  const [cat45] = await conn.execute("SELECT id, category_code, category_name FROM equipment_categories WHERE id = 45");
  console.log('Category 45:', cat45[0]);
  
  await conn.end();
})();
