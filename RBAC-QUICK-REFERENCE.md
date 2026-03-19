# RBAC Quick Reference

## Overview
ODM-CMMS now has Role-Based Access Control with three roles:
- **Admin** - Full system access
- **Supervisor** - Management access (can create/edit but not delete certain items)
- **Operator** - Can only view and work on assigned work orders

---

## Key Rules

### Operators Can:
- ✅ View their own assigned work orders
- ✅ Update status of their own work orders (in_progress, on_hold)
- ✅ Submit inspection readings for their work orders
- ✅ Add notes to their work orders
- ✅ View equipment, facilities, schedules, tasks

### Operators CANNOT:
- ❌ View all work orders (only their own)
- ❌ Create work orders
- ❌ Assign work orders to others
- ❌ Mark work order as "completed" without inspection
- ❌ Delete anything
- ❌ Access admin panel
- ❌ Manage users

### Supervisors Can:
- Everything operators can
- ✅ View ALL work orders
- ✅ Create/edit work orders
- ✅ Assign work orders
- ✅ Create/edit/delete schedules
- ✅ Create/delete users (operators only) in their facility

### Supervisors CANNOT:
- ❌ Delete users
- ❌ Delete work orders
- ❌ Create/update/delete facilities
- ❌ Create/update/delete equipment
- ❌ Create/update/delete task templates

### Admins Can:
- ✅ Everything (full system access)

---

## Frontend Usage

### Hide elements by role:
```html
<!-- Only admins see this -->
<button class="admin-only">Delete</button>

<!-- Admins and supervisors see this -->
<button class="supervisor-only">Edit</button>

<!-- Only operators see this -->
<button class="operator-only">My Tasks Only</button>
```

### Check permission in JavaScript:
```javascript
// Check if user has permission
if (RBAC.hasPermission('WORK_ORDERS', 'CREATE')) {
  // Show create button
}

// Check with ownership
const isMyWorkOrder = workOrder.assigned_to === currentUser.id;
if (RBAC.hasPermission('WORK_ORDERS', 'UPDATE_STATUS', isMyWorkOrder)) {
  // Show status update
}

// Check role
if (RBAC.isAdmin()) { ... }
if (RBAC.isSupervisor()) { ... }
if (RBAC.isOperator()) { ... }
```

---

## Backend Usage

### In Routes:
```javascript
const { requirePermission } = require('../middleware/rbac');

router.post('/', requirePermission('WORK_ORDERS', 'CREATE'), controller.create);
```

### Special middleware for ownership checks:
```javascript
const { canUpdateWorkOrderStatus, canAddWorkOrderNote, canSubmitInspection } = require('../middleware/rbac');

router.put('/:id/status', canUpdateWorkOrderStatus, controller.updateStatus);
router.post('/:id/notes', canAddWorkOrderNote, controller.addNote);
router.post('/readings/:workOrderId', canSubmitInspection, controller.submitReading);
```

---

## API Endpoints

### Get my permissions:
```
GET /api/users/me/permissions
```

Returns your role and all permissions.

---

## Workflow Example

1. **Admin/Supervisor** creates work order → assigns to Operator
2. **Operator** sees work order in "My Tasks"
3. **Operator** starts work → status changes to "in_progress"
4. **Operator** completes inspection → submits readings
5. **Operator** can now mark work order as "completed"
6. **Admin/Supervisor** reviews and closes work order

---

## Files Modified/Created:

- `src/config/permissions.js` - Permission definitions
- `src/middleware/rbac.js` - RBAC middleware
- `public/js/permissions.js` - Frontend permission checking
- `public/js/auth-check.js` - Updated to use RBAC
- `src/routes/work-order.routes.js` - Updated with RBAC
- `src/routes/inspection.routes.js` - Updated with RBAC
- `src/routes/user.routes.js` - Updated with RBAC
- `views/partials/footer.ejs` - Added permissions.js
