# Render + Supabase Cloud Deployment

Phase 4A deploys the existing ODM-CMMS Node.js service to Render and connects it to a Supabase-hosted PostgreSQL database. It adds deployment automation only; it does not change the application runtime or schema.

## Architecture

```text
+---------+       HTTPS        +----------------------+       pg over TLS       +---------------------+
| Browser | -----------------> | Render web service   | ----------------------> | Supabase Postgres   |
|         | <----------------- | Node.js / Express    | <---------------------- | public schema       |
+---------+                     +----------------------+                         +---------------------+
                                      |
                                      +-- GET /health (Render health check)
```

The browser communicates only with the Render URL. The Render service uses the existing `pg` runtime adapter and server-side database credentials to communicate with Supabase. Database credentials must never be exposed to browser code or committed to Git.

## Prerequisites

- A GitHub repository containing ODM-CMMS and access to its `main` branch.
- A [Render](https://render.com/) account connected to GitHub.
- A [Supabase](https://supabase.com/) account.
- Node.js 18 or newer and project dependencies installed with `npm ci` for local smoke testing.
- The PostgreSQL client tools (`psql` and `pg_isready`) for the one-time schema apply.
- A local Bash shell. On Windows, use WSL or Git Bash with PostgreSQL client tools available.

Do not put database passwords, connection strings, JWT secrets, or provider tokens in tracked files.

## 1. Create the Supabase Project

1. In Supabase, create a new project and choose a region near Render's Singapore region.
2. Generate and save a strong database password in a password manager.
3. Wait until the database reports that it is ready.
4. Open **Connect** in the Supabase dashboard and select the connection suitable for the deployment:
   - **Session pooler (port 5432)** is the recommended default for this persistent Render service and for applying the schema from an IPv4-only network.
   - **Transaction pooler (port 6543)** can be used when transaction pooling is desired.
   - A direct connection also uses port 5432, but may require IPv6 support or Supabase's IPv4 option.
5. Record the host, port, database name, user, and password separately. Pooler usernames commonly include the project reference (for example, `postgres.<project-ref>`).

Use TLS. The Phase 4A configuration sets `DB_SSL=true` and `DB_SSL_REJECT_UNAUTHORIZED=false`, which encrypts the connection without requiring Node.js to validate a locally installed Supabase CA certificate.

## 2. Apply the PostgreSQL Schema Once

The Render pre-deploy command is a read-only smoke test and expects the `public.users` table to exist. Initialize a new Supabase project before the first successful Render deployment:

```bash
npm ci

export DB_HOST='aws-0-REGION.pooler.supabase.com'
export DB_PORT='5432'
export DB_NAME='postgres'
export DB_USER='postgres.PROJECT_REF'
export DB_PASSWORD='replace-with-your-database-password'
export DB_SSL='true'
export DB_SSL_REJECT_UNAUTHORIZED='false'

./scripts/deploy-render-supabase.sh
```

You may use `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, and `PGPASSWORD` instead of the `DB_*` aliases. The script defaults `PGSSLMODE` to `require`.

The script waits for PostgreSQL, then applies these files in order with `ON_ERROR_STOP` enabled:

1. `database/postgresql/001_core.sql`
2. `database/postgresql/002_equipment_taxonomy.sql`
3. `database/postgresql/003_templates_maintenance.sql`
4. `database/postgresql/004_work_management.sql`
5. `database/postgresql/005_commercial_security.sql`
6. `database/postgresql/006_customization_files.sql`
7. `database/postgresql/007_indexes.sql`
8. `database/postgresql/008_views.sql`

The schema SQL uses idempotent table/index creation and replaceable views, so the helper can be rerun safely when recovering from an interrupted apply. It does not seed application data. After applying the schema, it runs the read-only PostgreSQL smoke test.

## 3. Deploy with the Render Blueprint

1. In Render, select **New > Blueprint** and connect this GitHub repository.
2. Render detects the root `render.yaml`. Review the `atiman-api` web service and apply the Blueprint.
3. Supply every environment variable marked `sync: false`:
   - `DB_HOST`: the Supabase host only, without a URI scheme.
   - `DB_NAME`: usually `postgres` for a new Supabase project.
   - `DB_USER`: the exact user shown by Supabase.
   - `DB_PASSWORD`: the Supabase database password.
   - `CORS_ALLOWED_ORIGINS`: the exact public Render origin, such as `https://atiman-api.onrender.com`. Add other trusted browser origins as a comma-separated list only when needed.
4. Confirm that Render generated `JWT_SECRET`. Do not replace it with a placeholder; production validation requires a non-placeholder secret of at least 32 characters.
5. Deploy. Render runs `npm ci --omit=dev`, executes `node scripts/smoke-test-pg.js` as its pre-deploy check, and starts `node src/index.js` only after the database check passes.

If the Blueprint's automatic first deploy starts before the one-time schema apply, the pre-deploy command will fail with a missing `public.users` message. Run `scripts/deploy-render-supabase.sh`, then select **Manual Deploy > Deploy latest commit** in Render.

Render monitors `GET /health`. The correct cloud health path is `/health`, **not** `/api/health`.

## Environment Variables

| Variable | Phase 4A value | Purpose |
|---|---|---|
| `NODE_ENV` | `production` | Enables production runtime checks and behavior. |
| `HOST` | `0.0.0.0` | Allows Render's proxy to reach the Node.js listener. |
| `PORT` | `10000` | Port exposed by the Render web service. |
| `DB_HOST` | Supabase host | Direct or pooler hostname, without `postgres://`. |
| `DB_PORT` | `5432` or `6543` | PostgreSQL/direct or session pooler uses 5432; transaction pooling uses 6543. |
| `DB_NAME` | Usually `postgres` | Supabase PostgreSQL database name. |
| `DB_USER` | Supabase database user | Use the exact pooler/direct username shown by Supabase. |
| `DB_PASSWORD` | Secret | Supabase database password; never commit it. |
| `DB_CONNECTION_LIMIT` | `10` | Maximum connections in the application pool. |
| `DB_SSL` | `true` | Enables TLS for the `pg` connection. |
| `DB_SSL_REJECT_UNAUTHORIZED` | `false` | Allows encrypted Supabase connections without a locally installed CA certificate. |
| `JWT_SECRET` | Render-generated, at least 32 characters | Signs application JWTs. Keep stable and secret. |
| `JWT_EXPIRES_IN` | `24h` | JWT lifetime. |
| `CORS_ALLOWED_ORIGINS` | Exact trusted origin(s) | Comma-separated browser origin allowlist; do not use `*` with credentials. |
| `REQUEST_BODY_LIMIT` | `1mb` | JSON and URL-encoded request body limit. |
| `UPLOAD_MAX_SIZE` | `10485760` | General upload limit in bytes (10 MiB). |
| `ASSET_IMPORT_MAX_ROWS` | `10000` | Maximum CSV asset import rows. |
| `LOG_LEVEL` | `info` | Production logging level. |

The Blueprint also fixes the service plan to `starter`, region to `singapore`, and deployment branch to `main`.

## 4. Verify the Deployment

After Render reports the service as live, verify the configured health check:

```bash
curl -fsS https://atiman-api.onrender.com/health
```

A successful response is HTTP 200 JSON with `success: true`, a message, and a timestamp. If Render assigns a different hostname, substitute that hostname but keep the `/health` path.

To rerun only the read-only database verification from a configured local shell:

```bash
node scripts/smoke-test-pg.js
```

The smoke test performs `SELECT 1`, verifies that `public.users` is a base table, and prints the number of base tables and views in `public`. It does not modify data or schema.

## Running the Scripts Locally

Run both helpers from a clean checkout after `npm ci`:

```bash
# One-time/idempotent schema apply followed by smoke test
./scripts/deploy-render-supabase.sh

# Read-only connectivity and schema smoke test
node scripts/smoke-test-pg.js
```

Both scripts accept either libpq-style `PG*` settings or the application's `DB_*` aliases. The deploy helper exports normalized `PG*` values for `psql` and the Node.js smoke test. Avoid placing secrets directly in shell history; use your shell's secure environment loading or a secret manager, and unset local secret variables when finished.

## Troubleshooting

### `psql` or `pg_isready` is missing

Install the PostgreSQL client tools, then ensure their binary directory is on `PATH`:

- Debian/Ubuntu: `sudo apt-get install postgresql-client`
- macOS with Homebrew: `brew install libpq` and follow Homebrew's PATH instructions.
- Windows: install PostgreSQL client tools and use WSL/Git Bash as appropriate.

The schema helper intentionally stops before making changes when `psql` is unavailable.

### Core `users` table not found

The Supabase project is reachable but has not received the complete Phase 1 schema, or the credentials target the wrong database. Recheck `DB_HOST`, `DB_PORT`, `DB_NAME`, and `DB_USER`, then run:

```bash
./scripts/deploy-render-supabase.sh
```

Do not bypass the Render pre-deploy check. Review the first failing SQL file if `psql` exits early.

### TLS or certificate errors

Confirm `DB_SSL=true`, `DB_SSL_REJECT_UNAUTHORIZED=false`, and `PGSSLMODE=require`. Ensure the host and port came from the same Supabase connection mode. If organization policy requires certificate verification, install Supabase's CA certificate and test a `verify-full` setup separately before changing the Phase 4A defaults.

### Connection timeout or network unreachable

Use the Supabase session pooler host on port 5432 when the client or Render cannot reach the direct IPv6 endpoint. Check Supabase network restrictions and verify that the project is running rather than paused.

### Render startup delays

A Render service can take time to start or restart. Retry the `/health` request after the service starts, and inspect Render logs if it never returns HTTP 200. Startup latency does not change the health path.

## What This Does Not Change

- No application code, API, authentication, authorization, RBAC, business logic, or PostgreSQL schema is changed by Phase 4A.
- The existing Phase 1 schema files remain the source of truth and are only applied by the deployment helper.
- PostgreSQL through `pg` remains the only HTTP/application runtime database driver.
- `mysql2` stays installed only for the documented legacy one-off import and migration utilities; it is not used by Render, the smoke test, or the production runtime.
- Supabase Auth, Storage, Realtime, Edge Functions, and RLS are not introduced.
- Phase 4B is out of scope.
