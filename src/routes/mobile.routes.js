/**
 * ODM Mobile Routes
 * Mobile-first UI routes for operator-driven maintenance
 */

const express = require('express');
const router = express.Router();

// Middleware to check authentication
const requireAuth = (req, res, next) => {
  // In production, verify JWT/session here
  // For now, allow through with mock user
  req.user = {
    id: 'USR-001',
    name: 'Juan Santos',
    email: 'j.santos@acme.com',
    role: 'operator',
    organizationId: 'ORG-001'
  };
  next();
};

// Mobile Layout Wrapper
const renderMobile = (res, view, options = {}) => {
  res.render(`mobile/${view}`, options);
};

/**
 * Authentication Routes
 */

// Login screen
router.get('/login', (req, res) => {
  res.render('mobile/login');
});

// Login POST
router.post('/login', (req, res) => {
  // Authenticate user
  res.redirect('/mobile/home');
});

/**
 * Main Operator Routes
 */

// Home Dashboard
router.get('/home', requireAuth, (req, res) => {
  const data = {
    title: 'Home',
    showBack: false,
    showNav: true,
    activeNav: 'home',
    todayCount: 5,
    overdueCount: 2,
    priorityTasks: [
      {
        id: 'WO-2026-0042',
        assetName: 'Pump P-101',
        equipmentType: 'Centrifugal Pump',
        facility: 'North Plant',
        dueStatus: 'today',
        status: 'released'
      },
      {
        id: 'WO-2026-0038',
        assetName: 'Motor M-205',
        equipmentType: 'Electric Motor',
        facility: 'South Plant',
        dueStatus: 'overdue',
        daysOverdue: 2,
        status: 'released'
      }
    ]
  };
  renderMobile(res, 'home', data);
});

// Work Order List
router.get('/work-orders', requireAuth, (req, res) => {
  const data = {
    title: 'Work Orders',
    showBack: false,
    showNav: true,
    activeNav: 'work-orders',
    filters: ['All', 'Today', 'Overdue', 'In Progress', 'Completed'],
    activeFilter: req.query.filter || 'All',
    workOrders: [
      {
        id: 'WO-2026-0042',
        assetName: 'Pump P-101',
        equipmentType: 'Centrifugal Pump',
        facility: 'North Plant',
        dueDate: 'Today',
        dueStatus: 'today',
        status: 'released'
      },
      {
        id: 'WO-2026-0038',
        assetName: 'Motor M-205',
        equipmentType: 'Electric Motor',
        facility: 'South Plant',
        dueDate: '2 Days Overdue',
        dueStatus: 'overdue',
        status: 'released'
      },
      {
        id: 'WO-2026-0035',
        assetName: 'Heat Exchanger HX-301',
        equipmentType: 'Shell and Tube Heat Exchanger',
        facility: 'North Plant',
        dueDate: 'Due Apr 5',
        dueStatus: 'scheduled',
        status: 'in_progress'
      },
      {
        id: 'WO-2026-0030',
        assetName: 'Compressor C-102',
        equipmentType: 'Rotary Screw Compressor',
        facility: 'East Plant',
        dueDate: 'Due Apr 6',
        dueStatus: 'scheduled',
        status: 'scheduled'
      },
      {
        id: 'WO-2026-0028',
        assetName: 'Fan F-201',
        equipmentType: 'Centrifugal Fan',
        facility: 'South Plant',
        dueDate: 'Completed Apr 2',
        dueStatus: 'completed',
        status: 'completed'
      }
    ]
  };
  renderMobile(res, 'work-orders', data);
});

// Work Order Detail
router.get('/work-orders/:id', requireAuth, (req, res) => {
  const workOrderId = req.params.id;
  
  const data = {
    title: workOrderId,
    showBack: true,
    showNav: false,
    activeNav: '',
    workOrder: {
      id: workOrderId,
      assetName: 'Pump P-101',
      equipmentType: 'Centrifugal Pump',
      facility: 'North Plant',
      status: 'released',
      dueDate: 'Today',
      assignedTo: 'Juan Santos',
      template: {
        name: 'Daily Pump Inspection',
        version: 2,
        itemCount: 12,
        estimatedMinutes: 15
      }
    },
    checklistPreview: [
      { prompt: 'Check coupling for wear', type: 'pass_fail' },
      { prompt: 'Check bearing temperature', type: 'numeric' },
      { prompt: 'Check seal for leakage', type: 'multiple_choice' }
    ],
    lastInspection: {
      date: 'Mar 29, 2026',
      by: 'Juan Santos',
      result: 'no_findings'
    }
  };
  renderMobile(res, 'work-order-detail', data);
});

