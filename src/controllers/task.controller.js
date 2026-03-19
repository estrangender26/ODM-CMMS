/**
 * Task Master Controller
 */

const { TaskMaster } = require('../models');

/**
 * Get all tasks
 */
const getAll = async (req, res, next) => {
  try {
    const { active, type } = req.query;
    let tasks;

    if (type) {
      tasks = await TaskMaster.getByType(type);
    } else if (active === 'true') {
      tasks = await TaskMaster.getActive();
    } else {
      tasks = await TaskMaster.findAll();
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
 * Get task by ID
 */
const getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await TaskMaster.getWithInspectionPoints(id);
    
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
 * Create new task
 */
const create = async (req, res, next) => {
  try {
    const data = {
      ...req.body,
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
 * Update task
 */
const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await TaskMaster.update(id, req.body);
    
    res.json({
      success: true,
      message: 'Task template updated successfully',
      data: { task }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete task
 */
const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
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
 * Get task types summary
 */
const getTypes = async (req, res, next) => {
  try {
    const types = await TaskMaster.getTypeSummary();
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
