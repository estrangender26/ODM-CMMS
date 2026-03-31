/**
 * Schedule Controller
 * Multi-tenant aware schedule management
 */

const { Schedule } = require('../models');
const { calculateNextDueDate } = require('../utils/helpers');

/**
 * Get all schedules (organization-aware)
 * Admin sees all in org, Supervisor sees only their facility's schedules
 */
const getAll = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { role, facility_id } = req.user;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }
    
    const filters = {
      equipment_id: req.query.equipment_id,
      assigned_to: req.query.assigned_to,
      frequency_type: req.query.frequency_type
    };

    let schedules;
    
    // Supervisor only sees schedules in their facility
    if (role === 'supervisor' && facility_id) {
      schedules = await Schedule.getByFacility(facility_id, organizationId, filters);
    } else {
      // Admin sees all schedules in organization
      schedules = await Schedule.getAllWithDetails(organizationId, filters);
    }
    
    res.json({
      success: true,
      data: { schedules }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get schedule by ID (organization-aware)
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    const schedule = await Schedule.findById(id);
    
    if (!schedule || schedule.organization_id !== organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    res.json({
      success: true,
      data: { schedule }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new schedule (organization-aware)
 */
const create = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }

    const data = {
      ...req.body,
      organization_id: organizationId,
      created_by: req.user.id
    };

    // Calculate next due date if not provided
    if (!data.next_due_date) {
      data.next_due_date = data.start_date;
    }

    const schedule = await Schedule.create(data);
    res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      data: { schedule }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update schedule (organization-aware)
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    // Verify schedule belongs to organization
    const schedule = await Schedule.findById(id);
    if (!schedule || schedule.organization_id !== organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    const updated = await Schedule.update(id, req.body);
    
    res.json({
      success: true,
      message: 'Schedule updated successfully',
      data: { schedule: updated }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete schedule (organization-aware)
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    // Verify schedule belongs to organization
    const schedule = await Schedule.findById(id);
    if (!schedule || schedule.organization_id !== organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    await Schedule.delete(id);
    
    res.json({
      success: true,
      message: 'Schedule deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get overdue schedules (organization-aware)
 * Admin sees all in org, Supervisor sees only their facility's overdue schedules
 */
const getOverdue = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { role, facility_id } = req.user;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }
    
    let schedules;
    if (role === 'supervisor' && facility_id) {
      schedules = await Schedule.getOverdueByFacility(facility_id, organizationId);
    } else {
      schedules = await Schedule.getOverdue(organizationId);
    }
    
    res.json({
      success: true,
      data: { schedules }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get schedules due today (organization-aware)
 * Admin sees all in org, Supervisor sees only their facility's schedules due today
 */
const getDueToday = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { role, facility_id } = req.user;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }
    
    let schedules;
    if (role === 'supervisor' && facility_id) {
      schedules = await Schedule.getDueTodayByFacility(facility_id, organizationId);
    } else {
      schedules = await Schedule.getDueToday(organizationId);
    }
    
    res.json({
      success: true,
      data: { schedules }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  getOverdue,
  getDueToday
};
