/**
 * Inspection Controller
 */

const { Inspection, TaskMaster, WorkOrder } = require('../models');

/**
 * Get inspection points for a task
 */
const getPointsForTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const points = await Inspection.getPointsForTask(taskId);
    
    res.json({
      success: true,
      data: { inspection_points: points }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get readings for a work order
 */
const getReadingsForWorkOrder = async (req, res, next) => {
  try {
    const { workOrderId } = req.params;
    const readings = await Inspection.getReadingsForWorkOrder(workOrderId);
    const stats = await Inspection.getReadingsStats(workOrderId);
    
    res.json({
      success: true,
      data: { readings, stats }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit inspection reading
 */
const submitReading = async (req, res, next) => {
  try {
    const { workOrderId } = req.params;
    const { inspection_point_id, reading_value, notes } = req.body;

    // Get inspection point for validation
    const point = await Inspection.findById(inspection_point_id);
    if (!point) {
      return res.status(404).json({
        success: false,
        message: 'Inspection point not found'
      });
    }

    // Prepare reading data based on input type
    const readingData = {
      work_order_id: workOrderId,
      inspection_point_id,
      equipment_id: req.body.equipment_id,
      taken_by: req.user.id,
      notes,
      latitude: req.body.latitude,
      longitude: req.body.longitude
    };

    // Store value based on input type
    switch (point.input_type) {
      case 'numeric':
        readingData.reading_numeric = parseFloat(reading_value);
        readingData.reading_value = reading_value;
        // Validate against min/max
        if (point.min_value !== null && readingData.reading_numeric < point.min_value) {
          readingData.is_passing = false;
        } else if (point.max_value !== null && readingData.reading_numeric > point.max_value) {
          readingData.is_passing = false;
        } else {
          readingData.is_passing = true;
        }
        break;
        
      case 'boolean':
        readingData.reading_boolean = reading_value === true || reading_value === 'true' || reading_value === 1;
        readingData.reading_value = readingData.reading_boolean ? 'true' : 'false';
        // For boolean, check against expected value
        readingData.is_passing = readingData.reading_boolean === (point.expected_value === 'true');
        break;
        
      case 'text':
        readingData.reading_text = reading_value;
        readingData.reading_value = reading_value;
        readingData.is_passing = reading_value && reading_value.trim().length > 0;
        break;
        
      case 'select':
        readingData.reading_value = reading_value;
        readingData.is_passing = reading_value === point.expected_value;
        break;
        
      default:
        readingData.reading_value = reading_value;
        readingData.is_passing = true;
    }

    const reading = await Inspection.createReading(readingData);

    res.status(201).json({
      success: true,
      message: 'Reading submitted successfully',
      data: { reading }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit multiple readings at once
 */
const submitBulkReadings = async (req, res, next) => {
  try {
    const { workOrderId } = req.params;
    const { readings } = req.body;

    const results = [];
    const errors = [];

    for (const readingData of readings) {
      try {
        const point = await Inspection.findById(readingData.inspection_point_id);
        if (!point) {
          errors.push({ point_id: readingData.inspection_point_id, error: 'Point not found' });
          continue;
        }

        const data = {
          work_order_id: workOrderId,
          inspection_point_id: readingData.inspection_point_id,
          equipment_id: readingData.equipment_id,
          taken_by: req.user.id,
          notes: readingData.notes,
          latitude: readingData.latitude,
          longitude: readingData.longitude
        };

        // Process based on input type
        const value = readingData.reading_value;
        switch (point.input_type) {
          case 'numeric':
            data.reading_numeric = parseFloat(value);
            data.reading_value = value;
            data.is_passing = (point.min_value === null || data.reading_numeric >= point.min_value) &&
                             (point.max_value === null || data.reading_numeric <= point.max_value);
            break;
          case 'boolean':
            data.reading_boolean = value === true || value === 'true' || value === 1;
            data.reading_value = data.reading_boolean ? 'true' : 'false';
            data.is_passing = data.reading_boolean === (point.expected_value === 'true');
            break;
          case 'text':
            data.reading_text = value;
            data.reading_value = value;
            data.is_passing = value && value.trim().length > 0;
            break;
          default:
            data.reading_value = value;
            data.is_passing = true;
        }

        const result = await Inspection.createReading(data);
        results.push(result);
      } catch (err) {
        errors.push({ point_id: readingData.inspection_point_id, error: err.message });
      }
    }

    // Update work order completion percentage
    const stats = await Inspection.getReadingsStats(workOrderId);
    if (stats.total_points > 0) {
      const percentage = Math.round((stats.readings_taken / stats.total_points) * 100);
      await WorkOrder.update(workOrderId, { completion_percentage: percentage });
    }

    res.json({
      success: true,
      message: `Submitted ${results.length} readings${errors.length > 0 ? `, ${errors.length} errors` : ''}`,
      data: { readings: results, errors }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create inspection point for task
 */
const createInspectionPoint = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    
    // Verify task exists
    const task = await TaskMaster.findById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const data = {
      ...req.body,
      task_master_id: taskId
    };

    const point = await Inspection.create(data);
    res.status(201).json({
      success: true,
      message: 'Inspection point created',
      data: { inspection_point: point }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update inspection point
 */
const updateInspectionPoint = async (req, res, next) => {
  try {
    const { pointId } = req.params;
    const point = await Inspection.update(pointId, req.body);
    
    res.json({
      success: true,
      message: 'Inspection point updated',
      data: { inspection_point: point }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete inspection point
 */
const deleteInspectionPoint = async (req, res, next) => {
  try {
    const { pointId } = req.params;
    await Inspection.delete(pointId);
    
    res.json({
      success: true,
      message: 'Inspection point deleted'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPointsForTask,
  getReadingsForWorkOrder,
  submitReading,
  submitBulkReadings,
  createInspectionPoint,
  updateInspectionPoint,
  deleteInspectionPoint
};