// Inspection Execution
router.get('/inspection/:workOrderId', requireAuth, (req, res) => {
  const workOrderId = req.params.workOrderId;
  const itemIndex = parseInt(req.query.item) || 1;
  const totalItems = 12;
  
  // Mock inspection items
  const items = [
    {
      id: 'II-001',
      sequence: 1,
      prompt: 'Check coupling for wear or damage',
      type: 'pass_fail',
      subunit: 'Coupling Assembly',
      maintainableItem: 'Coupling Element'
    },
    {
      id: 'II-002',
      sequence: 2,
      prompt: 'Check bearing temperature (drive end)',
      type: 'numeric',
      subunit: 'Bearing Assembly',
      maintainableItem: 'Bearing DE',
      unit: '°C'
    },
    {
      id: 'II-003',
      sequence: 3,
      prompt: 'Check mechanical seal for leakage',
      type: 'multiple_choice',
      subunit: 'Sealing System',
      maintainableItem: 'Mechanical Seal',
      options: ['No leak', 'Minor drip', 'Active leak']
    }
  ];
  
  const currentItem = items[(itemIndex - 1) % items.length];
  
  const data = {
    title: `Inspection`,
    showBack: true,
    showNav: false,
    activeNav: '',
    progress: {
      current: itemIndex,
      total: totalItems,
      percent: Math.round((itemIndex / totalItems) * 100)
    },
    item: currentItem,
    workOrderId: workOrderId
  };
  renderMobile(res, 'inspection', data);
});

// Save inspection response
router.post('/inspection/:workOrderId/item/:itemId', requireAuth, (req, res) => {
  // Save inspection response
  // Return next item or completion
  res.json({ success: true });
});

// Create finding
router.post('/inspection/:workOrderId/finding', requireAuth, (req, res) => {
  // Create finding from inspection
  res.json({ success: true, findingId: 'FND-001' });
});

/**
 * QR and Asset Routes
 */

// QR Asset Context
router.get('/asset', requireAuth, (req, res) => {
  const qrCode = req.query.code;
  
  // In production, lookup asset by QR code
  const data = {
    title: 'Asset',
    showBack: true,
    showNav: false,
    activeNav: '',
    asset: {
      id: 'AST-001',
      name: 'Pump P-101',
      equipmentType: 'Centrifugal Pump',
      equipmentTypeId: 'ETYPE-001',
      facility: 'North Plant',
      facilityId: 'FAC-001',
      qrCode: qrCode || 'ODM-AST-001',
      status: 'active'
    },
    openWorkOrders: [
      {
        id: 'WO-2026-0042',
        dueDate: 'Today',
        templateName: 'Daily Pump Inspection',
        selected: true
      },
      {
        id: 'WO-2026-0039',
        dueDate: 'Due Apr 5',
        templateName: 'Weekly Maintenance',
        selected: false
      }
    ],
    hasOverdue: true,
    overdueWorkOrder: {
      id: 'WO-2026-0038',
      daysOverdue: 2
    },
    lastInspection: {
      date: 'Mar 29, 2026',
      by: 'Juan Santos',
      result: 'pass',
      findingsCount: 0
    }
  };
  renderMobile(res, 'asset-context', data);
});

// Asset History
router.get('/asset/:assetId/history', requireAuth, (req, res) => {
  const data = {
    title: 'Inspection History',
    showBack: true,
    showNav: false,
    activeNav: '',
    inspections: [
      {
        date: 'Mar 29, 2026',
        workOrder: 'WO-2026-0028',
        template: 'Daily Pump Inspection',
        result: 'pass',
        findings: 0
      },
      {
        date: 'Mar 28, 2026',
        workOrder: 'WO-2026-0021',
        template: 'Daily Pump Inspection',
        result: 'findings',
        findings: 1
      },
      {
        date: 'Mar 27, 2026',
        workOrder: 'WO-2026-0015',
        template: 'Daily Pump Inspection',
        result: 'pass',
        findings: 0
      }
    ]
  };
  renderMobile(res, 'asset-history', data);
});

/**
 * Profile and Settings
 */

// User Profile
router.get('/profile', requireAuth, (req, res) => {
  const data = {
    title: 'Profile',
    showBack: false,
    showNav: true,
    activeNav: 'profile',
    user: {
      id: 'USR-001',
      name: 'Juan Santos',
      email: 'j.santos@acme.com',
      initials: 'JS',
      role: 'Operator',
      organization: 'Acme Manufacturing',
      plan: 'Professional'
    },
    stats: {
      completedThisMonth: 42,
      findingsThisMonth: 3,
      onTimeRate: 98
    },
    syncStatus: {
      lastSync: '2 min ago',
      isOnline: true
    }
  };
  renderMobile(res, 'profile', data);
});

// Logout
router.post('/logout', (req, res) => {
  // Clear session/JWT
  res.redirect('/mobile/login');
});

