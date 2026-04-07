const { pool } = require('./src/config/database');

async function check() {
  const connection = await pool.getConnection();
  
  try {
    console.log('=== EQUIPMENT CATEGORIES ===');
    const [categories] = await connection.execute('SELECT category_code, category_name FROM equipment_categories ORDER BY category_name');
    categories.forEach(c => console.log(` - ${c.category_name} (${c.category_code})`));
    
    console.log('\n=== EQUIPMENT CLASSES (Sample) ===');
    const [classes] = await connection.execute(`
      SELECT ec.class_name, ec.class_code, c.category_name
      FROM equipment_classes ec
      JOIN equipment_categories c ON ec.category_id = c.id
      ORDER BY ec.class_name
      LIMIT 15
    `);
    classes.forEach(c => console.log(` - ${c.class_name} (${c.class_code}) [${c.category_name}]`));
    
    console.log('\n=== PUMP-RELATED EQUIPMENT TYPES ===');
    const [pumpTypes] = await connection.execute(`
      SELECT et.type_name, et.type_code, ec.class_name
      FROM equipment_types et
      JOIN equipment_classes ec ON et.class_id = ec.id
      WHERE et.type_name LIKE '%pump%' OR et.type_name LIKE '%Pump%'
      ORDER BY et.type_name
    `);
    if (pumpTypes.length === 0) {
      console.log(' - NONE FOUND!');
    } else {
      pumpTypes.forEach(t => console.log(` - ${t.type_name} (${t.type_code}) [${t.class_name}]`));
    }
    
    console.log('\n=== ALL EQUIPMENT TYPES (Total Count) ===');
    const [count] = await connection.execute('SELECT COUNT(*) as count FROM equipment_types');
    console.log(`Total: ${count[0].count} equipment types`);
    
    console.log('\n=== TEMPLATES FOR PUMPS ===');
    const [pumpTemplates] = await connection.execute(`
      SELECT tt.template_name, et.type_name 
      FROM task_templates tt
      JOIN equipment_types et ON tt.equipment_type_id = et.id
      WHERE LOWER(et.type_name) LIKE '%pump%'
      LIMIT 10
    `);
    if (pumpTemplates.length === 0) {
      console.log(' - NONE FOUND!');
    } else {
      pumpTemplates.forEach(t => console.log(` - ${t.template_name} -> ${t.type_name}`));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    connection.release();
    await pool.end();
  }
}

check();
