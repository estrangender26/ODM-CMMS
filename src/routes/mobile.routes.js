/**
 * ODM Mobile Routes
 * Mobile-first UI routes for operator-driven maintenance
 */

const express = require('express');
const router = express.Router();
const qrLabelController = require('../controllers/qr-label.controller');

// Middleware to check authentication
const { authenticate, requireAdmin, requireSupervisor } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// Use the actual authenticate middleware from auth.js
const requireAuth = authenticate;

// Middleware to require admin or supervisor role for admin routes
const requireAdminUI = (req, res, next) => {
  if (!req.user) {
    return res.redirect('/login');
  }
  
  const allowedRoles = ['admin', 'supervisor'];
  if (!allowedRoles.includes(req.user.role)) {
    // Redirect operators to home - they don't have admin access
    return res.redirect('/mobile/home');
  }
  
  next();
};

// Middleware to require admin role only
const requireAdminOnly = (req, res, next) => {
  if (!req.user) {
    return res.redirect('/login');
  }
  
  if (req.user.role !== 'admin') {
    // Supervisors and operators don't have full admin access
    return res.redirect('/mobile/admin');
  }
  
  next();
};

// Mobile Layout Wrapper
const renderMobile = (res, view, options = {}) => {
  res.render(`mobile/${view}`, { ...options, layout: 'mobile/layout' });
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
    activeNav: 'tasks',
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
  
  // Simulate workflow state - after inspection, status would be in_progress
  // For demo: WO-2026-0042 is in_progress, others are released
  const isInProgress = workOrderId === 'WO-2026-0042';
  
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
      status: isInProgress ? 'in_progress' : 'released',
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

// Complete Work Order
router.post('/work-orders/:id/complete', requireAuth, (req, res) => {
  // Mark work order as completed
  // In production: update database, set status to 'completed', set completed_at
  res.json({ success: true, status: 'completed' });
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
    itemIndex: itemIndex,
    totalItems: totalItems,
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

// Ad-hoc Inspection (no work order - using equipment type template)
router.get('/inspection/adhoc', requireAuth, (req, res) => {
  const equipmentTypeId = req.query.equipmentTypeId || 'ETYPE-001';
  const itemIndex = parseInt(req.query.item) || 1;
  const totalItems = 8;
  
  // Mock ad-hoc inspection items based on equipment type
  const items = [
    {
      id: 'ADH-001',
      sequence: 1,
      prompt: 'Visual inspection - check for damage',
      type: 'pass_fail',
      subunit: 'General',
      maintainableItem: 'Housing'
    },
    {
      id: 'ADH-002',
      sequence: 2,
      prompt: 'Check operating temperature',
      type: 'numeric',
      subunit: 'Thermal',
      maintainableItem: 'Body',
      unit: '°C'
    },
    {
      id: 'ADH-003',
      sequence: 3,
      prompt: 'Check for abnormal noise',
      type: 'multiple_choice',
      subunit: 'General',
      maintainableItem: 'Assembly',
      options: ['Normal', 'Slight noise', 'Loud noise']
    }
  ];
  
  const currentItem = items[(itemIndex - 1) % items.length];
  
  const data = {
    title: 'Ad-hoc Inspection',
    showBack: true,
    showNav: false,
    activeNav: '',
    isAdHoc: true,
    equipmentTypeId: equipmentTypeId,
    progress: {
      current: itemIndex,
      total: totalItems,
      percent: Math.round((itemIndex / totalItems) * 100)
    },
    item: currentItem,
    workOrderId: 'ADHOC-' + Date.now()
  };
  renderMobile(res, 'inspection', data);
});

/**
 * QR and Asset Routes
 */

// QR Asset Context
router.get('/asset', requireAuth, async (req, res) => {
  try {
    const qrCode = req.query.code;
    const { Equipment } = require('../models');
    
    // Lookup asset by QR code or asset code
    const asset = await Equipment.getByQRCode(qrCode);
    
    if (!asset) {
      return renderMobile(res, 'qr-error', {
        title: 'Asset Not Found',
        showBack: true,
        showNav: false,
        activeNav: '',
        qrCode: qrCode,
        message: 'No asset found with this QR code'
      });
    }
    
    const data = {
      title: asset.name || 'Asset',
      showBack: true,
      showNav: false,
      activeNav: '',
      asset: {
        id: asset.id,
        name: asset.name,
        equipmentType: asset.equipment_type || 'Unknown',
        equipmentTypeId: asset.equipment_type_id || '',
        facility: asset.facility_name || 'Unknown',
        facilityId: asset.facility_id,
        code: asset.code,
        qrCode: qrCode || asset.code,
        status: asset.status || 'active'
      },
      openWorkOrders: [],
      hasOverdue: false,
      overdueWorkOrder: null,
      lastInspection: {
        date: 'N/A',
        by: 'N/A',
        result: 'pass',
        findingsCount: 0
      }
    };
    renderMobile(res, 'asset-context', data);
  } catch (error) {
    console.error('Asset lookup error:', error);
    renderMobile(res, 'qr-error', {
      title: 'Error',
      showBack: true,
      showNav: false,
      activeNav: '',
      qrCode: req.query.code,
      message: 'Failed to lookup asset'
    });
  }
});

// Equipment List
router.get('/equipment', requireAuth, (req, res) => {
  const data = {
    title: 'Equipment',
    showBack: false,
    showNav: true,
    activeNav: 'equipment',
    equipment: [
      { id: 'EQ-001', name: 'Pump P-101', type: 'Centrifugal Pump', facility: 'North Plant', status: 'operational' },
      { id: 'EQ-002', name: 'Motor M-205', type: 'Electric Motor', facility: 'South Plant', status: 'operational' },
      { id: 'EQ-003', name: 'Heat Exchanger HX-301', type: 'Shell and Tube', facility: 'North Plant', status: 'maintenance' }
    ]
  };
  renderMobile(res, 'equipment-list', data);
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
router.get('/profile', requireAuth, async (req, res) => {
  // Get real user data from request
  const user = req.user;
  const isAdmin = user.role === 'admin' || user.role === 'supervisor';
  
  // Get organization name
  let orgName = 'Unknown Organization';
  try {
    const { Organization } = require('../models');
    const org = await Organization.findById(user.organization_id);
    if (org) orgName = org.organization_name;
  } catch (err) {
    console.error('Failed to get org name:', err);
  }
  
  const data = {
    title: 'Profile',
    showBack: false,
    showNav: true,
    activeNav: 'profile',
    user: {
      id: user.id,
      name: user.full_name || user.username,
      email: user.email,
      initials: (user.full_name || user.username).split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      role: user.role,
      organization: orgName,
      isAdmin: isAdmin
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

// Dashboard Hub
router.get('/dashboard', requireAuth, (req, res) => {
  const data = {
    title: 'Dashboard',
    showBack: false,
    showNav: true,
    activeNav: 'reports',
    sections: [
      { label: 'Work Orders', href: '/mobile/dashboard/work-orders', icon: 'clipboard' },
      { label: 'Findings', href: '/mobile/dashboard/findings', icon: 'alert' }
    ]
  };
  renderMobile(res, 'dashboard/index', data);
});

// Work Order Dashboard
router.get('/dashboard/work-orders', requireAuth, (req, res) => {
  const data = {
    title: 'WO Dashboard',
    showBack: true,
    showNav: true,
    activeNav: 'reports',
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
    showNav: true,
    activeNav: 'reports',
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
    showBack: false,
    showNav: true,
    activeNav: 'scheduler',
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

// Maintenance Plans List
router.get('/maintenance-plans', requireAuth, requireAdminUI, async (req, res) => {
  try {
    const { TaskTemplate } = require('../models');
    const organizationId = req.user.organization_id;
    
    // Get maintenance plans with template info
    const plans = await TaskTemplate.query(`
      SELECT 
        mp.id,
        mp.plan_name,
        mp.frequency_type,
        mp.frequency_interval,
        mp.priority,
        mp.is_active as isActive,
        mp.start_date,
        tt.template_name
      FROM maintenance_plans mp
      JOIN task_templates tt ON mp.task_template_id = tt.id
      WHERE mp.organization_id = ?
      ORDER BY mp.plan_name
    `, [organizationId]);
    
    const data = {
      title: 'Maintenance Plans',
      showBack: false,
      showNav: true,
      activeNav: 'admin',
      plans: plans.map(p => ({
        id: p.id,
        plan_name: p.plan_name,
        template_name: p.template_name,
        frequency_type: p.frequency_type,
        frequency_interval: p.frequency_interval,
        priority: p.priority,
        isActive: p.isActive === 1 || p.isActive === true,
        start_date: p.start_date
      }))
    };
    renderMobile(res, 'maintenance-plans', data);
  } catch (error) {
    console.error('[MOBILE] Error loading maintenance plans:', error);
    res.status(500).render('error', { 
      message: 'Error loading maintenance plans: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// New Maintenance Plan
router.get('/maintenance-plans/new', requireAuth, requireAdminUI, async (req, res) => {
  try {
    const { TaskTemplate, EquipmentType } = require('../models');
    const organizationId = req.user.organization_id;
    
    // Get all templates
    const templates = await TaskTemplate.query(`
      SELECT tt.id, tt.template_name as name, et.type_name as equipment_type
      FROM task_templates tt
      JOIN equipment_types et ON tt.equipment_type_id = et.id
      WHERE tt.organization_id IS NULL OR tt.organization_id = ?
      ORDER BY tt.template_name
    `, [organizationId]);
    
    // Get equipment (optional - for specific equipment plans)
    const equipment = await TaskTemplate.query(`
      SELECT e.id, e.name, e.code, et.type_name as type
      FROM equipment e
      JOIN equipment_types et ON e.equipment_type_id = et.id
      WHERE e.organization_id = ? AND e.status IN ('operational', 'active')
      ORDER BY e.name
    `, [organizationId]);
    
    const data = {
      title: 'New Maintenance Plan',
      showBack: true,
      showNav: false,
      activeNav: '',
      plan: {
        id: null,
        plan_name: '',
        task_template_id: '',
        equipment_id: '',
        frequency_type: 'daily',
        frequency_interval: 1,
        day_of_week: 1,
        day_of_month: 1,
        start_date: new Date().toISOString().split('T')[0],
        priority: 'medium',
        is_active: true
      },
      templates,
      equipment
    };
    renderMobile(res, 'maintenance-plan-editor', data);
  } catch (error) {
    console.error('[MOBILE] Error loading plan form:', error);
    res.status(500).render('error', { 
      message: 'Error loading form: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Edit Maintenance Plan
router.get('/maintenance-plans/:id/edit', requireAuth, requireAdminUI, async (req, res) => {
  try {
    const { TaskTemplate, EquipmentType } = require('../models');
    const { getDb } = require('../config/database');
    const db = getDb();
    const planId = req.params.id;
    const organizationId = req.user.organization_id;
    
    // Get plan details
    const [plan] = await db.query(`
      SELECT mp.*, tt.template_name
      FROM maintenance_plans mp
      JOIN task_templates tt ON mp.task_template_id = tt.id
      WHERE mp.id = ? AND mp.organization_id = ?
    `, [planId, organizationId]);
    
    if (!plan) {
      return res.status(404).render('error', { 
        message: 'Maintenance plan not found',
        error: {}
      });
    }
    
    // Get all templates
    const templates = await TaskTemplate.query(`
      SELECT tt.id, tt.template_name as name, et.type_name as equipment_type
      FROM task_templates tt
      JOIN equipment_types et ON tt.equipment_type_id = et.id
      WHERE tt.organization_id IS NULL OR tt.organization_id = ?
      ORDER BY tt.template_name
    `, [organizationId]);
    
    // Get equipment
    const equipment = await TaskTemplate.query(`
      SELECT e.id, e.name, e.code, et.type_name as type
      FROM equipment e
      JOIN equipment_types et ON e.equipment_type_id = et.id
      WHERE e.organization_id = ? AND e.status IN ('operational', 'active')
      ORDER BY e.name
    `, [organizationId]);
    
    const data = {
      title: 'Edit Maintenance Plan',
      showBack: true,
      showNav: false,
      activeNav: '',
      plan: {
        id: plan.id,
        plan_name: plan.plan_name,
        task_template_id: plan.task_template_id,
        equipment_id: plan.equipment_id,
        frequency_type: plan.frequency_type,
        frequency_interval: plan.frequency_interval,
        day_of_week: plan.day_of_week,
        day_of_month: plan.day_of_month,
        start_date: plan.start_date ? new Date(plan.start_date).toISOString().split('T')[0] : '',
        priority: plan.priority,
        is_active: plan.is_active === 1 || plan.is_active === true
      },
      templates,
      equipment
    };
    renderMobile(res, 'maintenance-plan-editor', data);
  } catch (error) {
    console.error('[MOBILE] Error loading plan for edit:', error);
    res.status(500).render('error', { 
      message: 'Error loading plan: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

/**
 * Admin Routes
 */

// Admin Hub - accessible by admin and supervisor
router.get('/admin', requireAuth, requireAdminUI, (req, res) => {
  const data = {
    title: 'Admin',
    showBack: false,
    showNav: true,
    activeNav: 'admin',
    sections: [
      { label: 'Onboarding', href: '/mobile/onboarding', icon: 'rocket' },
      { label: 'Users', href: '/mobile/admin/users', icon: 'users' },
      { label: 'Organization', href: '/mobile/admin/organization', icon: 'settings' },
      { label: 'Subscription', href: '/mobile/admin/subscription', icon: 'credit' },
      { label: 'Facilities', href: '/mobile/admin/facilities', icon: 'building' },
      { label: 'Assets', href: '/mobile/admin/assets', icon: 'box' },
      { label: 'Templates', href: '/mobile/admin/templates', icon: 'file' },
      { label: 'Scheduler', href: '/mobile/calendar', icon: 'calendar' },
      { label: 'QR Labels', href: '/mobile/qr-labels', icon: 'qr' }
    ]
  };
  renderMobile(res, 'admin/index', data);
});

// Facilities Management - admin only
router.get('/admin/facilities', requireAuth, requireAdminOnly, (req, res) => {
  const data = {
    title: 'Facilities',
    showBack: true,
    showNav: true,
    activeNav: 'admin',
    facilities: [
      { id: 'FAC-001', name: 'North Plant' },
      { id: 'FAC-002', name: 'South Plant' },
      { id: 'FAC-003', name: 'East Plant' }
    ]
  };
  renderMobile(res, 'admin/facilities', data);
});

// Asset Registration - admin only
router.get('/admin/assets', requireAuth, requireAdminOnly, (req, res) => {
  const data = {
    title: 'Assets',
    showBack: true,
    showNav: true,
    activeNav: 'admin',
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

// Template Management - admin and supervisor
router.get('/admin/templates', requireAuth, requireAdminUI, async (req, res) => {
  try {
    const { TaskTemplate } = require('../models');
    const organizationId = req.user.organization_id;
    
    // Get templates from database
    const templates = await TaskTemplate.query(`
      SELECT 
        tt.id,
        tt.template_name as name,
        tt.is_active as isActive,
        et.type_name as equipmentType,
        COUNT(tts.id) as itemCount
      FROM task_templates tt
      JOIN equipment_types et ON tt.equipment_type_id = et.id
      LEFT JOIN task_template_steps tts ON tt.id = tts.task_template_id
      WHERE tt.organization_id IS NULL OR tt.organization_id = ?
      GROUP BY tt.id, tt.template_name, tt.is_active, et.type_name
      ORDER BY tt.template_name
    `, [organizationId]);
    
    const data = {
      title: 'Templates',
      showBack: true,
      showNav: true,
      activeNav: 'admin',
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        equipmentType: t.equipmentType,
        isActive: t.isActive === 1 || t.isActive === true,
        itemCount: t.itemCount || 0
      }))
    };
    renderMobile(res, 'admin/templates', data);
  } catch (error) {
    console.error('[MOBILE] Error loading admin templates:', error);
    res.status(500).render('error', { 
      message: 'Error loading templates: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// User Management - admin and supervisor
router.get('/admin/users', requireAuth, requireAdminUI, (req, res) => {
  const data = {
    title: 'User Management',
    showBack: true,
    showNav: true,
    activeNav: 'admin'
  };
  renderMobile(res, 'admin/users', data);
});

// Organization Settings - admin only
router.get('/admin/organization', requireAuth, requireAdminOnly, (req, res) => {
  const data = {
    title: 'Organization Settings',
    showBack: true,
    showNav: true,
    activeNav: 'admin'
  };
  renderMobile(res, 'admin/organization', data);
});

// Subscription Management - admin only
router.get('/admin/subscription', requireAuth, requireAdminOnly, (req, res) => {
  const data = {
    title: 'Subscription Management',
    showBack: true,
    showNav: true,
    activeNav: 'admin'
  };
  renderMobile(res, 'admin/subscription', data);
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

/**
 * Template Management Routes
 */

// QR Label Views
router.get('/assets/:id/qr-label',
  requireAuth,
  qrLabelController.viewLabelUI
);

router.get('/qr-labels',
  requireAuth,
  qrLabelController.batchLabelUI
);

router.get('/qr-labels/batch',
  requireAuth,
  qrLabelController.batchLabelUI
);

// Template List
router.get('/templates', requireAuth, async (req, res) => {
  try {
    const { TaskTemplate } = require('../models');
    const organizationId = req.user.organization_id;
    
    console.log('[MOBILE] Loading templates for org:', organizationId);
    
    // Get templates from database
    const templates = await TaskTemplate.query(`
      SELECT 
        tt.id,
        tt.template_name as name,
        tt.is_active as isActive,
        et.type_name as equipmentTypeName,
        et.type_code as equipmentTypeCode,
        et.id as equipmentTypeId,
        COUNT(tts.id) as itemCount
      FROM task_templates tt
      JOIN equipment_types et ON tt.equipment_type_id = et.id
      LEFT JOIN task_template_steps tts ON tt.id = tts.task_template_id
      WHERE tt.organization_id IS NULL OR tt.organization_id = ?
      GROUP BY tt.id, tt.template_name, tt.is_active, et.type_name, et.type_code, et.id
      ORDER BY tt.template_name
    `, [organizationId]);
    
    console.log('[MOBILE] Found templates:', templates.length);
    if (templates.length > 0) {
      console.log('[MOBILE] First template:', templates[0]);
    }
    
    const data = {
      title: 'Templates',
      showBack: false,
      showNav: true,
      activeNav: 'templates',
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        equipmentTypeName: t.equipmentTypeName,
        equipmentTypeCode: t.equipmentTypeCode?.toLowerCase() || '',
        equipmentTypeId: t.equipmentTypeId,
        itemCount: t.itemCount || 0,
        isActive: t.isActive === 1 || t.isActive === true
      }))
    };
    renderMobile(res, 'template-list', data);
  } catch (error) {
    console.error('[MOBILE] Error loading templates:', error);
    res.status(500).render('error', { 
      message: 'Error loading templates: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// New Template
router.get('/templates/new', requireAuth, async (req, res) => {
  try {
    const { EquipmentType } = require('../models');
    
    console.log('[MOBILE] Fetching equipment types for template editor...');
    
    // Get all equipment types from database
    const equipmentTypes = await EquipmentType.query(`
      SELECT et.id, et.type_name as name, et.type_code as code, ec.class_name
      FROM equipment_types et
      JOIN equipment_classes ec ON et.class_id = ec.id
      ORDER BY ec.class_name, et.type_name
    `);
    
    console.log('[MOBILE] Found equipment types:', equipmentTypes.length);
    
    const data = {
      title: 'New Template',
      showBack: true,
      showNav: false,
      activeNav: '',
      template: {
        id: null,
        name: '',
        equipmentTypeId: '',
        version: 1,
        isActive: true
      },
      items: [],
      equipmentTypes: equipmentTypes.map(et => ({
        id: et.id,
        name: et.name,
        class: et.class_name
      })),
      subunits: [],
      maintainableItems: []
    };
    renderMobile(res, 'template-editor', data);
  } catch (error) {
    console.error('[MOBILE] Error loading equipment types:', error);
    res.status(500).send('Error loading equipment types');
  }
});

// Edit Template
router.get('/templates/:id/edit', requireAuth, async (req, res) => {
  try {
    const { TaskTemplate, EquipmentType } = require('../models');
    const templateId = req.params.id;
    
    // Get template details from database
    const [template] = await TaskTemplate.query(`
      SELECT tt.*, et.id as equipment_type_id, et.type_name as equipment_type_name
      FROM task_templates tt
      JOIN equipment_types et ON tt.equipment_type_id = et.id
      WHERE tt.id = ?
    `, [templateId]);
    
    if (!template) {
      return res.status(404).render('error', { message: 'Template not found', error: {} });
    }
    
    // Get template items (steps)
    const items = await TaskTemplate.query(`
      SELECT 
        id,
        step_no as sequence,
        instruction as prompt,
        data_type as type,
        is_required as isRequired
      FROM task_template_steps
      WHERE task_template_id = ?
      ORDER BY step_no
    `, [templateId]);
    
    // Get all equipment types
    const equipmentTypes = await EquipmentType.query(`
      SELECT et.id, et.type_name as name, et.type_code as code, ec.class_name
      FROM equipment_types et
      JOIN equipment_classes ec ON et.class_id = ec.id
      ORDER BY ec.class_name, et.type_name
    `);
    
    const data = {
      title: 'Edit Template',
      showBack: true,
      showNav: false,
      activeNav: '',
      template: {
        id: template.id,
        name: template.template_name,
        equipmentTypeId: template.equipment_type_id,
        isActive: template.is_active === 1 || template.is_active === true
      },
      items: items.map(item => ({
        id: item.id,
        sequence: item.sequence,
        prompt: item.prompt,
        type: item.type || 'pass_fail',
        isRequired: item.isRequired === 1 || item.isRequired === true
      })),
      equipmentTypes: equipmentTypes.map(et => ({
        id: et.id,
        name: et.name,
        class: et.class_name
      })),
      subunits: [],
      maintainableItems: []
    };
    renderMobile(res, 'template-editor', data);
  } catch (error) {
    console.error('[MOBILE] Error loading template for edit:', error);
    res.status(500).render('error', { 
      message: 'Error loading template: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

/**
 * Onboarding Wizard
 */
router.get('/onboarding', requireAuth, (req, res) => {
  // Render standalone wizard (no layout)
  res.render('mobile/onboarding-wizard');
});

// Complete onboarding API
router.post('/api/onboarding/complete', requireAuth, (req, res) => {
  const { facility, assets, activeTemplates } = req.body;
  
  // In production:
  // 1. Create facility
  // 2. Import assets
  // 3. Activate templates
  // 4. Enable scheduler
  
  res.json({ 
    success: true, 
    message: 'Onboarding complete',
    data: {
      facilities: 1,
      assets: assets?.length || 0,
      templates: activeTemplates?.length || 0
    }
  });
});

module.exports = router;
