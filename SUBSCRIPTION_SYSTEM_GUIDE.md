# ODM-CMMS Seat-Based Subscription System

## Overview

This document describes the seat-based subscription system implemented for ODM-CMMS, allowing organizations to subscribe to tiered plans with user limits and billing based on seat count.

## Database Schema

### subscription_plans
Defines available subscription tiers and pricing.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| plan_code | VARCHAR(50) | Unique identifier (e.g., 'starter', 'professional') |
| plan_name | VARCHAR(100) | Display name |
| description | TEXT | Plan description |
| included_users | INT | Base number of users included |
| max_users | INT | Maximum allowed users (NULL = unlimited) |
| base_price | DECIMAL(10,2) | Monthly base price in USD |
| price_per_additional_user | DECIMAL(10,2) | Price per extra user beyond included |
| features | JSON | Array of included features |
| is_active | BOOLEAN | Whether plan is available |
| is_public | BOOLEAN | Whether plan is shown to customers |
| sort_order | INT | Display order |

### organization_subscriptions
Links organizations to their subscription plans.

| Column | Type | Description |
|--------|------|-------------|
| id | INT | Primary key |
| organization_id | INT | FK to organizations |
| plan_id | INT | FK to subscription_plans |
| included_users | INT | Base seats from plan |
| extra_users | INT | Additional purchased seats |
| max_users | INT | Maximum allowed users |
| base_price | DECIMAL(10,2) | Locked-in base price |
| price_per_additional_user | DECIMAL(10,2) | Locked-in price per extra user |
| status | ENUM | trial, active, past_due, cancelled, suspended |
| billing_cycle | ENUM | monthly, annual |
| current_period_start/end | DATE | Billing period dates |
| seats_used | INT | Current billable users |
| seats_available | INT | Calculated available seats |

### users (updated)

| Column | Type | Description |
|--------|------|-------------|
| status | ENUM | invited, active, suspended, archived |
| is_billable | BOOLEAN | Whether user counts against seats |
| invited_by | INT | FK to user who invited |
| invited_at | TIMESTAMP | When invitation sent |

## Default Subscription Plans

### Free
- **Included Users**: 3
- **Max Users**: 5
- **Price**: $0/month
- **Features**: Basic work orders, equipment, basic reports

### Starter
- **Included Users**: 5
- **Max Users**: 25
- **Price**: $49/month + $10/additional user
- **Features**: Standard features including schedules, inspections, standard reports

### Professional
- **Included Users**: 15
- **Max Users**: 100
- **Price**: $149/month + $8/additional user
- **Features**: Advanced features including API access, custom fields, priority support

### Enterprise
- **Included Users**: 50
- **Max Users**: Unlimited
- **Price**: $499/month + $5/additional user
- **Features**: All features including SSO, dedicated support, custom integrations

## Billing Calculation

```
Total Price = Base Price + (Extra Users × Price per Additional User)

Where:
- Extra Users = MAX(0, Total Active Users - Included Users)
- Seats Available = Included Users + Extra Users - Billable Active Users
```

### Example
Professional Plan with 20 active users:
- Base Price: $149.00
- Extra Users: 20 - 15 = 5
- Additional Cost: 5 × $8 = $40
- **Total**: $149 + $40 = $189/month

## API Endpoints

### Get Current Subscription
```
GET /api/subscriptions/current
```

### Get Available Plans
```
GET /api/subscriptions/plans
```

### Calculate Pricing
```
GET /api/subscriptions/pricing?planId=3&totalUsers=25
```

### Subscribe to Plan
```
POST /api/subscriptions
{
  "planId": 3,
  "billingCycle": "monthly",
  "extraUsers": 0
}
```

### Upgrade/Downgrade Plan
```
PUT /api/subscriptions/upgrade
{
  "planId": 4,
  "extraUsers": 10
}
```

### Add Extra Seats
```
POST /api/subscriptions/seats
{
  "additionalSeats": 5
}
```

### Get Seat Usage
```
GET /api/subscriptions/seats/usage
```

Response:
```json
{
  "subscription": {
    "included_users": 15,
    "extra_users": 0,
    "total_seats": 15,
    "seats_used": 12,
    "seats_available": 3,
    "base_price": 149.00,
    "total_price": 149.00
  },
  "breakdown": {
    "active": { "count": 10, "billable": 10 },
    "invited": { "count": 2, "billable": 2 },
    "suspended": { "count": 1, "billable": 0 },
    "archived": { "count": 3, "billable": 0 }
  }
}
```

