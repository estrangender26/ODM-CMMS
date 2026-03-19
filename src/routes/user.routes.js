/**
 * User Routes
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { User, Facility } = require('../models');
const { authenticate, requireAdmin, requireSupervisor } = require('../middleware/auth');
const { requirePermission, canCreateUser, canManageUser, getUserPermissions } = require('../middleware/rbac');

router.use(authenticate);

/**
 * Get current user permissions
 */
router.get('/me/permissions', getUserPermissions);

/**
 * Get all users (with facility info) - admin and supervisor only
 * Admin sees all users, Supervisor sees only their facility's users
 */
router.get('/', requirePermission('USERS', 'VIEW'), async (req, res, next) => {
  try {
    const { role, facility_id, id } = req.user;
    
    console.log('[USERS API] Request from user:', id, 'Role:', role, 'Facility:', facility_id);
    
    let users;
    if (role === 'supervisor' && facility_id) {
      // Supervisor only sees users in their facility
      console.log('[USERS API] Supervisor - fetching users for facility:', facility_id);
      users = await User.getByFacility(facility_id);
      console.log('[USERS API] Found', users.length, 'users in facility');
    } else {
      // Admin sees all users
      console.log('[USERS API] Admin - fetching all users');
      users = await User.getAllWithFacility();
      console.log('[USERS API] Found', users.length, 'total users');
    }
    
    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get users in my facility (for supervisors to assign work orders)
 * Returns active operators in the supervisor's facility
 */
router.get('/facility/operators', requireSupervisor, async (req, res, next) => {
  try {
    const { facility_id } = req.user;
    
    if (!facility_id) {
      return res.status(400).json({
        success: false,
        message: 'You are not assigned to a facility'
      });
    }
    
    const operators = await User.getActiveOperatorsByFacility(facility_id);
    
    res.json({
      success: true,
      data: { users: operators }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get user by ID - users can view their own, admins/supervisors can view users in their facility
 */
router.get('/:id', canManageUser, async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create new user (admin and supervisor)
 * Admin can create any user in any facility
 * Supervisor can only create operators in their facility
 */
router.post('/', requirePermission('USERS', 'CREATE'), canCreateUser, async (req, res, next) => {
  try {
    const { username, email, password, full_name, role, facility_id } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username, email and password are required'
      });
    }
    
    // Check if username exists
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Username already exists'
      });
    }
    
    // Hash password
    const password_hash = await bcrypt.hash(password, 10);
    
    const user = await User.create({
      username,
      email,
      password_hash,
      full_name,
      role: role || 'operator',
      facility_id: facility_id || null,
      is_active: true
    });
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update user (admin and supervisor)
 * Admin can update any user
 * Supervisor can only update users in their facility
 */
router.put('/:id', canManageUser, async (req, res, next) => {
  try {
    const { username, email, full_name, role, facility_id, is_active, password } = req.body;
    const id = parseInt(req.params.id);
    const currentUserId = req.user.id;
    const currentUserRole = req.user.role;
    
    // Prevent users from changing their own role or active status
    if (id === currentUserId) {
      if (role && role !== currentUserRole) {
        return res.status(403).json({
          success: false,
          message: 'Cannot change your own role'
        });
      }
      if (is_active === false) {
        return res.status(403).json({
          success: false,
          message: 'Cannot deactivate your own account'
        });
      }
    }
    
    const updateData = {
      username,
      email,
      full_name,
      role,
      facility_id: facility_id ? parseInt(facility_id) : null,
      is_active: is_active !== undefined ? is_active : true
    };
    
    // If password provided, hash it
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }
    
    const user = await User.update(id, updateData);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete user (admin only)
 * Only admins can delete users
 */
router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id;
    
    // Prevent deleting self
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }
    
    await User.delete(id);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
