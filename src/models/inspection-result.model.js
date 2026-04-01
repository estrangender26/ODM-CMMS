/**
 * Inspection Result Model
 * Records structured inspection responses from task template execution
 * 
 * Supports multiple value types (text, number, boolean, JSON) for flexible data capture.
 * Linked to task templates for ISO 14224-aligned inspection data collection.
 */

const BaseModel = require('./base.model');

class InspectionResultModel extends BaseModel {
  constructor() {
    super('inspection_results');
  }

  /**
   * Create an inspection result
   * @param {Object} data - Inspection result data
   * @param {number} organizationId - Organization ID
   */
  async createResult(data, organizationId) {
    const fields = [
      'organization_id', 'facility_id', 'asset_id',
      'task_template_id', 'task_template_step_id',
      'recorded_value_text', 'recorded_value_number', 'recorded_value_boolean', 'recorded_value_json',
      'unit', 'remarks', 'photo_url', 'recorded_by_user_id'
    ];

    const values = fields.map(f => {
      if (f === 'organization_id') return organizationId;
      if (f === 'recorded_value_json' && data[f] !== undefined && data[f] !== null) {
        return JSON.stringify(data[f]);
      }
      return data[f] !== undefined ? data[f] : null;
    });

    const placeholders = fields.map(() => '?').join(', ');
    
    const sql = `INSERT INTO ${this.tableName} (${fields.join(', ')}) VALUES (${placeholders})`;
    
    const result = await this.query(sql, values);
    return this.getResultWithDetails(result.insertId, organizationId);
  }

  /**
   * Get inspection result with full details
   * @param {number} resultId - Result ID
   * @param {number} organizationId - Organization ID
   */
  async getResultWithDetails(resultId, organizationId) {
    const sql = `
      SELECT 
        ir.*,
        fac.name as facility_name,
        eq.name as asset_name,
        eq.code as asset_code,
        tt.template_name,
        tt.maintenance_type,
        tts.step_no,
        tts.step_type,
        tts.instruction as step_instruction,
        tts.data_type as expected_data_type,
        tts.min_value as expected_min,
        tts.max_value as expected_max,
        tts.expected_value,
        recorder.full_name as recorded_by_name
      FROM ${this.tableName} ir
      JOIN facilities fac ON ir.facility_id = fac.id
      JOIN equipment eq ON ir.asset_id = eq.id
      JOIN task_templates tt ON ir.task_template_id = tt.id
      JOIN task_template_steps tts ON ir.task_template_step_id = tts.id
      LEFT JOIN users recorder ON ir.recorded_by_user_id = recorder.id
      WHERE ir.id = ? AND ir.organization_id = ?
    `;
    
    const [result] = await this.query(sql, [resultId, organizationId]);
    return result || null;
  }

  /**
   * Get inspection results for an asset
   * @param {number} assetId - Asset ID
   * @param {number} organizationId - Organization ID
   * @param {Object} filters - Optional filters
   */
  async getByAsset(assetId, organizationId, filters = {}) {
    let sql = `
      SELECT 
        ir.*,
        fac.name as facility_name,
        eq.name as asset_name,
        eq.code as asset_code,
        tt.template_name,
        tts.step_no,
        tts.step_type,
        tts.instruction as step_instruction,
        tts.data_type as expected_data_type,
        recorder.full_name as recorded_by_name
      FROM ${this.tableName} ir
      JOIN facilities fac ON ir.facility_id = fac.id
      JOIN equipment eq ON ir.asset_id = eq.id
      JOIN task_templates tt ON ir.task_template_id = tt.id
      JOIN task_template_steps tts ON ir.task_template_step_id = tts.id
      LEFT JOIN users recorder ON ir.recorded_by_user_id = recorder.id
      WHERE ir.asset_id = ? AND ir.organization_id = ?
    `;
    
    const params = [assetId, organizationId];

    if (filters.task_template_id) {
      sql += ' AND ir.task_template_id = ?';
      params.push(filters.task_template_id);
    }
    if (filters.recorded_by_user_id) {
      sql += ' AND ir.recorded_by_user_id = ?';
      params.push(filters.recorded_by_user_id);
    }
    if (filters.from_date) {
      sql += ' AND ir.recorded_at >= ?';
      params.push(filters.from_date);
    }
    if (filters.to_date) {
      sql += ' AND ir.recorded_at <= ?';
      params.push(filters.to_date);
    }

    sql += ' ORDER BY ir.recorded_at DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    return this.query(sql, params);
  }

