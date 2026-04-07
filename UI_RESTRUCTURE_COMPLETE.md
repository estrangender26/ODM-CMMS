# ODM UI Restructure - COMPLETE

## Summary

Successfully restructured ODM UI into two clear layers:
1. **PLATFORM UI** - SaaS/multi-tenant screens (auth, signup, billing)
2. **ODM APP UI** - Mobile-first daily workflow (/mobile/*)

---

## Changes Made

### 1. Login Redirects Updated

| File | Change |
|------|--------|
| `views/login.ejs` | Redirect changed from `/dashboard` → `/mobile/home` |
| `views/signup.ejs` | Redirect changed from `/dashboard` → `/mobile/home` |

### 2. Old ODM Routes Redirect to Mobile

| Old Route | Redirects To |
|-----------|--------------|
| `/dashboard` | `/mobile/dashboard` |
| `/work-orders` | `/mobile/work-orders` |
| `/work-orders/:id` | `/mobile/work-orders/:id` |
| `/equipment` | `/mobile/equipment` |
| `/profile` | `/mobile/profile` |
| `/inspection/:workOrderId` | `/mobile/inspection/:workOrderId` |
| `/admin` | `/mobile/admin` |
| `/admin/equipment` | `/mobile/admin/assets` |
| `/admin/tasks` | `/mobile/admin/templates` |
| `/admin/schedules` | `/mobile/calendar` |
| `/admin/reports` | `/mobile/dashboard` |
| `/admin/facilities` | `/mobile/admin/facilities` |
| `/admin/users` | `/mobile/admin` |

### 3. Archived Views

All old ODM duplicate views moved to `/archive/views/`:

```
archive/views/
├── dashboard.ejs
├── equipment.ejs
├── inspection.ejs
├── profile.ejs
├── work-order-detail.ejs
├── work-orders.ejs
└── admin/
    ├── dashboard.ejs
    ├── equipment.ejs
    ├── facilities.ejs
    ├── reports.ejs
    ├── schedules.ejs
    ├── tasks.ejs
    └── users.ejs
```

### 4. Platform UI Kept Active

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/login` | Main login screen |
| `/signup` | Account creation with org signup |
| `/api/auth/*` | Authentication APIs |
| `/api/organizations/*` | Organization management |
| `/api/subscriptions/*` | Subscription/billing |
| `/api/invitations/*` | User invitations |

### 5. ODM App UI (Mobile) Kept Active

All `/mobile/*` routes remain active:
- `/mobile/home` - Operator home
- `/mobile/work-orders` - Work order list
- `/mobile/inspection/:id` - Inspection execution
- `/mobile/equipment` - Equipment list
- `/mobile/calendar` - Scheduler
- `/mobile/dashboard` - Reports
- `/mobile/admin` - Admin hub
- `/mobile/qr-labels` - QR printing
- `/mobile/onboarding` - Setup wizard

---

## File Structure After Restructure

```
views/
├── index.ejs              # PLATFORM: Landing page
├── login.ejs              # PLATFORM: Login (redirects to /mobile/home)
├── signup.ejs             # PLATFORM: Signup (redirects to /mobile/home)
├── error.ejs              # SHARED: Error page
├── partials/              # SHARED: Header, footer, nav
│   ├── header.ejs
│   ├── footer.ejs
│   ├── mobile-header.ejs
│   └── mobile-bottom-nav.ejs
└── mobile/                # ODM APP: Mobile-first UI
    ├── layout.ejs
    ├── home.ejs
    ├── work-orders.ejs
    ├── work-order-detail.ejs
    ├── inspection.ejs
    ├── equipment-list.ejs
    ├── calendar.ejs
    ├── profile.ejs
    ├── qr-labels-batch.ejs
    ├── onboarding-wizard.ejs
    ├── admin/
    │   ├── index.ejs
    │   ├── facilities.ejs
    │   ├── assets.ejs
    │   └── templates.ejs
    └── dashboard/
        ├── index.ejs
        ├── work-orders.ejs
        └── findings.ejs

archive/
└── views/                 # ARCHIVED: Old desktop UI
    ├── dashboard.ejs
    ├── work-orders.ejs
    ├── ...
    └── admin/
        ├── dashboard.ejs
        └── ...
```

---

## Testing Checklist

### Platform UI (Should Work)
- [ ] `/login` - Displays login form
- [ ] `/signup` - Displays signup form
- [ ] `/api/auth/login` - Returns JWT token
- [ ] Login redirects to `/mobile/home`

### ODM App UI (Should Work)
- [ ] `/mobile/home` - Operator dashboard
- [ ] `/mobile/work-orders` - WO list
- [ ] `/mobile/inspection/WO-2026-0042` - Inspection form
- [ ] `/mobile/equipment` - Equipment list
- [ ] `/mobile/calendar` - Scheduler
- [ ] `/mobile/dashboard` - Reports
- [ ] `/mobile/admin` - Admin hub

### Redirects (Should Redirect)
- [ ] `/dashboard` → `/mobile/dashboard`
- [ ] `/work-orders` → `/mobile/work-orders`
- [ ] `/equipment` → `/mobile/equipment`
- [ ] `/admin` → `/mobile/admin`

---

## Notes

1. **No files deleted** - All old views archived safely
2. **Mobile-first preserved** - All `/mobile/*` routes unchanged
3. **Platform auth preserved** - Login/signup/org creation intact
4. **Single login** - `/login` is the main entry point for all users
5. **Consistent redirect** - All auth flows redirect to `/mobile/home`

## Rollback

To restore old desktop UI:
```bash
# Restore views
mv archive/views/dashboard.ejs views/
mv archive/views/work-orders.ejs views/
# ... etc

# Restore routes (revert app.js changes)
# See git history for original app.js
```
