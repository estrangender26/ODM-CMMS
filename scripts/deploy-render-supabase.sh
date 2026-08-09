#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SCHEMA_DIR="${REPO_ROOT}/database/postgresql"

export PGHOST="${PGHOST:-${DB_HOST:-}}"
export PGPORT="${PGPORT:-${DB_PORT:-5432}}"
export PGDATABASE="${PGDATABASE:-${DB_NAME:-}}"
export PGUSER="${PGUSER:-${DB_USER:-}}"
export PGPASSWORD="${PGPASSWORD:-${DB_PASSWORD:-}}"
export PGSSLMODE="${PGSSLMODE:-require}"

missing=()
for variable in PGHOST PGDATABASE PGUSER PGPASSWORD; do
  if [[ -z "${!variable}" ]]; then
    missing+=("${variable}")
  fi
done

if (( ${#missing[@]} > 0 )); then
  echo "ERROR: Missing required PostgreSQL settings: ${missing[*]}." >&2
  echo "Set PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD or the corresponding DB_* aliases." >&2
  exit 1
fi

if [[ ! -d "${SCHEMA_DIR}" ]]; then
  echo "ERROR: PostgreSQL schema directory not found: ${SCHEMA_DIR}" >&2
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  echo "ERROR: psql is required but was not found in PATH." >&2
  exit 1
fi

schema_files=(
  001_core.sql
  002_equipment_taxonomy.sql
  003_templates_maintenance.sql
  004_work_management.sql
  005_commercial_security.sql
  006_customization_files.sql
  007_indexes.sql
  008_views.sql
)

for schema_file in "${schema_files[@]}"; do
  if [[ ! -f "${SCHEMA_DIR}/${schema_file}" ]]; then
    echo "ERROR: Required schema file not found: ${SCHEMA_DIR}/${schema_file}" >&2
    exit 1
  fi
done

echo "PostgreSQL target: ${PGUSER}@${PGHOST}:${PGPORT}/${PGDATABASE} (sslmode=${PGSSLMODE})"
echo "Waiting for PostgreSQL to accept connections..."

ready=false
for attempt in $(seq 1 30); do
  if pg_isready --quiet -h "${PGHOST}" -p "${PGPORT}" -d "${PGDATABASE}" -U "${PGUSER}"; then
    ready=true
    break
  fi
  echo "  Attempt ${attempt}/30 failed; retrying in 2 seconds..."
  sleep 2
done

if [[ "${ready}" != true ]]; then
  echo "ERROR: PostgreSQL did not become ready after 30 attempts." >&2
  exit 1
fi

for schema_file in "${schema_files[@]}"; do
  echo "Applying ${schema_file}..."
  psql -v ON_ERROR_STOP=1 --quiet -f "${SCHEMA_DIR}/${schema_file}"
done

echo "Running read-only PostgreSQL smoke test..."
node "${REPO_ROOT}/scripts/smoke-test-pg.js"

echo "Render + Supabase database deployment preparation complete."
