/**
 * Step 3 Seed Runner
 * Seeds system task templates for all equipment types using family-based assignment
 */

const { seedSystemTaskTemplates } = require('./003_system_task_templates');

async function runSeed() {
  console.log('=================================================');
  console.log('STEP 3: System Task Template Seeding');
  console.log('=================================================\n');
  
  try {
    const results = await seedSystemTaskTemplates();
    
    console.log('\n=================================================');
    console.log('SEED COMPLETE');
    console.log('=================================================');
    console.log(`Templates created: ${results.templatesCreated}`);
    console.log(`Steps created: ${results.stepsCreated}`);
    console.log(`Safety controls created: ${results.safetyControlsCreated}`);
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
