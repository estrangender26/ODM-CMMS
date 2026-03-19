# Role-Based Access Control (RBAC) Documentation

## Overview

ODM-CMMS implements a role-based access control system with three user roles:
- **Admin** - Full system access
- **Supervisor** - Management access with some limitations
- **Operator** - Limited access to own assignments only

---

## Role Permissions Matrix

### User Management

| Action | Admin | Supervisor | Operator |
|--------|-------|------------|----------|
| View All Users | ✅ | ✅ (facility only) | ❌ |
| Create User | ✅ | ✅ (operators only) | ❌ |
| Update Any User | ✅ | ❌ | ❌ |
| Update Own Profile | ✅ | ✅ | ✅ |
| Delete User | ✅ | ❌ | ❌ |
| Assign Facility | ✅ | ❌ | ❌ |

### Work Orders

| Action | Admin | Supervisor | Operator |
|--------|-------|------------|----------|
| View All Work Orders | ✅ | ✅ | ❌ |
| View Own Work Orders | ✅ | ✅ | ✅ |
| Create Work Order | ✅ | ✅ | ❌ |
| Update Work Order | ✅ | ✅ | ❌ |
| Delete Work Order | ✅ | ❌ | ❌ |
| Assign Work Order | ✅ | ✅ | ❌ |
| Update Status (Any) | ✅ | ✅ | ❌ |
| Update Status (Own) | ✅ | ✅ | ✅ |
| Add Notes (Any) | ✅ | ✅ | ❌ |
| Add Notes (Own) | ✅ | ✅ | ✅ |

**Note:** To mark a work order as "completed", the inspection must be completed first.

### Inspections

| Action | Admin | Supervisor | Operator |
|--------|-------|------------|----------|
| View Inspection Points | ✅ | ✅ | ✅ |
| View Readings | ✅ | ✅ | ✅ |
| Submit Readings (Any) | ✅ | ✅ | ❌ |
| Submit Readings (Own WO) | ✅ | ✅ | ✅ |
| Manage Inspection Points | ✅ | ✅ | ❌ |
| Edit Readings | ✅ | ✅ | ❌ |

### Equipment

| Action | Admin | Supervisor | Operator |
|--------|-------|------------|----------|
| View Equipment | ✅ | ✅ | ✅ |
| Create Equipment | ✅ | ❌ | ❌ |
| Update Equipment | ✅ | ❌ | ❌ |
| Delete Equipment | ✅ | ❌ | ❌ |

### Facilities

| Action | Admin | Supervisor | Operator |
|--------|-------|------------|----------|
| View Facilities | ✅ | ✅ | ✅ |
| Create Facility | ✅ | ❌ | ❌ |
| Update Facility | ✅ | ❌ | ❌ |
| Delete Facility | ✅ | ❌ | ❌ |

### Schedules

| Action | Admin | Supervisor | Operator |
|--------|-------|------------|----------|
| View Schedules | ✅ | ✅ | ✅ |
| Create Schedule | ✅ | ✅ | ❌ |
| Update Schedule | ✅ | ✅ | ❌ |
| Delete Schedule | ✅ | ✅ | ❌ |

### Tasks (Task Master)

| Action | Admin | Supervisor | Operator |
|--------|-------|------------|----------|
| View Tasks | ✅ | ✅ | ✅ |
| Create Task | ✅ | ❌ | ❌ |
| Update Task | ✅ | ❌ | ❌ |
| Delete Task | ✅ | ❌ | ❌ |

### Reports

| Action | Admin | Supervisor | Operator |
|--------|-------|------------|----------|
| View Reports | ✅ | ✅ (facility only) | ✅ (facility only) |
| Export Reports | ✅ | ✅ | ❌ |

---

## API Endpoints for Permissions

### Get Current User Permissions
```
GET /api/users/me/permissions
```

Response:
```json
{
  "success": true,
  "data": {
    "role": "operator",
    "permissions": {
      "USERS": {
        "VIEW": "none",
        "CREATE": "none",
        "UPDATE": "own",
        "DELETE": "none"
      },
      "WORK_ORDERS": {
        "VIEW_ALL": "none",
        "VIEW_OWN": "all",
        "CREATE": "none",
        "UPDATE_STATUS": "own"
      }
      // ... other permissions
    }
  }
}
```

---

## Frontend Permission Checking

### Using the global permission helper:

```javascript
// Check if user has permission
if (hasPermission('WORK_ORDERS', 'CREATE')) {
  // Show create button
}

// Check with ownership
if (hasPermission('WORK_ORDERS', 'UPDATE_STATUS', workOrder.assigned_to === currentUser.id)) {
  // Show status update button
}
```

### Hide/Show elements based on role:

```javascript
// In your page scripts
document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  
  // Hide admin-only elements
  if (user.role !== 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
  }
  
  // Hide supervisor+admin elements from operators
  if (user.role === 'operator') {
    document.querySelectorAll('.supervisor-only').forEach(el => el.style.display = 'none');
  }
});
```

---

## Middleware Usage

### In Routes:

```javascript
const { requirePermission } = require('../middleware/rbac');

// Require specific permission
router.post('/', requirePermission('WORK_ORDERS', 'CREATE'), controller.create);

// Custom ownership check
router.put('/:id/status', 
  requirePermission('WORK_ORDERS', 'UPDATE_STATUS', (req) => {
    // Check if work order is assigned to current user
    return req.workOrder?.assigned_to === req.user.id;
  }), 
  controller.updateStatus
);
```

### Predefined Middleware:

```javascript
const { 
  canUpdateWorkOrderStatus, 
  canAddWorkOrderNote, 
  canSubmitInspection 
} = require('../middleware/rbac');

router.put('/:id/status', canUpdateWorkOrderStatus, controller.updateStatus);
router.post('/:id/notes', canAddWorkOrderNote, controller.addNote);
router.post('/readings/:workOrderId', canSubmitInspection, controller.submitReading);
```

---

## Configuration

Permissions are defined in `src/config/permissions.js`:

```javascript
PERMISSIONS = {
  RESOURCE_NAME: {
    ACTION: {
      admin: 'all' | 'own' | 'none',
      supervisor: 'all' | 'own' | 'none',
      operator: 'all' | 'own' | 'none'
    }
  }
}
```

- `'all'` - Can perform action on any record
- `'own'` - Can only perform action on own records
- `'none'` - Cannot perform action
