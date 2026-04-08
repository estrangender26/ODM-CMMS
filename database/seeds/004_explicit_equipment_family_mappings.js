/**
 * Explicit Equipment Type to Family Mapping
 * Step 3 Patch: Deterministic mapping (no runtime keyword matching)
 * 
 * This seed creates explicit mappings from equipment_type_id to family_code.
 * Mappings are preserved in equipment_type_family_mappings table.
 */

const db = require('../../src/config/database');

/**
 * BATCH IDENTIFIER for safe rollback
 */
const SEED_BATCH_ID = 'step3_family_mappings_v1';
const SEED_BATCH_NAME = 'Step 3: Equipment Type to Family Mappings';
const SEED_BATCH_VERSION = '1.0.0';

/**
 * Explicit Equipment Type to Family Mapping
 * Format: { type_code_pattern: 'FAMILY_CODE' }
 * 
 * These mappings are explicit and deterministic.
 * No runtime keyword matching is used.
 */
const ExplicitMappings = {
  // PUMP_FAMILY
  'CENT_PUMP': 'PUMP_FAMILY',
  'PD_PUMP': 'PUMP_FAMILY',
  'SUB_PUMP': 'PUMP_FAMILY',
  'SUMP_PUMP': 'PUMP_FAMILY',
  'BOOST_PUMP': 'PUMP_FAMILY',
  'CIRC_PUMP': 'PUMP_FAMILY',
  'FEED_PUMP': 'PUMP_FAMILY',
  'TRANS_PUMP': 'PUMP_FAMILY',
  'WASTE_PUMP': 'PUMP_FAMILY',
  'SLUR_PUMP': 'PUMP_FAMILY',
  'CHEM_PUMP': 'PUMP_FAMILY',
  
  // AIR_SYSTEM_FAMILY
  'CENT_COMP': 'AIR_SYSTEM_FAMILY',
  'SCREW_COMP': 'AIR_SYSTEM_FAMILY',
  'RECIP_COMP': 'AIR_SYSTEM_FAMILY',
  'CENT_FAN': 'AIR_SYSTEM_FAMILY',
  'AXIAL_FAN': 'AIR_SYSTEM_FAMILY',
  'PD_BLOWER': 'AIR_SYSTEM_FAMILY',
  'TURBO_BLOW': 'AIR_SYSTEM_FAMILY',
  'VAC_PUMP': 'AIR_SYSTEM_FAMILY',
  
  // MIXER_FAMILY
  'AGITATOR': 'MIXER_FAMILY',
  'MIXER': 'MIXER_FAMILY',
  'BLENDER': 'MIXER_FAMILY',
  'STIRRER': 'MIXER_FAMILY',
  'FLUME_MIX': 'MIXER_FAMILY',
  
  // VALVE_FAMILY
  'GATE_VALVE': 'VALVE_FAMILY',
  'BUTTER_VALVE': 'VALVE_FAMILY',
  'BALL_VALVE': 'VALVE_FAMILY',
  'GLOBE_VALVE': 'VALVE_FAMILY',
  'CHECK_VALVE': 'VALVE_FAMILY',
  'CONTROL_VALVE': 'VALVE_FAMILY',
  'RELIEF_VALVE': 'VALVE_FAMILY',
  'NEEDLE_VALVE': 'VALVE_FAMILY',
  'DIAPH_VALVE': 'VALVE_FAMILY',
  'PINCH_VALVE': 'VALVE_FAMILY',
  
  // PIPELINE_FAMILY
  'PIPELINE': 'PIPELINE_FAMILY',
  'DIST_LINE': 'PIPELINE_FAMILY',
  'COLLECTOR': 'PIPELINE_FAMILY',
  'MANIFOLD': 'PIPELINE_FAMILY',
  
  // PIPING_COMPONENT_FAMILY
  'FLANGE': 'PIPING_COMPONENT_FAMILY',
  'ELBOW': 'PIPING_COMPONENT_FAMILY',
  'TEE': 'PIPING_COMPONENT_FAMILY',
  'REDUCER': 'PIPING_COMPONENT_FAMILY',
  'EXP_JOINT': 'PIPING_COMPONENT_FAMILY',
  'PIPE_SUPP': 'PIPING_COMPONENT_FAMILY',
  
  // STATIC_CONTAINMENT_FAMILY
  'ATM_TANK': 'STATIC_CONTAINMENT_FAMILY',
  'PRESS_VESSEL': 'STATIC_CONTAINMENT_FAMILY',
  'SILO': 'STATIC_CONTAINMENT_FAMILY',
  'BIN': 'STATIC_CONTAINMENT_FAMILY',
  'HOLD_TANK': 'STATIC_CONTAINMENT_FAMILY',
  'REACT_VESSEL': 'STATIC_CONTAINMENT_FAMILY',
  'CULVERT': 'STATIC_CONTAINMENT_FAMILY',
  
  // TREATMENT_UNIT_FAMILY
  'CLARIFIER': 'TREATMENT_UNIT_FAMILY',
  'FILTER': 'TREATMENT_UNIT_FAMILY',
  'AERATOR': 'TREATMENT_UNIT_FAMILY',
  'DIGESTER': 'TREATMENT_UNIT_FAMILY',
  'THICKENER': 'TREATMENT_UNIT_FAMILY',
  'SCREEN': 'TREATMENT_UNIT_FAMILY',
  'GRIT_REM': 'TREATMENT_UNIT_FAMILY',
  'OIL_SEP': 'TREATMENT_UNIT_FAMILY',
  'SCRUBBER': 'TREATMENT_UNIT_FAMILY',
  
  // INSTRUMENT_FAMILY
  'PRESS_TRAN': 'INSTRUMENT_FAMILY',
  'TEMP_TRAN': 'INSTRUMENT_FAMILY',
  'FLOW_METER': 'INSTRUMENT_FAMILY',
  'LEVEL_TRAN': 'INSTRUMENT_FAMILY',
  'PH_ANALYZER': 'INSTRUMENT_FAMILY',
  'DO_ANALYZER': 'INSTRUMENT_FAMILY',
  'TURBID_ANAL': 'INSTRUMENT_FAMILY',
  'FLOW_SWITCH': 'INSTRUMENT_FAMILY',
  'LEVEL_SWITCH': 'INSTRUMENT_FAMILY',
  
  // ELECTRICAL_FAMILY
  'IND_MOTOR': 'ELECTRICAL_FAMILY',
  'POWER_TRAN': 'ELECTRICAL_FAMILY',
  'DIST_TRAN': 'ELECTRICAL_FAMILY',
  'BREAKER': 'ELECTRICAL_FAMILY',
  'SWITCHGEAR': 'ELECTRICAL_FAMILY',
  'MCC': 'ELECTRICAL_FAMILY',
  'PANEL': 'ELECTRICAL_FAMILY',
  'UPS_SYS': 'ELECTRICAL_FAMILY',
  'BATTERY_BANK': 'ELECTRICAL_FAMILY',
  'INVERTER': 'ELECTRICAL_FAMILY',
  
  // STRUCTURE_FAMILY
  'BUILDING': 'STRUCTURE_FAMILY',
  'TANK_FDN': 'STRUCTURE_FAMILY',
  'EQUIP_FDN': 'STRUCTURE_FAMILY',
  'PIER': 'STRUCTURE_FAMILY',
  'BRIDGE': 'STRUCTURE_FAMILY',
  'CATWALK': 'STRUCTURE_FAMILY',
  'PLATFORM': 'STRUCTURE_FAMILY',
  'RET_WALL': 'STRUCTURE_FAMILY',
  
  // SAFETY_EQUIPMENT_FAMILY
  'FIRE_DET': 'SAFETY_EQUIPMENT_FAMILY',
  'GAS_DET': 'SAFETY_EQUIPMENT_FAMILY',
  'SMOKE_DET': 'SAFETY_EQUIPMENT_FAMILY',
  'HEAT_DET': 'SAFETY_EQUIPMENT_FAMILY',
  'FLAME_DET': 'SAFETY_EQUIPMENT_FAMILY',
  'E_STOP': 'SAFETY_EQUIPMENT_FAMILY',
  'FIRE_SUPP': 'SAFETY_EQUIPMENT_FAMILY',
  'EYEWASH': 'SAFETY_EQUIPMENT_FAMILY',
  'SHOWER': 'SAFETY_EQUIPMENT_FAMILY',
  'SCBA': 'SAFETY_EQUIPMENT_FAMILY',
  
  // MECHANICAL_HANDLING_FAMILY
  'BELT_CONV': 'MECHANICAL_HANDLING_FAMILY',
  'SCREW_CONV': 'MECHANICAL_HANDLING_FAMILY',
  'BUCKET_ELEV': 'MECHANICAL_HANDLING_FAMILY',
  'CHAIN_CONV': 'MECHANICAL_HANDLING_FAMILY',
  'ELEVATOR': 'MECHANICAL_HANDLING_FAMILY',
  'HOIST': 'MECHANICAL_HANDLING_FAMILY',
  'CRANE': 'MECHANICAL_HANDLING_FAMILY',
  'FORKLIFT': 'MECHANICAL_HANDLING_FAMILY'
};