  /**
   * Get inspection results for a facility
   * @param {number} facilityId - Facility ID
   * @param {number} organizationId - Organization ID
   * @param {Object} filters - Optional filters
   */
  async getByFacility(facilityId, organizationId, filters = {}) {
    let sql = `
      SELECT 
        ir.*,
        fac.name as facility_name,
        eq.name as asset_name,
        eq.code as asset_code,
        tt.template_name,
        tts.step_no,
        tts.step_type,
        tts.instruction as step_instruction,
        recorder.full_name as recorded_by_name
      FROM ${this.tableName} ir
      JOIN facilities fac ON ir.facility_id = fac.id
      JOIN equipment eq ON ir.asset_id = eq.id
      JOIN task_templates tt ON ir.task_template_id = tt.id
      JOIN task_template_steps tts ON ir.task_template_step_id = tts.id
      LEFT JOIN users recorder ON ir.recorded_by_user_id = recorder.id
      WHERE ir.facility_id = ? AND ir.organization_id = ?
    `;
    
    const params = [facilityId, organizationId];

    if (filters.task_template_id) {
      sql += ' AND ir.task_template_id = ?';
      params.push(filters.task_template_id);
    }
    if (filters.asset_id) {
      sql += ' AND ir.asset_id = ?';
      params.push(filters.asset_id);
    }

    sql += ' ORDER BY ir.recorded_at DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(filters.limit));
    }

