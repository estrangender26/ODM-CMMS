/**
 * Step 3 Seed Runner (Patched Version)
 * Runs all Step 3 seeds in correct order
 */

const { seedEquipmentFamilyMappings } = require('./004_explicit_equipment_family_mappings');
const { seedSystemTaskTemplates } = require('./005_system_task_templates_v2');

async function runSeed() {
  console.log('=================================================');
  console.log('STEP 3: System Task Template Seeding (PATCHED)');
  console.log('=================================================\n');
  
  try {
    // Step 1: Create explicit equipment type to family mappings
    console.log('>> Step 1: Creating equipment type to family mappings...\n');
    const mappingResults = await seedEquipmentFamilyMappings();
    
    // Step 2: Create system task templates from family rules
    console.log('\n>> Step 2: Creating system task templates...\n');
    const templateResults = await seedSystemTaskTemplates();
    
    console.log('\n=================================================');
    console.log('STEP 3 SEED COMPLETE (PATCHED)');
    console.log('=================================================');
    console.log('\nEquipment Family Mappings:');
    console.log(`  Batch ID: ${mappingResults.batchId}`);
    console.log(`  Mappings created: ${mappingResults.mappingsCreated}`);
    console.log(`  Mappings skipped: ${mappingResults.mappingsSkipped}`);
    console.log('\nSystem Task Templates:');
    console.log(`  Batch ID: ${templateResults.batchId}`);
    console.log(`  Templates created: ${templateResults.templatesCreated}`);
    console.log(`  Steps created: ${templateResults.stepsCreated}`);
    console.log(`  Safety controls created: ${templateResults.safetyControlsCreated}`);
    console.log('\n=================================================');
    console.log('\nRollback if needed:');
    console.log(`  node database/seeds/rollback-step3.js ${templateResults.batchId}`);
    console.log('=================================================\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n=================================================');
    console.error('SEED FAILED');
    console.error('=================================================');
    console.error(error.message);
    console.error('=================================================\n');
    process.exit(1);
  }
}

runSeed();
