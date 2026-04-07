/**
 * Add default inspection items to task templates
 * Usage: node add-inspection-items.js
 */

const fs = require('fs');
const { pool } = require('./src/config/database');

async function addInspectionItems() {
  const connection = await pool.getConnection();
  
  try {
    console.log('[ITEMS] Loading inspection items data...');
    const itemsData = JSON.parse(
      fs.readFileSync('./odm_seed/master_data/default_inspection_items.json', 'utf8')
    );
    
    // Get all templates with their equipment class
    const [templates] = await connection.execute(`
      SELECT tt.id, tt.template_name, ec.class_code
      FROM task_templates tt
      JOIN equipment_types et ON tt.equipment_type_id = et.id
      JOIN equipment_classes ec ON et.class_id = ec.id
    `);
    
    console.log(`[ITEMS] Found ${templates.length} templates`);
    
    let itemsAdded = 0;
    
    for (const template of templates) {
      // Check if template already has items
      const [existingItems] = await connection.execute(
        'SELECT COUNT(*) as count FROM task_template_steps WHERE task_template_id = ?',
        [template.id]
      );
      
      if (existingItems[0].count > 0) {
        console.log(`  Skipping ${template.template_name} - already has items`);
        continue;
      }
      
      // Determine which inspection set to use
      let inspectionSet = itemsData.default_inspections.GENERIC;
      const classCode = template.class_code;
      
      if (classCode.includes('PUMP')) {
        inspectionSet = itemsData.default_inspections.PUMP;
      } else if (classCode.includes('MOTOR')) {
        inspectionSet = itemsData.default_inspections.MOTOR;
      } else if (classCode.includes('VALVE')) {
        inspectionSet = itemsData.default_inspections.VALVE;
      } else if (classCode.includes('INSTRUMENT') || classCode.includes('FLOW') || classCode.includes('PRESSURE') || classCode.includes('LEVEL') || classCode.includes('TEMPERATURE')) {
        inspectionSet = itemsData.default_inspections.INSTRUMENT;
      } else if (classCode.includes('COMPRESSOR') || classCode.includes('BLOWER')) {
        inspectionSet = itemsData.default_inspections.COMPRESSOR;
      } else if (classCode.includes('FILTER')) {
        inspectionSet = itemsData.default_inspections.FILTER;
      }
      
      // Add inspection items
      for (const item of inspectionSet) {
        await connection.execute(
          `INSERT INTO task_template_steps 
           (task_template_id, step_no, step_type, instruction, data_type, 
            expected_value, min_value, max_value, unit, is_required, options)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            template.id,
            item.step_no,
            item.step_type,
            item.instruction,
            item.data_type,
            item.expected_value || null,
            item.min_value || null,
            item.max_value || null,
            item.unit || null,
            item.is_required !== false,
            item.options ? JSON.stringify(item.options) : null
          ]
        );
        itemsAdded++;
      }
      
      console.log(`  Added ${inspectionSet.length} items to ${template.template_name}`);
    }
    
    console.log(`[ITEMS] ✓ Completed! Added ${itemsAdded} inspection items total`);
    
  } catch (error) {
    console.error('[ITEMS] ✗ Error:', error.message);
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

addInspectionItems().catch(console.error);
