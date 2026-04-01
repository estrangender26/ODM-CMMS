/**
 * Work Order Controller
 * Multi-tenant aware work order management
 */

const { WorkOrder, User } = require('../models');

/**
 * Check if user is the system administrator (should not receive work orders)
 * @param {number} userId - User ID to check
 * @returns {Promise<boolean>} - True if user is admin
 */
const isSystemAdmin = async (userId) => {
  if (!userId) return false;
  const user = await User.findById(userId);
  return user && user.username === 'admin';
};

/**
 * Get all work orders (organization-aware)
 * Admin sees all in org, Supervisor sees only their facility's work orders
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
      workOrders = await WorkOrder.getByFacility(facility_id, organizationId, filters, options);
    } else {
      // Admin sees all work orders in organization
      workOrders = await WorkOrder.getAllWithDetails(organizationId, filters, options);
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
 * Get work order by ID (organization-aware)
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    const workOrder = await WorkOrder.getWithReadings(id, organizationId);
    
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
 * Create new work order (organization-aware)
 */
const create = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { assigned_to } = req.body;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }
    
    // Prevent assigning work orders to system administrator
    if (assigned_to && await isSystemAdmin(assigned_to)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign work orders to System Administrator'
      });
    }

    // Generate work order number
    const woNumber = await WorkOrder.generateNumber(organizationId);
    
    const data = {
      ...req.body,
      organization_id: organizationId,
      wo_number: woNumber,
      requested_by: req.user.id
    };
    
    const result = await WorkOrder.create(data);
    const workOrder = await WorkOrder.findByIdWithOrg(result.id, organizationId);
    
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
 * Update work order (organization-aware)
 * Validates that status cannot be changed to completed/closed without inspection (except admin)
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, assigned_to } = req.body;
    const userRole = req.user?.role;
    const organizationId = req.user.organization_id;
    
    // Verify work order belongs to user's organization
    const belongs = await WorkOrder.belongsToOrganization(id, organizationId);
    if (!belongs) {
      return res.status(404).json({
        success: false,
        message: 'Work order not found'
      });
    }
    
    // Check if trying to mark as completed/closed via general update (admin can bypass)
    if ((status === 'completed' || status === 'closed') && userRole !== 'admin') {
      const hasReadings = await WorkOrder.hasInspectionReadings(id, organizationId);
      if (!hasReadings) {
        return res.status(400).json({
          success: false,
          message: 'Inspection must be completed before marking work order as complete'
        });
      }
    }
    
    // Prevent assigning work orders to system administrator
    if (assigned_to && await isSystemAdmin(assigned_to)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign work orders to System Administrator'
      });
    }
    
    await WorkOrder.update(id, req.body);
    const workOrder = await WorkOrder.findByIdWithOrg(id, organizationId);
    
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
 * Update work order status (organization-aware)
 * Admin can complete without inspection, others require inspection
 */
const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, actual_hours, completion_notes, completion_percentage } = req.body;
    const userRole = req.user?.role;
    const organizationId = req.user.organization_id;
    
    // Verify work order belongs to user's organization
    const belongs = await WorkOrder.belongsToOrganization(id, organizationId);
    if (!belongs) {
      return res.status(404).json({
        success: false,
        message: 'Work order not found'
      });
    }
    
    // Validate inspection is completed before allowing "completed" status (admin can bypass)
    if ((status === 'completed' || status === 'closed') && userRole !== 'admin') {
      const hasReadings = await WorkOrder.hasInspectionReadings(id, organizationId);
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
 * Delete work order (organization-aware)
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    // Verify work order belongs to user's organization
    const belongs = await WorkOrder.belongsToOrganization(id, organizationId);
    if (!belongs) {
      return res.status(404).json({
        success: false,
        message: 'Work order not found'
      });
    }
    
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
 * Get work order statistics (organization-aware)
 * Admin sees all org stats, Supervisor sees only their facility's stats
 */
const getStats = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { role, facility_id } = req.user;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }
    
    let stats;
    if (role === 'supervisor' && facility_id) {
      stats = await WorkOrder.getStatsByFacility(facility_id, organizationId);
    } else {
      stats = await WorkOrder.getStats(organizationId);
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
 * Get my work orders (for operators) - organization-aware
 */
const getMyWorkOrders = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const organizationId = req.user.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }
    
    console.log('[API] getMyWorkOrders - User ID:', userId, 'Org ID:', organizationId);
    
    const filters = {
      status: req.query.status,
      priority: req.query.priority
    };
    
    const options = {
      limit: req.query.limit ? parseInt(req.query.limit) : null
    };
    
    const workOrders = await WorkOrder.getAssignedToOperator(userId, organizationId, filters);
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
 * Get work order by number (organization-aware)
 */
const getByNumber = async (req, res, next) => {
  try {
    const { number } = req.params;
    const organizationId = req.user.organization_id;
    
    const workOrder = await WorkOrder.findByNumber(number, organizationId);
    
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
 * Add note to work order (organization-aware)
 */
const addNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body;
    const userId = req.user.id;
    const organizationId = req.user.organization_id;
    
    if (!note || !note.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Note is required'
      });
    }
    
    // Verify work order belongs to user's organization
    const belongs = await WorkOrder.belongsToOrganization(id, organizationId);
    if (!belongs) {
      return res.status(404).json({
        success: false,
        message: 'Work order not found'
      });
    }
    
    await WorkOrder.addNote(id, userId, note.trim(), 'general', organizationId);
    
    res.json({
      success: true,
      message: 'Note added successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Re-assign work order to another user (organization-aware)
 */
const reassign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assigned_to, notes } = req.body;
    const userId = req.user.id;
    const organizationId = req.user.organization_id;
    
    // Verify work order belongs to user's organization
    const belongs = await WorkOrder.belongsToOrganization(id, organizationId);
    if (!belongs) {
      return res.status(404).json({
        success: false,
        message: 'Work order not found'
      });
    }
    
    // Validate work order exists
    const workOrder = await WorkOrder.getWithReadings(id, organizationId);
    if (!workOrder) {
      return res.status(404).json({
        success: false,
        message: 'Work order not found'
      });
    }
    
    // Prevent assigning work orders to system administrator
    if (assigned_to && await isSystemAdmin(assigned_to)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot assign work orders to System Administrator'
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
      await WorkOrder.addNote(id, userId, notes.trim(), 'assignment', organizationId);
    }
    
    // Get updated work order
    const updated = await WorkOrder.getWithReadings(id, organizationId);
    
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
