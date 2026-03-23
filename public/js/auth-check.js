/**
 * Client-side auth check using RBAC
 */

(function() {
  function checkAuth() {
    // Get role from body data attribute set by server
    const bodyRole = document.body.getAttribute('data-user-role');
    const role = bodyRole || (RBAC ? RBAC.getUserRole() : null);
    
    if (!role) {
      console.log('[AUTH-CHECK] No role found');
      return;
    }
    
    console.log('[AUTH-CHECK] Role:', role);
    
    // Apply RBAC rules
    if (typeof RBAC !== 'undefined' && RBAC) {
      RBAC.applyRBAC();
    }
    
    // For operators, hide admin elements
    if (role === 'operator') {
      console.log('[AUTH-CHECK] Hiding admin elements for operator');
      
      // Hide admin navigation items completely
      const adminNavItems = document.querySelectorAll('a[href^="/admin"]');
      adminNavItems.forEach(item => {
        item.style.display = 'none';
      });
      
      // Hide admin-only class elements
      document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = 'none';
      });
      
      // Hide supervisor-only class elements for operators
      document.querySelectorAll('.supervisor-only').forEach(el => {
        el.style.display = 'none';
      });
    }
  }
  
  // Run when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAuth);
  } else {
    checkAuth();
  }
  
  // Also run on pageshow (handles back/forward navigation)
  window.addEventListener('pageshow', checkAuth);
})();
