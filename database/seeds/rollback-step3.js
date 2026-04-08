/**
 * Safe Rollback for Step 3
 * Only deletes entities created by specific seed batch
 * Does NOT delete all system templates - only those from this batch
 */

const db = require('../../src/config/database');

/**
 * Rollback a specific seed batch safely
 * @param {string} batchId - The seed batch ID to rollback
 */
async function rollbackSeedBatch(batchId) {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    console.log(`Rolling back seed batch: ${batchId}\n`);
    
    // Get batch info
    const [batches] = await connection.query(
      'SELECT * FROM seed_batches WHERE batch_id = ?',
      [batchId]
    );
    
    if (batches.length === 0) {
      console.log(`Batch ${batchId} not found - nothing to rollback`);
      await connection.commit();
      return { deleted: 0 };
    }
    
    const batch = batches[0];
    console.log(`Found batch: ${batch.batch_name}`);
    console.log(`Entity type: ${batch.entity_type}`);
    console.log(`Entity count: ${batch.entity_count}\n`);
    
    let deletedTemplates = 0;
    let deletedSteps = 0;
    let deletedSafetyControls = 0;
    let deletedMappings = 0;
    
    // Get all entities in this batch
    const [entities] = await connection.query(
      'SELECT entity_type, entity_id FROM seed_batch_entities WHERE batch_id = ?',
      [batchId]
    );
    
    console.log(`Found ${entities.length} entities to rollback\n`);
    
    // Group entities by type
    const templatesToDelete = [];
    const mappingsToDelete = [];
    
    for (const entity of entities) {
      if (entity.entity_type === 'task_template') {
        templatesToDelete.push(entity.entity_id);
      } else if (entity.entity_type === 'equipment_family_mapping') {
        mappingsToDelete.push(entity.entity_id);
      }
    }
    
    // Delete templates (with cascading steps and safety controls)
    if (templatesToDelete.length > 0) {
      console.log(`Deleting ${templatesToDelete.length} templates...`);
      
      // Get steps and safety controls count for reporting
      const [stepCounts] = await connection.query(
        `SELECT COUNT(*) as count FROM task_template_steps 
         WHERE task_template_id IN (?)`,
        [templatesToDelete]
      );
      deletedSteps = stepCounts[0].count;
      
      const [safetyCounts] = await connection.query(
        `SELECT COUNT(*) as count FROM task_template_safety_controls 
         WHERE task_template_id IN (?)`,
        [templatesToDelete]
      );
      deletedSafetyControls = safetyCounts[0].count;
      
      // Delete templates (steps and safety controls will cascade if FKs set up)
      const [deleteResult] = await connection.query(
        `DELETE FROM task_templates 
         WHERE id IN (?) 
         AND seed_batch_id = ?`, // Safety check: only delete if seed_batch_id matches
        [templatesToDelete, batchId]
      );
      deletedTemplates = deleteResult.affectedRows;
    }
    
    // Delete equipment family mappings
    if (mappingsToDelete.length > 0) {
      console.log(`Deleting ${mappingsToDelete.length} equipment family mappings...`);
      
      const [deleteResult] = await connection.query(
        `DELETE FROM equipment_type_family_mappings 
         WHERE id IN (?)`,
        [mappingsToDelete]
      );
      deletedMappings = deleteResult.affectedRows;
    }
    
    // Delete seed batch entity records
    await connection.query(
      'DELETE FROM seed_batch_entities WHERE batch_id = ?',
      [batchId]
    );
    
    // Delete seed batch record
    await connection.query(
      'DELETE FROM seed_batches WHERE batch_id = ?',
      [batchId]
    );
    
    await connection.commit();
    
    console.log('\n========================================');
    console.log('Rollback Complete');
    console.log('========================================');
    console.log(`Templates deleted: ${deletedTemplates}`);
    console.log(`Steps deleted: ${deletedSteps}`);
    console.log(`Safety controls deleted: ${deletedSafetyControls}`);
    console.log(`Equipment mappings deleted: ${deletedMappings}`);
    console.log(`Batch ${batchId} removed`);
    console.log('========================================\n');
    
    return {
      batchId,
      deletedTemplates,
      deletedSteps,
      deletedSafetyControls,
      deletedMappings
    };
    
  } catch (error) {
    await connection.rollback();
    console.error('Error during rollback:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Show what would be rolled back (dry run)
 */
async function previewRollback(batchId) {
  const connection = await db.getConnection();
  
  try {
    console.log(`Preview rollback for batch: ${batchId}\n`);
    
    const [batches] = await connection.query(
      'SELECT * FROM seed_batches WHERE batch_id = ?',
      [batchId]
    );
    
    if (batches.length === 0) {
      console.log(`Batch ${batchId} not found`);
      return;
    }
    
    const batch = batches[0];
    console.log(`Batch: ${batch.batch_name}`);
    console.log(`Created: ${batch.created_at}`);
    console.log(`Entities: ${batch.entity_count}\n`);
    
    const [entities] = await connection.query(
      `SELECT entity_type, COUNT(*) as count 
       FROM seed_batch_entities 
       WHERE batch_id = ?
       GROUP BY entity_type`,
      [batchId]
    );
    
    console.log('Entities to be deleted:');
    for (const e of entities) {
      console.log(`  ${e.entity_type}: ${e.count}`);
    }
    
    console.log('\nTo execute rollback, run:');
    console.log(`  node rollback-step3.js ${batchId}`);
    
  } finally {
    connection.release();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const batchId = args[1] || 'step3_system_templates_v1';
  
  if (command === '--preview' || command === '-p') {
    await previewRollback(batchId);
  } else if (command === '--help' || command === '-h') {
    console.log(`
Usage: node rollback-step3.js [options] [batch_id]

Options:
  --preview, -p    Show what would be rolled back (dry run)
  --help, -h       Show this help

Examples:
  node rollback-step3.js --preview
  node rollback-step3.js step3_system_templates_v1
  node rollback-step3.js step3_family_mappings_v1
    `);
  } else {
    // Default: execute rollback
    const targetBatch = command || 'step3_system_templates_v1';
    console.log('WARNING: This will delete seed data. Use --preview first to review.\n');
    console.log(`Rolling back: ${targetBatch}\n`);
    await rollbackSeedBatch(targetBatch);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

module.exports = { rollbackSeedBatch, previewRollback };
