/**
 * MySQL-to-PostgreSQL SQL Translator for runtime compatibility
 * Phase 2: Runtime Migration
 * 
 * Converts:
 * - ? placeholders -> $1, $2, ...
 * - Common MySQL functions/operators
 * - Handles LIMIT offset syntax
 * - Prepares for RETURNING where needed
 */

const MYSQL_TO_PG_FUNCTIONS = {
  'NOW()': 'CURRENT_TIMESTAMP',
  'CURDATE()': 'CURRENT_DATE',
  'CURTIME()': 'CURRENT_TIME',
  'UNIX_TIMESTAMP()': 'EXTRACT(EPOCH FROM NOW())',
  'UNIX_TIMESTAMP(': 'EXTRACT(EPOCH FROM ',
  'LAST_INSERT_ID()': null, // handled specially via RETURNING or currval
  'FOUND_ROWS()': null, // not directly supported, use COUNT
  'UUID()': 'gen_random_uuid()',
  'CONCAT(': 'CONCAT(', // pg supports CONCAT
  'IFNULL(': 'COALESCE(',
  'ISNULL(': 'COALESCE(',
  'DATE_FORMAT(': null, // will need special handling or leave for now
  'DATEDIFF(': null, // special
  'DATE_ADD(': null,
  'DATE_SUB(': null,
  'GROUP_CONCAT(': null, // string_agg
};

/**
 * Translate a MySQL SQL string to PostgreSQL compatible
 * @param {string} sql
 * @returns {string}
 */
function translateSql(sql) {
  if (!sql || typeof sql !== 'string') return sql;

  let translated = sql;

  // Basic function replacements (case insensitive careful)
  translated = translated.replace(/\bNOW\(\)/gi, 'CURRENT_TIMESTAMP');
  translated = translated.replace(/\bCURDATE\(\)/gi, 'CURRENT_DATE');
  translated = translated.replace(/\bCURTIME\(\)/gi, 'CURRENT_TIME');
  translated = translated.replace(/\bUNIX_TIMESTAMP\(\)/gi, 'EXTRACT(EPOCH FROM NOW())');
  translated = translated.replace(/\bUUID\(\)/gi, 'gen_random_uuid()');
  translated = translated.replace(/\bIFNULL\(/gi, 'COALESCE(');
  translated = translated.replace(/\bISNULL\(/gi, 'COALESCE(');

  // GROUP_CONCAT -> string_agg (simple case)
  translated = translated.replace(/GROUP_CONCAT\(([^)]+)\s+SEPARATOR\s+['"]([^'"]+)['"]\)/gi, 'string_agg($1, \'$2\')');
  translated = translated.replace(/GROUP_CONCAT\(([^)]+)\)/gi, 'string_agg($1, \',\')');

  // DATEDIFF(date1, date2) -> date1 - date2 (for days)
  translated = translated.replace(/DATEDIFF\(([^,]+),\s*([^)]+)\)/gi, '($1 - $2)');

  // DATE_ADD / DATE_SUB simple cases (basic support)
  translated = translated.replace(/DATE_ADD\(([^,]+),\s*INTERVAL\s+([0-9]+)\s+([A-Z]+)\)/gi, "$1 + INTERVAL '$2 $3'");
  translated = translated.replace(/DATE_SUB\(([^,]+),\s*INTERVAL\s+([0-9]+)\s+([A-Z]+)\)/gi, "$1 - INTERVAL '$2 $3'");

  // Remove MySQL specific ENGINE/CHARSET comments etc if they slip in
  translated = translated.replace(/\s*ENGINE\s*=\s*\w+/gi, '');
  translated = translated.replace(/\s*DEFAULT\s+CHARSET\s*=\s*\w+/gi, '');
  translated = translated.replace(/\s*COLLATE\s*=\s*\w+/gi, '');

  // Convert LIMIT offset,limit syntax to LIMIT + OFFSET
  // e.g. LIMIT 10, 20  -> LIMIT 20 OFFSET 10
  translated = translated.replace(/LIMIT\s+(\d+)\s*,\s*(\d+)/gi, 'LIMIT $2 OFFSET $1');

  return translated;
}

/**
 * Convert MySQL ? placeholders to PostgreSQL $1, $2, ...
 * @param {string} sql
 * @param {Array} params
 * @returns {{sql: string, params: Array}}
 */
function convertPlaceholders(sql, params = []) {
  if (!sql) return { sql, params };

  let translatedSql = sql;
  let paramIndex = 0;

  // Replace each ? with $N (respecting that params may be passed)
  translatedSql = translatedSql.replace(/\?/g, () => {
    paramIndex += 1;
    return `$${paramIndex}`;
  });

  // Ensure params length matches (caller responsibility mostly)
  return {
    sql: translatedSql,
    params: params || []
  };
}

/**
 * Normalize query result for mysql2 compatibility
 * pg returns { rows: [...], rowCount, ... }
 * mysql2 execute returns [rows, fields] or for INSERT/UPDATE [result]
 * We return a shape that supports:
 *   - rows array
 *   - [0] for single row cases
 *   - .insertId
 *   - .affectedRows
 */
function normalizeResult(pgResult, originalSql = '') {
  if (!pgResult) {
    return [];
  }

  // If pg client returned rows directly (some patterns)
  let rows = pgResult.rows || pgResult;

  if (!Array.isArray(rows)) {
    rows = [rows].filter(Boolean);
  }

  // Detect INSERT to attach insertId
  const isInsert = /^\s*INSERT/i.test(originalSql || '');
  const isUpdateOrDelete = /^\s*(UPDATE|DELETE)/i.test(originalSql || '');

  const normalized = rows;

  // Attach mysql2-like properties on the array (and first element if needed)
  if (isInsert) {
    // Try to get id from RETURNING or from last row if present
    let insertId = null;
    if (rows.length > 0 && rows[0]) {
      // Common cases: id, or the first column
      insertId = rows[0].id || rows[0].insert_id || Object.values(rows[0])[0];
    }
    // Fallback - caller can also use RETURNING in sql
    normalized.insertId = insertId ? parseInt(insertId, 10) : null;
    normalized.affectedRows = pgResult.rowCount || (rows.length > 0 ? 1 : 0);
  } else if (isUpdateOrDelete) {
    normalized.affectedRows = pgResult.rowCount || 0;
    normalized.insertId = null;
  } else {
    normalized.affectedRows = pgResult.rowCount || rows.length;
    normalized.insertId = null;
  }

  // Also expose rowCount for convenience
  normalized.rowCount = pgResult.rowCount || rows.length;

  return normalized;
}

/**
 * Full translate + prepare for execution
 */
function prepareQuery(sql, params = []) {
  const translated = translateSql(sql);
  const { sql: finalSql, params: finalParams } = convertPlaceholders(translated, params);
  return { sql: finalSql, params: finalParams };
}

module.exports = {
  translateSql,
  convertPlaceholders,
  normalizeResult,
  prepareQuery,
  MYSQL_TO_PG_FUNCTIONS
};
