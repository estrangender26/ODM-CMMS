/**
 * Work Order Model
 * Multi-tenant aware work order management
 */

const BaseModel = require('./base.model');

class WorkOrderModel extends BaseModel {
  constructor() {
    super('work_orders');
  }

  /**
   * Get work orders with full details (organization-aware)
   * @param {number} organizationId
   * @param {Object} filters
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async getAllWithDetails(organizationId, filters = {}, options = {}) {
    let sql = `
      SELECT wo.*, 
        e.name as equipment_name, e.code as equipment_code, e.location,
        f.name as facility_name,
        tm.task_code, tm.title as task_title,
        assignee.full_name as assigned_to_name,
        requester.full_name as requested_by_name
      FROM ${this.tableName} wo
      JOIN equipment e ON wo.equipment_id = e.id
      JOIN facilities f ON e.facility_id = f.id
      LEFT JOIN task_master tm ON wo.task_master_id = tm.id
      LEFT JOIN users assignee ON wo.assigned_to = assignee.id
      LEFT JOIN users requester ON wo.requested_by = requester.id
      WHERE wo.organization_id = ?
    `;

    const params = [organizationId];
    const conditions = [];

    if (filters.status) {
      conditions.push('wo.status = ?');
      params.push(filters.status);
    }
    if (filters.assigned_to) {
      conditions.push('wo.assigned_to = ?');
      params.push(filters.assigned_to);
    }
    if (filters.equipment_id) {
      conditions.push('wo.equipment_id = ?');
      params.push(filters.equipment_id);
    }
    if (filters.priority) {
      conditions.push('wo.priority = ?');
      params.push(filters.priority);
    }
    if (filters.wo_type) {
      conditions.push('wo.wo_type = ?');
      params.push(filters.wo_type);
    }
    if (filters.facility_id) {
      conditions.push('e.facility_id = ?');
      params.push(filters.facility_id);
    }

    if (conditions.length > 0) {
      sql += ` AND ${conditions.join(' AND ')}`;
    }

    sql += ` ORDER BY wo.created_at DESC`;

    const limitNum = parseInt(options.limit);
    if (limitNum > 0) {
      // Embed LIMIT directly in SQL (MySQL prepared statements don't support LIMIT as parameter)
      sql += ` LIMIT ${limitNum}`;
    }

    console.log('[SQL] Query:', sql.trim().replace(/\s+/g, ' '));
    console.log('[SQL] Params:', params);
    return this.query(sql, params);
  }

  /**
   * Get work order by number (organization-aware)
   * @param {string} woNumber
   * @param {number} organizationId
   * @returns {Promise<Object|null>}
   */
  async findByNumber(woNumber, organizationId) {
    const sql = `
      SELECT wo.*, 
        e.name as equipment_name, e.code as equipment_code, e.location,
        f.name as facility_name,
        tm.task_code, tm.title as task_title, tm.description as task_description,
        assignee.full_name as assigned_to_name,
        requester.full_name as requested_by_name
      FROM ${this.tableName} wo
      JOIN equipment e ON wo.equipment_id = e.id
      JOIN facilities f ON e.facility_id = f.id
      LEFT JOIN task_master tm ON wo.task_master_id = tm.id
      LEFT JOIN users assignee ON wo.assigned_to = assignee.id
      LEFT JOIN users requester ON wo.requested_by = requester.id
      WHERE wo.wo_number = ? AND wo.organization_id = ?
    `;
    const [result] = await this.query(sql, [woNumber, organizationId]);
    return result || null;
  }

  /**
   * Get work order by ID with organization check
   * @param {number} workOrderId
   * @param {number} organizationId
   * @returns {Promise<Object|null>}
   */
  async findByIdWithOrg(workOrderId, organizationId) {
    const sql = `
      SELECT wo.*, 
        e.name as equipment_name, e.code as equipment_code, e.location,
        f.name as facility_name
      FROM ${this.tableName} wo
      JOIN equipment e ON wo.equipment_id = e.id
      JOIN facilities f ON e.facility_id = f.id
      WHERE wo.id = ? AND wo.organization_id = ?
    `;
    const [result] = await this.query(sql, [workOrderId, organizationId]);
    return result || null;
  }

  /**
   * Get work order with inspection readings (organization-aware)
   * @param {number} workOrderId
   * @param {number} organizationId
   * @returns {Promise<Object|null>}
   */
  async getWithReadings(workOrderId, organizationId) {
    const wo = await this.findByIdWithOrg(workOrderId, organizationId);
    if (!wo) return null;

    const readingsSql = `
      SELECT ir.*, ip.point_code, ip.description as point_description,
        ip.input_type, ip.unit_of_measure, ip.min_value, ip.max_value
      FROM inspection_readings ir
      JOIN inspection_points ip ON ir.inspection_point_id = ip.id
      WHERE ir.work_order_id = ? AND ir.organization_id = ?
      ORDER BY ip.sort_order
    `;
    const readings = await this.query(readingsSql, [workOrderId, organizationId]);

    const notesSql = `
      SELECT won.*, u.full_name as created_by_name
      FROM work_order_notes won
      JOIN users u ON won.user_id = u.id
      WHERE won.work_order_id = ? AND won.organization_id = ?
      ORDER BY won.created_at DESC
    `;
    const notes = await this.query(notesSql, [workOrderId, organizationId]);

    return { ...wo, readings, notes };
  }

