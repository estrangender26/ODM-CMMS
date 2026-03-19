/**
 * Work Order Controller
 */

const { WorkOrder } = require('../models');

/**
 * Get all work orders
 * Admin sees all, Supervisor sees only their facility's work orders
 */
const getAll = async (req, res, next) => {
  try {
    const { role, facility_id } = req.user;
    
    const filters = {
      status: req.query.status,
      priority: req.query.priority,
      equipment_id: req.query.equipment_id,
      assigned_to: req.query.assigned_to
    };

    const options = {
      limit: req.query.limit ? parseInt(req.query.limit) : null,
      offset: req.query.offset ? parseInt(req.query.offset) : null
    };

    let workOrders;
    
    // Supervisor only sees work orders in their facility
    if (role === 'supervisor' && facility_id) {
      workOrders = await WorkOrder.getByFacility(facility_id, filters, options);
    } else {
      // Admin sees all work orders
      workOrders = await WorkOrder.getAllWithDetails(filters, options);
    }
    
    res.json({
      success: true,
      data: { work_orders: workOrders }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get work order by ID
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const workOrder = await WorkOrder.getWithReadings(id);
    
    if (!workOrder) {
      return res.status(404).json({
        success: false,
        message: 'Work order not found'
      });
    }

    res.json({
      success: true,
      data: { work_order: workOrder }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new work order
 */
const create = async (req, res, next) => {
  try {
    const workOrderId = await WorkOrder.create(req.body);
    const workOrder = await WorkOrder.getById(workOrderId);
    
    res.status(201).json({
      success: true,
      message: 'Work order created successfully',
      data: { work_order: workOrder }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update work order
 * Validates that status cannot be changed to completed/closed without inspection (except admin)
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userRole = req.user?.role;
    
    // Check if trying to mark as completed/closed via general update (admin can bypass)
    if ((status === 'completed' || status === 'closed') && userRole !== 'admin') {
      const hasReadings = await WorkOrder.hasInspectionReadings(id);
      if (!hasReadings) {
        return res.status(400).json({
          success: false,
          message: 'Inspection must be completed before marking work order as complete'
        });
      }
    }
    
    await WorkOrder.update(id, req.body);
    const workOrder = await WorkOrder.getById(id);
    
    res.json({
      success: true,
      message: 'Work order updated successfully',
      data: { work_order: workOrder }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update work order status
 * Admin can complete without inspection, others require inspection
 */
const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, actual_hours, completion_notes, completion_percentage } = req.body;
    const userRole = req.user?.role;
    
    // Validate inspection is completed before allowing "completed" status (admin can bypass)
    if ((status === 'completed' || status === 'closed') && userRole !== 'admin') {
      const hasReadings = await WorkOrder.hasInspectionReadings(id);
      if (!hasReadings) {
        return res.status(400).json({
          success: false,
          message: 'Inspection must be completed before marking work order as complete'
        });
      }
    }
    
    const updateData = { status };
    if (actual_hours !== undefined) updateData.actual_hours = actual_hours;
    if (completion_notes !== undefined) updateData.completion_notes = completion_notes;
    if (completion_percentage !== undefined) updateData.completion_percentage = completion_percentage;
    
    if (status === 'completed' || status === 'closed') {
      updateData.actual_end = new Date();
    }
    
    await WorkOrder.update(id, updateData);
    
    res.json({
      success: true,
      message: 'Status updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete work order
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    await WorkOrder.delete(id);
    
    res.json({
      success: true,
      message: 'Work order deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get work order statistics
 * Admin sees all stats, Supervisor sees only their facility's stats
 */
const getStats = async (req, res, next) => {
  try {
    const { role, facility_id } = req.user;
    
    let stats;
    if (role === 'supervisor' && facility_id) {
      stats = await WorkOrder.getStatsByFacility(facility_id);
    } else {
      stats = await WorkOrder.getStats();
    }
    
    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get my work orders (for operators)
 */
const getMyWorkOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    console.log('[API] getMyWorkOrders - User ID:', userId);
    
    const filters = {
      assigned_to: userId,
      status: req.query.status,
      priority: req.query.priority
    };
    // DEBUG: Log SQL query details
    console.log('[API] getMyWorkOrders - Filters:', filters);
    console.log('[API] getMyWorkOrders - User ID:', userId);
    
    const options = {
      limit: req.query.limit ? parseInt(req.query.limit) : null
    };
    console.log('[API] getMyWorkOrders - Options:', options);
    
    const workOrders = await WorkOrder.getAllWithDetails(filters, options);
    console.log('[API] getMyWorkOrders - Found:', workOrders.length, 'work orders');
    
    res.json({
      success: true,
      data: { work_orders: workOrders }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get work order by number
 */
const getByNumber = async (req, res, next) => {
  try {
    const { number } = req.params;
    const workOrder = await WorkOrder.getByNumber(number);
    
    if (!workOrder) {
      return res.status(404).json({
        success: false,
        message: 'Work order not found'
      });
    }

    res.json({
      success: true,
      data: { work_order: workOrder }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add note to work order
 */
const addNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const userId = req.user.id;
    
    if (!note || !note.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Note is required'
      });
    }
    
    await WorkOrder.addNote(id, userId, note.trim());
    
    res.json({
      success: true,
      message: 'Note added successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Re-assign work order to another user
 */
const reassign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assigned_to, notes } = req.body;
    const userId = req.user.id;
    
    // Validate work order exists
    const workOrder = await WorkOrder.getWithReadings(id);
    if (!workOrder) {
      return res.status(404).json({
        success: false,
        message: 'Work order not found'
      });
    }
    
    // Update assignment
    const updateData = { assigned_to: assigned_to || null };
    if (assigned_to) {
      updateData.status = 'assigned';
    } else {
      updateData.status = 'open';
    }
    
    await WorkOrder.update(id, updateData);
    
    // Add note about reassignment if provided
    if (notes && notes.trim()) {
      await WorkOrder.addNote(id, userId, notes.trim(), 'assignment');
    }
    
    // Get updated work order
    const updated = await WorkOrder.getWithReadings(id);
    
    res.json({
      success: true,
      message: 'Work order re-assigned successfully',
      data: { work_order: updated }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAll,
  getById,
  getByNumber,
  create,
  update,
  updateStatus,
  remove,
  getStats,
  getMyWorkOrders,
  addNote,
  reassign
};
