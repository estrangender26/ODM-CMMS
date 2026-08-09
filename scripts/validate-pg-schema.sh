#!/usr/bin/env bash
set -euo pipefail

echo "=== ODM-CMMS PostgreSQL Schema Validation ==="

if ! command -v docker &> /dev/null; then
  echo "SKIPPED/PENDING: Docker is not available in the current environment."
  echo "POSTGRESQL EXECUTION VALIDATION PENDING — CI service container execution required."
  exit 2
fi

CONTAINER_NAME="odm_pg_validation_$$"
DB_NAME="odm_cmms_val"
DB_USER="postgres"
DB_PASS="postgres"

echo "Starting disposable PostgreSQL container..."
docker run --name "$CONTAINER_NAME" -e POSTGRES_PASSWORD="$DB_PASS" -e POSTGRES_DB="$DB_NAME" -p 5432:5432 -d postgres:15

cleanup() {
  echo "Cleaning up container $CONTAINER_NAME..."
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
  if docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    echo "PostgreSQL is ready!"
    break
  fi
  sleep 1
done

echo "Executing PostgreSQL schema files in order..."
for sql_file in database/postgresql/001_core.sql \
                database/postgresql/002_equipment_taxonomy.sql \
                database/postgresql/003_templates_maintenance.sql \
                database/postgresql/004_work_management.sql \
                database/postgresql/005_commercial_security.sql \
                database/postgresql/006_customization_files.sql \
                database/postgresql/007_indexes.sql \
                database/postgresql/008_views.sql; do
  echo "  -> Executing $sql_file"
  docker exec -i "$CONTAINER_NAME" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" < "$sql_file"
done

echo "Verifying table count..."
TABLE_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | xargs)
echo "Tables created: $TABLE_COUNT"
if [ "$TABLE_COUNT" -ne 66 ]; then
  echo "ERROR: Expected 66 tables, got $TABLE_COUNT"
  exit 1
fi

echo "Verifying view count..."
VIEW_COUNT=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public';" | xargs)
echo "Views created: $VIEW_COUNT"
if [ "$VIEW_COUNT" -ne 6 ]; then
  echo "ERROR: Expected 6 views, got $VIEW_COUNT"
  exit 1
fi

echo "ALL VALIDATION CHECKS PASSED: 66 tables and 6 views successfully verified in PostgreSQL!"
