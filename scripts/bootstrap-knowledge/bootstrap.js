/**
 * Atiman Knowledge Bootstrap
 *
 * Imports approved legacy maintenance knowledge from a MySQL dump JSONL extract
 * into a clean Atiman PostgreSQL schema.
 *
 * Approved knowledge tables (per ATM-001A):
 *   industries, equipment_categories, equipment_classes, equipment_types,
 *   equipment_type_industries, activity_codes, cause_codes, damage_codes,
 *   failure_modes, object_parts, task_master, task_templates,
 *   task_template_steps, task_template_safety_controls
 *
 * Explicitly excluded (per ATM-001A):
 *   template_families, template_family_rules, equipment_type_family_mappings,
 *   smp_families, smp_tasks, and all operational/transactional data.
 *
 * Task-to-equipment applicability is derived directly from source evidence:
 *   task_templates.equipment_type_id is non-null for all source rows.
 *   A future migration to task_template_equipment_types is a separate
 *   governed design decision, not part of this bootstrap.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DATA_DIR = __dirname;

const KEEP_TABLES = [
  'industries',
  'equipment_categories',
  'equipment_classes',
  'equipment_types',
  'equipment_type_industries',
  'activity_codes',
  'cause_codes',
  'damage_codes',
  'failure_modes',
  'object_parts',
  'task_master',
  'task_templates',
  'task_template_steps',
  'task_template_safety_controls'
];

function booleanize(v) {
  return v === 1 || v === true || v === '1';
}

function parseJson(v) {
  if (v && typeof v === 'string' && (v.startsWith('[') || v.startsWith('{'))) {
    try { return JSON.parse(v); }
    catch { return null; }
  }
  return v || null;
}

function nullableFk(v) {
  return (v && v !== 0) ? v : null;
}

const MAPPINGS = {
  industries: {
    target: 'industries',
    columns: ['id', 'code', 'name', 'description', 'is_active', 'created_at', 'updated_at'],
    transforms: { is_active: booleanize }
  },
  equipment_categories: {
    target: 'equipment_categories',
    columns: ['id', 'category_code', 'category_name', 'description', 'created_at', 'updated_at']
  },
  equipment_classes: {
    target: 'equipment_classes',
    columns: ['id', 'category_id', 'class_code', 'class_name', 'description', 'created_at', 'updated_at']
  },
  equipment_types: {
    target: 'equipment_types',
    columns: ['id', 'class_id', 'type_code', 'type_name', 'description', 'typical_components', 'created_at', 'updated_at']
  },
  equipment_type_industries: {
    target: 'equipment_type_industries',
    columns: ['equipment_type_id', 'industry_id', 'created_at', 'criticality'],
    transforms: { criticality: (v) => v || 'B' }
  },
  activity_codes: {
    target: 'activity_codes',
    columns: ['id', 'activity_code', 'activity_name', 'description', 'iso_maintenance_reference', 'activity_category', 'typical_duration_minutes', 'required_skills', 'safety_precautions', 'is_active', 'created_at', 'updated_at'],
    transforms: { is_active: booleanize }
  },
  cause_codes: {
    target: 'cause_codes',
    columns: ['id', 'equipment_class_id', 'cause_code', 'cause_name', 'description', 'iso_failure_cause_reference', 'cause_category', 'is_preventable', 'prevention_guidelines', 'is_active', 'created_at', 'updated_at'],
    transforms: {
      is_preventable: booleanize,
      is_active: booleanize,
      equipment_class_id: nullableFk
    }
  },
  damage_codes: {
    target: 'damage_codes',
    columns: ['id', 'equipment_class_id', 'damage_code', 'damage_name', 'description', 'iso_failure_mode_reference', 'typical_symptoms', 'severity_level', 'is_active', 'created_at', 'updated_at'],
    transforms: {
      is_active: booleanize,
      severity_level: (v) => (['low','medium','high','critical'].includes(v) ? v : 'medium')
    }
  },
  object_parts: {
    target: 'object_parts',
    columns: ['id', 'equipment_class_id', 'object_part_code', 'object_part_name', 'description', 'iso_reference', 'is_active', 'created_at', 'updated_at'],
    transforms: { is_active: booleanize }
  },
  failure_modes: {
    target: 'failure_modes',
    columns: ['id', 'equipment_type_id', 'failure_mode', 'failure_cause', 'failure_mechanism', 'typical_symptoms', 'recommended_action', 'is_active', 'created_at', 'updated_at'],
    transforms: { is_active: booleanize }
  },
  task_master: {
    target: 'task_master',
    columns: ['id', 'task_code', 'title', 'description', 'task_type', 'estimated_duration', 'required_skills', 'safety_instructions', 'required_tools', 'required_parts', 'is_active', 'created_by', 'created_at', 'updated_at', 'organization_id'],
    transforms: {
      is_active: booleanize,
      created_by: () => null,
      organization_id: () => null
    }
  },
  task_templates: {
    target: 'task_templates',
    columns: ['id', 'organization_id', 'equipment_type_id', 'industry_id', 'activity_code_id', 'template_code', 'template_name', 'maintenance_type', 'task_scope', 'description', 'frequency_value', 'frequency_unit', 'estimated_duration_minutes', 'required_skills', 'required_tools', 'is_active', 'created_by', 'created_at', 'updated_at', 'frequency_type', 'frequency_interval', 'day_of_week', 'day_of_month', 'start_date', 'priority', 'task_kind', 'is_system', 'is_editable', 'parent_template_id', 'seed_batch_id', 'version'],
    transforms: {
      is_active: booleanize,
      is_system: booleanize,
      is_editable: booleanize,
      organization_id: () => null,
      industry_id: nullableFk,
      activity_code_id: nullableFk,
      created_by: () => null,
      parent_template_id: nullableFk,
      seed_batch_id: () => null,
      frequency_type: (v) => (['daily','weekly','monthly'].includes(v) ? v : 'monthly'),
      frequency_interval: (v) => v || 1,
      priority: (v) => (['low','medium','high','urgent'].includes(v) ? v : 'medium'),
      task_kind: (v) => v || 'inspection',
      version: (v) => v || 1
    }
  },
  task_template_steps: {
    target: 'task_template_steps',
    columns: ['id', 'task_template_id', 'step_no', 'step_type', 'activity_code_id', 'instruction', 'data_type', 'expected_value', 'min_value', 'max_value', 'unit', 'is_required', 'options', 'created_at', 'updated_at', 'safety_note', 'is_visual_only', 'requires_equipment_stopped', 'prohibit_if_running', 'prohibit_opening_covers'],
    transforms: {
      is_required: booleanize,
      is_visual_only: booleanize,
      requires_equipment_stopped: booleanize,
      prohibit_if_running: booleanize,
      prohibit_opening_covers: booleanize,
      activity_code_id: nullableFk,
      options: parseJson
    }
  },
  task_template_safety_controls: {
    target: 'task_template_safety_controls',
    columns: ['id', 'task_template_id', 'safety_type', 'description', 'is_mandatory', 'created_at'],
    transforms: { is_mandatory: booleanize }
  }
};

function getPool() {
  const config = {
    host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.PGPORT || process.env.DB_PORT || '5432', 10),
    database: process.env.PGDATABASE || process.env.DB_NAME || 'odm_cmms',
    user: process.env.PGUSER || process.env.DB_USER || 'postgres',
    password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
    ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false
  };
  return new Pool(config);
}

function loadRows(table) {
  const filePath = path.join(DATA_DIR, `${table}.jsonl`);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
    return [];
  }
  return fs.readFileSync(filePath, 'utf-8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

function buildRecord(sourceRow, mapping) {
  const record = {};
  mapping.columns.forEach((col, idx) => {
    let value = sourceRow[idx];
    if (mapping.transforms && mapping.transforms[col]) {
      value = mapping.transforms[col](value);
    }
    record[col] = value;
  });
  return record;
}

function cleanValue(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

async function importTable(client, sourceTable, rows, mapping) {
  if (rows.length === 0) return { inserted: 0, rejected: [] };

  const targetTable = mapping.target || sourceTable;
  const columns = mapping.columns;
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const insertSql = `INSERT INTO ${targetTable} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

  const rejected = [];
  let inserted = 0;

  for (const sourceRow of rows) {
    try {
      const record = buildRecord(sourceRow, mapping);
      const values = columns.map(col => cleanValue(record[col]));
      const result = await client.query(insertSql, values);
      inserted += result.rowCount || 0;
    } catch (err) {
      rejected.push({ row: sourceRow, error: err.message });
    }
  }

  return { inserted, rejected };
}

const IMPORT_ORDER = [
  'industries',
  'equipment_categories',
  'equipment_classes',
  'equipment_types',
  'equipment_type_industries',
  'activity_codes',
  'cause_codes',
  'damage_codes',
  'object_parts',
  'failure_modes',
  'task_master',
  'task_templates',
  'task_template_steps',
  'task_template_safety_controls'
];

async function runImport(client) {
  const results = {};
  for (const table of IMPORT_ORDER) {
    const rows = loadRows(table);
    const mapping = MAPPINGS[table] || { target: table, columns: [] };
    if (mapping.columns.length === 0) {
      results[table] = { sourceRows: rows.length, inserted: 0, skipped: true };
      continue;
    }
    const { inserted, rejected } = await importTable(client, table, rows, mapping);
    results[table] = { sourceRows: rows.length, inserted, rejected: rejected.length };
    if (rejected.length > 0) {
      console.error(`[${table}] first rejected row:`, rejected[0].error);
    }
  }
  return results;
}

async function bootstrap() {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const results = await runImport(client);
    await client.query('COMMIT');
    return results;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

async function validate() {
  const pool = getPool();
  const targets = Object.values(MAPPINGS).map(m => m.target);
  const { rows } = await pool.query(`
    SELECT relname AS table_name, n_live_tup AS row_count
    FROM pg_stat_user_tables
    WHERE relname = ANY($1)
    ORDER BY relname
  `, [targets]);
  const counts = {};
  for (const r of rows) counts[r.table_name] = parseInt(r.row_count, 10);

  // Applicability evidence: task_templates.equipment_type_id coverage
  const { rows: appRows } = await pool.query(`
    SELECT
      COUNT(*) AS total_templates,
      COUNT(equipment_type_id) AS templates_with_equipment_type,
      COUNT(DISTINCT equipment_type_id) AS covered_equipment_types
    FROM task_templates
  `);

  await pool.end();
  return { counts, applicability: appRows[0] };
}

if (require.main === module) {
  (async () => {
    const results = await bootstrap();
    const validation = await validate();

    console.log('\n=== Bootstrap Results ===');
    for (const [table, res] of Object.entries(results)) {
      const target = MAPPINGS[table]?.target || table;
      const targetCount = validation.counts[target] || 0;
      console.log(`${table}: source=${res.sourceRows} inserted=${res.inserted}${res.skipped ? ' SKIPPED' : ''}${res.rejected ? ` rejected=${res.rejected}` : ''} target=${targetCount}`);
    }

    console.log('\n=== Task-to-Equipment Applicability Evidence ===');
    console.log(`task_templates total: ${validation.applicability.total_templates}`);
    console.log(`templates with equipment_type_id: ${validation.applicability.templates_with_equipment_type}`);
    console.log(`distinct equipment_types covered: ${validation.applicability.covered_equipment_types}`);
  })().catch(err => {
    console.error('Bootstrap failed:', err);
    process.exit(1);
  });
}

module.exports = { bootstrap, KEEP_TABLES, IMPORT_ORDER, MAPPINGS };
