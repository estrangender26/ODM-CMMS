/**
 * SMP (Standard Maintenance Procedure) Import Utility
 * Imports SMP data and populates database tables
 * Usage: node src/utils/import-smp.js <smp-file.json>
 */

const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Database connection
async function getConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'odm_cmms'
  });
}

// Generate unique codes
function generateCode(prefix, id) {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(id).padStart(4, '0')}`;
}

// Create facility if not exists
async function createFacility(conn, facilityData) {
  const [existing] = await conn.execute(
    'SELECT id FROM facilities WHERE code = ?',
    [facilityData.code]
  );
  
  if (existing.length > 0) {
    return existing[0].id;
  }
  
  const [result] = await conn.execute(
    `INSERT INTO facilities (name, code, description, city, state, status) 
     VALUES (?, ?, ?, ?, ?, 'active')`,
    [
      facilityData.name,
      facilityData.code,
      facilityData.description || `${facilityData.name} facility`,
      facilityData.city || 'Unknown',
      facilityData.state || 'Unknown'
    ]
  );
  
  console.log(`  ✓ Created facility: ${facilityData.name} (ID: ${result.insertId})`);
  return result.insertId;
}

// Create equipment
async function createEquipment(conn, equipData, facilityId) {
  const [existing] = await conn.execute(
    'SELECT id FROM equipment WHERE code = ?',
    [equipData.code]
  );
  
  if (existing.length > 0) {
    return existing[0].id;
  }
  
  const [result] = await conn.execute(
    `INSERT INTO equipment 
     (facility_id, name, code, description, category, manufacturer, model, 
      location, status, criticality, created_by) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'operational', ?, 1)`,
    [
      facilityId,
      equipData.name,
      equipData.code,
      equipData.description || `${equipData.name} equipment`,
      equipData.category || 'General',
      equipData.manufacturer || 'Unknown',
      equipData.model || 'Unknown',
      equipData.location || 'Main Area',
      equipData.criticality || 'medium'
    ]
  );
  
  console.log(`  ✓ Created equipment: ${equipData.name} (ID: ${result.insertId})`);
  return result.insertId;
}

// Create task master from SMP
async function createTaskMaster(conn, smpData) {
  const taskCode = `SMP-${smpData.smpNumber || Date.now()}`;
  
  const [existing] = await conn.execute(
    'SELECT id FROM task_master WHERE task_code = ?',
    [taskCode]
  );
  
  if (existing.length > 0) {
    return existing[0].id;
  }
  
  const [result] = await conn.execute(
    `INSERT INTO task_master 
     (task_code, title, description, task_type, estimated_duration, 
      required_tools, safety_instructions, is_active, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, 1)`,
    [
      taskCode,
      smpData.title || `SMP ${smpData.smpNumber}`,
      smpData.description || smpData.procedure || 'Standard maintenance procedure',
      smpData.taskType || 'inspection',
      smpData.estimatedTime || 30,
      smpData.toolsRequired || 'Standard toolkit',
      smpData.safetyNotes || 'Follow standard safety procedures'
    ]
  );
  
  console.log(`  ✓ Created task: ${smpData.title} (ID: ${result.insertId})`);
  return result.insertId;
}

// Create inspection points from SMP steps
async function createInspectionPoints(conn, taskId, steps) {
  const points = [];
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const pointCode = `STEP-${String(i + 1).padStart(2, '0')}`;
    
    // Determine input type based on step content
    let inputType = 'boolean';
    if (step.expectedValue && !isNaN(step.expectedValue)) {
      inputType = 'numeric';
    } else if (step.options && step.options.length > 0) {
      inputType = 'select';
    } else if (step.requiresPhoto) {
      inputType = 'photo';
    }
    
    const [result] = await conn.execute(
      `INSERT INTO inspection_points 
       (task_master_id, point_code, description, input_type, 
        min_value, max_value, unit_of_measure, expected_value,
        acceptable_values, is_critical, sort_order, help_text, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
      [
        taskId,
        pointCode,
        step.description,
        inputType,
        step.minValue || null,
        step.maxValue || null,
        step.unit || null,
        step.expectedValue || null,
        step.options ? JSON.stringify(step.options) : null,
        step.isCritical || false,
        i + 1,
        step.helpText || step.description
      ]
    );
    
    points.push(result.insertId);
  }
  
  console.log(`  ✓ Created ${points.length} inspection points`);
  return points;
}

// Create schedule
async function createSchedule(conn, scheduleData, equipmentId, taskId) {
  const scheduleCode = `SCH-${Date.now()}`;
  
  const [result] = await conn.execute(
    `INSERT INTO schedules 
     (schedule_code, equipment_id, task_master_id, title, description,
      frequency_type, frequency_value, start_date, next_due_date,
      estimated_hours, assigned_to, priority, is_active, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE(), CURDATE() + INTERVAL 1 DAY,
             ?, ?, ?, TRUE, 1)`,
    [
      scheduleCode,
      equipmentId,
      taskId,
      scheduleData.title || 'Scheduled Maintenance',
      scheduleData.description || 'Regular maintenance schedule',
      scheduleData.frequency || 'monthly',
      scheduleData.frequencyValue || 1,
      scheduleData.estimatedHours || 1,
      scheduleData.assignedTo || 2,
      scheduleData.priority || 'medium'
    ]
  );
  
  console.log(`  ✓ Created schedule: ${scheduleCode} (ID: ${result.insertId})`);
  return result.insertId;
}

