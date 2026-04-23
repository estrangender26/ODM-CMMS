require('dotenv').config();
const { pool } = require('./src/config/database');

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
  ]
};

const SafetyControlsByTaskKind = {
  inspection: [
    { safety_type: 'PPE', description: 'Safety glasses required', is_mandatory: true },
    { safety_type: 'PPE', description: 'Work gloves if contact required', is_mandatory: false },
    { safety_type: 'guidance', description: 'Visual inspection only - maintain safe distance from rotating parts', is_mandatory: false }
  ]
};

const GENERIC_TEMPLATE_IDS = [74, 75, 76, 77, 78, 79, 80, 81, 82, 83];

(async () => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const templateId of GENERIC_TEMPLATE_IDS) {
      // Delete generic steps
      await connection.query(
        'DELETE FROM task_template_steps WHERE task_template_id = ?',
        [templateId]
      );

      // Delete existing safety controls
      await connection.query(
        'DELETE FROM task_template_safety_controls WHERE task_template_id = ?',
        [templateId]
      );

      // Insert detailed inspection steps
      const steps = StepDefinitions.inspection;
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
      }

      // Insert safety controls
      const controls = SafetyControlsByTaskKind.inspection;
      for (const control of controls) {
        await connection.query(
          `INSERT INTO task_template_safety_controls
           (task_template_id, safety_type, description, is_mandatory, created_at)
           VALUES (?, ?, ?, ?, NOW())`,
          [templateId, control.safety_type, control.description, control.is_mandatory]
        );
      }

      console.log(`Fixed template ${templateId}: ${steps.length} steps, ${controls.length} safety controls`);
    }

    await connection.commit();
    console.log('\nAll generic templates fixed successfully.');
    process.exit(0);
  } catch (e) {
    await connection.rollback();
    console.error(e);
    process.exit(1);
  } finally {
    connection.release();
  }
})();
