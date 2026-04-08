/**
 * Idempotent Coverage Validation Script
 * Step 4: Industry-aware coverage validation
 * 
 * READ-ONLY by default.
 * --fix generates PROPOSALS for review, does NOT auto-assign final mappings.
 */

const db = require('../src/config/database');

const VALIDATION_BATCH_ID = 'step4_coverage_validation';

class CoverageValidator {
  constructor() {
    this.results = {
      summary: {},
      gaps: [],
      proposals: [],
      errors: []
    };
  }

  /**
   * Run full validation (READ-ONLY)
   * @param {boolean} generateProposals - If true, generate proposals for review instead of applying
   */
  async validate(generateProposals = false) {
    console.log('========================================');
    console.log('Step 4: Coverage Validation');
    console.log('========================================');
    console.log(`Mode: ${generateProposals ? 'GENERATE PROPOSALS' : 'READ-ONLY'}\n`);
    
    await this.validateFamilyMappings(generateProposals);
    await this.validateIndustryMappings(generateProposals);
    await this.validateIndustryAwareTemplates();
    await this.validateInvariants();
    await this.checkForDuplicateMappings();
    
    this.printReport();
    
    return this.results;
  }

  /**
   * Validate equipment type to family mappings
   * Invariant: Every equipment type should have exactly one family mapping
   */
  async validateFamilyMappings(generateProposals = false) {
    console.log('Checking family mappings...');
    
    // Equipment types without family mappings
    const [missing] = await db.query(`
      SELECT et.id, et.type_name, et.type_code, et.class_id, ec.class_name
      FROM equipment_types et
      JOIN equipment_classes ec ON et.class_id = ec.id
      LEFT JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
      WHERE etm.id IS NULL
      ORDER BY et.id
    `);
    
    console.log(`  Missing family mappings: ${missing.length}`);
    
    if (missing.length > 0) {
      this.results.gaps.push({
        type: 'missing_family_mapping',
        count: missing.length,
        equipment: missing.slice(0, 10)
      });
      
      if (generateProposals) {
        console.log('  Generating proposed mappings for review...');
        const proposals = await this.generateProposedMappings(missing);
        this.results.proposals.push(...proposals);
        console.log(`  Generated ${proposals.length} proposals`);
      }
    }
    
    this.results.summary.family_mappings = {
      missing: missing.length
    };
  }

  /**
   * Validate equipment type to industry mappings
   * Invariant: Every equipment type should have at least one industry mapping
   */
  async validateIndustryMappings(generateProposals = false) {
    console.log('\nChecking industry mappings...');
    
    // Equipment types with family mapping but no industry mapping
    const [missing] = await db.query(`
      SELECT et.id, et.type_name, et.type_code, etm.family_code
      FROM equipment_types et
      JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
      LEFT JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
      WHERE eti.id IS NULL
      ORDER BY et.id
    `);
    
    console.log(`  Missing industry mappings: ${missing.length}`);
    
    if (missing.length > 0) {
      this.results.gaps.push({
        type: 'missing_industry_mapping',
        count: missing.length,
        equipment: missing.slice(0, 10)
      });
      
      if (generateProposals) {
        console.log('  Generating proposed industry mappings...');
        const proposals = await this.generateProposedIndustries(missing);
        this.results.proposals.push(...proposals);
        console.log(`  Generated ${proposals.length} proposals`);
      }
    }
    
    this.results.summary.industry_mappings = {
      missing: missing.length
    };
  }

