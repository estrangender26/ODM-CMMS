# API Access Guide

## Overview

API Access is a **Professional+** feature that allows organizations to create API keys for programmatic access to the ODM-CMMS system.

## Plan Limits

| Plan | API Keys Allowed | Rate Limit |
|------|------------------|------------|
| Free | 0 | N/A |
| Starter | 0 | N/A |
| Professional | 5 | 60/min per key |
| Enterprise | 25 | 60/min per key |

## Authentication

### API Key Header
Include your API key in the `X-API-Key` header:

```http
X-API-Key: odm_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Response Headers
Rate limit information is included in response headers:

```http
X-RateLimit-Remaining: 45
```

## API Key Scopes

API keys can have the following scopes:

| Scope | Permissions |
|-------|-------------|
| `read` | GET requests only |
| `write` | GET, POST, PUT, PATCH requests |
| `admin` | Full access including DELETE |

## Endpoints

### Create API Key
```http
POST /api/api-keys
Content-Type: application/json

{
  "name": "Integration Key",
  "scopes": ["read", "write"],
  "rate_limit_per_minute": 60,
  "expires_at": "2026-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "API key created successfully",
  "data": {
    "key": {
      "id": 1,
      "name": "Integration Key",
      "api_key": "odm_live_abc123...",
      "prefix": "odm_live",
      "scopes": ["read", "write"],
      "rate_limit_per_minute": 60,
      "expires_at": "2026-12-31T23:59:59Z"
    },
    "warning": "This is the only time the API key will be shown. Please copy it now."
  }
}
```

### List API Keys
```http
GET /api/api-keys
```

**Response:**
```json
{
  "success": true,
  "data": {
    "keys": [
      {
        "id": 1,
        "name": "Integration Key",
        "prefix": "odm_live...",
        "scopes": ["read", "write"],
        "rate_limit_per_minute": 60,
        "last_used_at": "2026-04-08T10:30:00Z",
        "usage_count": 150,
        "is_active": true
      }
    ]
  }
}
```

### Update API Key
```http
PUT /api/api-keys/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "is_active": false
}
```

### Delete API Key
```http
DELETE /api/api-keys/:id
```

### Get API Usage Statistics
```http
GET /api/api-keys/stats/usage?days=30
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_requests": 15234,
    "error_rate": "2.5",
    "top_endpoints": [
      { "endpoint": "/api/work-orders", "count": 5200 },
      { "endpoint": "/api/equipment", "count": 3100 }
    ],
    "daily_usage": [
      { "date": "2026-04-01", "count": 450 },
      { "date": "2026-04-02", "count": 520 }
    ]
  }
}
```

## Protected API Endpoints

The following API endpoints require **Professional+** plan:

| Endpoint | Method | Access |
|----------|--------|--------|
| `/api/custom-fields/*` | All | Professional+ |
| `/api/api-keys/*` | All | Professional+ |
| `/api/audit-logs/*` | All | Enterprise |
| `/api/sso/*` | All | Enterprise |

## Error Codes

| Code | Description |
|------|-------------|
| `API_KEY_MISSING` | No API key provided |
| `API_KEY_INVALID` | Invalid or expired API key |
| `API_ACCESS_DENIED` | Plan doesn't support API access |
| `API_KEY_LIMIT_REACHED` | Maximum API keys reached |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INSUFFICIENT_SCOPE` | API key doesn't have required scope |
| `FEATURE_UPGRADE_REQUIRED` | Need to upgrade plan |

## Using API Keys with Existing Routes

You can use API keys on most existing API endpoints. For example:

```http
GET /api/work-orders
X-API-Key: odm_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

This allows programmatic access to:
- Work Orders
- Equipment
- Inspections
- Schedules
- Reports
- And more...

## Security Best Practices

1. **Keep API keys secret** - Never expose them in client-side code
2. **Use HTTPS** - Always use encrypted connections
3. **Rotate keys regularly** - Delete old keys and create new ones
4. **Use minimal scopes** - Only grant necessary permissions
5. **Set expiration dates** - Don't create keys that never expire
6. **Monitor usage** - Regularly check API usage statistics

## Implementation Details

### Database Tables
- `api_keys` - Stores API key hashes and metadata
- `api_usage_logs` - Tracks all API requests
- `api_rate_limit_tracking` - Rate limit counters

### Middleware
- `authenticateApiKey` - Validates API keys
- `requireScope` - Checks API key permissions
- `requireApiAccess` - Verifies plan has API access
- `checkApiKeyLimit` - Enforces API key count limits
- `logApiUsage` - Logs API requests

### Models
- `ApiKey` - API key management (create, validate, delete, stats)