### Cancel Subscription
```
POST /api/subscriptions/cancel
{
  "atPeriodEnd": true,
  "reason": "Switching to different solution"
}
```

## Seat Validation Middleware

The system enforces seat limits through middleware:

### `validateAvailableSeats`
Checks if organization has available seats before:
- Creating a new user
- Inviting a user

Returns 403 if limit reached with upgrade options.

### `validateReactivation`
Checks seats before reactivating suspended/archived users.

### `checkSeatUsage`
Attaches warning to requests if seat usage > 75%.

## User Status Flow

```
[Invited] → [Active] → [Suspended] → [Archived]
                ↑_____________|
```

### Status Definitions
- **invited**: User invited but hasn't accepted yet (counts toward seats)
- **active**: Fully active user (counts toward seats)
- **suspended**: Temporarily disabled, no access (doesn't count toward seats)
- **archived**: Permanently disabled, historical reference (doesn't count toward seats)

### Billable Rules
- Invited + Active + Billable = Counts toward seat limit
- Suspended = Doesn't count
- Archived = Doesn't count
- Non-billable users (system accounts, API users) = Don't count

## Admin UI Data Model

### Subscription Card
```javascript
{
  plan: {
    name: "Professional",
    description: "Advanced features for growing organizations"
  },
  status: "active",
  billing: {
    cycle: "monthly",
    currentPeriodEnd: "2026-04-30",
    basePrice: 149.00,
    additionalCost: 0.00,
    totalPrice: 149.00
  },
  seats: {
    included: 15,
    extra: 0,
    used: 12,
    available: 3,
    usagePercentage: 80
  }
}
```

### User List Item
```javascript
{
  id: 25,
  username: "john.doe",
  fullName: "John Doe",
  role: "operator",
  status: "active",
  isBillable: true,
  facility: "Main Plant",
  lastLogin: "2026-03-28T10:30:00Z"
}
```

## Backend Validation Examples

### Creating a User Beyond Seat Limit
```javascript
// Request
POST /api/users
{ "username": "newuser", "role": "operator" }

// Response (403 Forbidden)
{
  "success": false,
  "message": "Seat limit reached. Please upgrade your subscription to add more users.",
  "code": "SEAT_LIMIT_REACHED",
  "seats_available": 0,
  "seats_used": 15,
  "total_seats": 15,
  "can_upgrade": true
}
```

### Successfully Creating a User
```javascript
// Request
POST /api/users
{ "username": "newuser", "role": "operator", "is_billable": true }

// Response (201 Created)
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": { ... },
    "seat_info": {
      "seats_available": 2,
      "total_seats": 15,
      "current_usage": 13
    }
  }
}
```

## Migration Instructions

Run the migration to add subscription tables:

```bash
node database/migrations/003_add_subscription_system.sql
```

Or use the migration runner (to be implemented):

```bash
npm run db:migrate:subscriptions
```

## Integration with Existing Multi-Tenant System

The subscription system integrates with the existing multi-tenant architecture:

1. **Organization Context**: All subscription queries are scoped to `organization_id`
2. **User Filtering**: Subscription status affects user creation/activation
3. **Data Isolation**: Seat counts are per-organization
4. **Billing Period**: Tracked per organization subscription

## Production Considerations

### Stripe Integration
The schema includes Stripe fields for payment processing:
- `stripe_customer_id`: Customer in Stripe
- `stripe_subscription_id`: Subscription in Stripe
- `payment_method_id`: Default payment method

### Webhook Handlers
Implement webhook handlers for:
- `invoice.payment_succeeded`: Extend subscription period
- `invoice.payment_failed`: Set status to `past_due`
- `customer.subscription.deleted`: Set status to `cancelled`

### Background Jobs
Schedule daily jobs for:
- Checking subscriptions nearing renewal
- Sending seat usage warnings at 75%, 90%, 100%
- Suspending organizations with expired subscriptions

### Email Notifications
Send emails for:
- Subscription renewal reminders (7 days, 1 day before)
- Seat limit warnings
- Payment failures
- Subscription cancellations

## Future Enhancements

1. **Annual Discounts**: 15-20% discount for annual billing
2. **Add-on Features**: Additional modules (IoT, Advanced Analytics)
3. **Usage-Based Pricing**: Per-work-order pricing for high-volume users
4. **Reseller/Partner Plans**: White-label and commission structures
5. **Trial Extensions**: Automated trial extension requests