  /**
   * Validate industry-aware template coverage
   * Invariant: Every (equipment_type_id, industry_id) should have required templates
   */
  async validateIndustryAwareTemplates() {
    console.log('\nChecking industry-aware template coverage...');
    
    // Get all (equipment_type, industry) combinations that should have templates
    const [coverage] = await db.query(`
      SELECT 
        et.id as equipment_type_id,
        et.type_name,
        et.type_code,
        etm.family_code,
        eti.industry_id,
        i.code as industry_code,
        i.name as industry_name,
        COUNT(DISTINCT tt.id) as template_count,
        COUNT(DISTINCT tfr.task_kind) as required_task_kinds,
        GROUP_CONCAT(DISTINCT tt.task_kind ORDER BY tt.task_kind) as existing_task_kinds
      FROM equipment_types et
      JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
      JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
      JOIN industries i ON eti.industry_id = i.id
      LEFT JOIN template_family_rules tfr ON etm.family_code = tfr.family_code AND tfr.is_active = TRUE
      LEFT JOIN task_templates tt ON et.id = tt.equipment_type_id 
        AND tt.is_system = TRUE 
        AND (tt.industry_id = eti.industry_id OR tt.industry_id IS NULL)
      GROUP BY et.id, et.type_name, et.type_code, etm.family_code, eti.industry_id, i.code, i.name
      HAVING template_count < required_task_kinds OR template_count = 0
      ORDER BY et.id, i.code
    `);
    
    console.log(`  Missing templates: ${coverage.length} (equipment_type, industry) combinations`);
    
    if (coverage.length > 0) {
      this.results.gaps.push({
        type: 'missing_industry_aware_templates',
        count: coverage.length,
        combinations: coverage.slice(0, 10)
      });
      
      console.log('  Run seed script to generate missing templates:');
      console.log('    node database/seeds/run-step3-seed-v2.js');
    }
    
    this.results.summary.industry_aware_templates = {
      missing: coverage.length
    };
  }

  /**
   * Check for duplicate family mappings (data integrity issue)
   */
  async checkForDuplicateMappings() {
    console.log('\nChecking for duplicate family mappings...');
    
    const [duplicates] = await db.query(`
      SELECT et.id, et.type_name, et.type_code, COUNT(*) as mapping_count,
             GROUP_CONCAT(etm.family_code) as families
      FROM equipment_types et
      JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
      GROUP BY et.id
      HAVING COUNT(*) > 1
    `);
    
    console.log(`  Duplicate family mappings: ${duplicates.length}`);
    
    if (duplicates.length > 0) {
      this.results.errors.push({
        type: 'duplicate_family_mapping',
        severity: 'critical',
        count: duplicates.length,
        message: 'Database invariant violated: Equipment types with multiple family mappings',
        equipment: duplicates
      });
      
      console.log('  CRITICAL: Duplicate mappings found - data cleanup required');
      console.log('  Run: DELETE FROM equipment_type_family_mappings WHERE ...');
    }
    
    this.results.summary.duplicates = duplicates.length;
  }

  /**
   * Validate all invariants
   */
  async validateInvariants() {
    console.log('\nChecking invariants...');
    
    // Count totals
    const [[total]] = await db.query('SELECT COUNT(*) as count FROM equipment_types');
    const [[withFamily]] = await db.query(`
      SELECT COUNT(DISTINCT et.id) as count 
      FROM equipment_types et
      JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
    `);
    const [[withIndustry]] = await db.query(`
      SELECT COUNT(DISTINCT et.id) as count 
      FROM equipment_types et
      JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
    `);
    
    // Industry-aware complete coverage
    const [[industryAwareComplete]] = await db.query(`
      SELECT COUNT(DISTINCT CONCAT(et.id, '-', eti.industry_id)) as count
      FROM equipment_types et
      JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
      JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
      JOIN task_templates tt ON et.id = tt.equipment_type_id 
        AND tt.is_system = TRUE 
        AND (tt.industry_id = eti.industry_id OR tt.industry_id IS NULL)
    `);
    
    // Total (equipment, industry) combinations
    const [[totalCombinations]] = await db.query(`
      SELECT COUNT(*) as count 
      FROM equipment_type_family_mappings etm
      JOIN equipment_type_industries eti ON etm.equipment_type_id = eti.equipment_type_id
    `);
    
    this.results.summary.total = {
      equipment_types: total.count,
      with_family: withFamily.count,
      with_industry: withIndustry.count,
      total_industry_combinations: totalCombinations.count,
      covered_combinations: industryAwareComplete.count,
      coverage_percentage: totalCombinations.count > 0 
        ? Math.round((industryAwareComplete.count / totalCombinations.count) * 100)
        : 0
    };
    
    console.log(`\n  Total equipment types: ${total.count}`);
    console.log(`  With family mapping: ${withFamily.count}`);
    console.log(`  With industry mapping: ${withIndustry.count}`);
    console.log(`  Total (equipment, industry) combinations: ${totalCombinations.count}`);
    console.log(`  Covered combinations: ${industryAwareComplete.count}`);
    console.log(`  Coverage: ${this.results.summary.total.coverage_percentage}%`);
  }

