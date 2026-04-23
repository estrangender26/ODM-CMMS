/**
 * Coverage Validation Controller
 * Step 4: Industry-aware coverage validation and admin mapping visibility
 * 
 * HARDENED: Duplicate prevention, validation, audit logging
 */

const { pool } = require('../config/database');

class CoverageValidationController {
  /**
   * GET /api/admin/coverage/validate
   * Full coverage validation report (READ-ONLY)
   */
  async validateCoverage(req, res) {
    try {
      const report = await this.generateValidationReport();
      
      res.json({
        success: true,
        data: report,
        generated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error generating coverage validation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate coverage validation report'
      });
    }
  }

  /**
   * GET /api/admin/coverage/unmapped-equipment
   * Equipment types without family mappings
   */
  async getUnmappedEquipment(req, res) {
    try {
      const sql = `
        SELECT 
          et.id,
          et.type_name,
          et.type_code,
          ec.class_name,
          c.category_name,
          pfp.proposed_family_code,
          pfp.confidence_score,
          pfp.proposal_reason
        FROM equipment_types et
        JOIN equipment_classes ec ON et.class_id = ec.id
        JOIN equipment_categories c ON ec.category_id = c.id
        LEFT JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
        LEFT JOIN equipment_type_family_proposals pfp ON et.id = pfp.equipment_type_id 
          AND pfp.review_status = 'pending'
        WHERE etm.id IS NULL
        ORDER BY c.category_name, ec.class_name, et.type_name
      `;
      
      const [equipment] = await pool.query(sql);
      
      res.json({
        success: true,
        data: {
          count: equipment.length,
          equipment_types: equipment
        }
      });
    } catch (error) {
      console.error('Error fetching unmapped equipment:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch unmapped equipment' });
    }
  }

  /**
   * GET /api/admin/coverage/missing-industry-mappings
   * Equipment types without industry associations
   */
  async getMissingIndustryMappings(req, res) {
    try {
      const sql = `
        SELECT 
          et.id,
          et.type_name,
          et.type_code,
          ec.class_name,
          c.category_name,
          etm.family_code,
          tf.family_name
        FROM equipment_types et
        JOIN equipment_classes ec ON et.class_id = ec.id
        JOIN equipment_categories c ON ec.category_id = c.id
        JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
        LEFT JOIN template_families tf ON etm.family_code = tf.family_code
        LEFT JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
        WHERE eti.id IS NULL
        ORDER BY c.category_name, ec.class_name, et.type_name
      `;
      
      const [equipment] = await pool.query(sql);
      
      res.json({
        success: true,
        data: {
          count: equipment.length,
          equipment_types: equipment
        }
      });
    } catch (error) {
      console.error('Error fetching missing industry mappings:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch missing industry mappings' });
    }
  }

  /**
   * GET /api/admin/coverage/missing-templates
   * Equipment types without system templates (industry-aware)
   */
  async getMissingTemplates(req, res) {
    try {
      // Industry-aware: Check for each (equipment_type, industry) combination
      const sql = `
        SELECT 
          et.id as equipment_type_id,
          et.type_name,
          et.type_code,
          etm.family_code,
          eti.industry_id,
          i.code as industry_code,
          i.name as industry_name,
          COUNT(tt.id) as existing_template_count,
          COUNT(tfr.id) as required_task_kind_count
        FROM equipment_types et
        JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
        JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
        JOIN industries i ON eti.industry_id = i.id
        LEFT JOIN template_family_rules tfr ON etm.family_code = tfr.family_code AND tfr.is_active = TRUE
        LEFT JOIN task_templates tt ON et.id = tt.equipment_type_id 
          AND tt.is_system = TRUE 
          AND (tt.industry_id = eti.industry_id OR tt.industry_id IS NULL)
        GROUP BY et.id, et.type_name, et.type_code, etm.family_code, eti.industry_id, i.code, i.name
        HAVING existing_template_count < required_task_kind_count OR existing_template_count = 0
        ORDER BY et.id, i.code
      `;
      
      const [equipment] = await pool.query(sql);
      
      res.json({
        success: true,
        data: {
          count: equipment.length,
          combinations: equipment
        }
      });
    } catch (error) {
      console.error('Error fetching missing templates:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch missing templates' });
    }
  }

  /**
   * GET /api/admin/coverage/by-industry
   * Template coverage by industry
   */
  async getCoverageByIndustry(req, res) {
    try {
      const sql = `
        SELECT 
          i.id as industry_id,
          i.code as industry_code,
          i.name as industry_name,
          COUNT(DISTINCT et.id) as equipment_type_count,
          COUNT(DISTINCT CASE WHEN etm.id IS NOT NULL THEN et.id END) as mapped_count,
          COUNT(DISTINCT CASE WHEN tt.id IS NOT NULL THEN et.id END) as with_templates_count,
          COUNT(DISTINCT tt.id) as template_count
        FROM industries i
        LEFT JOIN equipment_type_industries eti ON i.id = eti.industry_id
        LEFT JOIN equipment_types et ON eti.equipment_type_id = et.id
        LEFT JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
        LEFT JOIN task_templates tt ON et.id = tt.equipment_type_id AND tt.is_system = TRUE
          AND (tt.industry_id = i.id OR tt.industry_id IS NULL)
        WHERE i.is_active = TRUE
        GROUP BY i.id, i.code, i.name
        ORDER BY i.name
      `;
      
      const [coverage] = await pool.query(sql);
      
      res.json({
        success: true,
        data: { coverage }
      });
    } catch (error) {
      console.error('Error fetching coverage by industry:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch coverage by industry' });
    }
  }

  /**
   * GET /api/admin/coverage/by-family
   * Template coverage by family
   */
  async getCoverageByFamily(req, res) {
    try {
      const sql = `
        SELECT 
          tf.family_code,
          tf.family_name,
          COUNT(DISTINCT etm.equipment_type_id) as equipment_type_count,
          COUNT(DISTINCT tt.id) as template_count,
          COUNT(DISTINCT tts.id) as total_steps,
          AVG(CASE WHEN tt.id IS NOT NULL THEN step_counts.step_count END) as avg_steps_per_template
        FROM template_families tf
        LEFT JOIN equipment_type_family_mappings etm ON tf.family_code = etm.family_code
        LEFT JOIN task_templates tt ON etm.equipment_type_id = tt.equipment_type_id AND tt.is_system = TRUE
        LEFT JOIN task_template_steps tts ON tt.id = tts.task_template_id
        LEFT JOIN (
          SELECT task_template_id, COUNT(*) as step_count 
          FROM task_template_steps 
          GROUP BY task_template_id
        ) step_counts ON tt.id = step_counts.task_template_id
        WHERE tf.is_active = TRUE
        GROUP BY tf.family_code, tf.family_name
        ORDER BY tf.family_name
      `;
      
      const [coverage] = await pool.query(sql);
      
      res.json({
        success: true,
        data: { coverage }
      });
    } catch (error) {
      console.error('Error fetching coverage by family:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch coverage by family' });
    }
  }

  /**
   * GET /api/admin/coverage/equipment-mappings
   * All equipment type mappings (family + industry)
   */
  async getEquipmentMappings(req, res) {
    try {
      const { page = 1, limit = 50, search = '', family_code = '', industry_id = '' } = req.query;
      const offset = (page - 1) * limit;
      
      let whereClause = 'WHERE 1=1';
      const params = [];
      
      if (search) {
        whereClause += ' AND (et.type_name LIKE ? OR et.type_code LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }
      
      if (family_code) {
        whereClause += ' AND etm.family_code = ?';
        params.push(family_code);
      }
      
      if (industry_id) {
        whereClause += ' AND eti.industry_id = ?';
        params.push(industry_id);
      }
      
      const sql = `
        SELECT 
          et.id,
          et.type_name,
          et.type_code,
          ec.class_name,
          c.category_name,
          etm.family_code,
          tf.family_name,
          GROUP_CONCAT(DISTINCT i.name ORDER BY i.name SEPARATOR ', ') as industries,
          COUNT(DISTINCT tt.id) as template_count,
          CASE 
            WHEN etm.id IS NOT NULL AND tt.id IS NOT NULL THEN 'complete'
            WHEN etm.id IS NOT NULL THEN 'mapped_no_templates'
            ELSE 'unmapped'
          END as status
        FROM equipment_types et
        JOIN equipment_classes ec ON et.class_id = ec.id
        JOIN equipment_categories c ON ec.category_id = c.id
        LEFT JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
        LEFT JOIN template_families tf ON etm.family_code = tf.family_code
        LEFT JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
        LEFT JOIN industries i ON eti.industry_id = i.id
        LEFT JOIN task_templates tt ON et.id = tt.equipment_type_id AND tt.is_system = TRUE
        ${whereClause}
        GROUP BY et.id, et.type_name, et.type_code, ec.class_name, c.category_name, 
                 etm.family_code, tf.family_name, etm.id
        ORDER BY c.category_name, ec.class_name, et.type_name
        LIMIT ? OFFSET ?
      `;
      
      params.push(parseInt(limit), parseInt(offset));
      
      const [mappings] = await pool.query(sql, params);
      
      // Get total count
      const [countResult] = await pool.query(
        `SELECT COUNT(DISTINCT et.id) as total FROM equipment_types et ${whereClause}`,
        params.slice(0, -2)
      );
      
      res.json({
        success: true,
        data: {
          mappings,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: countResult[0].total,
            total_pages: Math.ceil(countResult[0].total / limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching equipment mappings:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch equipment mappings' });
    }
  }

  /**
   * POST /api/admin/coverage/map-equipment-to-family
   * Map an equipment type to a template family (HARDENED)
   * 
   * Enforces:
   * - Exactly one family mapping per equipment type (duplicate prevention)
   * - Validates family exists
   * - Warns if equipment has existing seeded templates
   * - Audit logs the change
   */
  async mapEquipmentToFamily(req, res) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const { equipment_type_id, family_code, change_reason = '' } = req.body;
      const changed_by = req.user?.id || null;
      
      // Validation 1: Required fields
      if (!equipment_type_id || !family_code) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'equipment_type_id and family_code are required'
        });
      }
      
      // Validation 2: Equipment type exists
      const [equipment] = await connection.query(
        'SELECT id, type_name, type_code FROM equipment_types WHERE id = ?',
        [equipment_type_id]
      );
      
      if (equipment.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Equipment type not found'
        });
      }
      
      // Validation 3: Family exists and is active
      const [family] = await connection.query(
        'SELECT family_code FROM template_families WHERE family_code = ? AND is_active = TRUE',
        [family_code]
      );
      
      if (family.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Template family not found or inactive'
        });
      }
      
      // Validation 4: Check for existing mapping (enforce exactly one)
      const [existingMapping] = await connection.query(
        'SELECT family_code FROM equipment_type_family_mappings WHERE equipment_type_id = ?',
        [equipment_type_id]
      );
      
      if (existingMapping.length > 0) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: 'Equipment type already has a family mapping. Use update endpoint to change.',
          existing_family: existingMapping[0].family_code,
          code: 'FAMILY_MAPPING_EXISTS'
        });
      }
      
      // Validation 5: Check for existing seeded templates (WARNING)
      const [existingTemplates] = await connection.query(
        `SELECT COUNT(*) as count FROM task_templates 
         WHERE equipment_type_id = ? AND is_system = TRUE`,
        [equipment_type_id]
      );
      
      const hasExistingTemplates = existingTemplates[0].count > 0;
      
      // Insert mapping
      await connection.query(
        `INSERT INTO equipment_type_family_mappings 
         (equipment_type_id, family_code, mapping_source)
         VALUES (?, ?, 'manual')`,
        [equipment_type_id, family_code]
      );
      
      // Audit log
      await connection.query(
        `INSERT INTO equipment_mapping_change_log 
         (equipment_type_id, change_type, new_value, changed_by, change_reason)
         VALUES (?, 'family_assigned', ?, ?, ?)`,
        [equipment_type_id, family_code, changed_by, change_reason]
      );
      
      await connection.commit();
      
      const response = {
        success: true,
        message: 'Equipment type mapped to family successfully',
        data: {
          equipment_type_id,
          family_code,
          equipment_name: equipment[0].type_name
        }
      };
      
      // Add warning if templates exist
      if (hasExistingTemplates) {
        response.warning = 'Equipment type has existing system templates. These templates may not match the new family rules.';
        response.recommendation = 'Review existing templates or regenerate from new family rules.';
      }
      
      res.json(response);
    } catch (error) {
      await connection.rollback();
      
      // Handle unique constraint violation
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          message: 'Equipment type already has a family mapping.',
          code: 'DUPLICATE_MAPPING'
        });
      }
      
      console.error('Error mapping equipment to family:', error);
      res.status(500).json({ success: false, message: 'Failed to map equipment to family' });
    } finally {
      connection.release();
    }
  }

  /**
   * POST /api/admin/coverage/map-equipment-to-industry
   * Map an equipment type to an industry (HARDENED)
   * 
   * Enforces:
   * - Validates industry exists
   * - Prevents duplicate industry mappings
   * - Audit logs the change
   */
  async mapEquipmentToIndustry(req, res) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const { equipment_type_id, industry_id, change_reason = '' } = req.body;
      const changed_by = req.user?.id || null;
      
      // Validation 1: Required fields
      if (!equipment_type_id || !industry_id) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'equipment_type_id and industry_id are required'
        });
      }
      
      // Validation 2: Equipment type exists
      const [equipment] = await connection.query(
        'SELECT id, type_name FROM equipment_types WHERE id = ?',
        [equipment_type_id]
      );
      
      if (equipment.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Equipment type not found'
        });
      }
      
      // Validation 3: Industry exists and is active
      const [industry] = await connection.query(
        'SELECT id, code, name FROM industries WHERE id = ? AND is_active = TRUE',
        [industry_id]
      );
      
      if (industry.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'Industry not found or inactive'
        });
      }
      
      // Validation 4: Check for existing mapping (prevent duplicates)
      const [existingMapping] = await connection.query(
        'SELECT id FROM equipment_type_industries WHERE equipment_type_id = ? AND industry_id = ?',
        [equipment_type_id, industry_id]
      );
      
      if (existingMapping.length > 0) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          message: 'Equipment type is already mapped to this industry.',
          code: 'INDUSTRY_MAPPING_EXISTS'
        });
      }
      
      // Insert mapping
      await connection.query(
        `INSERT INTO equipment_type_industries (equipment_type_id, industry_id)
         VALUES (?, ?)`,
        [equipment_type_id, industry_id]
      );
      
      // Audit log
      await connection.query(
        `INSERT INTO equipment_mapping_change_log 
         (equipment_type_id, change_type, new_value, changed_by, change_reason)
         VALUES (?, 'industry_added', ?, ?, ?)`,
        [equipment_type_id, industry[0].code, changed_by, change_reason]
      );
      
      await connection.commit();
      
      res.json({
        success: true,
        message: 'Equipment type mapped to industry successfully',
        data: {
          equipment_type_id,
          industry_id,
          industry_name: industry[0].name
        }
      });
    } catch (error) {
      await connection.rollback();
      
      if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
          success: false,
          message: 'Equipment type is already mapped to this industry.',
          code: 'DUPLICATE_MAPPING'
        });
      }
      
      console.error('Error mapping equipment to industry:', error);
      res.status(500).json({ success: false, message: 'Failed to map equipment to industry' });
    } finally {
      connection.release();
    }
  }

  /**
   * PUT /api/admin/coverage/update-family-mapping
   * Update existing family mapping (with safeguards)
   */
  async updateFamilyMapping(req, res) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const { equipment_type_id, family_code, change_reason = '' } = req.body;
      const changed_by = req.user?.id || null;
      
      if (!equipment_type_id || !family_code) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'equipment_type_id and family_code are required'
        });
      }
      
      // Get existing mapping
      const [existing] = await connection.query(
        'SELECT family_code FROM equipment_type_family_mappings WHERE equipment_type_id = ?',
        [equipment_type_id]
      );
      
      if (existing.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          message: 'No existing family mapping found. Use POST to create.',
          code: 'NO_EXISTING_MAPPING'
        });
      }
      
      const oldFamily = existing[0].family_code;
      
      // Check for existing templates
      const [templates] = await connection.query(
        `SELECT COUNT(*) as count FROM task_templates 
         WHERE equipment_type_id = ? AND is_system = TRUE`,
        [equipment_type_id]
      );
      
      const hasTemplates = templates[0].count > 0;
      
      // Update mapping
      await connection.query(
        `UPDATE equipment_type_family_mappings 
         SET family_code = ?, mapping_source = 'manual', updated_at = NOW()
         WHERE equipment_type_id = ?`,
        [family_code, equipment_type_id]
      );
      
      // Audit log
      await connection.query(
        `INSERT INTO equipment_mapping_change_log 
         (equipment_type_id, change_type, old_value, new_value, changed_by, change_reason)
         VALUES (?, 'family_changed', ?, ?, ?, ?)`,
        [equipment_type_id, oldFamily, family_code, changed_by, change_reason]
      );
      
      await connection.commit();
      
      const response = {
        success: true,
        message: 'Family mapping updated successfully',
        data: {
          equipment_type_id,
          old_family: oldFamily,
          new_family: family_code
        }
      };
      
      if (hasTemplates) {
        response.warning = 'Equipment type has existing system templates from previous family.';
        response.recommendation = 'Review existing templates - they may need to be regenerated.';
      }
      
      res.json(response);
    } catch (error) {
      await connection.rollback();
      console.error('Error updating family mapping:', error);
      res.status(500).json({ success: false, message: 'Failed to update family mapping' });
    } finally {
      connection.release();
    }
  }

  /**
   * Generate full validation report (industry-aware)
   */
  async generateValidationReport() {
    let totalEquipmentTypes = 0;
    let withFamilyMapping = 0;
    let withIndustryMapping = 0;
    let totalCombinations = 0;
    let coveredCombinations = 0;
    let duplicateMappings = 0;
    let criticalityCounts = { A: 0, B: 0, C: 0 };

    // Total equipment types
    try {
      const [totalResult] = await pool.query('SELECT COUNT(*) as count FROM equipment_types');
      totalEquipmentTypes = totalResult[0].count;
    } catch (e) {
      console.error('[VALIDATION] Error counting equipment_types:', e.message);
    }

    // With family mappings
    try {
      const [withFamilyResult] = await pool.query(`
        SELECT COUNT(DISTINCT et.id) as count 
        FROM equipment_types et
        JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
      `);
      withFamilyMapping = withFamilyResult[0].count;
    } catch (e) {
      console.error('[VALIDATION] Error counting family mappings:', e.message);
    }

    // With industry mappings
    try {
      const [withIndustryResult] = await pool.query(`
        SELECT COUNT(DISTINCT et.id) as count 
        FROM equipment_types et
        JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
      `);
      withIndustryMapping = withIndustryResult[0].count;
    } catch (e) {
      console.error('[VALIDATION] Error counting industry mappings:', e.message);
    }

    // Total (equipment, industry) combinations
    try {
      const [totalCombinationsResult] = await pool.query(`
        SELECT COUNT(*) as count 
        FROM equipment_type_family_mappings etm
        JOIN equipment_type_industries eti ON etm.equipment_type_id = eti.equipment_type_id
      `);
      totalCombinations = totalCombinationsResult[0].count;
    } catch (e) {
      console.error('[VALIDATION] Error counting combinations:', e.message);
    }

    // Industry-aware covered combinations
    try {
      const [coveredResult] = await pool.query(`
        SELECT COUNT(DISTINCT CONCAT(etm.equipment_type_id, '-', eti.industry_id)) as count
        FROM equipment_type_family_mappings etm
        JOIN equipment_type_industries eti ON etm.equipment_type_id = eti.equipment_type_id
        JOIN task_templates tt ON etm.equipment_type_id = tt.equipment_type_id 
          AND tt.is_system = TRUE 
          AND (tt.industry_id = eti.industry_id OR tt.industry_id IS NULL)
      `);
      coveredCombinations = coveredResult[0].count;
    } catch (e) {
      console.error('[VALIDATION] Error counting covered combinations:', e.message);
    }

    // Check for duplicates
    try {
      const [duplicatesResult] = await pool.query(`
        SELECT COUNT(*) as count FROM (
          SELECT equipment_type_id
          FROM equipment_type_family_mappings
          GROUP BY equipment_type_id
          HAVING COUNT(*) > 1
        ) dup
      `);
      duplicateMappings = duplicatesResult[0].count;
    } catch (e) {
      console.error('[VALIDATION] Error checking duplicate mappings:', e.message);
    }

    // Criticality breakdown (global across all industry mappings)
    try {
      const [critRows] = await pool.query(`
        SELECT criticality, COUNT(DISTINCT equipment_type_id) as count
        FROM equipment_type_industries
        GROUP BY criticality
      `);
      critRows.forEach(r => {
        if (r.criticality) criticalityCounts[r.criticality] = r.count || 0;
      });
    } catch (e) {
      console.error('[VALIDATION] Error counting criticality breakdown:', e.message);
    }

    return {
      summary: {
        total_equipment_types: totalEquipmentTypes,
        with_family_mapping: withFamilyMapping,
        with_industry_mapping: withIndustryMapping,
        total_combinations: totalCombinations,
        covered_combinations: coveredCombinations,
        coverage_percentage: totalCombinations > 0 
          ? Math.round((coveredCombinations / totalCombinations) * 100)
          : 0,
        duplicate_mappings: duplicateMappings,
        criticality_counts: criticalityCounts
      },
      gaps: {
        missing_family_mapping: totalEquipmentTypes - withFamilyMapping,
        missing_industry_mapping: withFamilyMapping - withIndustryMapping,
        missing_templates: totalCombinations - coveredCombinations
      },
      status: (coveredCombinations === totalCombinations && duplicateMappings === 0) 
        ? 'complete' 
        : 'incomplete'
    };
  }
}

module.exports = new CoverageValidationController();
