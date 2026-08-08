# ODM-CMMS Agent Guide

## Overview
ODM-CMMS is an Operator-Driven Maintenance CMMS built with Node.js, Express, EJS, and MySQL 8. It has a REST API under `/api`, a mobile-first server-rendered UI under `/mobile`, and tenant-aware RBAC, subscriptions, inspection, scheduling, QR, and reporting capabilities.

## Layout
- `src/app.js` — Express app and middleware setup.
- `src/index.js` — HTTP server entry point.
- `src/routes/`, `src/controllers/`, `src/models/` — API layers.
- `src/middleware/` — authentication, tenancy, RBAC, uploads, and errors.
- `src/services/` — domain integrations and background services.
- `database/` — schema, migrations, ISO taxonomy, and migration helpers.
- `tests/` — Node built-in test runner suites.
- `public/`, `views/` — static assets and EJS views.

## Commands
```bash
npm ci
npm start
npm run dev
npm test
RUN_DB_TESTS=true npm test
npm run db:init
```

`npm test` runs non-destructive app tests and skips database integration suites by default. Database tests can create and remove test data; run them only against a disposable MySQL database configured through `DB_*` variables.

## Environment
Copy `.env.example` for local use or `.env.production.example` as a production template. Do not commit real `.env` files or secrets. The server listens on `0.0.0.0` by default. Configure `CORS_ALLOWED_ORIGINS` as a comma-separated allowlist when cross-origin browser access is required.

## Conventions
- JavaScript uses single quotes, two-space indentation, and semicolons.
- Keep organization/tenant checks and RBAC middleware on protected routes.
- Add or update tests for behavior changes.
- Run `npm test` and `npm audit --omit=dev` before submitting changes.