  /**
   * Generate proposed family mappings for review (NOT auto-applied)
   */
  async generateProposedMappings(equipmentTypes) {
    const proposals = [];
    
    // Heuristic patterns for proposal generation only
    const patterns = {
      'PUMP': 'PUMP_FAMILY',
      'COMP': 'AIR_SYSTEM_FAMILY',
      'FAN': 'AIR_SYSTEM_FAMILY',
      'BLOW': 'AIR_SYSTEM_FAMILY',
      'MIX': 'MIXER_FAMILY',
      'AGIT': 'MIXER_FAMILY',
      'VALVE': 'VALVE_FAMILY',
      'PIPE': 'PIPELINE_FAMILY',
      'TANK': 'STATIC_CONTAINMENT_FAMILY',
      'VESSEL': 'STATIC_CONTAINMENT_FAMILY',
      'FILTER': 'TREATMENT_UNIT_FAMILY',
      'CLARIFIER': 'TREATMENT_UNIT_FAMILY',
      'INSTR': 'INSTRUMENT_FAMILY',
      'TRANSMITTER': 'INSTRUMENT_FAMILY',
      'MOTOR': 'ELECTRICAL_FAMILY',
      'TRANSFORMER': 'ELECTRICAL_FAMILY',
      'CONVEYOR': 'MECHANICAL_HANDLING_FAMILY'
    };
    
    for (const equipment of equipmentTypes) {
      let proposedFamily = null;
      let confidence = 0;
      let reason = '';
      
      // Check for deterministic pre-seeded mapping first
      const [preseeded] = await db.query(
        'SELECT family_code FROM equipment_type_family_proposals WHERE equipment_type_id = ? AND review_status = ?',
        [equipment.id, 'approved']
      );
      
      if (preseeded.length > 0) {
        proposedFamily = preseeded[0].family_code;
        confidence = 1.0;
        reason = 'Pre-approved mapping from proposal table';
      } else {
        // Generate heuristic proposal
        for (const [pattern, family] of Object.entries(patterns)) {
          if (equipment.type_code.includes(pattern)) {
            proposedFamily = family;
            confidence = 0.7; // Heuristic confidence
            reason = `Pattern match: ${pattern} in type_code`;
            break;
          }
        }
        
        if (!proposedFamily) {
          proposedFamily = 'PUMP_FAMILY'; // Default for review
          confidence = 0.3;
          reason = 'No pattern match - default proposal for review';
        }
      }
      
      if (proposedFamily) {
        // Insert into proposals table for review (does NOT create final mapping)
        await db.query(
          `INSERT INTO equipment_type_family_proposals 
           (equipment_type_id, proposed_family_code, proposal_source, proposal_reason, confidence_score, proposed_at)
           VALUES (?, ?, 'heuristic', ?, ?, NOW())
           ON DUPLICATE KEY UPDATE 
             proposed_family_code = VALUES(proposed_family_code),
             proposal_reason = VALUES(proposal_reason),
             confidence_score = VALUES(confidence_score),
             proposed_at = VALUES(proposed_at)`,
          [equipment.id, proposedFamily, reason, confidence]
        );
        
        proposals.push({
          equipment_type_id: equipment.id,
          type_code: equipment.type_code,
          type_name: equipment.type_name,
          proposed_family_code: proposedFamily,
          confidence: confidence,
          reason: reason,
          status: 'pending_review'
        });
      }
    }
    
    return proposals;
  }

