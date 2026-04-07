/**
 * Report Controller
 * Multi-tenant aware report generation
 */

const { WorkOrder, Equipment, Schedule, User } = require('../models');
const { getDb } = require('../config/database');

/**
 * Get work order summary report (organization-aware, role-based filtering)
 * Admin sees all, Supervisor/Operator sees only their facility's data
 */
const getWorkOrderSummary = async (req, res, next) => {
  try {
    console.log('[REPORTS] getWorkOrderSummary called');
    console.log('[REPORTS] User:', req.user?.username, 'Role:', req.user?.role, 'Facility:', req.user?.facility_id);
    console.log('[REPORTS] Query params:', req.query);
    
    const organizationId = req.user.organization_id;
    const userRole = req.user?.role;
    const userFacilityId = req.user?.facility_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }
    
    // Enforce facility-based access for supervisors and operators
    if ((userRole === 'supervisor' || userRole === 'operator') && !userFacilityId) {
      return res.status(403).json({
        success: false,
        message: 'You must be assigned to a facility to view reports'
      });
    }
    
    const { start_date, end_date, facility_id } = req.query;
    const db = getDb();
    console.log('[REPORTS] db connected');
    
    let conditions = ['wo.organization_id = ?'];
    const params = [organizationId];
    
    // Handle date filtering on created_at
    if (start_date && start_date !== 'undefined' && start_date !== '') {
      conditions.push('wo.created_at >= ?');
      params.push(start_date + ' 00:00:00');
    }
    if (end_date && end_date !== 'undefined' && end_date !== '') {
      conditions.push('wo.created_at <= ?');
      params.push(end_date + ' 23:59:59');
    }
    
    // Facility filtering: Admin can filter by any facility, Supervisor/Operator only sees their facility
    if (userRole === 'supervisor' || userRole === 'operator') {
      conditions.push('e.facility_id = ?');
      params.push(userFacilityId);
    } else if (facility_id && facility_id !== 'undefined' && facility_id !== '') {
      conditions.push('e.facility_id = ?');
      params.push(parseInt(facility_id));
    }
    
    const whereClause = conditions.join(' AND ');
    console.log('[REPORTS] WHERE clause:', whereClause);
    console.log('[REPORTS] Params:', params);
    
    // Status breakdown
    const statusQuery = `
      SELECT wo.status, COUNT(*) as count
      FROM work_orders wo
      JOIN equipment e ON wo.equipment_id = e.id
      WHERE ${whereClause}
      GROUP BY wo.status
    `;
    console.log('[REPORTS] Status query:', statusQuery.substring(0, 100));
    const statusBreakdown = await db.query(statusQuery, params);
    console.log('[REPORTS] Status breakdown:', statusBreakdown);
    
    // Priority breakdown
    const priorityQuery = `
      SELECT wo.priority, COUNT(*) as count
      FROM work_orders wo
      JOIN equipment e ON wo.equipment_id = e.id
      WHERE ${whereClause}
      GROUP BY wo.priority
    `;
    const priorityBreakdown = await db.query(priorityQuery, params);
    console.log('[REPORTS] Priority breakdown:', priorityBreakdown);
    
    // Type breakdown
    const typeQuery = `
      SELECT wo.wo_type, COUNT(*) as count
      FROM work_orders wo
      JOIN equipment e ON wo.equipment_id = e.id
      WHERE ${whereClause}
      GROUP BY wo.wo_type
    `;
    const typeBreakdown = await db.query(typeQuery, params);
    
    // Completion metrics
    const metricsQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN wo.status IN ('completed', 'closed') THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN wo.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        AVG(CASE WHEN wo.actual_hours IS NOT NULL THEN wo.actual_hours END) as avg_actual_hours,
        AVG(CASE WHEN wo.estimated_hours IS NOT NULL THEN wo.estimated_hours END) as avg_estimated_hours
      FROM work_orders wo
      JOIN equipment e ON wo.equipment_id = e.id
      WHERE ${whereClause}
    `;
    const metrics = await db.query(metricsQuery, params);
    console.log('[REPORTS] Metrics:', metrics[0]);
    
    console.log('[REPORTS] Work order summary success');
    res.json({
      success: true,
      data: {
        status_breakdown: statusBreakdown,
        priority_breakdown: priorityBreakdown,
        type_breakdown: typeBreakdown,
        metrics: metrics[0]
      }
    });
  } catch (error) {
    console.error('[REPORTS] Work order summary error:', error.message);
    console.error('[REPORTS] Error stack:', error.stack);
    // Return error directly for debugging
    res.status(500).json({
      success: false,
      message: error.message,
      sqlError: error.sqlMessage || null
    });
  }
};

/**
 * Get equipment maintenance report (organization-aware, role-based filtering)
 * Admin sees all, Supervisor/Operator sees only their facility's equipment
 */
const getEquipmentReport = async (req, res, next) => {
  try {
    console.log('[REPORTS] getEquipmentReport called');
    console.log('[REPORTS] User:', req.user?.username, 'Role:', req.user?.role, 'Facility:', req.user?.facility_id);
    console.log('[REPORTS] Query params:', req.query);
    
    const organizationId = req.user.organization_id;
    const userRole = req.user?.role;
    const userFacilityId = req.user?.facility_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }
    
    // Enforce facility-based access for supervisors and operators
    if ((userRole === 'supervisor' || userRole === 'operator') && !userFacilityId) {
      return res.status(403).json({
        success: false,
        message: 'You must be assigned to a facility to view reports'
      });
    }
    
    const { facility_id, category } = req.query;
    const db = getDb();
    
    let conditions = ['e.organization_id = ?'];
    const params = [organizationId];
    
    // Facility filtering: Admin can filter by any facility, Supervisor/Operator only sees their facility
    if (userRole === 'supervisor' || userRole === 'operator') {
      conditions.push('e.facility_id = ?');
      params.push(userFacilityId);
    } else if (facility_id) {
      conditions.push('e.facility_id = ?');
      params.push(facility_id);
    }
    
    if (category) {
      conditions.push('e.category = ?');
      params.push(category);
    }
    
    const whereClause = conditions.join(' AND ');
    
    // Equipment with work order counts
    const equipmentQuery = `
      SELECT 
        e.id,
        e.code,
        e.name,
        e.category,
        e.status as equipment_status,
        f.name as facility_name,
        COUNT(wo.id) as total_work_orders,
        SUM(CASE WHEN wo.status IN ('completed', 'closed') THEN 1 ELSE 0 END) as completed_work_orders,
        SUM(CASE WHEN wo.status IN ('open', 'assigned', 'in_progress') THEN 1 ELSE 0 END) as pending_work_orders,
        MAX(wo.actual_end) as last_maintenance_date
      FROM equipment e
      JOIN facilities f ON e.facility_id = f.id
      LEFT JOIN work_orders wo ON e.id = wo.equipment_id AND wo.organization_id = ?
      WHERE ${whereClause}
      GROUP BY e.id, e.code, e.name, e.category, e.status, f.name
      ORDER BY total_work_orders DESC
    `;
    params.push(organizationId);
    const equipment = await db.query(equipmentQuery, params);
    
    // Category breakdown
    const categoryQuery = `
      SELECT e.category, COUNT(*) as count
      FROM equipment e
      WHERE ${whereClause}
      GROUP BY e.category
    `;
    const categories = await db.query(categoryQuery, params.slice(0, -1));
    
    console.log('[REPORTS] Equipment report success');
    res.json({
      success: true,
      data: {
        equipment,
        categories
      }
    });
  } catch (error) {
    console.error('[REPORTS] Equipment report error:', error.message);
    next(error);
  }
};

/**
 * Get technician performance report (organization-aware, role-based filtering)
 * Admin sees all, Supervisor/Operator sees only their facility's technicians
 */
const getTechnicianReport = async (req, res, next) => {
  try {
    console.log('[REPORTS] getTechnicianReport called');
    console.log('[REPORTS] User:', req.user?.username, 'Role:', req.user?.role, 'Facility:', req.user?.facility_id);
    
    const organizationId = req.user.organization_id;
    const userRole = req.user?.role;
    const userFacilityId = req.user?.facility_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }
    
    // Enforce facility-based access for supervisors and operators
    if ((userRole === 'supervisor' || userRole === 'operator') && !userFacilityId) {
      return res.status(403).json({
        success: false,
        message: 'You must be assigned to a facility to view reports'
      });
    }
    
    const { start_date, end_date, facility_id } = req.query;
    const db = getDb();
    
    let conditions = ['u.organization_id = ?', 'wo.assigned_to IS NOT NULL'];
    const params = [organizationId];
    
    if (start_date && start_date !== 'undefined' && start_date !== '') {
      conditions.push('wo.created_at >= ?');
      params.push(start_date + ' 00:00:00');
    }
    if (end_date && end_date !== 'undefined' && end_date !== '') {
      conditions.push('wo.created_at <= ?');
      params.push(end_date + ' 23:59:59');
    }
    
    // Facility filter: Admin can filter by any, Supervisor/Operator only sees their facility
    let facilityJoin = '';
    if (userRole === 'supervisor' || userRole === 'operator') {
      facilityJoin = 'JOIN equipment e ON wo.equipment_id = e.id';
      conditions.push('e.facility_id = ?');
      params.push(userFacilityId);
    } else if (facility_id && facility_id !== 'undefined' && facility_id !== '') {
      facilityJoin = 'JOIN equipment e ON wo.equipment_id = e.id';
      conditions.push('e.facility_id = ?');
      params.push(parseInt(facility_id));
    }
    
    const whereClause = conditions.join(' AND ');
    
    const query = `
      SELECT 
        u.id,
        u.full_name,
        u.role,
        COUNT(wo.id) as total_assigned,
        SUM(CASE WHEN wo.status IN ('completed', 'closed') THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN wo.status IN ('open', 'assigned', 'in_progress') THEN 1 ELSE 0 END) as pending,
        AVG(wo.actual_hours) as avg_hours_per_job,
        SUM(wo.actual_hours) as total_hours,
        MIN(wo.scheduled_start) as first_assignment,
        MAX(wo.actual_end) as last_completion
      FROM users u
      LEFT JOIN work_orders wo ON u.id = wo.assigned_to AND wo.organization_id = ?
      ${facilityJoin}
      WHERE ${whereClause}
      GROUP BY u.id, u.full_name, u.role
      HAVING total_assigned > 0
      ORDER BY completed DESC
    `;
    params.unshift(organizationId);
    
    const technicians = await db.query(query, params);
    
    console.log('[REPORTS] Technician report success');
    res.json({
      success: true,
      data: technicians
    });
  } catch (error) {
    console.error('[REPORTS] Technician report error:', error.message);
    next(error);
  }
};

/**
 * Get schedule compliance report (organization-aware, role-based filtering)
 * Admin sees all, Supervisor/Operator sees only their facility's schedules
 */
const getScheduleCompliance = async (req, res, next) => {
  try {
    console.log('[REPORTS] getScheduleCompliance called');
    console.log('[REPORTS] User:', req.user?.username, 'Role:', req.user?.role, 'Facility:', req.user?.facility_id);
    console.log('[REPORTS] Query params:', req.query);
    
    const organizationId = req.user.organization_id;
    const userRole = req.user?.role;
    const userFacilityId = req.user?.facility_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }
    
    // Enforce facility-based access for supervisors and operators
    if ((userRole === 'supervisor' || userRole === 'operator') && !userFacilityId) {
      return res.status(403).json({
        success: false,
        message: 'You must be assigned to a facility to view reports'
      });
    }
    
    const { facility_id } = req.query;
    const db = getDb();
    
    let conditions = ['s.organization_id = ?', 's.is_active = TRUE'];
    const params = [organizationId];
    
    // Facility filter: Admin can filter by any, Supervisor/Operator only sees their facility
    if (userRole === 'supervisor' || userRole === 'operator') {
      conditions.push('e.facility_id = ?');
      params.push(userFacilityId);
    } else if (facility_id) {
      conditions.push('e.facility_id = ?');
      params.push(facility_id);
    }
    
    const whereClause = conditions.join(' AND ');
    
    // Overdue schedules
    const overdueQuery = `
      SELECT 
        s.id,
        s.next_due_date,
        s.frequency_type,
        e.code as equipment_code,
        e.name as equipment_name,
        f.name as facility_name,
        tm.task_code,
        tm.title as task_title,
        u.full_name as assigned_to_name,
        DATEDIFF(CURDATE(), s.next_due_date) as days_overdue
      FROM schedules s
      JOIN equipment e ON s.equipment_id = e.id
      JOIN facilities f ON e.facility_id = f.id
      JOIN task_master tm ON s.task_master_id = tm.id
      LEFT JOIN users u ON s.assigned_to = u.id
      WHERE ${whereClause} AND s.next_due_date < CURDATE()
      ORDER BY s.next_due_date ASC
    `;
    const overdue = await db.query(overdueQuery, params);
    
    // Due this week
    const thisWeekQuery = `
      SELECT 
        s.id,
        s.next_due_date,
        e.code as equipment_code,
        e.name as equipment_name,
        tm.task_code,
        tm.title as task_title
      FROM schedules s
      JOIN equipment e ON s.equipment_id = e.id
      JOIN task_master tm ON s.task_master_id = tm.id
      WHERE ${whereClause} 
        AND s.next_due_date >= CURDATE() 
        AND s.next_due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)
      ORDER BY s.next_due_date ASC
    `;
    const dueThisWeek = await db.query(thisWeekQuery, params);
    
    // Compliance summary
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_schedules,
        SUM(CASE WHEN s.next_due_date < CURDATE() THEN 1 ELSE 0 END) as overdue_count,
        SUM(CASE WHEN s.next_due_date >= CURDATE() AND s.next_due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as due_this_week,
        SUM(CASE WHEN s.next_due_date > DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as future_schedules
      FROM schedules s
      JOIN equipment e ON s.equipment_id = e.id
      WHERE ${whereClause}
    `;
    const summary = await db.query(summaryQuery, params);
    
    console.log('[REPORTS] Compliance report success');
    res.json({
      success: true,
      data: {
        overdue,
        due_this_week: dueThisWeek,
        summary: summary[0]
      }
    });
  } catch (error) {
    console.error('[REPORTS] Compliance report error:', error.message);
    next(error);
  }
};

