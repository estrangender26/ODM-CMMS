# ODM-CMMS Multi-Tenant Migration Guide

## Overview

This guide documents the Phase 1 implementation of multi-tenant architecture for ODM-CMMS. Each subscriber (organization) has complete data isolation using `organization_id` foreign keys.

## Architecture Summary

- **Single Database**: All tenants share one database
- **Row-Level Isolation**: Each record has an `organization_id` column
- **Tenant Resolution**: JWT token includes `organizationId`, middleware resolves tenant context
- **Subscription Ready**: Organizations table includes plan/status fields for future billing integration

## Files Created/Modified

### 1. Database Migrations

| File | Purpose |
|------|---------|
| `database/migrations/001_add_multitenant_support.sql` | Creates organizations table, adds organization_id to all tables |
| `database/migrations/002_migrate_existing_data.sql` | Creates default org, migrates existing data, adds FK constraints |
| `database/migrations/run-multitenant-migration.js` | Migration runner script |

### 2. New Models

| File | Purpose |
|------|---------|
| `src/models/organization.model.js` | Organization CRUD, subscription management, limit checking |

### 3. Updated Models (Organization-Aware)

| File | Changes |
|------|---------|
| `src/models/user.model.js` | All methods now accept organizationId parameter |
| `src/models/facility.model.js` | All queries filtered by organization_id |
| `src/models/equipment.model.js` | All queries filtered by organization_id |
| `src/models/work-order.model.js` | All queries filtered by organization_id |
| `src/models/schedule.model.js` | All queries filtered by organization_id |
| `src/models/task.model.js` | All queries filtered by organization_id |
| `src/models/inspection.model.js` | All queries filtered by organization_id |
| `src/models/index.js` | Added Organization export |

### 4. New Middleware

| File | Purpose |
|------|---------|
| `src/middleware/tenant.js` | `resolveOrganization`, `requireOrganizationAdmin`, `checkOrganizationLimit` |

### 5. Updated Controllers (Organization-Aware)

| File | Changes |
|------|---------|
| `src/controllers/auth.controller.js` | JWT includes organizationId, login returns organization_id |
| `src/controllers/equipment.controller.js` | All methods use req.user.organization_id |
| `src/controllers/work-order.controller.js` | All methods use req.user.organization_id |
| `src/controllers/facility.controller.js` | All methods use req.user.organization_id |
| `src/controllers/schedule.controller.js` | All methods use req.user.organization_id |
| `src/controllers/task.controller.js` | All methods use req.user.organization_id |
| `src/controllers/inspection.controller.js` | All methods use req.user.organization_id |
| `src/controllers/report.controller.js` | All queries include organization_id filter |

## Migration Steps

### Step 1: Backup Your Database

```bash
# MySQL backup
mysqldump -u root -p odm_cmms > odm_cmms_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Run the Migration

```bash
# From project root
node database/migrations/run-multitenant-migration.js
```

This will:
1. Create the `organizations` table
2. Add `organization_id` columns to all existing tables
3. Create a default organization (ID: 1)
4. Assign all existing data to the default organization
5. Add foreign key constraints
6. Create new tables (smp_families, smp_tasks, notifications, dashboard_widgets, uploaded_files)

### Step 3: Verify Migration

```sql
-- Check organizations
SELECT * FROM organizations;

-- Check users have organization_id
SELECT id, username, organization_id FROM users LIMIT 5;

-- Check equipment count by organization
SELECT organization_id, COUNT(*) as count FROM equipment GROUP BY organization_id;
```

### Step 4: Restart Application

```bash
npm start
# or
npm run dev
```

## JWT Token Structure

After login, the JWT token contains:

```json
{
  "userId": 25,
  "organizationId": 1,
  "role": "admin",
  "isOrgAdmin": true,
  "iat": 1234567890,
  "exp": 1234571490
}
```

## Login Response

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 25,
      "username": "admin",
      "organization_id": 1,
      "role": "admin",
      ...
    },
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "organization_id": 1
  }
}
```

## API Routes

All existing routes remain unchanged. They are now organization-aware:

| Route | Description |
|-------|-------------|
| `POST /api/auth/login` | Returns organization_id in response |
| `GET /api/equipment` | Returns equipment for user's organization only |
| `GET /api/work-orders` | Returns work orders for user's organization only |
| `GET /api/facilities` | Returns facilities for user's organization only |
| `GET /api/schedules` | Returns schedules for user's organization only |
| `GET /api/tasks` | Returns task templates for user's organization only |

## Database Schema Changes

### New Table: organizations

```sql
CREATE TABLE organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organization_name VARCHAR(255) NOT NULL,
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_status VARCHAR(50) DEFAULT 'active',
    billing_email VARCHAR(100),
    billing_address TEXT,
    max_users INT DEFAULT 10,
    max_facilities INT DEFAULT 5,
    max_equipment INT DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Modified Tables (organization_id added)

- `users`
- `facilities`
- `equipment`
- `task_master`
- `schedules`
- `work_orders`
- `work_order_notes`
- `inspection_points`
- `inspection_readings`
- `attachments`
- `audit_log`

### New Tables

- `smp_families` - SMP family templates
- `smp_tasks` - SMP task templates
- `notifications` - User notifications
- `dashboard_widgets` - Dashboard customization
- `uploaded_files` - File uploads

## Future Enhancements (Phase 2+)

### QR Code Support
- Add `qr_code` column to equipment table
- Generate QR codes linking to equipment detail page
- Scan QR to quickly access equipment

### Subscription Billing
- Integrate with Stripe/PayPal
- Webhook handlers for subscription events
- Automatic plan enforcement

### Organization Admin Features
- Organization settings page
- User invitation system (replace self-registration)
- Billing management

### Multi-Facility Support
- Already supported in schema
- Facility switching in UI
- Cross-facility reporting

## Rollback Plan

If you need to rollback:

```sql
-- Drop foreign keys first
ALTER TABLE users DROP FOREIGN KEY fk_users_organization;
-- ... repeat for all tables

-- Drop organization_id columns
ALTER TABLE users DROP COLUMN organization_id;
-- ... repeat for all tables

-- Drop organizations table
DROP TABLE organizations;

-- Drop new tables if needed
DROP TABLE IF EXISTS smp_families;
DROP TABLE IF EXISTS smp_tasks;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS dashboard_widgets;
DROP TABLE IF EXISTS uploaded_files;
```

## Troubleshooting

### Issue: Migration fails with foreign key error
**Solution**: Ensure all existing data is valid before migration. Check for orphaned records.

### Issue: Users can't see data after migration
**Solution**: Verify users have `organization_id` set. Check JWT token contains correct organizationId.

### Issue: "Organization is not active" error
**Solution**: Check `subscription_status` in organizations table is set to 'active'.

## Support

For issues or questions:
1. Check application logs
2. Verify database schema matches migration
3. Ensure all models are importing from updated index.js

---

**Migration Version**: 1.0.0  
**Last Updated**: 2026-03-30  
**Compatible With**: ODM-CMMS v2.0.0+
