require('dotenv').config();
const { pool } = require('./src/config/database');

(async () => {
  try {
    // 1. Equipment types with families
    const [equipmentTypes] = await pool.query(`
      SELECT 
        et.id,
        et.type_name,
        et.type_code,
        ec.class_name,
        c.category_name,
        tfm.family_code,
        tf.family_name
      FROM equipment_types et
      JOIN equipment_classes ec ON et.class_id = ec.id
      JOIN equipment_categories c ON ec.category_id = c.id
      LEFT JOIN equipment_type_family_mappings tfm ON et.id = tfm.equipment_type_id
      LEFT JOIN template_families tf ON tfm.family_code = tf.family_code
      ORDER BY c.category_name, ec.class_name, et.type_name
    `);
    console.log('Equipment types:', equipmentTypes.length);

    // 2. Templates with their equipment types and task kinds
    const [templates] = await pool.query(`
      SELECT 
        tt.id,
        tt.template_code,
        tt.template_name,
        tt.task_kind,
        et.type_name,
        ec.class_name,
        c.category_name,
        tfm.family_code
      FROM task_templates tt
      LEFT JOIN equipment_types et ON tt.equipment_type_id = et.id
      LEFT JOIN equipment_classes ec ON et.class_id = ec.id
      LEFT JOIN equipment_categories c ON ec.category_id = c.id
      LEFT JOIN equipment_type_family_mappings tfm ON et.id = tfm.equipment_type_id
      WHERE tt.is_system = TRUE
      ORDER BY tt.id
    `);
    console.log('System templates:', templates.length);

    // 3. Unique families + task kinds combo count
    const [combos] = await pool.query(`
      SELECT 
        tfm.family_code,
        tt.task_kind,
        COUNT(*) as template_count
      FROM task_templates tt
      LEFT JOIN equipment_types et ON tt.equipment_type_id = et.id
      LEFT JOIN equipment_type_family_mappings tfm ON et.id = tfm.equipment_type_id
      WHERE tt.is_system = TRUE
      GROUP BY tfm.family_code, tt.task_kind
      ORDER BY tfm.family_code, tt.task_kind
    `);
    console.log('Family + task kind combos:', combos.length);
    console.log(combos);

    // 4. Sample of templates per family
    const [sample] = await pool.query(`
      SELECT 
        tfm.family_code,
        tt.task_kind,
        tt.template_name,
        et.type_name
      FROM task_templates tt
      LEFT JOIN equipment_types et ON tt.equipment_type_id = et.id
      LEFT JOIN equipment_type_family_mappings tfm ON et.id = tfm.equipment_type_id
      WHERE tt.is_system = TRUE
      ORDER BY tfm.family_code, tt.task_kind, et.type_name
      LIMIT 20
    `);
    console.log('\nSample templates:');
    console.log(sample);

    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
