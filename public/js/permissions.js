/**
 * Role-Based Access Control (RBAC) - Frontend
 * 
 * Permission levels:
 * - 'all' - Can perform action on any record
 * - 'own' - Can only perform action on own records
 * - 'none' - Cannot perform action
 */

// Permission matrix (mirrors backend configuration)
const PERMISSIONS = {
  USERS: {
    VIEW: { admin: 'all', supervisor: 'all', operator: 'none' },
    CREATE: { admin: 'all', supervisor: 'none', operator: 'none' },
    UPDATE: { admin: 'all', supervisor: 'own', operator: 'own' },
    DELETE: { admin: 'all', supervisor: 'none', operator: 'none' },
    ASSIGN_FACILITY: { admin: 'all', supervisor: 'none', operator: 'none' }
  },
  WORK_ORDERS: {
    VIEW_ALL: { admin: 'all', supervisor: 'all', operator: 'none' },
    VIEW_OWN: { admin: 'all', supervisor: 'all', operator: 'all' },
    CREATE: { admin: 'all', supervisor: 'all', operator: 'none' },
    UPDATE: { admin: 'all', supervisor: 'all', operator: 'none' },
    DELETE: { admin: 'all', supervisor: 'none', operator: 'none' },
    ASSIGN: { admin: 'all', supervisor: 'all', operator: 'none' },
    UPDATE_STATUS: { admin: 'all', supervisor: 'all', operator: 'own' },
    ADD_NOTES: { admin: 'all', supervisor: 'all', operator: 'own' }
  },
  INSPECTIONS: {
    VIEW: { admin: 'all', supervisor: 'all', operator: 'all' },
    SUBMIT_READINGS: { admin: 'all', supervisor: 'all', operator: 'own' },
    MANAGE_POINTS: { admin: 'all', supervisor: 'all', operator: 'none' },
    EDIT_READINGS: { admin: 'all', supervisor: 'all', operator: 'none' }
  },
  EQUIPMENT: {
    VIEW: { admin: 'all', supervisor: 'all', operator: 'all' },
    CREATE: { admin: 'all', supervisor: 'none', operator: 'none' },
    UPDATE: { admin: 'all', supervisor: 'none', operator: 'none' },
    DELETE: { admin: 'all', supervisor: 'none', operator: 'none' }
  },
  FACILITIES: {
    VIEW: { admin: 'all', supervisor: 'all', operator: 'all' },
    CREATE: { admin: 'all', supervisor: 'none', operator: 'none' },
    UPDATE: { admin: 'all', supervisor: 'none', operator: 'none' },
    DELETE: { admin: 'all', supervisor: 'none', operator: 'none' }
  },
  SCHEDULES: {
    VIEW: { admin: 'all', supervisor: 'all', operator: 'all' },
    CREATE: { admin: 'all', supervisor: 'all', operator: 'none' },
    UPDATE: { admin: 'all', supervisor: 'all', operator: 'none' },
    DELETE: { admin: 'all', supervisor: 'none', operator: 'none' }
  },
  TASKS: {
    VIEW: { admin: 'all', supervisor: 'all', operator: 'all' },
    CREATE: { admin: 'all', supervisor: 'none', operator: 'none' },
    UPDATE: { admin: 'all', supervisor: 'none', operator: 'none' },
    DELETE: { admin: 'all', supervisor: 'none', operator: 'none' }
  },
  REPORTS: {
    VIEW: { admin: 'all', supervisor: 'all', operator: 'all' },
    EXPORT: { admin: 'all', supervisor: 'all', operator: 'none' }
  }
};

// Cache for user permissions fetched from server
let cachedPermissions = null;
let userRole = null;

/**
 * Get current user's role
 * @returns {string|null}
 */
function getUserRole() {
  if (userRole) return userRole;
  
  // Try to get from body data attribute (server-rendered)
  const bodyRole = document.body.getAttribute('data-user-role');
  if (bodyRole) {
    userRole = bodyRole;
    return userRole;
  }
  
  // Try localStorage
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      userRole = user.role;
      return userRole;
    } catch (e) {
      console.error('Error parsing user:', e);
    }
  }
  
  return null;
}

