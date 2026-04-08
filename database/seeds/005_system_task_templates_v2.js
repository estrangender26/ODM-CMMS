/**
 * System Task Template Seed v2 (Patched)
 * Step 3: Populate immutable system task templates
 * 
 * PATCHED VERSION:
 * - Uses explicit family mappings from equipment_type_family_mappings table
 * - Deeper inspection steps (4-8 steps per template)
 * - Explicit industry_id assignment
 * - Seed batch tracking for safe rollback
 * - Safety controls are guidance only (no workflow dependencies)
 */

const db = require('../../src/config/database');

/**
 * BATCH IDENTIFIER for safe rollback
 */
const SEED_BATCH_ID = 'step3_system_templates_v1';
const SEED_BATCH_NAME = 'Step 3: System Task Templates';
const SEED_BATCH_VERSION = '1.0.0';

/**
 * Deep Step Definitions by Task Kind
 * Practical ODM inspection point coverage
 * - Simple assets: 4-5 steps
 * - Rotating/process assets: 5-8 steps
 */
const StepDefinitions = {
  inspection: [
    {
      step_no: 1,
      step_type: 'inspection',
      instruction: 'Visually inspect exterior for leaks, corrosion, or physical damage',
      data_type: 'dropdown',
      options: JSON.stringify(['Good', 'Minor Issues', 'Major Issues', 'Critical']),
      is_required: true,
      is_visual_only: true,
      safety_note: 'Visual inspection only - maintain safe distance from rotating parts',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 2,
      step_type: 'inspection',
      instruction: 'Check for abnormal noise or vibration during operation',
      data_type: 'dropdown',
      options: JSON.stringify(['Normal', 'Slight Anomaly', 'Moderate Anomaly', 'Severe Anomaly']),
      is_required: true,
      is_visual_only: true,
      safety_note: 'Do not touch equipment while running',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 3,
      step_type: 'inspection',
      instruction: 'Verify all safety guards, covers, and shields are in place and secure',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: true,
      safety_note: 'Never operate without guards in place - report missing guards immediately',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: true
    },
    {
      step_no: 4,
      step_type: 'inspection',
      instruction: 'Check indicator lights, gauges, and display panels for normal readings',
      data_type: 'text',
      is_required: true,
      is_visual_only: true,
      safety_note: 'Record any abnormal readings for trending',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 5,
      step_type: 'inspection',
      instruction: 'Inspect foundations, supports, and mounting bolts for looseness or deterioration',
      data_type: 'dropdown',
      options: JSON.stringify(['Secure', 'Minor Looseness', 'Requires Attention', 'Critical']),
      is_required: true,
      is_visual_only: true,
      safety_note: 'Do not operate with loose mounting - risk of catastrophic failure',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 6,
      step_type: 'inspection',
      instruction: 'Check seal condition and packing for leakage (if applicable)',
      data_type: 'dropdown',
      options: JSON.stringify(['No Leakage', 'Minimal Weep', 'Drip', 'Spray/Heavy']),
      is_required: false,
      is_visual_only: true,
      safety_note: 'Identify leak source - do not overtighten while running',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    }
  ],

  measurement: [
    {
      step_no: 1,
      step_type: 'measurement',
      instruction: 'Measure and record operating temperature (°C) at designated points',
      data_type: 'number',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Use non-contact IR thermometer for hot surfaces (>60°C)',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 2,
      step_type: 'measurement',
      instruction: 'Measure and record operating pressure (bar or kPa)',
      data_type: 'number',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Verify gauge is rated for maximum operating pressure',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 3,
      step_type: 'measurement',
      instruction: 'Measure vibration level (mm/s RMS) at bearing locations',
      data_type: 'number',
      min_value: 0,
      max_value: 50,
      is_required: true,
      is_visual_only: false,
      safety_note: 'Equipment must be at normal operating speed for valid measurement',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 4,
      step_type: 'measurement',
      instruction: 'Measure and record current draw (Amps) for electric motor',
      data_type: 'number',
      is_required: false,
      is_visual_only: false,
      safety_note: 'Use clamp meter on motor conductors - do not open panels while energized',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: true
    },
    {
      step_no: 5,
      step_type: 'measurement',
      instruction: 'Record flow rate (L/min or m³/hr) if flow meter available',
      data_type: 'number',
      is_required: false,
      is_visual_only: true,
      safety_note: 'Read from installed instrument - no intervention required',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    }
  ],

  cleaning: [
    {
      step_no: 1,
      step_type: 'safety_check',
      instruction: 'PERFORM LOCK OUT/TAG OUT - Equipment must be isolated and verified zero energy',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: false,
      safety_note: 'MANDATORY: Complete LOTO procedure before proceeding - verify zero energy state',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: true
    },
    {
      step_no: 2,
      step_type: 'cleaning',
      instruction: 'Remove dust, dirt, and debris from external surfaces and cooling fins',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Use vacuum or brush - avoid compressed air near bearings (forces debris in)',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: false
    },
    {
      step_no: 3,
      step_type: 'cleaning',
      instruction: 'Clean filters, strainers, or screens - replace if damaged',
      data_type: 'dropdown',
      options: JSON.stringify(['Clean/Good', 'Dirty/Cleaned', 'Dirty/Replace', 'Missing']),
      is_required: true,
      is_visual_only: false,
      safety_note: 'Wear dust mask - ensure correct filter orientation on reassembly',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: false
    },
    {
      step_no: 4,
      step_type: 'cleaning',
      instruction: 'Clean heat exchange surfaces, cooling coils, or radiator fins',
      data_type: 'boolean',
      is_required: false,
      is_visual_only: false,
      safety_note: 'Use appropriate cleaning solution - avoid damage to fins',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: false
    },
    {
      step_no: 5,
      step_type: 'inspection',
      instruction: 'Post-cleaning visual inspection - check for damage or deterioration revealed by cleaning',
      data_type: 'text',
      is_required: true,
      is_visual_only: true,
      safety_note: 'Document any findings with photos if possible',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: false
    }
  ],

  lubrication: [
    {
      step_no: 1,
      step_type: 'safety_check',
      instruction: 'LOCK OUT equipment if guards must be removed for access',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: false,
      safety_note: 'NEVER remove guards while equipment is running - LOTO required',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: true
    },
    {
      step_no: 2,
      step_type: 'inspection',
      instruction: 'Check oil level in sight glass or dipstick - record condition',
      data_type: 'dropdown',
      options: JSON.stringify(['Full/Clear', 'Full/Dark', 'Add Oil', 'Drain & Replace', 'Not Visible']),
      is_required: true,
      is_visual_only: false,
      safety_note: 'Allow hot oil to cool before checking - use proper PPE',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 3,
      step_type: 'lubrication',
      instruction: 'Add or change lubricant per manufacturer specification - record type and quantity',
      data_type: 'text',
      is_required: false,
      is_visual_only: false,
      safety_note: 'Use ONLY specified lubricant grade - verify compatibility',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: false
    },
    {
      step_no: 4,
      step_type: 'lubrication',
      instruction: 'Grease bearings per schedule - use correct grease type and quantity',
      data_type: 'text',
      is_required: false,
      is_visual_only: false,
      safety_note: 'Do not over-grease - can cause seal damage and overheating',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: false
    },
    {
      step_no: 5,
      step_type: 'inspection',
      instruction: 'Inspect for lubricant leaks around seals, gaskets, and fittings',
      data_type: 'dropdown',
      options: JSON.stringify(['No Leaks', 'Minor Seeps', 'Active Leaks', 'Heavy Leaks']),
      is_required: true,
      is_visual_only: true,
      safety_note: 'Report significant leaks for corrective maintenance',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    }
  ],

  adjustment: [
    {
      step_no: 1,
      step_type: 'safety_check',
      instruction: 'LOCK OUT and verify ZERO ENERGY before any adjustment work',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: false,
      safety_note: 'MANDATORY: Complete isolation - verify no stored energy (pressure, tension, etc.)',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: true
    },
    {
      step_no: 2,
      step_type: 'measurement',
      instruction: 'Measure and record current settings, clearances, or alignment before changes',
      data_type: 'text',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Document "as-found" condition - critical for rollback if needed',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: false
    },
    {
      step_no: 3,
      step_type: 'adjustment',
      instruction: 'Make adjustments per manufacturer specification - do not exceed limits',
      data_type: 'text',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Use proper tools - do not force - follow torque specs for fasteners',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: false
    },
    {
      step_no: 4,
      step_type: 'measurement',
      instruction: 'Verify post-adjustment settings with measurements',
      data_type: 'text',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Confirm within specification before releasing',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: false
    },
    {
      step_no: 5,
      step_type: 'functional_test',
      instruction: 'Test operation after adjustment - verify normal function',
      data_type: 'dropdown',
      options: JSON.stringify(['Normal', 'Improved', 'No Change', 'Worse', 'Failed']),
      is_required: true,
      is_visual_only: false,
      safety_note: 'Monitor closely during first run - be prepared to stop if abnormal',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    }
  ],

  tightening: [
    {
      step_no: 1,
      step_type: 'safety_check',
      instruction: 'LOCK OUT equipment - must be stopped for tightening work',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Equipment MUST be stopped - no exceptions',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: true
    },
    {
      step_no: 2,
      step_type: 'inspection',
      instruction: 'Visually inspect all fasteners for looseness, corrosion, or damage',
      data_type: 'dropdown',
      options: JSON.stringify(['All Secure', 'Minor Looseness', 'Requires Tightening', 'Damaged/Replace']),
      is_required: true,
      is_visual_only: true,
      safety_note: 'Mark loose fasteners with paint pen for tracking',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: false
    },
    {
      step_no: 3,
      step_type: 'adjustment',
      instruction: 'Torque fasteners to specification using calibrated torque wrench',
      data_type: 'number',
      unit: 'Nm',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Use correct torque value from manual - mark with paint pen after torquing',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: false
    },
    {
      step_no: 4,
      step_type: 'inspection',
      instruction: 'Check for missing fasteners or hardware - replace as needed',
      data_type: 'text',
      is_required: true,
      is_visual_only: true,
      safety_note: 'Use correct grade and specification replacement hardware',
      requires_equipment_stopped: true,
      prohibit_if_running: true,
      prohibit_opening_covers: false
    }
  ],

  testing: [
    {
      step_no: 1,
      step_type: 'safety_check',
      instruction: 'Coordinate with operations - notify affected personnel before testing',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Ensure area is clear - have emergency stop accessible',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 2,
      step_type: 'functional_test',
      instruction: 'Perform functional test per test procedure',
      data_type: 'dropdown',
      options: JSON.stringify(['Pass', 'Fail', 'Marginal', 'Inconclusive']),
      is_required: true,
      is_visual_only: false,
      safety_note: 'Monitor for abnormal conditions - stop immediately if unsafe',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: true
    },
    {
      step_no: 3,
      step_type: 'measurement',
      instruction: 'Record test parameters and results',
      data_type: 'text',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Document all readings for trend analysis',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 4,
      step_type: 'functional_test',
      instruction: 'Verify safety interlocks and protective devices function correctly',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: false,
      safety_note: 'DO NOT bypass safety systems - report failures immediately',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: true
    }
  ],

  calibration: [
    {
      step_no: 1,
      step_type: 'safety_check',
      instruction: 'Isolate instrument from control system if bypass required - follow MOC',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Management of Change required for bypassed instruments',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 2,
      step_type: 'measurement',
      instruction: 'Apply low range reference value - record instrument reading',
      data_type: 'number',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Verify reference standard calibration is current',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 3,
      step_type: 'measurement',
      instruction: 'Apply mid range reference value - record instrument reading',
      data_type: 'number',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Check linearity at mid-point',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 4,
      step_type: 'measurement',
      instruction: 'Apply high range reference value - record instrument reading',
      data_type: 'number',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Do not exceed instrument rated maximum',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 5,
      step_type: 'adjustment',
      instruction: 'Adjust zero and span if outside tolerance - document as-found/as-left',
      data_type: 'text',
      is_required: false,
      is_visual_only: false,
      safety_note: 'Record adjustment made and final values',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 6,
      step_type: 'functional_test',
      instruction: 'Return to service - verify normal operation and communication',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: false,
      safety_note: 'Confirm reading matches process conditions',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    }
  ],

  safety_check: [
    {
      step_no: 1,
      step_type: 'safety_check',
      instruction: 'Verify all safety guards, covers, and protective devices are in place',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: true,
      safety_note: 'NEVER operate without guards - report missing guards immediately',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: true
    },
    {
      step_no: 2,
      step_type: 'safety_check',
      instruction: 'Check emergency stop devices are accessible and functional',
      data_type: 'dropdown',
      options: JSON.stringify(['Tested/Good', 'Not Tested', 'Defective', 'Obstructed']),
      is_required: true,
      is_visual_only: true,
      safety_note: 'Coordinate with operations before testing E-stop',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 3,
      step_type: 'safety_check',
      instruction: 'Verify safety labels, warnings, and signs are legible and in place',
      data_type: 'boolean',
      is_required: true,
      is_visual_only: true,
      safety_note: 'Request replacement of damaged or missing labels',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    },
    {
      step_no: 4,
      step_type: 'safety_check',
      instruction: 'Check for trip hazards, leaks, or unsafe conditions in equipment area',
      data_type: 'text',
      is_required: true,
      is_visual_only: true,
      safety_note: 'Housekeeping is part of safety - clean up as you inspect',
      requires_equipment_stopped: false,
      prohibit_if_running: false,
      prohibit_opening_covers: false
    }
  ]
};

