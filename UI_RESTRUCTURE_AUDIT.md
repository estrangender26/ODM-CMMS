# ODM UI Restructure Audit Report

## Classification Legend
- **PLATFORM UI**: SaaS/multi-tenant screens (KEEP)
- **ODM DUPLICATE UI**: Old desktop ODM screens that duplicate mobile (REDIRECT → /mobile/*)
- **SHARED AUTH**: Common auth dependencies (KEEP CAREFULLY)
- **ODM APP UI**: Mobile-first daily workflow (KEEP - Current)

---

## PHASE 1: ROUTE AUDIT

### PLATFORM UI (KEEP ACTIVE)

| Route Path | File | Classification | Action | Notes |
|------------|------|----------------|--------|-------|
| `GET /` | src/app.js | PLATFORM UI | KEEP | Landing page - redirect to /login if not auth |
| `GET /login` | src/app.js | PLATFORM UI | KEEP | Main login screen |
| `GET /signup` | src/app.js | PLATFORM UI | KEEP | Account creation with org signup |
| `POST /api/auth/login` | src/routes/auth.routes.js | PLATFORM UI | KEEP | Login API |
| `POST /api/auth/signup` | src/routes/auth.routes.js | PLATFORM UI | KEEP | Signup API |
| `POST /api/auth/organization-signup` | src/routes/auth.routes.js | PLATFORM UI | KEEP | Create org + user |
| `POST /api/auth/logout` | src/routes/auth.routes.js | PLATFORM UI | KEEP | Logout API |
| `POST /api/auth/change-password` | src/routes/auth.routes.js | PLATFORM UI | KEEP | Password change |
| `GET /api/auth/profile` | src/routes/auth.routes.js | PLATFORM UI | KEEP | User profile |
| `PUT /api/auth/profile` | src/routes/auth.routes.js | PLATFORM UI | KEEP | Update profile |

### ORGANIZATION & BILLING (PLATFORM UI - KEEP)

| Route Path | File | Classification | Action | Notes |
|------------|------|----------------|--------|-------|
| `GET /api/organizations` | src/routes/organization.routes.js | PLATFORM UI | KEEP | Org management |
| `POST /api/organizations` | src/routes/organization.routes.js | PLATFORM UI | KEEP | Create org |
| `GET /api/organizations/:id` | src/routes/organization.routes.js | PLATFORM UI | KEEP | Org details |
| `PUT /api/organizations/:id` | src/routes/organization.routes.js | PLATFORM UI | KEEP | Update org |
| `GET /api/subscriptions` | src/routes/subscription.routes.js | PLATFORM UI | KEEP | Subscription mgmt |
| `GET /api/subscriptions/plans` | src/routes/subscription.routes.js | PLATFORM UI | KEEP | Available plans |
| `POST /api/subscriptions` | src/routes/subscription.routes.js | PLATFORM UI | KEEP | Subscribe |
| `GET /api/invitations` | src/routes/invitation.routes.js | PLATFORM UI | KEEP | Invite users |
| `POST /api/invitations` | src/routes/invitation.routes.js | PLATFORM UI | KEEP | Send invites |
| `POST /api/invitations/accept` | src/routes/invitation.routes.js | PLATFORM UI | KEEP | Accept invite |

### ODM DUPLICATE UI (REDIRECT TO MOBILE)

| Route Path | File | Classification | Action | Redirect To |
|------------|------|----------------|--------|-------------|
| `GET /dashboard` | src/app.js | ODM DUPLICATE | REDIRECT | /mobile/dashboard |
| `GET /work-orders` | src/app.js | ODM DUPLICATE | REDIRECT | /mobile/work-orders |
| `GET /work-orders/:id` | src/app.js | ODM DUPLICATE | REDIRECT | /mobile/work-orders/:id |
| `GET /equipment` | src/app.js | ODM DUPLICATE | REDIRECT | /mobile/equipment |
| `GET /inspection/:workOrderId` | src/app.js | ODM DUPLICATE | REDIRECT | /mobile/inspection/:workOrderId |
| `GET /admin` | src/app.js | ODM DUPLICATE | REDIRECT | /mobile/admin |
| `GET /admin/equipment` | src/app.js | ODM DUPLICATE | REDIRECT | /mobile/admin/assets |
| `GET /admin/tasks` | src/app.js | ODM DUPLICATE | REDIRECT | /mobile/admin/templates |
| `GET /admin/schedules` | src/app.js | ODM DUPLICATE | REDIRECT | /mobile/calendar |
| `GET /admin/reports` | src/app.js | ODM DUPLICATE | REDIRECT | /mobile/dashboard |
| `GET /admin/facilities` | src/app.js | ODM DUPLICATE | REDIRECT | /mobile/admin/facilities |
| `GET /admin/users` | src/app.js | ODM DUPLICATE | REDIRECT | /mobile/admin |

### SHARED AUTH/COMMON (KEEP CAREFULLY)

| File Path | Classification | Action | Notes |
|-----------|----------------|--------|-------|
| views/partials/header.ejs | SHARED AUTH | KEEP | Used by login/signup |
| views/partials/footer.ejs | SHARED AUTH | KEEP | Used by login/signup |
| views/login.ejs | PLATFORM UI | KEEP | Main login view |
| views/signup.ejs | PLATFORM UI | KEEP | Main signup view |
| views/error.ejs | SHARED AUTH | KEEP | Error page shared |

### ODM APP UI (MOBILE-FIRST - KEEP)

| Route Path | File | Classification | Notes |
|------------|------|----------------|-------|
| `GET /mobile/login` | src/routes/mobile.routes.js | ODM APP UI | Mobile login (archive, use /login) |
| `GET /mobile/home` | src/routes/mobile.routes.js | ODM APP UI | Main operator home |
| `GET /mobile/work-orders` | src/routes/mobile.routes.js | ODM APP UI | WO list |
| `GET /mobile/work-orders/:id` | src/routes/mobile.routes.js | ODM APP UI | WO detail |
| `GET /mobile/inspection/:workOrderId` | src/routes/mobile.routes.js | ODM APP UI | Inspection execution |
| `GET /mobile/inspection/adhoc` | src/routes/mobile.routes.js | ODM APP UI | Ad-hoc inspection |
| `GET /mobile/asset` | src/routes/mobile.routes.js | ODM APP UI | Asset context (QR scan) |
| `GET /mobile/equipment` | src/routes/mobile.routes.js | ODM APP UI | Equipment list |
| `GET /mobile/profile` | src/routes/mobile.routes.js | ODM APP UI | User profile |
| `GET /mobile/dashboard` | src/routes/mobile.routes.js | ODM APP UI | Dashboard hub |
| `GET /mobile/dashboard/work-orders` | src/routes/mobile.routes.js | ODM APP UI | WO reports |
| `GET /mobile/dashboard/findings` | src/routes/mobile.routes.js | ODM APP UI | Findings reports |
| `GET /mobile/calendar` | src/routes/mobile.routes.js | ODM APP UI | Scheduler view |
| `GET /mobile/admin` | src/routes/mobile.routes.js | ODM APP UI | Admin hub |
| `GET /mobile/admin/facilities` | src/routes/mobile.routes.js | ODM APP UI | Facility mgmt |
| `GET /mobile/admin/assets` | src/routes/mobile.routes.js | ODM APP UI | Asset registration |
| `GET /mobile/admin/templates` | src/routes/mobile.routes.js | ODM APP UI | Template mgmt |
| `GET /mobile/qr-labels` | src/routes/mobile.routes.js | ODM APP UI | QR batch print |
| `GET /mobile/assets/:id/qr-label` | src/routes/mobile.routes.js | ODM APP UI | Single QR view |
| `GET /mobile/onboarding` | src/routes/mobile.routes.js | ODM APP UI | Onboarding wizard |

---

## PHASE 2: VIEW FILES AUDIT

### Root Views (views/*.ejs)

| File | Classification | Action | Notes |
|------|----------------|--------|-------|
| views/login.ejs | PLATFORM UI | KEEP | Main login - uses partials/header, partials/footer |
| views/signup.ejs | PLATFORM UI | KEEP | Main signup - uses partials/header, partials/footer |
| views/error.ejs | SHARED AUTH | KEEP | Error page |
| views/index.ejs | PLATFORM UI | KEEP | Landing page |
| views/dashboard.ejs | ODM DUPLICATE | ARCHIVE | Old dashboard view |
| views/work-orders.ejs | ODM DUPLICATE | ARCHIVE | Old WO list view |
| views/work-order-detail.ejs | ODM DUPLICATE | ARCHIVE | Old WO detail view |
| views/equipment.ejs | ODM DUPLICATE | ARCHIVE | Old equipment view |
| views/inspection.ejs | ODM DUPLICATE | ARCHIVE | Old inspection view |
| views/profile.ejs | ODM DUPLICATE | ARCHIVE | Old profile view |

### Admin Views (views/admin/*.ejs)

| File | Classification | Action | Notes |
|------|----------------|--------|-------|
| views/admin/dashboard.ejs | ODM DUPLICATE | ARCHIVE | Old admin dashboard |
| views/admin/equipment.ejs | ODM DUPLICATE | ARCHIVE | Old equipment mgmt |
| views/admin/tasks.ejs | ODM DUPLICATE | ARCHIVE | Old tasks mgmt |
| views/admin/schedules.ejs | ODM DUPLICATE | ARCHIVE | Old schedules mgmt |
| views/admin/reports.ejs | ODM DUPLICATE | ARCHIVE | Old reports |
| views/admin/facilities.ejs | ODM DUPLICATE | ARCHIVE | Old facilities mgmt |
| views/admin/users.ejs | ODM DUPLICATE | ARCHIVE | Old users mgmt |

### Mobile Views (views/mobile/*.ejs) - KEEP ALL

All 21 mobile views are current ODM APP UI - keep as-is.

### Partials (views/partials/*.ejs) - KEEP ALL

Used by both Platform UI and Mobile UI.

---

## PHASE 3: LOGIN REDIRECT TARGET

### Current Behavior
- `views/login.ejs` line 220: `window.location.href = '/dashboard'`
- `views/signup.ejs` line 602: `window.location.href = '/dashboard'`

### Required Change
- Change redirect from `/dashboard` to `/mobile/home`

---

## IMPLEMENTATION CHECKLIST

### Step 1: Update Login Redirects
- [ ] views/login.ejs: Change `/dashboard` → `/mobile/home`
- [ ] views/signup.ejs: Change `/dashboard` → `/mobile/home`
- [ ] Check src/controllers/auth.controller.js for server-side redirects

### Step 2: Add Redirects in app.js
- [ ] `/dashboard` → `/mobile/dashboard`
- [ ] `/work-orders` → `/mobile/work-orders`
- [ ] `/work-orders/:id` → `/mobile/work-orders/:id`
- [ ] `/equipment` → `/mobile/equipment`
- [ ] `/inspection/:workOrderId` → `/mobile/inspection/:workOrderId`
- [ ] `/admin` → `/mobile/admin`
- [ ] `/admin/*` → appropriate `/mobile/admin/*` routes
- [ ] `/profile` → `/mobile/profile`

### Step 3: Archive Old Views
- [ ] Create archive/views/ folder
- [ ] Create archive/routes/ folder
- [ ] Move old views to archive/

### Step 4: Remove/Archive Old Routes
- [ ] Comment out or redirect old web routes in app.js
- [ ] Archive old admin route handlers

### Step 5: Test
- [ ] /login works and redirects to /mobile/home
- [ ] /signup works
- [ ] All /mobile/* routes work
- [ ] All old routes redirect correctly