  /**
   * Generate proposed industry mappings for review
   */
  async generateProposedIndustries(equipmentTypes) {
    const proposals = [];
    
    // Get default industry
    const [defaultIndustry] = await db.query(
      "SELECT id, code FROM industries WHERE code = 'WATER_WASTEWATER_UTILITIES' AND is_active = TRUE LIMIT 1"
    );
    
    if (defaultIndustry.length === 0) {
      console.log('  ERROR: Default industry not found');
      return proposals;
    }
    
    const defaultIndustryId = defaultIndustry[0].id;
    const defaultIndustryCode = defaultIndustry[0].code;
    
    for (const equipment of equipmentTypes) {
      // Determine industry based on family
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
      
      const proposedIndustryCode = industryMap[equipment.family_code] || defaultIndustryCode;
      
      const [industry] = await db.query(
        'SELECT id FROM industries WHERE code = ? AND is_active = TRUE',
        [proposedIndustryCode]
      );
      
      if (industry.length > 0) {
        proposals.push({
          equipment_type_id: equipment.id,
          type_code: equipment.type_code,
          proposed_industry_id: industry[0].id,
          proposed_industry_code: proposedIndustryCode,
          reason: `Default industry for ${equipment.family_code}`,
          status: 'pending_review'
        });
      }
    }
    
    return proposals;
  }

  /**
   * Print validation report
   */
  printReport() {
    console.log('\n========================================');
    console.log('Validation Report');
    console.log('========================================');
    
    const { summary, gaps, proposals, errors } = this.results;
    
    console.log('\nSummary:');
    console.log(`  Total Equipment Types: ${summary.total?.equipment_types || 0}`);
    console.log(`  With Family Mapping: ${summary.total?.with_family || 0}`);
    console.log(`  With Industry Mapping: ${summary.total?.with_industry || 0}`);
    console.log(`  (Equipment, Industry) Combinations: ${summary.total?.total_industry_combinations || 0}`);
    console.log(`  Covered Combinations: ${summary.total?.covered_combinations || 0}`);
    console.log(`  Coverage: ${summary.total?.coverage_percentage || 0}%`);
    
    if (gaps.length > 0) {
      console.log('\nGaps Found:');
      for (const gap of gaps) {
        console.log(`  - ${gap.type}: ${gap.count}`);
      }
    }
    
    if (proposals.length > 0) {
      console.log('\nProposals Generated (for review):');
      console.log(`  Total: ${proposals.length}`);
      console.log('  Review at: SELECT * FROM equipment_type_family_proposals WHERE review_status = pending');
    }
    
    if (errors.length > 0) {
      console.log('\nErrors:');
      for (const error of errors) {
        console.log(`  [${error.severity.toUpperCase()}] ${error.type}: ${error.message}`);
      }
    }
    
    console.log('\n========================================');
    
    if (errors.length > 0) {
      console.log('✗ Validation FAILED - errors found');
      process.exitCode = 2;
    } else if (summary.total?.coverage_percentage === 100 && gaps.length === 0) {
      console.log('✓ Coverage validation PASSED');
    } else {
      console.log('✗ Coverage validation INCOMPLETE - gaps found');
      console.log('\nTo generate proposals for review:');
      console.log('  node database/validate-coverage.js --propose');
      process.exitCode = 1;
    }
    
    console.log('========================================\n');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const generateProposals = args.includes('--propose') || args.includes('-p');
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node validate-coverage.js [options]

Options:
  --propose, -p    Generate proposals for review (does NOT apply mappings)
  --help, -h       Show this help

Examples:
  node validate-coverage.js              # Read-only validation
  node validate-coverage.js --propose    # Generate proposals for admin review

Note: This script is READ-ONLY by default.
Mappings are NOT auto-applied. Proposals are stored in:
  - equipment_type_family_proposals table

To apply approved mappings, use admin API or:
  - POST /api/admin/coverage/map-equipment-to-family
    `);
    return;
  }
  
  const validator = new CoverageValidator();
  await validator.validate(generateProposals);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Validation failed:', error);
      process.exit(1);
    });
}

module.exports = CoverageValidator;