/**
 * Get work order trends (over time) (organization-aware, role-based filtering)
 * Admin sees all, Supervisor/Operator sees only their facility's trends
 */
const getTrends = async (req, res, next) => {
  try {
    console.log('[REPORTS] getTrends called');
    console.log('[REPORTS] User:', req.user?.username, 'Role:', req.user?.role, 'Facility:', req.user?.facility_id);
    
    const organizationId = req.user.organization_id;
    const userRole = req.user?.role;
    const userFacilityId = req.user?.facility_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }
    
    // Enforce facility-based access for supervisors and operators
    if ((userRole === 'supervisor' || userRole === 'operator') && !userFacilityId) {
      return res.status(403).json({
        success: false,
        message: 'You must be assigned to a facility to view reports'
      });
    }
    
    const { period = 'monthly', months = 12, facility_id } = req.query;
    const db = getDb();
    
    let dateFormat, groupBy;
    if (period === 'daily') {
      dateFormat = '%Y-%m-%d';
      groupBy = 'DATE(wo.created_at)';
    } else if (period === 'weekly') {
      dateFormat = '%Y-%u';
      groupBy = 'YEARWEEK(wo.created_at)';
    } else {
      dateFormat = '%Y-%m';
      groupBy = 'DATE_FORMAT(wo.created_at, "%Y-%m")';
    }
    
    // Build facility filter
    let facilityJoin = '';
    let facilityWhere = '';
    const params = [organizationId, months];
    
    // Facility filter: Admin can filter by any, Supervisor/Operator only sees their facility
    if (userRole === 'supervisor' || userRole === 'operator') {
      facilityJoin = 'JOIN equipment e ON wo.equipment_id = e.id';
      facilityWhere = 'AND e.facility_id = ?';
      params.push(userFacilityId);
    } else if (facility_id && facility_id !== 'undefined' && facility_id !== '') {
      facilityJoin = 'JOIN equipment e ON wo.equipment_id = e.id';
      facilityWhere = 'AND e.facility_id = ?';
      params.push(parseInt(facility_id));
    }
    
    const query = `
      SELECT 
        ${groupBy} as period,
        COUNT(*) as total_created,
        SUM(CASE WHEN wo.status IN ('completed', 'closed') THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN wo.priority = 'urgent' THEN 1 ELSE 0 END) as urgent_count
      FROM work_orders wo
      ${facilityJoin}
      WHERE wo.organization_id = ? AND wo.created_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      ${facilityWhere}
      GROUP BY period
      ORDER BY period ASC
    `;
    
    console.log('[REPORTS] Trends query:', query.substring(0, 200));
    const trends = await db.query(query, params);
    
    console.log('[REPORTS] Trends report success');
    res.json({
      success: true,
      data: trends
    });
  } catch (error) {
    console.error('[REPORTS] Trends report error:', error.message);
    next(error);
  }
};