    return this.query(sql, params);
  }

  /**
   * Get inspection results for a template
   * @param {number} templateId - Task template ID
   * @param {number} organizationId - Organization ID
   * @param {Object} filters - Optional filters
   */
  async getByTemplate(templateId, organizationId, filters = {}) {
    let sql = `
      SELECT 
        ir.*,
        fac.name as facility_name,
        eq.name as asset_name,
        eq.code as asset_code,
        tts.step_no,
        tts.step_type,
        tts.instruction as step_instruction,
        recorder.full_name as recorded_by_name
      FROM ${this.tableName} ir
      JOIN facilities fac ON ir.facility_id = fac.id
      JOIN equipment eq ON ir.asset_id = eq.id
      JOIN task_template_steps tts ON ir.task_template_step_id = tts.id
      LEFT JOIN users recorder ON ir.recorded_by_user_id = recorder.id
      WHERE ir.task_template_id = ? AND ir.organization_id = ?
    `;
    
    const params = [templateId, organizationId];

    if (filters.asset_id) {
      sql += ' AND ir.asset_id = ?';
      params.push(filters.asset_id);
    }
    if (filters.from_date) {
      sql += ' AND ir.recorded_at >= ?';
      params.push(filters.from_date);
    }
    if (filters.to_date) {
      sql += ' AND ir.recorded_at <= ?';
      params.push(filters.to_date);
    }

    sql += ' ORDER BY ir.recorded_at DESC';

    return this.query(sql, params);
  }

  /**
   * Get latest inspection results for an asset
   * Returns the most recent result for each step of each template
   * @param {number} assetId - Asset ID
   * @param {number} organizationId - Organization ID
   */
  async getLatestForAsset(assetId, organizationId) {
    const sql = `
      SELECT 
        ir.*,
        fac.name as facility_name,
        eq.name as asset_name,
        eq.code as asset_code,
        tt.template_name,
        tts.step_no,
        tts.step_type,
        tts.instruction as step_instruction,
        tts.data_type as expected_data_type,
        recorder.full_name as recorded_by_name
      FROM ${this.tableName} ir
      JOIN facilities fac ON ir.facility_id = fac.id
      JOIN equipment eq ON ir.asset_id = eq.id
      JOIN task_templates tt ON ir.task_template_id = tt.id
      JOIN task_template_steps tts ON ir.task_template_step_id = tts.id
      LEFT JOIN users recorder ON ir.recorded_by_user_id = recorder.id
      INNER JOIN (
        SELECT task_template_step_id, MAX(recorded_at) as max_recorded_at
        FROM ${this.tableName}
        WHERE asset_id = ? AND organization_id = ?
        GROUP BY task_template_step_id
      ) latest ON ir.task_template_step_id = latest.task_template_step_id 
        AND ir.recorded_at = latest.max_recorded_at
      WHERE ir.asset_id = ? AND ir.organization_id = ?
      ORDER BY tt.template_name, tts.step_no
    `;
    
    return this.query(sql, [assetId, organizationId, assetId, organizationId]);
  }

  /**
   * Get inspection statistics for an asset
   * @param {number} assetId - Asset ID
   * @param {number} organizationId - Organization ID
   */
  async getStatsForAsset(assetId, organizationId) {
    const sql = `
      SELECT 
        COUNT(*) as total_results,
        COUNT(DISTINCT task_template_id) as templates_used,
        COUNT(DISTINCT task_template_step_id) as steps_completed,
        COUNT(DISTINCT DATE(recorded_at)) as inspection_days,
        MIN(recorded_at) as first_recorded,
        MAX(recorded_at) as last_recorded,
        COUNT(CASE WHEN recorded_value_number IS NOT NULL THEN 1 END) as numeric_readings,
        COUNT(CASE WHEN recorded_value_boolean IS NOT NULL THEN 1 END) as boolean_readings,
        COUNT(CASE WHEN photo_url IS NOT NULL THEN 1 END) as photos_taken
      FROM ${this.tableName}
      WHERE asset_id = ? AND organization_id = ?
    `;
    
    const [result] = await this.query(sql, [assetId, organizationId]);
    return result;
  }

  /**
   * Get inspection statistics for an organization
   * @param {number} organizationId - Organization ID
   * @param {Object} filters - Optional filters
   */
  async getStats(organizationId, filters = {}) {
    let sql = `
      SELECT 
        COUNT(*) as total_results,
        COUNT(DISTINCT asset_id) as assets_inspected,
        COUNT(DISTINCT facility_id) as facilities_inspected,
        COUNT(DISTINCT task_template_id) as templates_used,
        COUNT(DISTINCT DATE(recorded_at)) as inspection_days,
        MIN(recorded_at) as first_recorded,
        MAX(recorded_at) as last_recorded
      FROM ${this.tableName}
      WHERE organization_id = ?
    `;
    
    const params = [organizationId];

    if (filters.facility_id) {
      sql += ' AND facility_id = ?';
      params.push(filters.facility_id);
    }
    if (filters.from_date) {
      sql += ' AND recorded_at >= ?';
      params.push(filters.from_date);
    }
    if (filters.to_date) {
      sql += ' AND recorded_at <= ?';
      params.push(filters.to_date);
    }

    const [result] = await this.query(sql, params);
    return result;
  }

  /**
   * Check if result belongs to organization
   * @param {number} resultId - Result ID
   * @param {number} organizationId - Organization ID
   */
  async belongsToOrganization(resultId, organizationId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE id = ? AND organization_id = ?
    `;
    const [result] = await this.query(sql, [resultId, organizationId]);
    return result.count > 0;
  }

  /**
   * Delete inspection results for an asset (use with caution)
   * @param {number} assetId - Asset ID
   * @param {number} organizationId - Organization ID
   */
  async deleteByAsset(assetId, organizationId) {
    const sql = `DELETE FROM ${this.tableName} WHERE asset_id = ? AND organization_id = ?`;
    return this.query(sql, [assetId, organizationId]);
  }
}

module.exports = new InspectionResultModel();
