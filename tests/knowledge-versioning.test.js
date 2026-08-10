/**
 * Knowledge Versioning Foundation Tests
 * Verifies the core tables and immutability expectations
 * defined in ATM-013E.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert');
const { getConnection, pool } = require('../src/config/database');

async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

describe('Knowledge Versioning Foundation', () => {
  it('creates required knowledge versioning tables', async () => {
    const tables = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'knowledge_packs',
          'knowledge_pack_versions',
          'knowledge_pack_version_items',
          'task_template_versions',
          'task_template_step_versions'
        )
      ORDER BY table_name
    `);
    const names = tables.map(t => t.table_name);
    assert.ok(names.includes('knowledge_packs'));
    assert.ok(names.includes('knowledge_pack_versions'));
    assert.ok(names.includes('knowledge_pack_version_items'));
    assert.ok(names.includes('task_template_versions'));
    assert.ok(names.includes('task_template_step_versions'));
  });

  it('enforces unique pack code on knowledge_packs', async () => {
    const constraints = await query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'knowledge_packs'::regclass
        AND contype = 'u'
    `);
    const names = constraints.map(c => c.conname);
    assert.ok(names.some(n => n.includes('knowledge_packs_pack_code')));
  });

  it('enforces unique pack/version on knowledge_pack_versions', async () => {
    const constraints = await query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'knowledge_pack_versions'::regclass
        AND contype = 'u'
    `);
    const names = constraints.map(c => c.conname);
    assert.ok(names.some(n => n.includes('knowledge_pack_versions_pack_version')));
  });

  it('enforces unique template/version on task_template_versions', async () => {
    const constraints = await query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'task_template_versions'::regclass
        AND contype = 'u'
    `);
    const names = constraints.map(c => c.conname);
    assert.ok(names.some(n => n.includes('task_template_versions_template_version')));
  });

  it('enforces unique step_no within a template version', async () => {
    const constraints = await query(`
      SELECT conname
      FROM pg_constraint
      WHERE conrelid = 'task_template_step_versions'::regclass
        AND contype = 'u'
    `);
    const names = constraints.map(c => c.conname);
    assert.ok(names.some(n => n.includes('task_template_step_versions_version_step_no')));
  });

  it('can insert and query a pack/version/template-version/step-version chain', async () => {
    const conn = await getConnection();
    try {
      // Create a pack
      const [packRow] = await conn.query(`
        INSERT INTO knowledge_packs (pack_code, pack_name, description)
        VALUES ('test-pack', 'Test Pack', 'For testing only')
        RETURNING id
      `);
      const packId = packRow.id;

      // Create a pack version
      const [packVersionRow] = await conn.query(`
        INSERT INTO knowledge_pack_versions (
          knowledge_pack_id, version_number, lifecycle_state,
          author_user_id, published_at
        )
        VALUES ($1, '1.0.0', 'published', NULL, NOW())
        RETURNING id
      `, [packId]);
      const packVersionId = packVersionRow.id;

      // Find an existing template and step to version
      const [template] = await conn.query(`SELECT id, equipment_type_id FROM task_templates LIMIT 1`);
      const [step] = await conn.query(`SELECT id FROM task_template_steps WHERE task_template_id = $1 LIMIT 1`, [template.id]);

      assert.ok(template, 'Need at least one task_templates row');
      assert.ok(step, 'Need at least one task_template_steps row for that template');

      // Create a template version
      const [templateVersion] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, knowledge_pack_version_id
        )
        VALUES ($1, 1, $2, 'Test Template v1', 'preventive', $3)
        RETURNING id
      `, [template.id, template.equipment_type_id, packVersionId]);

      // Create a step version
      const [stepVersion] = await conn.query(`
        INSERT INTO task_template_step_versions (
          task_template_version_id, step_no, task_template_step_id,
          step_type, instruction
        )
        VALUES ($1, 1, $2, 'instruction', 'Test instruction')
        RETURNING id
      `, [templateVersion.id, step.id]);

      assert.ok(templateVersion.id > 0);
      assert.ok(stepVersion.id > 0);

      // Clean up
      await conn.query('DELETE FROM task_template_step_versions WHERE id = $1', [stepVersion.id]);
      await conn.query('DELETE FROM task_template_versions WHERE id = $1', [templateVersion.id]);
      await conn.query('DELETE FROM knowledge_pack_versions WHERE id = $1', [packVersionId]);
      await conn.query('DELETE FROM knowledge_packs WHERE id = $1', [packId]);

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });
});
