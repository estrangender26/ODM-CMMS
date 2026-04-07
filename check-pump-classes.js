const { pool } = require('./src/config/database');

async function check() {
  const connection = await pool.getConnection();
  
  try {
    console.log('=== PUMP CLASSES ===');
    const [pumpClasses] = await connection.execute(`
      SELECT ec.class_name, c.category_name
      FROM equipment_classes ec
      JOIN equipment_categories c ON ec.category_id = c.id
      WHERE LOWER(ec.class_name) LIKE '%pump%'
      ORDER BY ec.class_name
    `);
    pumpClasses.forEach(c => console.log(` - ${c.class_name} [${c.category_name}]`));
    
    console.log('\n=== CENTRIFUGAL PUMP TYPES ===');
    const [centTypes] = await connection.execute(`
      SELECT et.type_name, et.type_code
      FROM equipment_types et
      JOIN equipment_classes ec ON et.class_id = ec.id
      WHERE LOWER(ec.class_name) = 'centrifugal pump'
      ORDER BY et.type_name
    `);
    centTypes.forEach(t => console.log(` - ${t.type_name} (${t.type_code})`));
    
    console.log('\n=== RECIPROCATING PUMP TYPES ===');
    const [recipTypes] = await connection.execute(`
      SELECT et.type_name, et.type_code
      FROM equipment_types et
      JOIN equipment_classes ec ON et.class_id = ec.id
      WHERE LOWER(ec.class_name) = 'reciprocating pump'
      ORDER BY et.type_name
    `);
    recipTypes.forEach(t => console.log(` - ${t.type_name} (${t.type_code})`));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    connection.release();
    await pool.end();
  }
}

check();
