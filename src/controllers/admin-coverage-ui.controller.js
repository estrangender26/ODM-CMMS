/**
 * Admin Coverage UI Controller
 * Step 5: Operational tooling for coverage management
 * 
 * Provides enhanced admin UI data with filtering, search, pagination
 */

const { pool } = require('../config/database');

class AdminCoverageUIController {
  /**
   * GET /api/admin/coverage/dashboard
   * Coverage dashboard data with stats and charts
   */
  async getDashboard(req, res) {
    try {
      const stats = await this.getDashboardStats();
      const recentChanges = await this.getRecentChanges(10);
      const gapSummary = await this.getGapSummary();
      
      res.json({
        success: true,
        data: {
          stats,
          recent_changes: recentChanges,
          gap_summary: gapSummary,
          updated_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
    }
  }

  /**
   * GET /api/admin/coverage/equipment-with-filters
   * Equipment list with advanced filtering
   */
  async getEquipmentWithFilters(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        search = '',
        family_code = '',
        industry_id = '',
        status = '', // 'complete', 'mapped_no_templates', 'unmapped', 'missing_industry'
        category_id = '',
        class_id = '',
        sort_by = 'type_name',
        sort_order = 'asc'
      } = req.query;
      
      const offset = (page - 1) * limit;
      const params = [];
      
      // Build WHERE clause
      let whereClause = 'WHERE 1=1';
      
      if (search) {
        whereClause += ' AND (et.type_name LIKE ? OR et.type_code LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }
      
      if (family_code) {
        whereClause += family_code === 'none' 
          ? ' AND etm.id IS NULL'
          : ' AND etm.family_code = ?';
        if (family_code !== 'none') params.push(family_code);
      }
      
      if (industry_id) {
        whereClause += industry_id === 'none'
          ? ' AND eti.id IS NULL'
          : ' AND eti.industry_id = ?';
        if (industry_id !== 'none') params.push(industry_id);
      }
      
      if (category_id) {
        whereClause += ' AND ec.category_id = ?';
        params.push(category_id);
      }
      
      if (class_id) {
        whereClause += ' AND et.class_id = ?';
        params.push(class_id);
      }
      
      // Status filter
      if (status) {
        switch (status) {
          case 'complete':
            whereClause += ' AND etm.id IS NOT NULL AND eti.id IS NOT NULL AND tt.id IS NOT NULL';
            break;
          case 'mapped_no_templates':
            whereClause += ' AND etm.id IS NOT NULL AND eti.id IS NOT NULL AND tt.id IS NULL';
            break;
          case 'unmapped':
            whereClause += ' AND etm.id IS NULL';
            break;
          case 'missing_industry':
            whereClause += ' AND etm.id IS NOT NULL AND eti.id IS NULL';
            break;
          case 'missing_templates':
            whereClause += ' AND etm.id IS NOT NULL AND eti.id IS NOT NULL AND tt.id IS NULL';
            break;
        }
      }
      
      // Valid sort columns
      const validSortColumns = ['type_name', 'type_code', 'class_name', 'category_name', 'family_name'];
      const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'type_name';
      const sortDir = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
      
      const sql = `
        SELECT 
          et.id,
          et.type_name,
          et.type_code,
          et.description,
          ec.id as class_id,
          ec.class_name,
          ec.class_code,
          c.id as category_id,
          c.category_name,
          c.category_code,
          etm.family_code,
          tf.family_name,
          GROUP_CONCAT(DISTINCT CONCAT(i.id, ':', i.name) ORDER BY i.name SEPARATOR '|') as industries,
          COUNT(DISTINCT tt.id) as template_count,
          COUNT(DISTINCT tti.id) as industry_template_count,
          CASE 
            WHEN etm.id IS NULL THEN 'unmapped'
            WHEN eti.id IS NULL THEN 'missing_industry'
            WHEN tt.id IS NULL THEN 'missing_templates'
            ELSE 'complete'
          END as status,
          etm.created_at as mapped_at,
          etm.mapping_source
        FROM equipment_types et
        JOIN equipment_classes ec ON et.class_id = ec.id
        JOIN equipment_categories c ON ec.category_id = c.id
        LEFT JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
        LEFT JOIN template_families tf ON etm.family_code = tf.family_code
        LEFT JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
        LEFT JOIN industries i ON eti.industry_id = i.id
        LEFT JOIN task_templates tt ON et.id = tt.equipment_type_id AND tt.is_system = TRUE
        LEFT JOIN task_templates tti ON et.id = tti.equipment_type_id AND tti.is_system = TRUE 
          AND (tti.industry_id = eti.industry_id OR tti.industry_id IS NULL)
        ${whereClause}
        GROUP BY et.id, et.type_name, et.type_code, et.description,
                 ec.id, ec.class_name, ec.class_code,
                 c.id, c.category_name, c.category_code,
                 etm.family_code, tf.family_name, etm.id, etm.created_at, etm.mapping_source, eti.id
        ORDER BY ${sortColumn} ${sortDir}
        LIMIT ? OFFSET ?
      `;
      
      params.push(parseInt(limit), parseInt(offset));
      
      const [equipment] = await db.query(sql, params);
      
      // Parse industries string into array
      equipment.forEach(e => {
        e.industries = e.industries 
          ? e.industries.split('|').map(i => {
              const [id, name] = i.split(':');
              return { id: parseInt(id), name };
            })
          : [];
      });
      
      // Get total count
      const [countResult] = await db.query(
        `SELECT COUNT(DISTINCT et.id) as total 
         FROM equipment_types et
         JOIN equipment_classes ec ON et.class_id = ec.id
         JOIN equipment_categories c ON ec.category_id = c.id
         LEFT JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
         LEFT JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
         LEFT JOIN task_templates tt ON et.id = tt.equipment_type_id AND tt.is_system = TRUE
         ${whereClause}`,
        params.slice(0, -2)
      );
      
      // Get filter options
      const [families] = await pool.execute(
        "SELECT family_code, family_name FROM template_families WHERE is_active = TRUE ORDER BY family_name"
      );
      const [industries] = await pool.execute(
        "SELECT id, name FROM industries WHERE is_active = TRUE ORDER BY name"
      );
      const [categories] = await db.query(
        "SELECT id, category_name as name FROM equipment_categories ORDER BY category_name"
      );
      
      res.json({
        success: true,
        data: {
          equipment,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: countResult[0].total,
            total_pages: Math.ceil(countResult[0].total / limit)
          },
          filters: {
            families: [{ family_code: 'none', family_name: 'No Family' }, ...families],
            industries: [{ id: 'none', name: 'No Industry' }, ...industries],
            categories,
            status_options: [
              { value: '', label: 'All Statuses' },
              { value: 'complete', label: 'Complete' },
              { value: 'mapped_no_templates', label: 'Mapped - No Templates' },
              { value: 'unmapped', label: 'Unmapped' },
              { value: 'missing_industry', label: 'Missing Industry' },
              { value: 'missing_templates', label: 'Missing Templates' }
            ]
          }
        }
      });
    } catch (error) {
      console.error('Error fetching equipment with filters:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch equipment' });
    }
  }