// Create work order
async function createWorkOrder(conn, woData, equipmentId, taskId, assignedTo) {
  const woNumber = `WO-${Date.now()}`;
  
  const [result] = await conn.execute(
    `INSERT INTO work_orders 
     (wo_number, equipment_id, task_master_id, title, description,
      wo_type, priority, status, assigned_to, requested_by,
      scheduled_start, estimated_hours, completion_percentage)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'assigned', ?, 1, CURDATE(), ?, 0)`,
    [
      woNumber,
      equipmentId,
      taskId,
      woData.title || 'Maintenance Task',
      woData.description || 'Perform maintenance per SMP',
      woData.type || 'preventive',
      woData.priority || 'medium',
      assignedTo || 2,
      woData.estimatedHours || 1
    ]
  );
  
  console.log(`  ✓ Created work order: ${woNumber} (ID: ${result.insertId})`);
  return result.insertId;
}

// Main import function
async function importSMP(smpFile) {
  console.log(`\n📄 Importing SMP: ${smpFile}\n`);
  
  const smpData = JSON.parse(fs.readFileSync(smpFile, 'utf8'));
  const conn = await getConnection();
  
  try {
    // Process each SMP entry
    for (const smp of smpData.smps || [smpData]) {
      console.log(`\n📝 Processing: ${smp.title || smp.smpNumber}`);
      
      // 1. Create/Get Facility
      const facilityId = await createFacility(conn, {
        name: smp.facilityName || 'Main Facility',
        code: smp.facilityCode || 'FAC-001',
        description: smp.facilityDescription,
        city: smp.facilityCity,
        state: smp.facilityState
      });
      
      // 2. Create/Get Equipment
      const equipmentId = await createEquipment(conn, {
        name: smp.equipmentName || 'Equipment',
        code: smp.equipmentCode || `EQ-${Date.now()}`,
        description: smp.equipmentDescription,
        category: smp.equipmentCategory,
        manufacturer: smp.manufacturer,
        model: smp.model,
        location: smp.equipmentLocation,
        criticality: smp.criticality || 'medium'
      }, facilityId);
      
      // 3. Create Task Master from SMP
      const taskId = await createTaskMaster(conn, smp);
      
      // 4. Create Inspection Points from SMP steps
      if (smp.steps && smp.steps.length > 0) {
        await createInspectionPoints(conn, taskId, smp.steps);
      } else {
        // Create default inspection points
        await createInspectionPoints(conn, taskId, [
          { description: 'Visual inspection completed', isCritical: true },
          { description: 'Equipment operational', isCritical: true },
          { description: 'Safety checks passed', isCritical: true }
        ]);
      }
      
      // 5. Create Schedule
      await createSchedule(conn, {
        title: `${smp.title} Schedule`,
        frequency: smp.frequency || 'monthly',
        priority: smp.priority || 'medium'
      }, equipmentId, taskId);
      
      // 6. Create Initial Work Order
      await createWorkOrder(conn, {
        title: smp.title,
        description: smp.description,
        type: smp.taskType || 'preventive',
        priority: smp.priority || 'medium'
      }, equipmentId, taskId, smp.assignedTo || 2);
    }
    
    console.log('\n✅ Import completed successfully!\n');
    
  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error.stack);
  } finally {
    await conn.end();
  }
}

// Usage
const smpFile = process.argv[2];

if (!smpFile) {
  console.log('Usage: node import-smp.js <smp-file.json>');
  console.log('\nSMP JSON format example:');
  console.log(JSON.stringify({
    smps: [{
      smpNumber: 'SMP-001',
      title: 'Monthly Pump Inspection',
      facilityName: 'Main Plant',
      facilityCode: 'PLANT-01',
      equipmentName: 'Main Pump A',
      equipmentCode: 'PUMP-001',
      equipmentCategory: 'Pump',
      manufacturer: 'Grundfos',
      model: 'CR-10-10',
      criticality: 'high',
      taskType: 'inspection',
      frequency: 'monthly',
      estimatedTime: 45,
      priority: 'high',
      steps: [
        { description: 'Check pump pressure', inputType: 'numeric', minValue: 40, maxValue: 60, unit: 'PSI', isCritical: true },
        { description: 'Check for leaks', inputType: 'boolean', isCritical: true },
        { description: 'Check vibration level', inputType: 'numeric', minValue: 0, maxValue: 5, unit: 'mm/s' }
      ]
    }]
  }, null, 2));
  process.exit(1);
}

importSMP(smpFile);
