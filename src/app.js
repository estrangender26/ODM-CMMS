/**
 * ODM-CMMS Application
 * Main Express application setup
 */

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const expressLayouts = require('express-ejs-layouts');
require('dotenv').config();

const routes = require('./routes');
const { errorHandler, notFound } = require('./middleware/error-handler');
const { testConnection } = require('./config/database');
const { optionalAuth } = require('./middleware/auth');

const app = express();

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Layouts setup
app.use(expressLayouts);
app.set('layout', false); // Disable default layout

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// CORS - Allow all origins in development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Request logger
app.use((req, res, next) => {
  if (req.originalUrl !== '/favicon.ico') {
    console.log('[REQ]', req.method, req.originalUrl);
  }
  next();
});

// API routes
app.use('/api', routes);
console.log('[APP] Routes mounted at /api');

// Mobile UI routes (separate from API)
app.use('/mobile', require('./routes/mobile.routes'));

// Web routes - apply optional auth to set req.user
app.use(optionalAuth);

// Web routes (render views)
app.get('/', (req, res) => {
  res.render('index', { 
    title: 'ODM-CMMS',
    user: req.user 
  });
});

app.get('/login', (req, res) => {
  res.render('login', { 
    title: 'Login - ODM-CMMS',
    error: null 
  });
});

app.get('/signup', (req, res) => {
  res.render('signup', { 
    title: 'Sign Up - ODM-CMMS',
    error: null 
  });
});

app.get('/dashboard', (req, res) => {
  res.render('dashboard', { 
    title: 'Dashboard - ODM-CMMS',
    user: req.user 
  });
});

app.get('/work-orders', (req, res) => {
  res.render('work-orders', { 
    title: 'Work Orders - ODM-CMMS',
    user: req.user 
  });
});

app.get('/work-orders/:id', (req, res) => {
  res.render('work-order-detail', { 
    title: 'Work Order Detail - ODM-CMMS',
    user: req.user,
    workOrderId: req.params.id
  });
});

app.get('/equipment', (req, res) => {
  res.render('equipment', { 
    title: 'Equipment - ODM-CMMS',
    user: req.user 
  });
});

app.get('/profile', (req, res) => {
  res.render('profile', { 
    title: 'My Profile - ODM-CMMS',
    user: req.user 
  });
});

app.get('/inspection/:workOrderId', (req, res) => {
  res.render('inspection', { 
    title: 'Inspection - ODM-CMMS',
    user: req.user,
    workOrderId: req.params.workOrderId
  });
});

// Admin route protection middleware
const requireAdminWeb = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'supervisor')) {
    return res.redirect('/dashboard');
  }
  next();
};

// Admin routes
app.get('/admin', requireAdminWeb, (req, res) => {
  res.render('admin/dashboard', { 
    title: 'Admin Dashboard - ODM-CMMS',
    user: req.user 
  });
});

app.get('/admin/equipment', requireAdminWeb, (req, res) => {
  res.render('admin/equipment', { 
    title: 'Manage Equipment - ODM-CMMS',
    user: req.user 
  });
});

app.get('/admin/tasks', requireAdminWeb, (req, res) => {
  res.render('admin/tasks', { 
    title: 'Manage Tasks - ODM-CMMS',
    user: req.user 
  });
});

app.get('/admin/schedules', requireAdminWeb, (req, res) => {
  res.render('admin/schedules', { 
    title: 'Manage Schedules - ODM-CMMS',
    user: req.user 
  });
});

app.get('/admin/reports', requireAdminWeb, (req, res) => {
  res.render('admin/reports', { 
    title: 'Reports - ODM-CMMS',
    user: req.user 
  });
});

app.get('/admin/facilities', requireAdminWeb, (req, res) => {
  res.render('admin/facilities', { 
    title: 'Manage Facilities - ODM-CMMS',
    user: req.user 
  });
});

app.get('/admin/users', requireAdminWeb, (req, res) => {
  res.render('admin/users', { 
    title: 'Manage Users - ODM-CMMS',
    user: req.user 
  });
});

// Favicon handler - prevents 404 errors from browser requests
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Error handling
app.use(notFound);
app.use(errorHandler);

// Initialize database connection
testConnection();

module.exports = app;