/**
 * Check permission level for a resource/action
 * @param {string} resource - Resource name (e.g., 'WORK_ORDERS')
 * @param {string} action - Action name (e.g., 'CREATE')
 * @returns {string} - 'all', 'own', or 'none'
 */
function checkPermission(resource, action) {
  const role = getUserRole();
  if (!role) return 'none';
  
  if (!PERMISSIONS[resource] || !PERMISSIONS[resource][action]) {
    return 'none';
  }
  
  return PERMISSIONS[resource][action][role] || 'none';
}

/**
 * Check if user has permission
 * @param {string} resource - Resource name
 * @param {string} action - Action name
 * @param {boolean} isOwn - Whether the resource belongs to the user
 * @returns {boolean}
 */
function hasPermission(resource, action, isOwn = false) {
  const level = checkPermission(resource, action);
  
  if (level === 'all') return true;
  if (level === 'own' && isOwn) return true;
  
  return false;
}

/**
 * Check if user is admin
 * @returns {boolean}
 */
function isAdmin() {
  return getUserRole() === 'admin';
}

/**
 * Check if user is supervisor or admin
 * @returns {boolean}
 */
function isSupervisor() {
  const role = getUserRole();
  return role === 'admin' || role === 'supervisor';
}

/**
 * Check if user is operator
 * @returns {boolean}
 */
function isOperator() {
  return getUserRole() === 'operator';
}

/**
 * Show/hide elements based on permission
 * @param {string} selector - CSS selector
 * @param {string} resource - Resource name
 * @param {string} action - Action name
 * @param {boolean} isOwn - Whether resource belongs to user
 */
function showIfPermitted(selector, resource, action, isOwn = false) {
  const elements = document.querySelectorAll(selector);
  const permitted = hasPermission(resource, action, isOwn);
  
  elements.forEach(el => {
    el.style.display = permitted ? '' : 'none';
  });
}

/**
 * Disable elements based on permission
 * @param {string} selector - CSS selector
 * @param {string} resource - Resource name
 * @param {string} action - Action name
 * @param {boolean} isOwn - Whether resource belongs to user
 */
function disableIfNotPermitted(selector, resource, action, isOwn = false) {
  const elements = document.querySelectorAll(selector);
  const permitted = hasPermission(resource, action, isOwn);
  
  elements.forEach(el => {
    if (!permitted) {
      el.disabled = true;
      el.classList.add('disabled');
      el.title = 'You do not have permission to perform this action';
    }
  });
}

/**
 * Apply RBAC to the page - hide/show elements based on role
 */
function applyRBAC() {
  const role = getUserRole();
  if (!role) return;
  
  // Hide admin-only elements for non-admins
  if (!isAdmin()) {
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = 'none';
    });
  }
  
  // Hide supervisor+admin elements from operators
  if (isOperator()) {
    document.querySelectorAll('.supervisor-only').forEach(el => {
      el.style.display = 'none';
    });
  }
  
  // Show operator-only elements
  if (!isOperator()) {
    document.querySelectorAll('.operator-only').forEach(el => {
      el.style.display = 'none';
    });
  }
}

/**
 * Fetch user permissions from server
 * @returns {Promise<Object>}
 */
async function fetchUserPermissions() {
  if (cachedPermissions) return cachedPermissions;
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/users/me/permissions', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        cachedPermissions = data.data.permissions;
        return cachedPermissions;
      }
    }
  } catch (error) {
    console.error('Error fetching permissions:', error);
  }
  
  return null;
}

/**
 * Clear cached permissions (call on logout)
 */
function clearPermissionsCache() {
  cachedPermissions = null;
  userRole = null;
}

// Apply RBAC on page load
document.addEventListener('DOMContentLoaded', applyRBAC);

// Export functions for use in other scripts
window.RBAC = {
  getUserRole,
  checkPermission,
  hasPermission,
  isAdmin,
  isSupervisor,
  isOperator,
  showIfPermitted,
  disableIfNotPermitted,
  fetchUserPermissions,
  clearPermissionsCache
};