/**
 * Template-level Safety Controls (GUIDANCE ONLY)
 * These are informational - no permit-to-work or LOTO workflow dependencies
 */
const SafetyControlsByTaskKind = {
  inspection: [
    { safety_type: 'PPE', description: 'Safety glasses required', is_mandatory: true },
    { safety_type: 'PPE', description: 'Work gloves if contact required', is_mandatory: false },
    { safety_type: 'guidance', description: 'Visual inspection only - maintain safe distance from rotating parts', is_mandatory: false }
  ],
  measurement: [
    { safety_type: 'PPE', description: 'Safety glasses required', is_mandatory: true },
    { safety_type: 'guidance', description: 'Use non-contact tools for hot surfaces', is_mandatory: false },
    { safety_type: 'guidance', description: 'Verify gauge ratings before use', is_mandatory: false }
  ],
  cleaning: [
    { safety_type: 'PPE', description: 'Safety glasses required', is_mandatory: true },
    { safety_type: 'PPE', description: 'Dust mask if cleaning dirty filters', is_mandatory: false },
    { safety_type: 'guidance', description: 'LOTO required - verify zero energy', is_mandatory: false },
    { safety_type: 'guidance', description: 'Follow site LOTO procedure - this is guidance only', is_mandatory: false }
  ],
  lubrication: [
    { safety_type: 'PPE', description: 'Safety glasses required', is_mandatory: true },
    { safety_type: 'PPE', description: 'Oil-resistant gloves', is_mandatory: false },
    { safety_type: 'guidance', description: 'LOTO if guards removed', is_mandatory: false },
    { safety_type: 'guidance', description: 'Allow hot oil to cool before servicing', is_mandatory: false }
  ],
  adjustment: [
    { safety_type: 'PPE', description: 'Safety glasses required', is_mandatory: true },
    { safety_type: 'guidance', description: 'LOTO required - verify zero energy', is_mandatory: false },
    { safety_type: 'guidance', description: 'Document as-found before changes', is_mandatory: false }
  ],
  tightening: [
    { safety_type: 'PPE', description: 'Safety glasses required', is_mandatory: true },
    { safety_type: 'guidance', description: 'LOTO required - equipment must be stopped', is_mandatory: false },
    { safety_type: 'guidance', description: 'Use calibrated torque wrench', is_mandatory: false }
  ],
  testing: [
    { safety_type: 'PPE', description: 'Area-appropriate PPE', is_mandatory: true },
    { safety_type: 'guidance', description: 'Coordinate with operations', is_mandatory: false },
    { safety_type: 'guidance', description: 'Have emergency stop accessible', is_mandatory: false }
  ],
  calibration: [
    { safety_type: 'PPE', description: 'Safety glasses required', is_mandatory: true },
    { safety_type: 'guidance', description: 'Follow MOC if bypassing control', is_mandatory: false },
    { safety_type: 'guidance', description: 'Verify reference standard is current', is_mandatory: false }
  ],
  safety_check: [
    { safety_type: 'PPE', description: 'Safety glasses required', is_mandatory: true },
    { safety_type: 'guidance', description: 'Report all safety deficiencies immediately', is_mandatory: false },
    { safety_type: 'guidance', description: 'Do not bypass safety systems', is_mandatory: false }
  ]
};