/**
 * Export report as CSV (organization-aware, role-based filtering)
 * Admin can export all, Supervisor/Operator can only export their facility's data
 */
const exportReport = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { start_date, end_date } = req.query;
    const organizationId = req.user.organization_id;
    const userRole = req.user?.role;
    const userFacilityId = req.user?.facility_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }
    
    // Enforce facility-based access for supervisors and operators
    if ((userRole === 'supervisor' || userRole === 'operator') && !userFacilityId) {
      return res.status(403).json({
        success: false,
        message: 'You must be assigned to a facility to export reports'
      });
    }
    
    // Apply facility filter for supervisors and operators
    let facilityId = req.query.facility_id;
    if (userRole === 'supervisor' || userRole === 'operator') {
      facilityId = userFacilityId;
    }
    
    let csv = '';
    let filename = '';
    
    switch(type) {
      case 'work-orders':
        filename = 'work-order-summary.csv';
        const woData = await getWorkOrderSummaryData(start_date, end_date, facilityId, organizationId);
        csv = convertToCSV(woData.status_breakdown, ['status', 'count']);
        break;
        
      case 'equipment':
        filename = 'equipment-report.csv';
        const eqData = await getEquipmentData(facilityId, req.query.category, organizationId);
        csv = convertToCSV(eqData.equipment, ['code', 'name', 'facility_name', 'total_work_orders', 'completed_work_orders', 'pending_work_orders']);
        break;
        
      case 'technicians':
        filename = 'technician-performance.csv';
        const techData = await getTechnicianData(start_date, end_date, facilityId, organizationId);
        csv = convertToCSV(techData, ['full_name', 'role', 'total_assigned', 'completed', 'pending', 'avg_hours_per_job']);
        break;
        
      case 'compliance':
        filename = 'schedule-compliance.csv';
        const compData = await getComplianceData(facilityId, organizationId);
        csv = convertToCSV(compData.overdue, ['equipment_code', 'equipment_name', 'task_title', 'next_due_date', 'days_overdue']);
        break;
        
      default:
        return res.status(400).json({ success: false, message: 'Unknown report type' });
    }
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
    
  } catch (error) {
    next(error);
  }
};

