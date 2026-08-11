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

const isForbiddenError = (err) => {
  const msg = (err.message || '').toLowerCase();
  return msg.includes('immutable') || msg.includes('cannot be') || msg.includes('insufficient privilege');
};

const isUpdateForbiddenError = (err) => {
  const msg = (err.message || '').toLowerCase();
  return msg.includes('immutable') || msg.includes('cannot be updated') || msg.includes('insufficient privilege');
};

const isSupersessionError = (err) => {
  const msg = (err.message || '').toLowerCase();
  return msg.includes('supersede') || msg.includes('same knowledge_pack') || msg.includes('same task_template') || msg.includes('check_violation') || msg.includes('cycle') || msg.includes('must be published');
};

const isSealError = (err) => {
  const msg = (err.message || '').toLowerCase();
  return msg.includes('seal') || msg.includes('cannot be changed') || msg.includes('must be sealed before commit') || msg.includes('check_violation');
};

const isAncestryError = (err) => {
  const msg = (err.message || '').toLowerCase();
  return msg.includes('does not belong to task_template_id') || msg.includes('check_violation');
};

describe('Knowledge Versioning Foundation', () => {
  it('creates required knowledge versioning tables', async () => {
    const tables = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN (
          'knowledge_packs',
          'knowledge_pack_versions',
          'task_template_versions',
          'task_template_step_versions'
        )
      ORDER BY table_name
    `);
    const names = tables.map(t => t.table_name);
    assert.ok(names.includes('knowledge_packs'));
    assert.ok(names.includes('knowledge_pack_versions'));
    assert.ok(names.includes('task_template_versions'));
    assert.ok(names.includes('task_template_step_versions'));
  });

  it('does not create deferred knowledge_pack_version_items table', async () => {
    const tables = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'knowledge_pack_version_items'
    `);
    assert.strictEqual(tables.length, 0, 'knowledge_pack_version_items should not exist yet');
  });

  it('task_template_versions has no knowledge_pack_version_id column', async () => {
    const cols = await query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'task_template_versions'
        AND column_name = 'knowledge_pack_version_id'
    `);
    assert.strictEqual(cols.length, 0, 'knowledge_pack_version_id column should not exist on task_template_versions');
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

  it('task_template_versions only accepts post-publication lifecycle states', async () => {
    const conn = await getConnection();
    try {
      const [template] = await conn.query(`SELECT id, equipment_type_id FROM task_templates LIMIT 1`);
      assert.ok(template, 'Need at least one task_templates row');

      // published is valid
      const [valid] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish
        )
        VALUES ($1, 1, $2, 'Valid State', 'preventive', 'published')
        RETURNING id
      `, [template.id, template.equipment_type_id]);
      assert.ok(valid.id);

      // draft is invalid for a publication record
      let rejected = false;
      try {
        await conn.query(`
          INSERT INTO task_template_versions (
            task_template_id, version_number, equipment_type_id,
            template_name, maintenance_type, lifecycle_state_at_publish
          )
          VALUES ($1, 2, $2, 'Draft State', 'preventive', 'draft')
        `, [template.id, template.equipment_type_id]);
      } catch (err) {
        rejected = /check.*constraint|violates check constraint|new row.*violates/i.test(err.message || '');
      }
      assert.ok(rejected, 'draft lifecycle_state_at_publish should be rejected');

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  it('can insert and query a pack/version/template-version/step-version chain', async () => {
    const conn = await getConnection();
    try {
      const [packRow] = await conn.query(`
        INSERT INTO knowledge_packs (pack_code, pack_name)
        VALUES ('chain-test-pack', 'Chain Test Pack')
        RETURNING id
      `);
      const packId = packRow.id;

      const [packVersionRow] = await conn.query(`
        INSERT INTO knowledge_pack_versions (knowledge_pack_id, version_number, lifecycle_state)
        VALUES ($1, '0.1.0', 'draft')
        RETURNING id
      `, [packId]);
      const packVersionId = packVersionRow.id;

      const [template] = await conn.query(`SELECT id, equipment_type_id FROM task_templates LIMIT 1`);
      const [step] = await conn.query(`SELECT id FROM task_template_steps WHERE task_template_id = $1 LIMIT 1`, [template.id]);

      assert.ok(template, 'Need at least one task_templates row');
      assert.ok(step, 'Need at least one task_template_steps row for that template');

      const [templateVersion] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type
        )
        VALUES ($1, 1, $2, 'Chain Test Template', 'preventive')
        RETURNING id
      `, [template.id, template.equipment_type_id]);

      const [stepVersion] = await conn.query(`
        INSERT INTO task_template_step_versions (
          task_template_version_id, step_no, task_template_step_id, step_type, instruction
        )
        VALUES ($1, 1, $2, 'instruction', 'Chain test instruction')
        RETURNING id
      `, [templateVersion.id, step.id]);

      assert.ok(templateVersion.id > 0);
      assert.ok(stepVersion.id > 0);

      // Clean up: use rollback because step versions are always immutable.
      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  it('blocks UPDATE of content columns on published knowledge_pack_versions', async () => {
    const conn = await getConnection();
    try {
      const [pack] = await conn.query(`
        INSERT INTO knowledge_packs (pack_code, pack_name)
        VALUES ('immutable-pack', 'Immutable Pack')
        RETURNING id
      `);

      const [packVersion] = await conn.query(`
        INSERT INTO knowledge_pack_versions (knowledge_pack_id, version_number, lifecycle_state, published_at)
        VALUES ($1, '1.0.0', 'published', NOW())
        RETURNING id
      `, [pack.id]);

      let blocked = false;
      try {
        await conn.query(`
          UPDATE knowledge_pack_versions SET change_summary = 'tampered' WHERE id = $1
        `, [packVersion.id]);
      } catch (err) {
        blocked = isUpdateForbiddenError(err);
      }
      assert.ok(blocked, 'UPDATE of published pack version content should be blocked');

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  it('blocks DELETE of published knowledge_pack_versions', async () => {
    const conn = await getConnection();
    try {
      const [pack] = await conn.query(`
        INSERT INTO knowledge_packs (pack_code, pack_name)
        VALUES ('delete-test-pack', 'Delete Test Pack')
        RETURNING id
      `);

      const [packVersion] = await conn.query(`
        INSERT INTO knowledge_pack_versions (knowledge_pack_id, version_number, lifecycle_state, published_at)
        VALUES ($1, '1.0.0', 'published', NOW())
        RETURNING id
      `, [pack.id]);

      let blocked = false;
      try {
        await conn.query(`DELETE FROM knowledge_pack_versions WHERE id = $1`, [packVersion.id]);
      } catch (err) {
        blocked = isForbiddenError(err);
      }
      assert.ok(blocked, 'DELETE of published pack version should be blocked');

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  it('allows only supersession/retirement metadata transitions on published task_template_versions', async () => {
    const conn = await getConnection();
    try {
      const [template] = await conn.query(`SELECT id, equipment_type_id FROM task_templates LIMIT 1`);

      const [templateVersionV1] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish
        )
        VALUES ($1, 1, $2, 'Transition Template v1', 'preventive', 'published')
        RETURNING id
      `, [template.id, template.equipment_type_id]);

      const [templateVersionV2] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish
        )
        VALUES ($1, 2, $2, 'Transition Template v2', 'preventive', 'published')
        RETURNING id
      `, [template.id, template.equipment_type_id]);

      // Allowed: supersede v1 with the later version of the same template.
      await conn.query(`
        UPDATE task_template_versions
        SET lifecycle_state_at_publish = 'superseded', superseded_by_version_id = $1
        WHERE id = $2
      `, [templateVersionV2.id, templateVersionV1.id]);

      // Once superseded, content changes remain blocked.
      let blocked = false;
      try {
        await conn.query(`
          UPDATE task_template_versions SET template_name = 'Tampered' WHERE id = $1
        `, [templateVersionV1.id]);
      } catch (err) {
        blocked = isUpdateForbiddenError(err);
      }
      assert.ok(blocked, 'UPDATE of superseded template version content should be blocked');

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  it('rejects self-supersession for knowledge_pack_versions and task_template_versions', async () => {
    const conn = await getConnection();
    try {
      const [pack] = await conn.query(`
        INSERT INTO knowledge_packs (pack_code, pack_name)
        VALUES ('self-super-pack', 'Self Supersession Pack')
        RETURNING id
      `);
      const [packVersion] = await conn.query(`
        INSERT INTO knowledge_pack_versions (knowledge_pack_id, version_number, lifecycle_state, published_at)
        VALUES ($1, '1.0.0', 'published', NOW())
        RETURNING id
      `, [pack.id]);

      let packBlocked = false;
      await conn.query('SAVEPOINT self_super_pack');
      try {
        await conn.query(`
          UPDATE knowledge_pack_versions
          SET superseded_by_version_id = $1
          WHERE id = $1
        `, [packVersion.id]);
      } catch (err) {
        packBlocked = isSupersessionError(err);
        await conn.query('ROLLBACK TO SAVEPOINT self_super_pack');
      }
      assert.ok(packBlocked, 'Self-supersession of pack version should be rejected');

      const [template] = await conn.query(`SELECT id, equipment_type_id FROM task_templates LIMIT 1`);
      const [templateVersion] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish
        )
        VALUES ($1, 1, $2, 'Self Super Template', 'preventive', 'published')
        RETURNING id
      `, [template.id, template.equipment_type_id]);

      let templateBlocked = false;
      await conn.query('SAVEPOINT self_super_template');
      try {
        await conn.query(`
          UPDATE task_template_versions
          SET superseded_by_version_id = $1
          WHERE id = $1
        `, [templateVersion.id]);
      } catch (err) {
        templateBlocked = isSupersessionError(err);
        await conn.query('ROLLBACK TO SAVEPOINT self_super_template');
      }
      assert.ok(templateBlocked, 'Self-supersession of template version should be rejected');

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  it('requires pack-version supersession to stay within the same pack', async () => {
    const conn = await getConnection();
    try {
      const [packA] = await conn.query(`
        INSERT INTO knowledge_packs (pack_code, pack_name)
        VALUES ('same-pack-a', 'Pack A')
        RETURNING id
      `);
      const [packB] = await conn.query(`
        INSERT INTO knowledge_packs (pack_code, pack_name)
        VALUES ('same-pack-b', 'Pack B')
        RETURNING id
      `);

      const [packVersionA] = await conn.query(`
        INSERT INTO knowledge_pack_versions (knowledge_pack_id, version_number, lifecycle_state, published_at)
        VALUES ($1, '1.0.0', 'published', NOW())
        RETURNING id
      `, [packA.id]);

      const [packVersionB] = await conn.query(`
        INSERT INTO knowledge_pack_versions (knowledge_pack_id, version_number, lifecycle_state, published_at)
        VALUES ($1, '1.0.0', 'published', NOW())
        RETURNING id
      `, [packB.id]);

      // Attempting to supersede pack version A with a version from pack B must fail.
      let blocked = false;
      await conn.query('SAVEPOINT cross_pack_test');
      try {
        await conn.query(`
          UPDATE knowledge_pack_versions
          SET superseded_by_version_id = $1, lifecycle_state = 'superseded'
          WHERE id = $2
        `, [packVersionB.id, packVersionA.id]);
      } catch (err) {
        blocked = isSupersessionError(err);
        await conn.query('ROLLBACK TO SAVEPOINT cross_pack_test');
      }
      assert.ok(blocked, 'Cross-pack supersession should be rejected');

      // Superseding A with a second version from the SAME pack should succeed.
      const [packVersionA2] = await conn.query(`
        INSERT INTO knowledge_pack_versions (knowledge_pack_id, version_number, lifecycle_state, published_at)
        VALUES ($1, '2.0.0', 'published', NOW())
        RETURNING id
      `, [packA.id]);

      await conn.query(`
        UPDATE knowledge_pack_versions
        SET superseded_by_version_id = $1, lifecycle_state = 'superseded'
        WHERE id = $2
      `, [packVersionA2.id, packVersionA.id]);

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  it('requires task-template-version supersession to stay within the same task template', async () => {
    const conn = await getConnection();
    try {
      const [templateA] = await conn.query(`SELECT id, equipment_type_id FROM task_templates LIMIT 1`);
      const [templateB] = await conn.query(`
        SELECT id, equipment_type_id FROM task_templates
        WHERE id != $1 LIMIT 1
      `, [templateA.id]);
      assert.ok(templateB, 'Need at least two distinct task_templates rows');

      const [versionA1] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish
        )
        VALUES ($1, 1, $2, 'Template A v1', 'preventive', 'published')
        RETURNING id
      `, [templateA.id, templateA.equipment_type_id]);

      const [versionB1] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish
        )
        VALUES ($1, 1, $2, 'Template B v1', 'preventive', 'published')
        RETURNING id
      `, [templateB.id, templateB.equipment_type_id]);

      // Cross-template supersession must fail.
      let blocked = false;
      await conn.query('SAVEPOINT cross_template_test');
      try {
        await conn.query(`
          UPDATE task_template_versions
          SET superseded_by_version_id = $1, lifecycle_state_at_publish = 'superseded'
          WHERE id = $2
        `, [versionB1.id, versionA1.id]);
      } catch (err) {
        blocked = isSupersessionError(err);
        await conn.query('ROLLBACK TO SAVEPOINT cross_template_test');
      }
      assert.ok(blocked, 'Cross-template supersession should be rejected');

      // Same-template supersession must succeed.
      const [versionA2] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish
        )
        VALUES ($1, 2, $2, 'Template A v2', 'preventive', 'published')
        RETURNING id
      `, [templateA.id, templateA.equipment_type_id]);

      await conn.query(`
        UPDATE task_template_versions
        SET superseded_by_version_id = $1, lifecycle_state_at_publish = 'superseded'
        WHERE id = $2
      `, [versionA2.id, versionA1.id]);

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  it('blocks UPDATE of task_template_step_versions', async () => {
    const conn = await getConnection();
    try {
      const [template] = await conn.query(`SELECT id, equipment_type_id FROM task_templates LIMIT 1`);
      const [templateVersion] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish
        )
        VALUES ($1, 1, $2, 'Step Update Template', 'preventive', 'published')
        RETURNING id
      `, [template.id, template.equipment_type_id]);

      const [step] = await conn.query(`SELECT id FROM task_template_steps WHERE task_template_id = $1 LIMIT 1`, [template.id]);
      const [stepVersion] = await conn.query(`
        INSERT INTO task_template_step_versions (
          task_template_version_id, step_no, task_template_step_id, step_type, instruction
        )
        VALUES ($1, 1, $2, 'instruction', 'Step to remain immutable')
        RETURNING id
      `, [templateVersion.id, step.id]);

      let blocked = false;
      try {
        await conn.query(`UPDATE task_template_step_versions SET instruction = 'changed' WHERE id = $1`, [stepVersion.id]);
      } catch (err) {
        blocked = isForbiddenError(err);
      }
      assert.ok(blocked, 'UPDATE of task_template_step_versions should be blocked');

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  it('blocks DELETE of task_template_step_versions', async () => {
    const conn = await getConnection();
    try {
      const [template] = await conn.query(`SELECT id, equipment_type_id FROM task_templates LIMIT 1`);
      const [templateVersion] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish
        )
        VALUES ($1, 1, $2, 'Step Delete Template', 'preventive', 'published')
        RETURNING id
      `, [template.id, template.equipment_type_id]);

      const [step] = await conn.query(`SELECT id FROM task_template_steps WHERE task_template_id = $1 LIMIT 1`, [template.id]);
      const [stepVersion] = await conn.query(`
        INSERT INTO task_template_step_versions (
          task_template_version_id, step_no, task_template_step_id, step_type, instruction
        )
        VALUES ($1, 1, $2, 'instruction', 'Step to remain immutable')
        RETURNING id
      `, [templateVersion.id, step.id]);

      let blocked = false;
      try {
        await conn.query(`DELETE FROM task_template_step_versions WHERE id = $1`, [stepVersion.id]);
      } catch (err) {
        blocked = isForbiddenError(err);
      }
      assert.ok(blocked, 'DELETE of task_template_step_versions should be blocked');

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });
  it('seals published template step sets and blocks later step changes', async () => {
    const conn = await getConnection();
    try {
      const [template] = await conn.query(`SELECT id, equipment_type_id FROM task_templates LIMIT 1`);
      const [templateVersion] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish, is_step_set_sealed
        )
        VALUES ($1, 1, $2, 'Sealed Step Set Template', 'preventive', 'published', FALSE)
        RETURNING id
      `, [template.id, template.equipment_type_id]);

      const [step] = await conn.query(`SELECT id FROM task_template_steps WHERE task_template_id = $1 LIMIT 1`, [template.id]);

      const [stepVersion] = await conn.query(`
        INSERT INTO task_template_step_versions (
          task_template_version_id, step_no, task_template_step_id, step_type, instruction
        )
        VALUES ($1, 1, $2, 'instruction', 'Step to be sealed')
        RETURNING id
      `, [templateVersion.id, step.id]);

      // Seal the step set.
      await conn.query(`
        UPDATE task_template_versions SET is_step_set_sealed = TRUE WHERE id = $1
      `, [templateVersion.id]);

      // INSERT blocked
      let blockedInsert = false;
      await conn.query('SAVEPOINT seal_insert_test');
      try {
        await conn.query(`
          INSERT INTO task_template_step_versions (
            task_template_version_id, step_no, task_template_step_id, step_type, instruction
          )
          VALUES ($1, 2, $2, 'instruction', 'Should not be added')
        `, [templateVersion.id, step.id]);
      } catch (err) {
        blockedInsert = isForbiddenError(err);
        await conn.query('ROLLBACK TO SAVEPOINT seal_insert_test');
      }
      assert.ok(blockedInsert, 'INSERT into sealed step set should be blocked');

      // UPDATE blocked
      let blockedUpdate = false;
      await conn.query('SAVEPOINT seal_update_test');
      try {
        await conn.query(`UPDATE task_template_step_versions SET instruction = 'changed' WHERE id = $1`, [stepVersion.id]);
      } catch (err) {
        blockedUpdate = isForbiddenError(err);
        await conn.query('ROLLBACK TO SAVEPOINT seal_update_test');
      }
      assert.ok(blockedUpdate, 'UPDATE of sealed step set should be blocked');

      // DELETE blocked
      let blockedDelete = false;
      await conn.query('SAVEPOINT seal_delete_test');
      try {
        await conn.query(`DELETE FROM task_template_step_versions WHERE id = $1`, [stepVersion.id]);
      } catch (err) {
        blockedDelete = isForbiddenError(err);
        await conn.query('ROLLBACK TO SAVEPOINT seal_delete_test');
      }
      assert.ok(blockedDelete, 'DELETE from sealed step set should be blocked');

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  it('allows step set assembly before sealing', async () => {
    const conn = await getConnection();
    try {
      const [template] = await conn.query(`SELECT id, equipment_type_id FROM task_templates LIMIT 1`);
      const [templateVersion] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish, is_step_set_sealed
        )
        VALUES ($1, 1, $2, 'Unsealed Step Set Template', 'preventive', 'published', FALSE)
        RETURNING id
      `, [template.id, template.equipment_type_id]);

      const [step] = await conn.query(`SELECT id FROM task_template_steps WHERE task_template_id = $1 LIMIT 1`, [template.id]);

      const [stepVersion] = await conn.query(`
        INSERT INTO task_template_step_versions (
          task_template_version_id, step_no, task_template_step_id, step_type, instruction
        )
        VALUES ($1, 1, $2, 'instruction', 'Step before seal')
        RETURNING id
      `, [templateVersion.id, step.id]);

      assert.ok(stepVersion.id > 0);

      await conn.query(`
        UPDATE task_template_versions SET is_step_set_sealed = TRUE WHERE id = $1
      `, [templateVersion.id]);

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  it('requires successor to be a valid published version', async () => {
    const conn = await getConnection();
    try {
      const [template] = await conn.query(`SELECT id, equipment_type_id FROM task_templates LIMIT 1`);

      const [v1] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish
        )
        VALUES ($1, 1, $2, 'Successor Valid v1', 'preventive', 'published')
        RETURNING id
      `, [template.id, template.equipment_type_id]);

      const [v2Retired] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish
        )
        VALUES ($1, 2, $2, 'Successor Retired', 'preventive', 'retired')
        RETURNING id
      `, [template.id, template.equipment_type_id]);

      // Attempting to supersede v1 with a retired version should fail.
      let blocked = false;
      await conn.query('SAVEPOINT retired_successor_test');
      try {
        await conn.query(`
          UPDATE task_template_versions
          SET superseded_by_version_id = $1
          WHERE id = $2
        `, [v2Retired.id, v1.id]);
      } catch (err) {
        blocked = isSupersessionError(err) || /successor.*must be published/i.test(err.message || '');
        await conn.query('ROLLBACK TO SAVEPOINT retired_successor_test');
      }
      assert.ok(blocked, 'Supersession by a retired successor should be rejected');

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  it('requires superseded state to have a successor', async () => {
    const conn = await getConnection();
    try {
      const [pack] = await conn.query(`
        INSERT INTO knowledge_packs (pack_code, pack_name)
        VALUES ('orphan-super-pack', 'Orphan Supersession Pack')
        RETURNING id
      `);
      const [packVersion] = await conn.query(`
        INSERT INTO knowledge_pack_versions (knowledge_pack_id, version_number, lifecycle_state, published_at)
        VALUES ($1, '1.0.0', 'published', NOW())
        RETURNING id
      `, [pack.id]);

      let blocked = false;
      await conn.query('SAVEPOINT orphan_super_test');
      try {
        await conn.query(`
          UPDATE knowledge_pack_versions
          SET lifecycle_state = 'superseded'
          WHERE id = $1
        `, [packVersion.id]);
      } catch (err) {
        blocked = isSupersessionError(err) || /must specify superseded_by_version_id/i.test(err.message || '');
        await conn.query('ROLLBACK TO SAVEPOINT orphan_super_test');
      }
      assert.ok(blocked, 'Superseded state without successor should be rejected');

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });


  it('rejects unsealing a sealed task_template_version', async () => {
    const conn = await getConnection();
    try {
      const [template] = await conn.query(`SELECT id, equipment_type_id FROM task_templates LIMIT 1`);
      const [version] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish, is_step_set_sealed
        )
        VALUES ($1, 1, $2, 'Unseal Test Template', 'preventive', 'published', FALSE)
        RETURNING id
      `, [template.id, template.equipment_type_id]);

      const [step] = await conn.query(`SELECT id FROM task_template_steps WHERE task_template_id = $1 LIMIT 1`, [template.id]);
      await conn.query(`
        INSERT INTO task_template_step_versions (
          task_template_version_id, step_no, task_template_step_id, step_type, instruction
        )
        VALUES ($1, 1, $2, 'instruction', 'Step to seal')
      `, [version.id, step.id]);

      await conn.query(`
        UPDATE task_template_versions SET is_step_set_sealed = TRUE WHERE id = $1
      `, [version.id]);

      let blocked = false;
      await conn.query('SAVEPOINT unseal_test');
      try {
        await conn.query(`
          UPDATE task_template_versions SET is_step_set_sealed = FALSE WHERE id = $1
        `, [version.id]);
      } catch (err) {
        blocked = isSealError(err);
        await conn.query('ROLLBACK TO SAVEPOINT unseal_test');
      }
      assert.ok(blocked, 'Unsealing a sealed template version should be rejected');

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  it('rejects sealing a task_template_version with zero steps', async () => {
    const conn = await getConnection();
    try {
      const [template] = await conn.query(`SELECT id, equipment_type_id FROM task_templates LIMIT 1`);
      const [version] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish, is_step_set_sealed
        )
        VALUES ($1, 1, $2, 'Zero Step Seal Template', 'preventive', 'published', FALSE)
        RETURNING id
      `, [template.id, template.equipment_type_id]);

      let blocked = false;
      await conn.query('SAVEPOINT zero_seal_test');
      try {
        await conn.query(`
          UPDATE task_template_versions SET is_step_set_sealed = TRUE WHERE id = $1
        `, [version.id]);
      } catch (err) {
        blocked = isSealError(err);
        await conn.query('ROLLBACK TO SAVEPOINT zero_seal_test');
      }
      assert.ok(blocked, 'Sealing a template version with zero steps should be rejected');

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  it('rejects committing a published task_template_version with an unsealed step set', async () => {
    const conn = await getConnection();
    try {
      const [template] = await conn.query(`SELECT id, equipment_type_id FROM task_templates LIMIT 1`);
      await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish, is_step_set_sealed
        )
        VALUES ($1, 1, $2, 'Unsealed Commit Template', 'preventive', 'published', FALSE)
      `, [template.id, template.equipment_type_id]);

      let blocked = false;
      try {
        // Force the deferred seal check to run before commit.
        await conn.query('SET CONSTRAINTS ALL IMMEDIATE');
      } catch (err) {
        blocked = /must be sealed before commit|check_violation/i.test(err.message || '');
      }
      assert.ok(blocked, 'Committing an unsealed published template version should be rejected');

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  it('allows assemble -> seal -> commit for a task_template_version', async () => {
    const conn = await getConnection();
    try {
      const [template] = await conn.query(`SELECT id, equipment_type_id FROM task_templates LIMIT 1`);
      const [version] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish, is_step_set_sealed
        )
        VALUES ($1, 1, $2, 'Assemble Seal Commit Template', 'preventive', 'published', FALSE)
        RETURNING id
      `, [template.id, template.equipment_type_id]);

      const [step] = await conn.query(`SELECT id FROM task_template_steps WHERE task_template_id = $1 LIMIT 1`, [template.id]);
      await conn.query(`
        INSERT INTO task_template_step_versions (
          task_template_version_id, step_no, task_template_step_id, step_type, instruction
        )
        VALUES ($1, 1, $2, 'instruction', 'Assembled step')
      `, [version.id, step.id]);

      await conn.query(`
        UPDATE task_template_versions SET is_step_set_sealed = TRUE WHERE id = $1
      `, [version.id]);

      // Simulate commit-time deferred seal check without persisting test data.
      let ok = false;
      try {
        await conn.query('SET CONSTRAINTS ALL IMMEDIATE');
        ok = true;
      } catch (err) {
        ok = false;
      }
      assert.ok(ok, 'Assemble -> seal -> commit should satisfy the deferred seal check');

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  it('blocks inserting a step after the step set is sealed', async () => {
    const conn = await getConnection();
    try {
      const [template] = await conn.query(`SELECT id, equipment_type_id FROM task_templates LIMIT 1`);
      const [version] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish, is_step_set_sealed
        )
        VALUES ($1, 1, $2, 'Post-Seal Insert Template', 'preventive', 'published', FALSE)
        RETURNING id
      `, [template.id, template.equipment_type_id]);

      const [step] = await conn.query(`SELECT id FROM task_template_steps WHERE task_template_id = $1 LIMIT 1`, [template.id]);
      await conn.query(`
        INSERT INTO task_template_step_versions (
          task_template_version_id, step_no, task_template_step_id, step_type, instruction
        )
        VALUES ($1, 1, $2, 'instruction', 'Pre-seal step')
      `, [version.id, step.id]);

      await conn.query(`
        UPDATE task_template_versions SET is_step_set_sealed = TRUE WHERE id = $1
      `, [version.id]);

      let blocked = false;
      await conn.query('SAVEPOINT post_seal_insert_test');
      try {
        await conn.query(`
          INSERT INTO task_template_step_versions (
            task_template_version_id, step_no, task_template_step_id, step_type, instruction
          )
          VALUES ($1, 2, $2, 'instruction', 'Should not be added')
        `, [version.id, step.id]);
      } catch (err) {
        blocked = isForbiddenError(err);
        await conn.query('ROLLBACK TO SAVEPOINT post_seal_insert_test');
      }
      assert.ok(blocked, 'INSERT into a sealed step set should be blocked');

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  it('allows v1 -> v2 -> v3 supersession chain for knowledge_pack_versions', async () => {
    const conn = await getConnection();
    try {
      const [pack] = await conn.query(`
        INSERT INTO knowledge_packs (pack_code, pack_name)
        VALUES ('chain-pack', 'Chain Pack')
        RETURNING id
      `);

      const [v1] = await conn.query(`
        INSERT INTO knowledge_pack_versions (knowledge_pack_id, version_number, lifecycle_state, published_at)
        VALUES ($1, '1.0.0', 'published', NOW())
        RETURNING id
      `, [pack.id]);

      const [v2] = await conn.query(`
        INSERT INTO knowledge_pack_versions (knowledge_pack_id, version_number, lifecycle_state, published_at)
        VALUES ($1, '2.0.0', 'published', NOW())
        RETURNING id
      `, [pack.id]);

      const [v3] = await conn.query(`
        INSERT INTO knowledge_pack_versions (knowledge_pack_id, version_number, lifecycle_state, published_at)
        VALUES ($1, '3.0.0', 'published', NOW())
        RETURNING id
      `, [pack.id]);

      await conn.query(`
        UPDATE knowledge_pack_versions
        SET superseded_by_version_id = $1
        WHERE id = $2
      `, [v2.id, v1.id]);

      await conn.query(`
        UPDATE knowledge_pack_versions
        SET superseded_by_version_id = $1
        WHERE id = $2
      `, [v3.id, v2.id]);

      const rows = await conn.query(`
        SELECT id, lifecycle_state FROM knowledge_pack_versions
        WHERE id IN ($1, $2, $3)
        ORDER BY id
      `, [v1.id, v2.id, v3.id]);

      assert.strictEqual(rows.find(r => r.id === v1.id).lifecycle_state, 'superseded');
      assert.strictEqual(rows.find(r => r.id === v2.id).lifecycle_state, 'superseded');
      assert.strictEqual(rows.find(r => r.id === v3.id).lifecycle_state, 'published');

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  it('rejects back-link supersession cycles for knowledge_pack_versions', async () => {
    const conn = await getConnection();
    try {
      const [pack] = await conn.query(`
        INSERT INTO knowledge_packs (pack_code, pack_name)
        VALUES ('backlink-pack', 'Backlink Pack')
        RETURNING id
      `);

      const [v1] = await conn.query(`
        INSERT INTO knowledge_pack_versions (knowledge_pack_id, version_number, lifecycle_state, published_at)
        VALUES ($1, '1.0.0', 'published', NOW())
        RETURNING id
      `, [pack.id]);

      const [v2] = await conn.query(`
        INSERT INTO knowledge_pack_versions (knowledge_pack_id, version_number, lifecycle_state, published_at)
        VALUES ($1, '2.0.0', 'published', NOW())
        RETURNING id
      `, [pack.id]);

      await conn.query(`
        UPDATE knowledge_pack_versions
        SET superseded_by_version_id = $1
        WHERE id = $2
      `, [v2.id, v1.id]);

      let blocked = false;
      await conn.query('SAVEPOINT backlink_pack_test');
      try {
        await conn.query(`
          UPDATE knowledge_pack_versions
          SET superseded_by_version_id = $1
          WHERE id = $2
        `, [v1.id, v2.id]);
      } catch (err) {
        blocked = isSupersessionError(err);
        await conn.query('ROLLBACK TO SAVEPOINT backlink_pack_test');
      }
      assert.ok(blocked, 'Back-link supersession v2 -> v1 should be rejected');

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  it('allows v1 -> v2 -> v3 supersession chain for task_template_versions', async () => {
    const conn = await getConnection();
    try {
      const [template] = await conn.query(`SELECT id, equipment_type_id FROM task_templates LIMIT 1`);

      const [v1] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish, is_step_set_sealed
        )
        VALUES ($1, 1, $2, 'Chain v1', 'preventive', 'published', FALSE)
        RETURNING id
      `, [template.id, template.equipment_type_id]);

      const [v2] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish, is_step_set_sealed
        )
        VALUES ($1, 2, $2, 'Chain v2', 'preventive', 'published', FALSE)
        RETURNING id
      `, [template.id, template.equipment_type_id]);

      const [v3] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish, is_step_set_sealed
        )
        VALUES ($1, 3, $2, 'Chain v3', 'preventive', 'published', FALSE)
        RETURNING id
      `, [template.id, template.equipment_type_id]);

      await conn.query(`
        UPDATE task_template_versions
        SET superseded_by_version_id = $1
        WHERE id = $2
      `, [v2.id, v1.id]);

      await conn.query(`
        UPDATE task_template_versions
        SET superseded_by_version_id = $1
        WHERE id = $2
      `, [v3.id, v2.id]);

      const rows = await conn.query(`
        SELECT id, lifecycle_state_at_publish FROM task_template_versions
        WHERE id IN ($1, $2, $3)
        ORDER BY id
      `, [v1.id, v2.id, v3.id]);

      assert.strictEqual(rows.find(r => r.id === v1.id).lifecycle_state_at_publish, 'superseded');
      assert.strictEqual(rows.find(r => r.id === v2.id).lifecycle_state_at_publish, 'superseded');
      assert.strictEqual(rows.find(r => r.id === v3.id).lifecycle_state_at_publish, 'published');

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  it('rejects back-link supersession cycles for task_template_versions', async () => {
    const conn = await getConnection();
    try {
      const [template] = await conn.query(`SELECT id, equipment_type_id FROM task_templates LIMIT 1`);

      const [v1] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish, is_step_set_sealed
        )
        VALUES ($1, 1, $2, 'Backlink v1', 'preventive', 'published', FALSE)
        RETURNING id
      `, [template.id, template.equipment_type_id]);

      const [v2] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish, is_step_set_sealed
        )
        VALUES ($1, 2, $2, 'Backlink v2', 'preventive', 'published', FALSE)
        RETURNING id
      `, [template.id, template.equipment_type_id]);

      await conn.query(`
        UPDATE task_template_versions
        SET superseded_by_version_id = $1
        WHERE id = $2
      `, [v2.id, v1.id]);

      let blocked = false;
      await conn.query('SAVEPOINT backlink_template_test');
      try {
        await conn.query(`
          UPDATE task_template_versions
          SET superseded_by_version_id = $1
          WHERE id = $2
        `, [v1.id, v2.id]);
      } catch (err) {
        blocked = isSupersessionError(err);
        await conn.query('ROLLBACK TO SAVEPOINT backlink_template_test');
      }
      assert.ok(blocked, 'Back-link supersession v2 -> v1 should be rejected');

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });


  it('rejects committing a retired task_template_version with an unsealed step set', async () => {
    const conn = await getConnection();
    try {
      const [template] = await conn.query(`SELECT id, equipment_type_id FROM task_templates LIMIT 1`);
      await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish, is_step_set_sealed
        )
        VALUES ($1, 1, $2, 'Unsealed Retired Template', 'preventive', 'retired', FALSE)
      `, [template.id, template.equipment_type_id]);

      let blocked = false;
      try {
        await conn.query('SET CONSTRAINTS ALL IMMEDIATE');
      } catch (err) {
        blocked = /must be sealed before commit|check_violation/i.test(err.message || '');
      }
      assert.ok(blocked, 'Committing a retired unsealed template version should be rejected');

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  it('rejects committing a superseded task_template_version with an unsealed step set', async () => {
    const conn = await getConnection();
    try {
      const [template] = await conn.query(`SELECT id, equipment_type_id FROM task_templates LIMIT 1`);

      const [v1] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish, is_step_set_sealed
        )
        VALUES ($1, 1, $2, 'Unsealed Superseded Template', 'preventive', 'published', FALSE)
        RETURNING id
      `, [template.id, template.equipment_type_id]);

      const [v2] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish, is_step_set_sealed
        )
        VALUES ($1, 2, $2, 'Successor Template', 'preventive', 'published', FALSE)
        RETURNING id
      `, [template.id, template.equipment_type_id]);

      // v2 must be sealed because every committed version requires it.
      // We need at least one step for v2 before sealing.
      const [step] = await conn.query(`SELECT id FROM task_template_steps WHERE task_template_id = $1 LIMIT 1`, [template.id]);
      await conn.query(`
        INSERT INTO task_template_step_versions (
          task_template_version_id, step_no, task_template_step_id, step_type, instruction
        )
        VALUES ($1, 1, $2, 'instruction', 'Successor step')
      `, [v2.id, step.id]);

      await conn.query(`
        UPDATE task_template_versions SET is_step_set_sealed = TRUE WHERE id = $1
      `, [v2.id]);

      // This will coerce v1 to superseded.
      await conn.query(`
        UPDATE task_template_versions
        SET superseded_by_version_id = $1
        WHERE id = $2
      `, [v2.id, v1.id]);

      let blocked = false;
      try {
        await conn.query('SET CONSTRAINTS ALL IMMEDIATE');
      } catch (err) {
        blocked = /must be sealed before commit|check_violation/i.test(err.message || '');
      }
      assert.ok(blocked, 'Committing a superseded unsealed template version should be rejected');

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

  it('rejects task_template_step_versions whose source step belongs to a different template', async () => {
    const conn = await getConnection();
    try {
      const [templateA] = await conn.query(`SELECT id, equipment_type_id FROM task_templates LIMIT 1`);
      const [templateB] = await conn.query(`
        SELECT id, equipment_type_id FROM task_templates
        WHERE id != $1 LIMIT 1
      `, [templateA.id]);
      assert.ok(templateB, 'Need at least two distinct task_templates rows');

      const [versionA] = await conn.query(`
        INSERT INTO task_template_versions (
          task_template_id, version_number, equipment_type_id,
          template_name, maintenance_type, lifecycle_state_at_publish, is_step_set_sealed
        )
        VALUES ($1, 1, $2, 'Ancestry Template A', 'preventive', 'published', FALSE)
        RETURNING id
      `, [templateA.id, templateA.equipment_type_id]);

      const [stepB] = await conn.query(`
        SELECT id FROM task_template_steps WHERE task_template_id = $1 LIMIT 1
      `, [templateB.id]);
      assert.ok(stepB, 'Need at least one step for template B');

      let blocked = false;
      await conn.query('SAVEPOINT ancestry_test');
      try {
        await conn.query(`
          INSERT INTO task_template_step_versions (
            task_template_version_id, step_no, task_template_step_id, step_type, instruction
          )
          VALUES ($1, 1, $2, 'instruction', 'Step from wrong template')
        `, [versionA.id, stepB.id]);
      } catch (err) {
        blocked = isAncestryError(err);
        await conn.query('ROLLBACK TO SAVEPOINT ancestry_test');
      }
      assert.ok(blocked, 'Source step from a different template should be rejected');

      await conn.rollback();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });

});
