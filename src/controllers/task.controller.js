/**
 * Task Master Controller
 * Multi-tenant aware task management
 */

const { TaskMaster } = require('../models');

/**
 * Get all tasks (organization-aware)
 */
const getAll = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    const { active, type } = req.query;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }
    
    let tasks;

    if (type) {
      tasks = await TaskMaster.getByType(type, organizationId);
    } else if (active === 'true') {
      tasks = await TaskMaster.getActive(organizationId);
    } else {
      tasks = await TaskMaster.getByOrganization(organizationId);
    }

    res.json({
      success: true,
      data: { tasks }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get task by ID (organization-aware)
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    const task = await TaskMaster.getWithInspectionPoints(id, organizationId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      data: { task }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new task (organization-aware)
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

    const task = await TaskMaster.create(data);
    res.status(201).json({
      success: true,
      message: 'Task template created successfully',
      data: { task }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update task (organization-aware)
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    // Verify task belongs to organization
    const task = await TaskMaster.findById(id);
    if (!task || task.organization_id !== organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    const updated = await TaskMaster.update(id, req.body);
    
    res.json({
      success: true,
      message: 'Task template updated successfully',
      data: { task: updated }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete task (organization-aware)
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organization_id;
    
    // Verify task belongs to organization
    const task = await TaskMaster.findById(id);
    if (!task || task.organization_id !== organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }
    
    await TaskMaster.delete(id);
    
    res.json({
      success: true,
      message: 'Task template deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get task types summary (organization-aware)
 */
const getTypes = async (req, res, next) => {
  try {
    const organizationId = req.user.organization_id;
    
    if (!organizationId) {
      return res.status(400).json({
        success: false,
        message: 'User must belong to an organization'
      });
    }
    
    const types = await TaskMaster.getTypeSummary(organizationId);
    res.json({
      success: true,
      data: { types }
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
  getTypes
};