// Helper functions for data retrieval (organization-aware)
async function getWorkOrderSummaryData(start_date, end_date, facility_id, organizationId) {
  const { getDb } = require('../config/database');
  const db = getDb();
  
  let conditions = ['wo.organization_id = ?'];
  const params = [organizationId];
  
  if (start_date) {
    conditions.push('wo.created_at >= ?');
    params.push(start_date);
  }
  if (end_date) {
    conditions.push('wo.created_at <= ?');
    params.push(end_date);
  }
  if (facility_id) {
    conditions.push('e.facility_id = ?');
    params.push(facility_id);
  }
  
  const whereClause = conditions.join(' AND ');
  
  const statusQuery = `SELECT wo.status, COUNT(*) as count FROM work_orders wo JOIN equipment e ON wo.equipment_id = e.id WHERE ${whereClause} GROUP BY wo.status`;
  const statusBreakdown = await db.query(statusQuery, params);
  
  return { status_breakdown: statusBreakdown };
}

async function getEquipmentData(facility_id, category, organizationId) {
  const { getDb } = require('../config/database');
  const db = getDb();
  
  let conditions = ['e.organization_id = ?'];
  const params = [organizationId];
  
  if (facility_id) {
    conditions.push('e.facility_id = ?');
    params.push(facility_id);
  }
  if (category) {
    conditions.push('e.category = ?');
    params.push(category);
  }
  
  const whereClause = conditions.join(' AND ');
  
  const query = `
    SELECT e.code, e.name, f.name as facility_name,
      COUNT(wo.id) as total_work_orders,
      SUM(CASE WHEN wo.status IN ('completed', 'closed') THEN 1 ELSE 0 END) as completed_work_orders,
      SUM(CASE WHEN wo.status IN ('open', 'assigned', 'in_progress') THEN 1 ELSE 0 END) as pending_work_orders
    FROM equipment e
    JOIN facilities f ON e.facility_id = f.id
    LEFT JOIN work_orders wo ON e.id = wo.equipment_id AND wo.organization_id = ?
    WHERE ${whereClause}
    GROUP BY e.id, e.code, e.name, f.name
  `;
  params.push(organizationId);
  
  const equipment = await db.query(query, params);
  return { equipment };
}