/**
 * Dashboard Routes (Supervisor/Manager)
 */

// Work Order Dashboard
router.get('/dashboard/work-orders', requireAuth, (req, res) => {
  const data = {
    title: 'WO Dashboard',
    showBack: true,
    showNav: false,
    kpis: {
      scheduled: 45,
      completed: 38,
      overdue: 5,
      inProgress: 2
    },
    chartData: {
      byStatus: [
        { label: 'Completed', value: 38, color: '#4caf50' },
        { label: 'In Progress', value: 2, color: '#ff9800' },
        { label: 'Overdue', value: 5, color: '#f44336' },
        { label: 'Scheduled', value: 5, color: '#9e9e9e' }
      ]
    }
  };
  renderMobile(res, 'dashboard/work-orders', data);
});

// Findings Dashboard
router.get('/dashboard/findings', requireAuth, (req, res) => {
  const data = {
    title: 'Findings Dashboard',
    showBack: true,
    showNav: false,
    kpis: {
      total: 23,
      high: 3,
      medium: 8,
      low: 12
    },
    bySeverity: [
      { label: 'Low', value: 12, color: '#9e9e9e' },
      { label: 'Medium', value: 8, color: '#ff9800' },
      { label: 'High', value: 3, color: '#f44336' }
    ],
    byEquipmentType: [
      { label: 'Centrifugal Pump', count: 8 },
      { label: 'Electric Motor', count: 6 },
      { label: 'Heat Exchanger', count: 4 }
    ]
  };
  renderMobile(res, 'dashboard/findings', data);
});

// Calendar View
router.get('/calendar', requireAuth, (req, res) => {
  const data = {
    title: 'Calendar',
    showBack: true,
    showNav: false,
    activeNav: '',
    currentDate: new Date().toISOString().split('T')[0],
    workOrders: [
      { date: '2026-04-06', items: [
        { id: 'WO-0042', asset: 'Pump P-101', status: 'due' },
        { id: 'WO-0043', asset: 'Motor M-205', status: 'due' }
      ]},
      { date: '2026-04-07', items: [
        { id: 'WO-0045', asset: 'Heat Exchanger', status: 'scheduled' }
      ]}
    ]
  };
  renderMobile(res, 'calendar', data);
});

/**
 * Admin Routes
 */

// Facilities Management
router.get('/admin/facilities', requireAuth, (req, res) => {
  const data = {
    title: 'Facilities',
    showBack: true,
    showNav: false,
    facilities: [
      { id: 'FAC-001', name: 'North Plant' },
      { id: 'FAC-002', name: 'South Plant' },
      { id: 'FAC-003', name: 'East Plant' }
    ]
  };
  renderMobile(res, 'admin/facilities', data);
});

// Asset Registration
router.get('/admin/assets', requireAuth, (req, res) => {
  const data = {
    title: 'Assets',
    showBack: true,
    showNav: false,
    equipmentTypes: [
      { id: 'ETYPE-001', name: 'Centrifugal Pump' },
      { id: 'ETYPE-013', name: 'Electric Motor' }
    ],
    facilities: [
      { id: 'FAC-001', name: 'North Plant' }
    ]
  };
  renderMobile(res, 'admin/assets', data);
});

// Template Management
router.get('/admin/templates', requireAuth, (req, res) => {
  const data = {
    title: 'Templates',
    showBack: true,
    showNav: false,
    templates: [
      { id: 'TMP-001', name: 'Daily Pump Inspection', equipmentType: 'Centrifugal Pump', version: 2, isActive: true },
      { id: 'TMP-002', name: 'Weekly Motor Check', equipmentType: 'Electric Motor', version: 1, isActive: true }
    ]
  };
  renderMobile(res, 'admin/templates', data);
});

// API Endpoints for mobile app

// Get work orders for current user
router.get('/api/work-orders', requireAuth, (req, res) => {
  res.json({
    workOrders: [
      { id: 'WO-2026-0042', assetName: 'Pump P-101', status: 'released', dueDate: '2026-04-06' }
    ]
  });
});

// Get inspection item
router.get('/api/inspection/:workOrderId/item/:sequence', requireAuth, (req, res) => {
  res.json({
    item: {
      id: 'II-001',
      sequence: parseInt(req.params.sequence),
      prompt: 'Check coupling for wear',
      type: 'pass_fail',
      subunit: 'Coupling Assembly',
      maintainableItem: 'Coupling Element'
    }
  });
});

// Submit inspection response
router.post('/api/inspection/response', requireAuth, (req, res) => {
  const { workOrderId, itemId, response, notes, photo } = req.body;
  // Save to database
  res.json({ success: true, nextItemSequence: 2 });
});

module.exports = router;
