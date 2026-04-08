/**
 * System Task Template Seed
 * Step 3: Populate immutable system task templates for all equipment types
 * 
 * Uses family-based template assignment to generate standardized
 * maintenance templates for each equipment type in the ISO taxonomy.
 */

const db = require('../../src/config/database');
const { TemplateFamilies, getFamilyForEquipmentType, getTemplatesForFamily } = require('./002_template_families');

/**
 * Template Step Definitions by Task Kind
 * Standardized steps for each type of maintenance task
 */
const StepDefinitions = {
  inspection: [
    {
      step_no: 1,
      step_type: 'inspection',
      instruction: 'Visually inspect equipment for leaks, unusual noise, or damage',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: true,
      safety_note: 'Visual inspection only - no physical contact required',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 2,
      step_type: 'inspection',
      instruction: 'Check for abnormal vibrations or sounds during operation',
      data_type: 'dropdown',
      options: JSON.stringify(['Normal', 'Slight', 'Moderate', 'Severe']),
      is_required: true,
      is_visual_only: true,
      safety_note: 'Perform from safe distance - do not touch rotating parts',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 3,
      step_type: 'inspection',
      instruction: 'Verify all guards and safety devices are in place',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: true,
      safety_note: 'Do not operate without guards in place',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: true
    }
  ],

  measurement: [
    {
      step_no: 1,
      step_type: 'measurement',
      instruction: 'Record operating temperature (°C)',
      data_type: 'number',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Use non-contact IR thermometer if surface is hot',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 2,
      step_type: 'measurement',
      instruction: 'Record operating pressure (bar/kPa)',
      data_type: 'number',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Verify gauge is rated for operating pressure',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 3,
      step_type: 'measurement',
      instruction: 'Measure and record vibration level (mm/s RMS)',
      data_type: 'number',
      min_value: 0,
      max_value: 50,
      is_required: true,
      is_visual_only: false,
      safety_note: 'Equipment must be at operating speed for valid measurement',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    }
  ],

  cleaning: [
    {
      step_no: 1,
      step_type: 'safety_check',
      instruction: 'Lock out and tag out equipment',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Verify zero energy state before proceeding',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: true
    },
    {
      step_no: 2,
      step_type: 'cleaning',
      instruction: 'Remove dust and debris from external surfaces',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Use appropriate cleaning tools - avoid compressed air near bearings',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: false
    },
    {
      step_no: 3,
      step_type: 'cleaning',
      instruction: 'Clean cooling fins, filters, or heat exchange surfaces',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Wear dust mask when cleaning dirty filters',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: false
    }
  ],

  lubrication: [
    {
      step_no: 1,
      step_type: 'safety_check',
      instruction: 'Lock out equipment if guards must be removed',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Never remove guards while equipment is running',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: true
    },
    {
      step_no: 2,
      step_type: 'inspection',
      instruction: 'Check oil level and condition',
      data_type: 'dropdown',
      options: JSON.stringify(['Full/Clean', 'Full/Dark', 'Low', 'Empty']),
      is_required: true,
      is_visual_only: false,
      safety_note: 'Allow hot oil to cool before checking',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 3,
      step_type: 'lubrication',
      instruction: 'Add or change lubricant as required',
      data_type: 'text',
      is_required: false,
      is_visual_only: false,
      safety_note: 'Use correct lubricant grade - verify with manual',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: false
    }
  ],

  adjustment: [
    {
      step_no: 1,
      step_type: 'safety_check',
      instruction: 'Lock out and verify zero energy',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Verify isolation before adjustment work',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: true
    },
    {
      step_no: 2,
      step_type: 'measurement',
      instruction: 'Measure and record current settings/alignment',
      data_type: 'text',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Document current state before making changes',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: false
    },
    {
      step_no: 3,
      step_type: 'adjustment',
      instruction: 'Make adjustments per manufacturer specification',
      data_type: 'text',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Use proper tools - do not force adjustments',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: false
    }
  ],

  tightening: [
    {
      step_no: 1,
      step_type: 'safety_check',
      instruction: 'Lock out equipment',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Equipment must be stopped for tightening work',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: true
    },
    {
      step_no: 2,
      step_type: 'inspection',
      instruction: 'Visually inspect all fasteners for looseness or corrosion',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: true,
      safety_note: 'Mark any loose fasteners found',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: false
    },
    {
      step_no: 3,
      step_type: 'adjustment',
      instruction: 'Torque fasteners to specification',
      data_type: 'number',
      unit: 'Nm',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Use calibrated torque wrench - mark with paint pen after torquing',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: false
    }
  ],

  testing: [
    {
      step_no: 1,
      step_type: 'safety_check',
      instruction: 'Notify operations and secure area',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Ensure personnel are clear before functional testing',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: true
    },
    {
      step_no: 2,
      step_type: 'functional_test',
      instruction: 'Perform functional test per test procedure',
      data_type: 'dropdown',
      options: JSON.stringify(['Pass', 'Fail', 'Partial']),
      is_required: true,
      is_visual_only: false,
      safety_note: 'Monitor for abnormal conditions during test',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: true
    },
    {
      step_no: 3,
      step_type: 'measurement',
      instruction: 'Record test results and any deviations',
      data_type: 'text',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Document all findings for reliability tracking',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    }
  ],

  calibration: [
    {
      step_no: 1,
      step_type: 'safety_check',
      instruction: 'Isolate instrument from control system if required',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Follow MOC procedure for bypassed instruments',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 2,
      step_type: 'measurement',
      instruction: 'Apply known reference value (low range)',
      data_type: 'number',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Verify reference standard is current calibration',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 3,
      step_type: 'measurement',
      instruction: 'Apply known reference value (high range)',
      data_type: 'number',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Do not exceed instrument rated pressure/temperature',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 4,
      step_type: 'adjustment',
      instruction: 'Adjust zero and span if outside tolerance',
      data_type: 'boolean',
      is_required: false,
      is_visual_only: false,
      safety_note: 'Document as-found and as-left values',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    }
  ],

  safety_check: [
    {
      step_no: 1,
      step_type: 'safety_check',
      instruction: 'Verify all safety guards are in place and secure',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: true,
      safety_note: 'Never operate equipment without guards',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: true
    },
    {
      step_no: 2,
      step_type: 'safety_check',
      instruction: 'Check emergency stop function',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Coordinate with operations before testing E-stop',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 3,
      step_type: 'safety_check',
      instruction: 'Verify safety interlocks and alarms',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: true,
      safety_note: 'Report any disabled or bypassed safety systems immediately',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: true
    }
  ]
};

/**
 * Frequency mapping to database values
 */
const FrequencyMapping = {
  daily: { value: 1, unit: 'days' },
  weekly: { value: 1, unit: 'weeks' },
  monthly: { value: 1, unit: 'months' },
  quarterly: { value: 3, unit: 'months' },
  semi_annual: { value: 6, unit: 'months' },
  annual: { value: 1, unit: 'years' }
};

/**
 * Safety Controls by Task Kind
 */
const SafetyControlsByTaskKind = {
  inspection: [
    { safety_type: 'PPE', description: 'Safety glasses required', is_mandatory: true },
    { safety_type: 'PPE', description: 'Work gloves as needed', is_mandatory: false }
  ],
  measurement: [
    { safety_type: 'PPE', description: 'Safety glasses required', is_mandatory: true },
    { safety_type: 'PPE', description: 'Thermal protection for hot surfaces', is_mandatory: false }
  ],
  cleaning: [
    { safety_type: 'LOTO', description: 'Lock out/tag out required', is_mandatory: true },
    { safety_type: 'PPE', description: 'Dust mask for filter cleaning', is_mandatory: false }
  ],
  lubrication: [
    { safety_type: 'LOTO', description: 'Lock out if guards removed', is_mandatory: true },
    { safety_type: 'PPE', description: 'Oil-resistant gloves', is_mandatory: false }
  ],
  adjustment: [
    { safety_type: 'LOTO', description: 'Lock out/tag out required', is_mandatory: true },
    { safety_type: 'PPE', description: 'Safety glasses required', is_mandatory: true }
  ],
  tightening: [
    { safety_type: 'LOTO', description: 'Lock out/tag out required', is_mandatory: true },
    { safety_type: 'PPE', description: 'Safety glasses required', is_mandatory: true }
  ],
  testing: [
    { safety_type: 'permit', description: 'Functional test permit may be required', is_mandatory: false },
    { safety_type: 'PPE', description: 'Area safety equipment as required', is_mandatory: true }
  ],
  calibration: [
    { safety_type: 'PPE', description: 'Safety glasses required', is_mandatory: true },
    { safety_type: 'permit', description: 'MOC if bypassing control', is_mandatory: false }
  ],
  safety_check: [
    { safety_type: 'PPE', description: 'Safety glasses required', is_mandatory: true },
    { safety_type: 'permit', description: 'E-stop test coordination with operations', is_mandatory: false }
  ]
};

/**
 * Seed system task templates for all equipment types
 */
async function seedSystemTaskTemplates() {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    console.log('Step 3: Seeding system task templates...');
    
    // Get all equipment types with their class and category
    const [equipmentTypes] = await connection.query(`
      SELECT 
        et.id,
        et.type_name,
        et.type_code,
        et.class_id,
        ec.class_name,
        ec.category_id
      FROM equipment_types et
      JOIN equipment_classes ec ON et.class_id = ec.id
      ORDER BY et.id
    `);
    
    console.log(`Found ${equipmentTypes.length} equipment types`);
    
    let templatesCreated = 0;
    let stepsCreated = 0;
    let safetyControlsCreated = 0;
    
    for (const equipmentType of equipmentTypes) {
      // Determine family for this equipment type
      const familyCode = getFamilyForEquipmentType(
        equipmentType.type_name,
        equipmentType.type_code,
        equipmentType.class_name
      );
      
      if (!familyCode) {
        console.log(`  No family match for: ${equipmentType.type_name} (${equipmentType.type_code})`);
        continue;
      }
      
      // Get templates for this family
      const templates = getTemplatesForFamily(familyCode);
      
      for (const templateDef of templates) {
        // Check if template already exists
        const [existing] = await connection.query(
          `SELECT id FROM task_templates 
           WHERE equipment_type_id = ? 
           AND task_kind = ? 
           AND organization_id IS NULL`,
          [equipmentType.id, templateDef.task_kind]
        );
        
        if (existing.length > 0) {
          console.log(`  Skipping existing: ${templateDef.template_name}`);
          continue;
        }
        
        const freq = FrequencyMapping[templateDef.frequency] || { value: 1, unit: 'months' };
        
        // Create system template (organization_id = NULL, is_system = TRUE)
        const [templateResult] = await connection.query(
          `INSERT INTO task_templates 
           (organization_id, equipment_type_id, template_code, template_name, 
            maintenance_type, task_kind, is_system, is_editable,
            frequency_value, frequency_unit, estimated_duration_minutes, 
            description, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            null, // organization_id = NULL for system templates
            equipmentType.id,
            templateDef.template_code,
            templateDef.template_name,
            'preventive',
            templateDef.task_kind,
            true,  // is_system
            false, // is_editable
            freq.value,
            freq.unit,
            templateDef.estimated_duration,
            `System template for ${templateDef.task_kind} of ${TemplateFamilies[familyCode].family_name}`,
            true
          ]
        );
        
        const templateId = templateResult.insertId;
        templatesCreated++;
        
        // Create steps with safety metadata
        const steps = StepDefinitions[templateDef.task_kind] || [];
        for (const step of steps) {
          await connection.query(
            `INSERT INTO task_template_steps 
             (task_template_id, step_no, step_type, instruction, data_type,
              expected_value, min_value, max_value, unit, is_required, options,
              safety_note, is_visual_only, requires_equipment_stopped,
              prohibit_if_running, prohibit_opening_covers, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
              templateId,
              step.step_no,
              step.step_type,
              step.instruction,
              step.data_type,
              step.expected_value || null,
              step.min_value || null,
              step.max_value || null,
              step.unit || null,
              step.is_required,
              step.options || null,
              step.safety_note,
              step.is_visual_only,
              step.requires_equipment_stopped,
              step.prohibit_if_running,
              step.prohibit_opening_covers
            ]
          );
          stepsCreated++;
        }
        
        // Create template-level safety controls
        const safetyControls = SafetyControlsByTaskKind[templateDef.task_kind] || [];
        for (const control of safetyControls) {
          await connection.query(
            `INSERT INTO task_template_safety_controls 
             (task_template_id, safety_type, description, is_mandatory, created_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [templateId, control.safety_type, control.description, control.is_mandatory]
          );
          safetyControlsCreated++;
        }
        
        console.log(`  Created: ${templateDef.template_name} (${steps.length} steps, ${safetyControls.length} safety controls)`);
      }
    }
    
    await connection.commit();
    
    console.log('\n========================================');
    console.log('Step 3 Seed Complete');
    console.log('========================================');
    console.log(`Templates created: ${templatesCreated}`);
    console.log(`Steps created: ${stepsCreated}`);
    console.log(`Safety controls created: ${safetyControlsCreated}`);
    console.log('========================================\n');
    
    return {
      templatesCreated,
      stepsCreated,
      safetyControlsCreated
    };
    
  } catch (error) {
    await connection.rollback();
    console.error('Error seeding system task templates:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run if called directly
if (require.main === module) {
  seedSystemTaskTemplates()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { seedSystemTaskTemplates };