  /**
   * Check if work order has inspection readings (organization-aware)
   * @param {number} workOrderId
   * @param {number} organizationId
   * @returns {Promise<boolean>}
   */
  async hasInspectionReadings(workOrderId, organizationId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM inspection_readings
      WHERE work_order_id = ? AND organization_id = ?
    `;
    const [result] = await this.query(sql, [workOrderId, organizationId]);
    return result.count > 0;
  }

  /**
   * Get assigned work orders for operator (organization-aware)
   * @param {number} operatorId
   * @param {number} organizationId
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  async getAssignedToOperator(operatorId, organizationId, filters = {}) {
    const statusFilter = filters.status;
    const statuses = statusFilter ? (Array.isArray(statusFilter) ? statusFilter : [statusFilter]) : null;
    
    let sql = `
      SELECT wo.*, 
        e.name as equipment_name, e.code as equipment_code, e.location,
        f.name as facility_name,
        tm.task_code, tm.title as task_title
      FROM ${this.tableName} wo
      JOIN equipment e ON wo.equipment_id = e.id
      JOIN facilities f ON e.facility_id = f.id
      LEFT JOIN task_master tm ON wo.task_master_id = tm.id
      WHERE wo.assigned_to = ? AND wo.organization_id = ?
    `;
    
    const params = [operatorId, organizationId];
    
    // Only filter by status if provided
    if (statuses && statuses.length > 0) {
      sql += ` AND wo.status IN (${statuses.map(() => '?').join(', ')})`;
      params.push(...statuses);
    }
    
    // Filter by priority if provided
    if (filters.priority) {
      sql += ` AND wo.priority = ?`;
      params.push(filters.priority);
    }
    
    sql += ` ORDER BY wo.scheduled_start ASC, wo.priority DESC`;
    
    console.log('[SQL] Facility Query:', sql.trim().replace(/\s+/g, ' '));
    console.log('[SQL] Facility Params:', params);
    return this.query(sql, params);
  }

  /**
   * Get work order statistics (organization-aware)
   * @param {number} organizationId
   * @returns {Promise<Object>}
   */
  async getStats(organizationId) {
    const sql = `
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END), 0) as open,
        COALESCE(SUM(CASE WHEN status = 'assigned' THEN 1 ELSE 0 END), 0) as assigned,
        COALESCE(SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END), 0) as in_progress,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed,
        COALESCE(SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END), 0) as closed,
        COALESCE(SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END), 0) as cancelled
      FROM ${this.tableName}
      WHERE organization_id = ?
    `;
    const [result] = await this.query(sql, [organizationId]);
    return result;
  }

  /**
   * Update work order status
   * @param {number} workOrderId
   * @param {string} status
   * @param {Object} additionalData
   */
  async updateStatus(workOrderId, status, additionalData = {}) {
    const updateData = { status, ...additionalData };
    
    if (status === 'in_progress' && !additionalData.actual_start) {
      updateData.actual_start = new Date();
    }
    if ((status === 'completed' || status === 'closed') && !additionalData.actual_end) {
      updateData.actual_end = new Date();
    }
    
    return this.update(workOrderId, updateData);
  }

  /**
   * Generate next work order number (organization-aware)
   * @param {number} organizationId
   * @returns {Promise<string>}
   */
  async generateNumber(organizationId) {
    const year = new Date().getFullYear();
    const [result] = await this.query(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE organization_id = ? AND YEAR(created_at) = ?`,
      [organizationId, year]
    );
    const sequence = (result.count + 1).toString().padStart(4, '0');
    return `WO-${year}-${sequence}`;
  }

  /**
   * Add note to work order (organization-aware)
   * @param {number} workOrderId
   * @param {number} userId
   * @param {string} note
   * @param {string} noteType
   * @param {number} organizationId
   */
  async addNote(workOrderId, userId, note, noteType = 'general', organizationId) {
    const sql = `
      INSERT INTO work_order_notes (work_order_id, user_id, note, note_type, organization_id)
      VALUES (?, ?, ?, ?, ?)
    `;
    return this.query(sql, [workOrderId, userId, note, noteType, organizationId]);
  }

  /**
   * Get work orders by facility (organization-aware)
   * @param {number} facilityId
   * @param {number} organizationId
   * @param {Object} filters
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async getByFacility(facilityId, organizationId, filters = {}, options = {}) {
    let sql = `
      SELECT wo.*, 
        e.name as equipment_name, e.code as equipment_code, e.location,
        f.name as facility_name,
        tm.task_code, tm.title as task_title,
        assignee.full_name as assigned_to_name,
        requester.full_name as requested_by_name
      FROM ${this.tableName} wo
      JOIN equipment e ON wo.equipment_id = e.id
      JOIN facilities f ON e.facility_id = f.id
      LEFT JOIN task_master tm ON wo.task_master_id = tm.id
      LEFT JOIN users assignee ON wo.assigned_to = assignee.id
      LEFT JOIN users requester ON wo.requested_by = requester.id
      WHERE e.facility_id = ? AND wo.organization_id = ?
    `;

    const params = [facilityId, organizationId];

    if (filters.status) {
      sql += ' AND wo.status = ?';
      params.push(filters.status);
    }
    if (filters.assigned_to) {
      sql += ' AND wo.assigned_to = ?';
      params.push(filters.assigned_to);
    }
    if (filters.priority) {
      sql += ' AND wo.priority = ?';
      params.push(filters.priority);
    }
    if (filters.wo_type) {
      sql += ' AND wo.wo_type = ?';
      params.push(filters.wo_type);
    }

    sql += ` ORDER BY wo.created_at DESC`;

    const limitNum = parseInt(options.limit);
    if (limitNum > 0) {
      sql += ` LIMIT ${limitNum}`;
    }

    return this.query(sql, params);
  }

  /**
   * Get work order statistics by facility (organization-aware)
   * @param {number} facilityId
   * @param {number} organizationId
   * @returns {Promise<Object>}
   */
  async getStatsByFacility(facilityId, organizationId) {
    const sql = `
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN wo.status = 'open' THEN 1 ELSE 0 END), 0) as open,
        COALESCE(SUM(CASE WHEN wo.status = 'assigned' THEN 1 ELSE 0 END), 0) as assigned,
        COALESCE(SUM(CASE WHEN wo.status = 'in_progress' THEN 1 ELSE 0 END), 0) as in_progress,
        COALESCE(SUM(CASE WHEN wo.status = 'completed' THEN 1 ELSE 0 END), 0) as completed,
        COALESCE(SUM(CASE WHEN wo.status = 'closed' THEN 1 ELSE 0 END), 0) as closed,
        COALESCE(SUM(CASE WHEN wo.status = 'cancelled' THEN 1 ELSE 0 END), 0) as cancelled
      FROM ${this.tableName} wo
      JOIN equipment e ON wo.equipment_id = e.id
      WHERE e.facility_id = ? AND wo.organization_id = ?
    `;
    const [result] = await this.query(sql, [facilityId, organizationId]);
    return result;
  }

  /**
   * Check if work order belongs to organization
   * @param {number} workOrderId
   * @param {number} organizationId
   * @returns {Promise<boolean>}
   */
  async belongsToOrganization(workOrderId, organizationId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      WHERE id = ? AND organization_id = ?
    `;
    const [result] = await this.query(sql, [workOrderId, organizationId]);
    return result.count > 0;
  }

  /**
   * Check if work order belongs to facility (organization-aware)
   * @param {number} workOrderId
   * @param {number} facilityId
   * @param {number} organizationId
   * @returns {Promise<boolean>}
   */
  async belongsToFacility(workOrderId, facilityId, organizationId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM ${this.tableName} wo
      JOIN equipment e ON wo.equipment_id = e.id
      WHERE wo.id = ? AND e.facility_id = ? AND wo.organization_id = ?
    `;
    const [result] = await this.query(sql, [workOrderId, facilityId, organizationId]);
    return result.count > 0;
  }

  /**
   * Get recent work orders (organization-aware)
   * @param {number} organizationId
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getRecent(organizationId, limit = 10) {
    return this.getAllWithDetails(organizationId, {}, { limit });
  }

  /**
   * Get overdue work orders (organization-aware)
   * @param {number} organizationId
   * @returns {Promise<Array>}
   */
  async getOverdue(organizationId) {
    const sql = `
      SELECT wo.*, 
        e.name as equipment_name, e.code as equipment_code,
        f.name as facility_name,
        assignee.full_name as assigned_to_name
      FROM ${this.tableName} wo
      JOIN equipment e ON wo.equipment_id = e.id
      JOIN facilities f ON e.facility_id = f.id
      LEFT JOIN users assignee ON wo.assigned_to = assignee.id
      WHERE wo.organization_id = ?
      AND wo.status IN ('open', 'assigned', 'in_progress')
      AND wo.scheduled_end < NOW()
      ORDER BY wo.scheduled_end ASC
    `;
    return this.query(sql, [organizationId]);
  }
}

module.exports = new WorkOrderModel();
