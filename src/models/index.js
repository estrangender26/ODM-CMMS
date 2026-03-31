/**
 * Models Index
 * Central export for all models
 */

module.exports = {
  User: require('./user.model'),
  Organization: require('./organization.model'),
  OrganizationSubscription: require('./organization-subscription.model'),
  SubscriptionPlan: require('./subscription-plan.model'),
  Invitation: require('./invitation.model'),
  Facility: require('./facility.model'),
  Equipment: require('./equipment.model'),
  TaskMaster: require('./task.model'),
  Schedule: require('./schedule.model'),
  WorkOrder: require('./work-order.model'),
  Inspection: require('./inspection.model')
};