  /**
   * GET /api/admin/coverage/gap-resolution
   * Gap resolution view with actionable items
   */
  async getGapResolution(req, res) {
    try {
      const { gap_type = 'all', page = 1, limit = 25 } = req.query;
      const offset = (page - 1) * limit;
      
      let sql = '';
      let countSql = '';
      let params = [];
      
      switch (gap_type) {
        case 'unmapped':
          sql = `
            SELECT 
              et.id, et.type_name, et.type_code,
              ec.class_name, c.category_name,
              NULL as family_code,
              'unmapped' as gap_type,
              'Assign family mapping' as action_required
            FROM equipment_types et
            JOIN equipment_classes ec ON et.class_id = ec.id
            JOIN equipment_categories c ON ec.category_id = c.id
            LEFT JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
            WHERE etm.id IS NULL
          `;
          break;
          
        case 'missing_industry':
          sql = `
            SELECT 
              et.id, et.type_name, et.type_code,
              ec.class_name, c.category_name,
              etm.family_code,
              'missing_industry' as gap_type,
              'Assign industry mapping' as action_required
            FROM equipment_types et
            JOIN equipment_classes ec ON et.class_id = ec.id
            JOIN equipment_categories c ON ec.category_id = c.id
            JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
            LEFT JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
            WHERE eti.id IS NULL
          `;
          break;
          
        case 'missing_templates':
          sql = `
            SELECT 
              et.id, et.type_name, et.type_code,
              ec.class_name, c.category_name,
              etm.family_code,
              'missing_templates' as gap_type,
              'Generate system templates' as action_required
            FROM equipment_types et
            JOIN equipment_classes ec ON et.class_id = ec.id
            JOIN equipment_categories c ON ec.category_id = c.id
            JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
            JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
            LEFT JOIN task_templates tt ON et.id = tt.equipment_type_id AND tt.is_system = TRUE
            WHERE tt.id IS NULL
            GROUP BY et.id
          `;
          break;
          
        case 'incomplete_coverage':
          sql = `
            SELECT 
              et.id, et.type_name, et.type_code,
              ec.class_name, c.category_name,
              etm.family_code,
              'incomplete_coverage' as gap_type,
              CONCAT('Missing templates for ', COUNT(DISTINCT eti.industry_id) - COUNT(DISTINCT tt.industry_id), ' industries') as action_required
            FROM equipment_types et
            JOIN equipment_classes ec ON et.class_id = ec.id
            JOIN equipment_categories c ON ec.category_id = c.id
            JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
            JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
            LEFT JOIN task_templates tt ON et.id = tt.equipment_type_id AND tt.is_system = TRUE 
              AND (tt.industry_id = eti.industry_id OR tt.industry_id IS NULL)
            GROUP BY et.id
            HAVING COUNT(DISTINCT tt.id) < COUNT(DISTINCT tfr.id)
          `;
          break;
          
        default: // 'all'
          sql = `
            (SELECT 
              et.id, et.type_name, et.type_code,
              ec.class_name, c.category_name,
              NULL as family_code,
              'unmapped' as gap_type,
              'Assign family mapping' as action_required
            FROM equipment_types et
            JOIN equipment_classes ec ON et.class_id = ec.id
            JOIN equipment_categories c ON ec.category_id = c.id
            LEFT JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
            WHERE etm.id IS NULL)
            UNION ALL
            (SELECT 
              et.id, et.type_name, et.type_code,
              ec.class_name, c.category_name,
              etm.family_code,
              'missing_industry' as gap_type,
              'Assign industry mapping' as action_required
            FROM equipment_types et
            JOIN equipment_classes ec ON et.class_id = ec.id
            JOIN equipment_categories c ON ec.category_id = c.id
            JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
            LEFT JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
            WHERE eti.id IS NULL)
            UNION ALL
            (SELECT 
              et.id, et.type_name, et.type_code,
              ec.class_name, c.category_name,
              etm.family_code,
              'missing_templates' as gap_type,
              'Generate system templates' as action_required
            FROM equipment_types et
            JOIN equipment_classes ec ON et.class_id = ec.id
            JOIN equipment_categories c ON ec.category_id = c.id
            JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
            JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
            LEFT JOIN task_templates tt ON et.id = tt.equipment_type_id AND tt.is_system = TRUE
            WHERE tt.id IS NULL
            GROUP BY et.id)
          `;
      }
      
      // Add ordering and pagination
      sql += ' ORDER BY gap_type, type_name LIMIT ? OFFSET ?';
      params.push(parseInt(limit), parseInt(offset));
      
      const [gaps] = await db.query(sql, params);
      
      // Get counts per gap type
      const [[unmappedCount]] = await db.query(`
        SELECT COUNT(*) as count FROM equipment_types et
        LEFT JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
        WHERE etm.id IS NULL
      `);
      
      const [[missingIndustryCount]] = await db.query(`
        SELECT COUNT(*) as count FROM equipment_types et
        JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
        LEFT JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
        WHERE eti.id IS NULL
      `);
      
      const [[missingTemplatesCount]] = await db.query(`
        SELECT COUNT(DISTINCT et.id) as count FROM equipment_types et
        JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
        JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
        LEFT JOIN task_templates tt ON et.id = tt.equipment_type_id AND tt.is_system = TRUE
        WHERE tt.id IS NULL
      `);
      
      res.json({
        success: true,
        data: {
          gaps,
          summary: {
            unmapped: unmappedCount.count,
            missing_industry: missingIndustryCount.count,
            missing_templates: missingTemplatesCount.count,
            total: unmappedCount.count + missingIndustryCount.count + missingTemplatesCount.count
          },
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: gaps.length
          }
        }
      });
    } catch (error) {
      console.error('Error fetching gap resolution:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch gap resolution' });
    }
  }

  /**
   * GET /api/admin/coverage/template-browser
   * Browse system templates with filters
   */
  async getTemplateBrowser(req, res) {
    try {
      const {
        page = 1,
        limit = 25,
        equipment_type_id = '',
        family_code = '',
        industry_id = '',
        task_kind = '',
        search = ''
      } = req.query;
      
      const offset = (page - 1) * limit;
      const params = [];
      
      let whereClause = 'WHERE tt.is_system = TRUE';
      
      if (equipment_type_id) {
        whereClause += ' AND tt.equipment_type_id = ?';
        params.push(equipment_type_id);
      }
      
      // Family filter removed - requires equipment_type_family_mappings table
      // if (family_code) {
      //   whereClause += ' AND etm.family_code = ?';
      //   params.push(family_code);
      // }
      
      if (industry_id) {
        whereClause += ' AND (tt.industry_id = ? OR tt.industry_id IS NULL)';
        params.push(industry_id);
      }
      
      if (task_kind) {
        whereClause += ' AND tt.task_kind = ?';
        params.push(task_kind);
      }
      
      if (search) {
        whereClause += ' AND (tt.template_name LIKE ? OR tt.template_code LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }
      
      const sql = `
        SELECT 
          tt.id,
          tt.template_code,
          tt.template_name,
          tt.task_kind,
          tt.frequency_value,
          tt.frequency_unit,
          tt.estimated_duration_minutes,
          tt.is_active,
          tt.created_at,
          et.id as equipment_type_id,
          et.type_name,
          et.type_code,
          i.name as industry_name,
          COUNT(DISTINCT tts.id) as step_count,
          0 as safety_control_count
        FROM task_templates tt
        JOIN equipment_types et ON tt.equipment_type_id = et.id
        LEFT JOIN industries i ON tt.industry_id = i.id
        LEFT JOIN task_template_steps tts ON tt.id = tts.task_template_id
        ${whereClause}
        GROUP BY tt.id
        ORDER BY tt.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      params.push(parseInt(limit), parseInt(offset));
      
      const [templates] = await pool.execute(sql, params);
      
      // Get filter options
      let families = [];
      try {
        const [familiesRows] = await pool.execute(
          "SELECT family_code, family_name FROM template_families WHERE is_active = TRUE"
        );
        families = familiesRows || [];
      } catch (e) {
        families = [];
      }
      
      const [industries] = await pool.execute(
        "SELECT id, name FROM industries WHERE is_active = TRUE"
      );
      
      let taskKinds = [];
      try {
        const [kinds] = await pool.execute(
          "SELECT DISTINCT task_kind FROM task_templates WHERE is_system = TRUE"
        );
        taskKinds = kinds.map(t => t.task_kind).filter(k => k);
      } catch (e) {
        taskKinds = ['inspection'];
      }
      
      res.json({
        success: true,
        data: {
          templates,
          filters: { families, industries, task_kinds: taskKinds },
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching template browser:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch templates' });
    }
  }

  /**
   * GET /api/admin/coverage/audit-log
   * View audit log with filters
   */
  async getAuditLog(req, res) {
    try {
      const {
        page = 1,
        limit = 50,
        equipment_type_id = '',
        change_type = '',
        start_date = '',
        end_date = ''
      } = req.query;
      
      const offset = (page - 1) * limit;
      const params = [];
      
      let whereClause = 'WHERE 1=1';
      
      if (equipment_type_id) {
        whereClause += ' AND emcl.equipment_type_id = ?';
        params.push(equipment_type_id);
      }
      
      if (change_type) {
        whereClause += ' AND emcl.change_type = ?';
        params.push(change_type);
      }
      
      if (start_date) {
        whereClause += ' AND emcl.changed_at >= ?';
        params.push(start_date);
      }
      
      if (end_date) {
        whereClause += ' AND emcl.changed_at <= ?';
        params.push(end_date);
      }
      
      const sql = `
        SELECT 
          emcl.id,
          emcl.equipment_type_id,
          et.type_name,
          et.type_code,
          emcl.change_type,
          emcl.old_value,
          emcl.new_value,
          emcl.changed_by,
          u.full_name as changed_by_name,
          emcl.changed_at,
          emcl.change_reason
        FROM equipment_mapping_change_log emcl
        JOIN equipment_types et ON emcl.equipment_type_id = et.id
        LEFT JOIN users u ON emcl.changed_by = u.id
        ${whereClause}
        ORDER BY emcl.changed_at DESC
        LIMIT ? OFFSET ?
      `;
      
      params.push(parseInt(limit), parseInt(offset));
      
      const [logs] = await db.query(sql, params);
      
      // Get change type options
      const [changeTypes] = await db.query(
        'SELECT DISTINCT change_type FROM equipment_mapping_change_log ORDER BY change_type'
      );
      
      res.json({
        success: true,
        data: {
          logs,
          change_types: changeTypes.map(c => c.change_type),
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error fetching audit log:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch audit log' });
    }
  }

  // Helper methods
  async getDashboardStats() {
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
    const [[withTemplates]] = await db.query(`
      SELECT COUNT(DISTINCT et.id) as count 
      FROM equipment_types et
      JOIN task_templates tt ON et.id = tt.equipment_type_id AND tt.is_system = TRUE
    `);
    
    return {
      total_equipment_types: total.count,
      with_family_mapping: withFamily.count,
      with_industry_mapping: withIndustry.count,
      with_system_templates: withTemplates.count,
      coverage_percentage: Math.round((withTemplates.count / total.count) * 100)
    };
  }

  async getRecentChanges(limit) {
    const [changes] = await db.query(`
      SELECT 
        emcl.change_type,
        et.type_name,
        emcl.old_value,
        emcl.new_value,
        emcl.changed_at,
        u.full_name as changed_by
      FROM equipment_mapping_change_log emcl
      JOIN equipment_types et ON emcl.equipment_type_id = et.id
      LEFT JOIN users u ON emcl.changed_by = u.id
      ORDER BY emcl.changed_at DESC
      LIMIT ?
    `, [limit]);
    
    return changes;
  }

  async getGapSummary() {
    const [[unmapped]] = await db.query(`
      SELECT COUNT(*) as count FROM equipment_types et
      LEFT JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
      WHERE etm.id IS NULL
    `);
    
    const [[missingIndustry]] = await db.query(`
      SELECT COUNT(*) as count FROM equipment_types et
      JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
      LEFT JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
      WHERE eti.id IS NULL
    `);
    
    const [[missingTemplates]] = await db.query(`
      SELECT COUNT(DISTINCT et.id) as count FROM equipment_types et
      JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
      JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
      LEFT JOIN task_templates tt ON et.id = tt.equipment_type_id AND tt.is_system = TRUE
      WHERE tt.id IS NULL
    `);
    
    return {
      unmapped: unmapped.count,
      missing_industry: missingIndustry.count,
      missing_templates: missingTemplates.count
    };
  }
}

module.exports = new AdminCoverageUIController();
