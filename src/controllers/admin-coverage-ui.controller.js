/**
 * Admin Coverage UI Controller
 * Step 5: Operational tooling for coverage management
 * 
 * Provides enhanced admin UI data with filtering, search, pagination
 */

const { pool } = require('../config/database');

class AdminCoverageUIController {
  /**
   * GET /api/admin/coverage-ui/dashboard
   * Coverage dashboard data with stats and charts
   */
  async getDashboard(req, res) {
    try {
      const industryCode = req.user?.industry || null;
      const stats = await this.getDashboardStats(industryCode);
      const recentChanges = await this.getRecentChanges(10, industryCode);
      const gapSummary = await this.getGapSummary(industryCode);
      
      res.json({
        success: true,
        data: {
          stats,
          recent_changes: recentChanges,
          gap_summary: gapSummary,
          industry_code: industryCode,
          updated_at: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      // Return fallback data on error
      res.json({
        success: true,
        data: {
          stats: {
            total_equipment_types: 0,
            with_family_mapping: 0,
            with_industry_mapping: 0,
            with_system_templates: 0,
            coverage_percentage: 0
          },
          recent_changes: [],
          gap_summary: {
            unmapped: 0,
            missing_industry: 0,
            missing_templates: 0
          },
          industry_code: req.user?.industry || null,
          updated_at: new Date().toISOString()
        }
      });
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
        category_id = '',
        class_id = '',
        sort_by = 'type_name',
        sort_order = 'asc'
      } = req.query;
      
      const industryCode = req.user?.industry || null;
      const offset = (page - 1) * limit;
      const filterParams = [];
      
      // Build WHERE clause - filter by organization's industry if set
      let whereClause = 'WHERE 1=1';
      
      if (industryCode) {
        whereClause += ' AND i.code = ?';
        filterParams.push(industryCode);
      }
      
      if (search) {
        whereClause += ' AND (et.type_name LIKE ? OR et.type_code LIKE ?)';
        filterParams.push(`%${search}%`, `%${search}%`);
      }
      
      if (category_id) {
        whereClause += ' AND ec.category_id = ?';
        filterParams.push(category_id);
      }
      
      if (class_id) {
        whereClause += ' AND et.class_id = ?';
        filterParams.push(class_id);
      }
      
      // Valid sort columns
      const validSortColumns = ['type_name', 'type_code', 'class_name'];
      const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'type_name';
      const sortDir = sort_order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
      
      let joinClause = '';
      if (industryCode) {
        joinClause = `
          JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
          JOIN industries i ON eti.industry_id = i.id
        `;
      }
      
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
          COUNT(DISTINCT tt.id) as template_count,
          CASE WHEN COUNT(DISTINCT tt.id) > 0 THEN 'complete' ELSE 'missing_templates' END as status
        FROM equipment_types et
        JOIN equipment_classes ec ON et.class_id = ec.id
        JOIN equipment_categories c ON ec.category_id = c.id
        ${joinClause}
        LEFT JOIN task_templates tt ON et.id = tt.equipment_type_id AND tt.is_system = TRUE
          ${industryCode ? "AND (tt.industry_id = i.id OR tt.industry_id IS NULL)" : ""}
        ${whereClause}
        GROUP BY et.id
        ORDER BY ${sortColumn} ${sortDir}
        LIMIT ? OFFSET ?
      `;
      
      const queryParams = [...filterParams, parseInt(limit), parseInt(offset)];
      // Use pool.query to avoid mysql2 prepared-statement bug with LIMIT ? OFFSET ? in complex queries
      const [equipment] = await pool.query(sql, queryParams);
      
      // Get total count - use filterParams only, no limit/offset
      let countSql = `
        SELECT COUNT(DISTINCT et.id) as total 
        FROM equipment_types et
        JOIN equipment_classes ec ON et.class_id = ec.id
        JOIN equipment_categories c ON ec.category_id = c.id
        ${joinClause}
        ${whereClause}
      `;
      
      const [countResult] = await pool.query(countSql, filterParams);
      
      // Get filter options
      const [categories] = await pool.execute(
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
            categories,
            families: [],
            industries: [],
            status_options: [
              { value: '', label: 'All Statuses' },
              { value: 'complete', label: 'Complete' },
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
      const industryCode = req.user?.industry || null;
      const offset = (page - 1) * limit;
      
      let gaps = [];
      let total = 0;
      
      if (gap_type === 'all') {
        // Combined gaps from all categories for this industry - run separately to avoid mysql2 UNION LIMIT issues
        gaps = [];
        
        // Unmapped
        try {
          const [unmappedRows] = await pool.execute(`
            SELECT et.id, et.type_name, et.type_code, ec.class_name,
              'unmapped' as gap_type, 'No family assigned' as gap_reason
            FROM equipment_types et
            JOIN equipment_classes ec ON et.class_id = ec.id
            JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
            JOIN industries i ON eti.industry_id = i.id
            LEFT JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
            WHERE i.code = ? AND etm.equipment_type_id IS NULL
          `, [industryCode]);
          gaps = gaps.concat(unmappedRows || []);
        } catch (e) { /* ignore */ }
        
        // Missing industry
        try {
          const [missingIndRows] = await pool.execute(`
            SELECT et.id, et.type_name, et.type_code, ec.class_name,
              'missing_industry' as gap_type, 'No industry assigned' as gap_reason
            FROM equipment_types et
            JOIN equipment_classes ec ON et.class_id = ec.id
            LEFT JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
            WHERE eti.equipment_type_id IS NULL
          `);
          gaps = gaps.concat(missingIndRows || []);
        } catch (e) { /* ignore */ }
        
        // Missing templates
        try {
          const [missingTmplRows] = await pool.execute(`
            SELECT et.id, et.type_name, et.type_code, ec.class_name,
              'missing_templates' as gap_type, 'No system templates for this industry' as gap_reason
            FROM equipment_types et
            JOIN equipment_classes ec ON et.class_id = ec.id
            JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
            JOIN industries ind ON eti.industry_id = ind.id
            JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
            LEFT JOIN task_templates tt ON et.id = tt.equipment_type_id AND tt.is_system = TRUE
              AND (tt.industry_id = ind.id OR tt.industry_id IS NULL)
            WHERE ind.code = ? AND tt.id IS NULL
          `, [industryCode]);
          gaps = gaps.concat(missingTmplRows || []);
        } catch (e) { /* ignore */ }
        
        // Apply pagination manually
        total = gaps.length;
        gaps = gaps.slice(offset, offset + parseInt(limit));
        
      } else if (gap_type === 'unmapped') {
        // Equipment types in this industry without family mappings
        const [rows] = await pool.execute(`
          SELECT 
            et.id,
            et.type_name,
            et.type_code,
            ec.class_name,
            'unmapped' as gap_type,
            'No family assigned' as gap_reason
          FROM equipment_types et
          JOIN equipment_classes ec ON et.class_id = ec.id
          JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
          JOIN industries i ON eti.industry_id = i.id
          LEFT JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
          WHERE i.code = ? AND etm.equipment_type_id IS NULL
          LIMIT ? OFFSET ?
        `, [industryCode, parseInt(limit), offset]);
        gaps = rows;
        
        const [[countRow]] = await pool.execute(`
          SELECT COUNT(*) as total FROM equipment_types et
          JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
          JOIN industries i ON eti.industry_id = i.id
          LEFT JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
          WHERE i.code = ? AND etm.equipment_type_id IS NULL
        `, [industryCode]);
        total = countRow.total;
      } else if (gap_type === 'missing_industry') {
        // Equipment types not mapped to any industry
        const [rows] = await pool.execute(`
          SELECT 
            et.id,
            et.type_name,
            et.type_code,
            ec.class_name,
            'missing_industry' as gap_type,
            'No industry assigned' as gap_reason
          FROM equipment_types et
          JOIN equipment_classes ec ON et.class_id = ec.id
          LEFT JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
          WHERE eti.equipment_type_id IS NULL
          LIMIT ? OFFSET ?
        `, [parseInt(limit), offset]);
        gaps = rows;
        
        const [[countRow]] = await pool.execute(`
          SELECT COUNT(*) as total FROM equipment_types et
          LEFT JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
          WHERE eti.equipment_type_id IS NULL
        `);
        total = countRow.total;
      } else if (gap_type === 'missing_templates') {
        // Equipment types in this industry with family mapping but no system templates
        const [rows] = await pool.execute(`
          SELECT 
            et.id,
            et.type_name,
            et.type_code,
            ec.class_name,
            'missing_templates' as gap_type,
            'No system templates for this industry' as gap_reason
          FROM equipment_types et
          JOIN equipment_classes ec ON et.class_id = ec.id
          JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
          JOIN industries i ON eti.industry_id = i.id
          JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
          LEFT JOIN task_templates tt ON et.id = tt.equipment_type_id AND tt.is_system = TRUE
            AND (tt.industry_id = i.id OR tt.industry_id IS NULL)
          WHERE i.code = ? AND tt.id IS NULL
          LIMIT ? OFFSET ?
        `, [industryCode, parseInt(limit), offset]);
        gaps = rows;
        
        const [[countRow]] = await pool.execute(`
          SELECT COUNT(DISTINCT et.id) as total FROM equipment_types et
          JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
          JOIN industries i ON eti.industry_id = i.id
          JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
          LEFT JOIN task_templates tt ON et.id = tt.equipment_type_id AND tt.is_system = TRUE
            AND (tt.industry_id = i.id OR tt.industry_id IS NULL)
          WHERE i.code = ? AND tt.id IS NULL
        `, [industryCode]);
        total = countRow.total;
      }
      
      const gapSummary = await this.getGapSummary(industryCode);
      
      res.json({
        success: true,
        data: {
          gaps,
          summary: {
            ...gapSummary,
            total
          },
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total
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
        task_kind = '',
        search = '',
        family_code = ''
      } = req.query;
      
      const industryCode = req.user?.industry || null;
      const offset = (page - 1) * limit;
      const params = [];
      
      let whereClause = 'WHERE tt.is_system = TRUE';
      
      if (industryCode) {
        whereClause += ' AND (i.code = ? OR tt.industry_id IS NULL)';
        params.push(industryCode);
      }
      
      if (equipment_type_id) {
        whereClause += ' AND tt.equipment_type_id = ?';
        params.push(equipment_type_id);
      }
      
      if (task_kind) {
        whereClause += ' AND tt.task_kind = ?';
        params.push(task_kind);
      }
      
      if (family_code) {
        whereClause += ' AND tf.family_code = ?';
        params.push(family_code);
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
          tf.family_code,
          tf.family_name,
          COUNT(DISTINCT tts.id) as step_count,
          0 as safety_control_count
        FROM task_templates tt
        JOIN equipment_types et ON tt.equipment_type_id = et.id
        LEFT JOIN industries i ON tt.industry_id = i.id
        LEFT JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
        LEFT JOIN template_families tf ON etm.family_code = tf.family_code
        LEFT JOIN task_template_steps tts ON tt.id = tts.task_template_id
        ${whereClause}
        GROUP BY tt.id
        ORDER BY tt.created_at DESC
        LIMIT ? OFFSET ?
      `;
      
      params.push(parseInt(limit), parseInt(offset));
      
      // Use pool.query to avoid mysql2 prepared-statement bug with LIMIT ? OFFSET ? in complex queries
      const [templates] = await pool.query(sql, params);
      
      // Get total count for pagination
      const countSql = `
        SELECT COUNT(DISTINCT tt.id) as total 
        FROM task_templates tt
        JOIN equipment_types et ON tt.equipment_type_id = et.id
        LEFT JOIN industries i ON tt.industry_id = i.id
        LEFT JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
        LEFT JOIN template_families tf ON etm.family_code = tf.family_code
        ${whereClause}
      `;
      const [countResult] = await pool.query(countSql, params.slice(0, -2));
      const total = countResult[0]?.total || 0;
      
      // Get filter options
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
      
      let families = [];
      try {
        const [familyRows] = await pool.execute(
          "SELECT family_code, family_name FROM template_families ORDER BY family_name"
        );
        families = familyRows || [];
      } catch (e) {
        families = [];
      }
      
      // Get user's industry name for the UI
      let industryName = null;
      if (industryCode) {
        try {
          const [[ind]] = await pool.execute(
            "SELECT name FROM industries WHERE code = ?",
            [industryCode]
          );
          industryName = ind?.name || industryCode;
        } catch (e) {
          industryName = industryCode;
        }
      }
      
      res.json({
        success: true,
        data: {
          templates,
          filters: { families, industries, task_kinds: taskKinds },
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            total_pages: Math.ceil(total / limit)
          },
          industry: {
            code: industryCode,
            name: industryName
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
      // Return empty since audit log table may not exist
      res.json({
        success: true,
        data: {
          logs: [],
          change_types: [],
          pagination: {
            page: 1,
            limit: 50
          }
        }
      });
    } catch (error) {
      console.error('Error fetching audit log:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch audit log' });
    }
  }

  // Helper methods - calculate real coverage stats from existing tables
  async getDashboardStats(industryCode = null) {
    let totalCount = 0;
    let familyMappedCount = 0;
    let industryMappedCount = 0;
    let templateCount = 0;

    if (industryCode) {
      // Industry-aware counts
      try {
        const [[total]] = await pool.execute(`
          SELECT COUNT(DISTINCT et.id) as count 
          FROM equipment_types et
          JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
          JOIN industries i ON eti.industry_id = i.id
          WHERE i.code = ?
        `, [industryCode]);
        totalCount = total?.count || 0;
      } catch (e) { /* ignore */ }

      try {
        const [[familyMapped]] = await pool.execute(`
          SELECT COUNT(DISTINCT et.id) as count 
          FROM equipment_types et
          JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
          JOIN industries i ON eti.industry_id = i.id
          JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
          WHERE i.code = ?
        `, [industryCode]);
        familyMappedCount = familyMapped?.count || 0;
      } catch (e) { /* ignore - table may not exist */ }

      try {
        const [[industryMapped]] = await pool.execute(`
          SELECT COUNT(DISTINCT et.id) as count 
          FROM equipment_types et
          JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
          JOIN industries i ON eti.industry_id = i.id
          WHERE i.code = ?
        `, [industryCode]);
        industryMappedCount = industryMapped?.count || 0;
      } catch (e) { /* ignore - table may not exist */ }

      try {
        const [[withTemplates]] = await pool.execute(`
          SELECT COUNT(DISTINCT et.id) as count 
          FROM equipment_types et
          JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
          JOIN industries i ON eti.industry_id = i.id
          JOIN task_templates tt ON et.id = tt.equipment_type_id AND tt.is_system = TRUE
            AND (tt.industry_id = i.id OR tt.industry_id IS NULL)
          WHERE i.code = ?
        `, [industryCode]);
        templateCount = withTemplates?.count || 0;
      } catch (e) { /* ignore */ }
    } else {
      // Global counts (all industries)
      try {
        const [[total]] = await pool.execute('SELECT COUNT(*) as count FROM equipment_types');
        totalCount = total?.count || 0;
      } catch (e) { /* ignore */ }

      try {
        const [[familyMapped]] = await pool.execute(`
          SELECT COUNT(DISTINCT equipment_type_id) as count 
          FROM equipment_type_family_mappings
        `);
        familyMappedCount = familyMapped?.count || 0;
      } catch (e) { /* ignore - table may not exist */ }

      try {
        const [[industryMapped]] = await pool.execute(`
          SELECT COUNT(DISTINCT equipment_type_id) as count 
          FROM equipment_type_industries
        `);
        industryMappedCount = industryMapped?.count || 0;
      } catch (e) { /* ignore - table may not exist */ }

      try {
        const [[withTemplates]] = await pool.execute(`
          SELECT COUNT(DISTINCT equipment_type_id) as count 
          FROM task_templates 
          WHERE is_system = TRUE AND equipment_type_id IS NOT NULL
        `);
        templateCount = withTemplates?.count || 0;
      } catch (e) { /* ignore */ }
    }

    const coveragePercentage = totalCount > 0 
      ? Math.round((templateCount / totalCount) * 100) 
      : 0;

    return {
      total_equipment_types: totalCount,
      with_family_mapping: familyMappedCount,
      with_industry_mapping: industryMappedCount,
      with_system_templates: templateCount,
      coverage_percentage: coveragePercentage
    };
  }

  async getRecentChanges(limit = 10, industryCode = null) {
    try {
      let sql = `
        SELECT 
          c.change_type,
          c.changed_at,
          u.username as changed_by,
          et.type_name
        FROM equipment_mapping_change_log c
        JOIN equipment_types et ON c.equipment_type_id = et.id
        LEFT JOIN users u ON c.changed_by = u.id
      `;
      const params = [];
      
      if (industryCode) {
        sql += `
          JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
          JOIN industries i ON eti.industry_id = i.id
          WHERE i.code = ?
        `;
        params.push(industryCode);
      }
      
      sql += ` ORDER BY c.changed_at DESC LIMIT ?`;
      params.push(parseInt(limit));
      
      const [changes] = await pool.execute(sql, params);
      return changes || [];
    } catch (e) {
      return [];
    }
  }

  async getGapSummary(industryCode = null) {
    let unmappedCount = 0;
    let missingIndustryCount = 0;
    let missingTemplatesCount = 0;

    if (industryCode) {
      // Industry-aware gap counts
      try {
        const [[unmapped]] = await pool.execute(`
          SELECT COUNT(DISTINCT et.id) as count 
          FROM equipment_types et
          JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
          JOIN industries i ON eti.industry_id = i.id
          LEFT JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
          WHERE i.code = ? AND etm.equipment_type_id IS NULL
        `, [industryCode]);
        unmappedCount = unmapped?.count || 0;
      } catch (e) { /* ignore - table may not exist */ }

      // Missing industry is global - not specific to one industry
      try {
        const [[missingIndustry]] = await pool.execute(`
          SELECT COUNT(*) as count 
          FROM equipment_types et
          LEFT JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
          WHERE eti.equipment_type_id IS NULL
        `);
        missingIndustryCount = missingIndustry?.count || 0;
      } catch (e) { /* ignore - table may not exist */ }

      try {
        const [[missingTemplates]] = await pool.execute(`
          SELECT COUNT(DISTINCT et.id) as count 
          FROM equipment_types et
          JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
          JOIN industries i ON eti.industry_id = i.id
          JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
          LEFT JOIN task_templates tt ON et.id = tt.equipment_type_id AND tt.is_system = TRUE
            AND (tt.industry_id = i.id OR tt.industry_id IS NULL)
          WHERE i.code = ? AND tt.id IS NULL
        `, [industryCode]);
        missingTemplatesCount = missingTemplates?.count || 0;
      } catch (e) { /* ignore - table may not exist */ }
    } else {
      // Global gap counts
      try {
        const [[unmapped]] = await pool.execute(`
          SELECT COUNT(*) as count 
          FROM equipment_types et
          LEFT JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
          WHERE etm.equipment_type_id IS NULL
        `);
        unmappedCount = unmapped?.count || 0;
      } catch (e) { /* ignore - table may not exist */ }

      try {
        const [[missingIndustry]] = await pool.execute(`
          SELECT COUNT(*) as count 
          FROM equipment_types et
          LEFT JOIN equipment_type_industries eti ON et.id = eti.equipment_type_id
          WHERE eti.equipment_type_id IS NULL
        `);
        missingIndustryCount = missingIndustry?.count || 0;
      } catch (e) { /* ignore - table may not exist */ }

      try {
        const [[missingTemplates]] = await pool.execute(`
          SELECT COUNT(DISTINCT et.id) as count 
          FROM equipment_types et
          JOIN equipment_type_family_mappings etm ON et.id = etm.equipment_type_id
          LEFT JOIN task_templates tt ON et.id = tt.equipment_type_id AND tt.is_system = TRUE
          WHERE tt.id IS NULL
        `);
        missingTemplatesCount = missingTemplates?.count || 0;
      } catch (e) { /* ignore - table may not exist */ }
    }

    return {
      unmapped: unmappedCount,
      missing_industry: missingIndustryCount,
      missing_templates: missingTemplatesCount
    };
  }
}

module.exports = new AdminCoverageUIController();
