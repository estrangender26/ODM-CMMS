# ODM UI Structure

## Overview

The ODM UI is organized into two layers:
1. **Auth UI** - Login/signup screens
2. **Mobile App UI** - Daily maintenance workflow

---

## 1. Auth UI (`/`, `/login`, `/signup`)

**Purpose**: User authentication and organization signup

| File | Route | Purpose |
|------|-------|---------|
| `views/index.ejs` | `/` | Landing page |
| `views/login.ejs` | `/login` | User login |
| `views/signup.ejs` | `/signup` | Account + organization creation |
| `views/error.ejs` | - | Error page |

**Features**:
- Login with username, email, or phone
- Create account + organization (via `organization-signup` API)
- Auto-redirects to `/mobile/home` after login

**Note**: Organization management UIs (billing, seat management, etc.) use the mobile admin screens or would need to be built separately.

---

## 2. Mobile App UI (`/mobile/*`)

**Purpose**: Daily operator and admin workflows

### Operator Routes
| Route | View | Purpose |
|-------|------|---------|
| `/mobile/home` | `home.ejs` | Operator dashboard |
| `/mobile/work-orders` | `work-orders.ejs` | Work order list |
| `/mobile/work-orders/:id` | `work-order-detail.ejs` | WO detail |
| `/mobile/inspection/:id` | `inspection.ejs` | Inspection form |
| `/mobile/equipment` | `equipment-list.ejs` | Equipment list |
| `/mobile/asset?code=` | `asset-context.ejs` | Asset QR scan result |
| `/mobile/profile` | `profile.ejs` | User profile |

### Admin Routes
| Route | View | Purpose |
|-------|------|---------|
| `/mobile/admin` | `admin/index.ejs` | Admin hub |
| `/mobile/admin/facilities` | `admin/facilities.ejs` | Facility mgmt |
| `/mobile/admin/assets` | `admin/assets.ejs` | Asset registration |
| `/mobile/admin/templates` | `admin/templates.ejs` | Template mgmt |
| `/mobile/onboarding` | `onboarding-wizard.ejs` | Setup wizard |
| `/mobile/qr-labels` | `qr-labels-batch.ejs` | QR label printing |

### Scheduler & Reports
| Route | View | Purpose |
|-------|------|---------|
| `/mobile/calendar` | `calendar.ejs` | Scheduler view |
| `/mobile/dashboard` | `dashboard/index.ejs` | Reports hub |
| `/mobile/dashboard/work-orders` | `dashboard/work-orders.ejs` | WO reports |
| `/mobile/dashboard/findings` | `dashboard/findings.ejs` | Findings reports |

---

## 3. Archived UI (`/archive/views/`)

Old desktop views that have been replaced by mobile-first versions:

```
archive/views/
├── dashboard.ejs          # → /mobile/dashboard
├── work-orders.ejs        # → /mobile/work-orders
├── work-order-detail.ejs  # → /mobile/work-orders/:id
├── equipment.ejs          # → /mobile/equipment
├── inspection.ejs         # → /mobile/inspection/:id
├── profile.ejs            # → /mobile/profile
└── admin/
    ├── dashboard.ejs      # → /mobile/admin
    ├── equipment.ejs      # → /mobile/admin/assets
    ├── tasks.ejs          # → /mobile/admin/templates
    ├── schedules.ejs      # → /mobile/calendar
    ├── reports.ejs        # → /mobile/dashboard
    ├── facilities.ejs     # → /mobile/admin/facilities
    └── users.ejs          # → /mobile/admin
```

---

## Redirects

Old routes automatically redirect to mobile equivalents:

```javascript
/dashboard          → /mobile/dashboard
/work-orders        → /mobile/work-orders
/work-orders/:id    → /mobile/work-orders/:id
/equipment          → /mobile/equipment
/profile            → /mobile/profile
/inspection/:id     → /mobile/inspection/:id
/admin              → /mobile/admin
/admin/*            → /mobile/admin/*
```

---

## Backend APIs

The following backend systems exist (used by mobile UI):

| API | Purpose |
|-----|---------|
| `/api/auth/*` | Authentication |
| `/api/organizations/*` | Organization mgmt |
| `/api/subscriptions/*` | Subscription/seat mgmt |
| `/api/work-orders/*` | Work orders |
| `/api/inspections/*` | Inspections |
| `/api/equipment/*` | Equipment |
| `/api/scheduler/*` | Scheduling |
| `/api/reports/*` | Reports |

**Note**: Admin UIs for subscription/billing management would need to be built if required (currently managed via API or database directly).

---

## Flow

```
/login → (auth) → /mobile/home
                 ↓
    ┌────────────┼────────────┐
    ↓            ↓            ↓
/mobile/work-orders  /mobile/equipment  /mobile/admin
    ↓
/mobile/inspection/:id
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/app.js` | Main Express app, web routes, redirects |
| `src/routes/mobile.routes.js` | All mobile UI routes |
| `src/routes/auth.routes.js` | Auth API routes |
| `views/mobile/layout.ejs` | Mobile app shell |
| `public/css/odm-mobile.css` | Mobile styles |
| `public/css/odm-responsive.css` | Desktop enhancements |
