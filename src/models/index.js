/**
 * Models Index
 * Central export for all models
 */

module.exports = {
  User: require('./user.model'),
  Facility: require('./facility.model'),
  Equipment: require('./equipment.model'),
  TaskMaster: require('./task.model'),
  Schedule: require('./schedule.model'),
  WorkOrder: require('./work-order.model'),
  Inspection: require('./inspection.model')
};
