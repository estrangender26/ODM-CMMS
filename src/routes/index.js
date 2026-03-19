/**
 * Routes Index
 */

const express = require('express');
const router = express.Router();

console.log('[ROUTES] Loading routes...');

// API routes
router.use('/auth', require('./auth.routes'));
router.use('/users', require('./user.routes'));
router.use('/facilities', require('./facility.routes'));
router.use('/equipment', require('./equipment.routes'));
router.use('/tasks', require('./task.routes'));
router.use('/schedules', require('./schedule.routes'));
console.log('[ROUTES] About to load work-orders routes');
router.use('/work-orders', require('./work-order.routes'));
console.log('[ROUTES] Work-orders routes loaded');
router.use('/inspections', require('./inspection.routes'));
router.use('/reports', require('./report.routes'));

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