async function getTechnicianData(start_date, end_date, facilityId, organizationId) {
  const { getDb } = require('../config/database');
  const db = getDb();
  
  let conditions = ['u.organization_id = ?', 'wo.assigned_to IS NOT NULL'];
  const params = [organizationId];
  
  if (start_date) {
    conditions.push('wo.created_at >= ?');
    params.push(start_date);
  }
  if (end_date) {
    conditions.push('wo.created_at <= ?');
    params.push(end_date);
  }
  
  // Facility filter
  let facilityJoin = '';
  if (facilityId) {
    facilityJoin = 'JOIN equipment e ON wo.equipment_id = e.id';
    conditions.push('e.facility_id = ?');
    params.push(facilityId);
  }
  
  const whereClause = conditions.join(' AND ');
  
  const query = `
    SELECT u.full_name, u.role,
      COUNT(wo.id) as total_assigned,
      SUM(CASE WHEN wo.status IN ('completed', 'closed') THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN wo.status IN ('open', 'assigned', 'in_progress') THEN 1 ELSE 0 END) as pending,
      AVG(wo.actual_hours) as avg_hours_per_job
    FROM users u
    LEFT JOIN work_orders wo ON u.id = wo.assigned_to AND wo.organization_id = ?
    ${facilityJoin}
    WHERE ${whereClause}
    GROUP BY u.id, u.full_name, u.role
    HAVING total_assigned > 0
  `;
  params.unshift(organizationId);
  
  return await db.query(query, params);
}

