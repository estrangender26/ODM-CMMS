/**
 * Schedule Controller
 */

const { Schedule } = require('../models');
const { calculateNextDueDate } = require('../utils/helpers');

/**
 * Get all schedules
 * Admin sees all, Supervisor sees only their facility's schedules
 */
const getAll = async (req, res, next) => {
  try {
    const { role, facility_id } = req.user;
    
    const filters = {
      equipment_id: req.query.equipment_id,
      assigned_to: req.query.assigned_to,
      frequency_type: req.query.frequency_type
    };

    let schedules;
    
    // Supervisor only sees schedules in their facility
    if (role === 'supervisor' && facility_id) {
      schedules = await Schedule.getByFacility(facility_id, filters);
    } else {
      // Admin sees all schedules
      schedules = await Schedule.getAllWithDetails(filters);
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
 * Get schedule by ID
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schedule = await Schedule.findById(id);
    
    if (!schedule) {
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
 * Create new schedule
 */
const create = async (req, res, next) => {
  try {
    const data = {
      ...req.body,
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
 * Update schedule
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schedule = await Schedule.update(id, req.body);
    
    res.json({
      success: true,
      message: 'Schedule updated successfully',
      data: { schedule }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete schedule
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
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
 * Get overdue schedules
 * Admin sees all, Supervisor sees only their facility's overdue schedules
 */
const getOverdue = async (req, res, next) => {
  try {
    const { role, facility_id } = req.user;
    
    let schedules;
    if (role === 'supervisor' && facility_id) {
      schedules = await Schedule.getOverdueByFacility(facility_id);
    } else {
      schedules = await Schedule.getOverdue();
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
 * Get schedules due today
 * Admin sees all, Supervisor sees only their facility's schedules due today
 */
const getDueToday = async (req, res, next) => {
  try {
    const { role, facility_id } = req.user;
    
    let schedules;
    if (role === 'supervisor' && facility_id) {
      schedules = await Schedule.getDueTodayByFacility(facility_id);
    } else {
      schedules = await Schedule.getDueToday();
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