/**
 * Get industry_id for a family based on equipment type
 * Returns explicit industry assignment
 */
function getIndustryForEquipmentType(equipmentType, familyCode, industries) {
  // Find industry by family code preference
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
  
  const preferredIndustryCode = industryMap[familyCode] || 'WATER_WASTEWATER_UTILITIES';
  const industry = industries.find(i => i.code === preferredIndustryCode);
  return industry ? industry.id : null;
}

/**
 * Seed explicit equipment type to family mappings
 */
async function seedEquipmentFamilyMappings() {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    console.log('Step 3 Patch: Seeding explicit equipment type to family mappings...');
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
        'equipment_family_mapping',
        JSON.stringify({ explicit_mappings_count: Object.keys(ExplicitMappings).length })
      ]
    );
    
    // Get all equipment types
    const [equipmentTypes] = await connection.query(`
      SELECT et.id, et.type_code, et.type_name, et.class_id, ec.class_name
      FROM equipment_types et
      JOIN equipment_classes ec ON et.class_id = ec.id
      ORDER BY et.id
    `);
    
    // Get all industries
    const [industries] = await connection.query('SELECT id, code FROM industries WHERE is_active = TRUE');
    
    console.log(`Found ${equipmentTypes.length} equipment types`);
    console.log(`Found ${industries.length} industries\n`);
    
    let mappingsCreated = 0;
    let mappingsSkipped = 0;
    
    for (const equipmentType of equipmentTypes) {
      // Find explicit mapping by type_code
      const familyCode = ExplicitMappings[equipmentType.type_code];
      
      if (!familyCode) {
        console.log(`  No mapping for: ${equipmentType.type_code} (${equipmentType.type_name})`);
        mappingsSkipped++;
        continue;
      }
      
      // Check if mapping already exists
      const [existing] = await connection.query(
        'SELECT id FROM equipment_type_family_mappings WHERE equipment_type_id = ?',
        [equipmentType.id]
      );
      
      if (existing.length > 0) {
        console.log(`  Skipping existing: ${equipmentType.type_code} -> ${familyCode}`);
        continue;
      }
      
      // Determine industry for this mapping
      const industryId = getIndustryForEquipmentType(equipmentType, familyCode, industries);
      
      // Create mapping
      const [mappingResult] = await connection.query(
        `INSERT INTO equipment_type_family_mappings 
         (equipment_type_id, family_code, mapping_source)
         VALUES (?, ?, ?)`,
        [equipmentType.id, familyCode, 'seed']
      );
      
      // Track in seed batch
      await connection.query(
        `INSERT INTO seed_batch_entities (batch_id, entity_type, entity_id)
         VALUES (?, ?, ?)`,
        [SEED_BATCH_ID, 'equipment_family_mapping', mappingResult.insertId]
      );
      
      mappingsCreated++;
      console.log(`  Created: ${equipmentType.type_code} -> ${familyCode} (industry: ${industryId || 'none'})`);
    }
    
    // Update batch count
    await connection.query(
      'UPDATE seed_batches SET entity_count = ? WHERE batch_id = ?',
      [mappingsCreated, SEED_BATCH_ID]
    );
    
    await connection.commit();
    
    console.log('\n========================================');
    console.log('Equipment Family Mapping Complete');
    console.log('========================================');
    console.log(`Mappings created: ${mappingsCreated}`);
    console.log(`Mappings skipped: ${mappingsSkipped}`);
    console.log(`Batch ID: ${SEED_BATCH_ID}`);
    console.log('========================================\n');
    
    return {
      batchId: SEED_BATCH_ID,
      mappingsCreated,
      mappingsSkipped
    };
    
  } catch (error) {
    await connection.rollback();
    console.error('Error seeding equipment family mappings:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run if called directly
if (require.main === module) {
  seedEquipmentFamilyMappings()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { 
  seedEquipmentFamilyMappings,
  SEED_BATCH_ID,
  ExplicitMappings
};