async function getComplianceData(facility_id, organizationId) {
  const { getDb } = require('../config/database');
  const db = getDb();
  
  let conditions = ['s.organization_id = ?', 's.is_active = TRUE'];
  const params = [organizationId];
  
  if (facility_id) {
    conditions.push('e.facility_id = ?');
    params.push(facility_id);
  }
  
  const whereClause = conditions.join(' AND ');
  
  const query = `
    SELECT e.code as equipment_code, e.name as equipment_name, tm.title as task_title,
      s.next_due_date, DATEDIFF(CURDATE(), s.next_due_date) as days_overdue
    FROM schedules s
    JOIN equipment e ON s.equipment_id = e.id
    JOIN task_master tm ON s.task_master_id = tm.id
    WHERE ${whereClause} AND s.next_due_date < CURDATE()
    ORDER BY s.next_due_date ASC
  `;
  
  const overdue = await db.query(query, params);
  return { overdue };
}

function convertToCSV(data, fields) {
  if (!data || data.length === 0) return '';
  
  const header = fields.join(',') + '\n';
  const rows = data.map(row => 
    fields.map(field => {
      const value = row[field];
      // Escape quotes and wrap in quotes if contains comma
      if (value === null || value === undefined) return '';
      const str = String(value).replace(/"/g, '""');
      return str.includes(',') ? `"${str}"` : str;
    }).join(',')
  ).join('\n');
  
  return header + rows;
}

module.exports = {
  getWorkOrderSummary,
  getEquipmentReport,
  getTechnicianReport,
  getScheduleCompliance,
  getTrends,
  exportReport
};