/**
 * Seed system task templates with explicit industry assignment
 */
async function seedSystemTaskTemplates() {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    console.log('Step 3 Patch: Seeding system task templates...');
    console.log(`Batch ID: ${SEED_BATCH_ID}\n`);
    
    // Create seed batch record
    await connection.query(
      `INSERT INTO seed_batches (batch_id, batch_name, batch_version, entity_type, entity_count, metadata)
       VALUES (?, ?, ?, ?, 0, ?)
       ON DUPLICATE KEY UPDATE 
         batch_name = VALUES(batch_name),
         batch_version = VALUES(batch_version),
         entity_count = 0`,
      [
        SEED_BATCH_ID,
        SEED_BATCH_NAME,
        SEED_BATCH_VERSION,
        'task_template',
        JSON.stringify({ version: 'patched_v2', features: ['explicit_industry', 'deep_steps', 'safe_rollback'] })
      ]
    );
    
    // Get all equipment types with their family mappings
    const [equipmentTypes] = await connection.query(`
      SELECT 
        et.id as equipment_type_id,
        et.type_name,
        et.type_code,
        etm.family_code
      FROM equipment_types et
      JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
      WHERE etm.mapping_source = 'seed'
      ORDER BY et.id
    `);
    
    // Get all family rules
    const [familyRules] = await connection.query(
      'SELECT * FROM template_family_rules WHERE is_active = TRUE ORDER BY family_code, sort_order'
    );
    
    // Get all industries
    const [industries] = await connection.query('SELECT id, code FROM industries WHERE is_active = TRUE');
    
    console.log(`Found ${equipmentTypes.length} equipment types with family mappings`);
    console.log(`Found ${familyRules.length} family rules`);
    console.log(`Found ${industries.length} industries\n`);
    
    let templatesCreated = 0;
    let stepsCreated = 0;
    let safetyControlsCreated = 0;
    
    for (const equipmentType of equipmentTypes) {
      // Get rules for this family
      const rules = familyRules.filter(r => r.family_code === equipmentType.family_code);
      
      if (rules.length === 0) {
        console.log(`  No rules for family: ${equipmentType.family_code}`);
        continue;
      }
      
      // Determine industry for this equipment type
      const industryCode = getIndustryCodeForFamily(equipmentType.family_code);
      const industry = industries.find(i => i.code === industryCode);
      const industryId = industry ? industry.id : null;
      
      for (const rule of rules) {
        // Check if template already exists
        const [existing] = await connection.query(
          `SELECT id FROM task_templates 
           WHERE equipment_type_id = ? 
           AND task_kind = ? 
           AND organization_id IS NULL`,
          [equipmentType.equipment_type_id, rule.task_kind]
        );
        
        if (existing.length > 0) {
          console.log(`  Skipping existing: ${equipmentType.type_code} - ${rule.task_kind}`);
          continue;
        }
        
        // Create system template with EXPLICIT industry_id
        const templateCode = `${equipmentType.family_code}_${equipmentType.type_code}_${rule.task_kind.toUpperCase()}`;
        
        const [templateResult] = await connection.query(
          `INSERT INTO task_templates 
           (organization_id, equipment_type_id, template_code, template_name, 
            maintenance_type, task_kind, is_system, is_editable, industry_id,
            frequency_value, frequency_unit, estimated_duration_minutes, 
            description, is_active, seed_batch_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            null, // organization_id = NULL for system templates
            equipmentType.equipment_type_id,
            templateCode,
            `${equipmentType.type_name} - ${rule.task_kind.charAt(0).toUpperCase() + rule.task_kind.slice(1)}`,
            'preventive',
            rule.task_kind,
            true,  // is_system
            false, // is_editable
            industryId, // EXPLICIT industry assignment
            rule.frequency_value,
            rule.frequency_unit,
            rule.estimated_duration_minutes,
            `System template for ${rule.task_kind} of ${equipmentType.type_name} (${equipmentType.family_code})`,
            true,
            SEED_BATCH_ID // For safe rollback
          ]
        );
        
        const templateId = templateResult.insertId;
        templatesCreated++;
        
        // Track in seed batch
        await connection.query(
          `INSERT INTO seed_batch_entities (batch_id, entity_type, entity_id)
           VALUES (?, ?, ?)`,
          [SEED_BATCH_ID, 'task_template', templateId]
        );
        
        // Create steps with safety metadata
        const steps = StepDefinitions[rule.task_kind] || [];
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
        
        // Create template-level safety controls (GUIDANCE ONLY)
        const safetyControls = SafetyControlsByTaskKind[rule.task_kind] || [];
        for (const control of safetyControls) {
          await connection.query(
            `INSERT INTO task_template_safety_controls 
             (task_template_id, safety_type, description, is_mandatory, created_at)
             VALUES (?, ?, ?, ?, NOW())`,
            [templateId, control.safety_type, control.description, control.is_mandatory]
          );
          safetyControlsCreated++;
        }
        
        console.log(`  Created: ${templateCode} (${steps.length} steps, ${safetyControls.length} safety controls, industry: ${industryCode})`);
      }
    }
    
    // Update batch count
    await connection.query(
      'UPDATE seed_batches SET entity_count = ? WHERE batch_id = ?',
      [templatesCreated, SEED_BATCH_ID]
    );
    
    await connection.commit();
    
    console.log('\n========================================');
    console.log('Step 3 Seed Complete (Patched)');
    console.log('========================================');
    console.log(`Templates created: ${templatesCreated}`);
    console.log(`Steps created: ${stepsCreated}`);
    console.log(`Safety controls created: ${safetyControlsCreated}`);
    console.log(`Batch ID: ${SEED_BATCH_ID}`);
    console.log('========================================\n');
    
    return {
      batchId: SEED_BATCH_ID,
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

/**
 * Get industry code for a family (explicit assignment)
 */
function getIndustryCodeForFamily(familyCode) {
  const industryMap = {
    'PUMP_FAMILY': 'WATER_WASTEWATER_UTILITIES',
    'AIR_SYSTEM_FAMILY': 'WATER_WASTEWATER_UTILITIES',
    'MIXER_FAMILY': 'WATER_WASTEWATER_UTILITIES',
    'VALVE_FAMILY': 'WATER_WASTEWATER_UTILITIES',
    'PIPELINE_FAMILY': 'WATER_WASTEWATER_UTILITIES',
    'PIPING_COMPONENT_FAMILY': 'WATER_WASTEWATER_UTILITIES',
    'STATIC_CONTAINMENT_FAMILY': 'WATER_WASTEWATER_UTILITIES',
    'TREATMENT_UNIT_FAMILY': 'WATER_WASTEWATER_UTILITIES',
    'INSTRUMENT_FAMILY': 'WATER_WASTEWATER_UTILITIES',
    'ELECTRICAL_FAMILY': 'POWER_UTILITIES',
    'STRUCTURE_FAMILY': 'BUILDINGS_FACILITIES',
    'SAFETY_EQUIPMENT_FAMILY': 'WATER_WASTEWATER_UTILITIES',
    'MECHANICAL_HANDLING_FAMILY': 'MANUFACTURING'
  };
  
  return industryMap[familyCode] || 'WATER_WASTEWATER_UTILITIES';
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

module.exports = { seedSystemTaskTemplates, SEED_BATCH_ID };
