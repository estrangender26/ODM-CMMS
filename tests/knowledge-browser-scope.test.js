/**
 * Knowledge Browser Scope Tests
 * Proves the Knowledge Browser only exposes shared/global knowledge.
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { TaskTemplate } = require('../src/models/task-template.model');

describe('Knowledge Browser shared-scope access', () => {
  let originalQuery;

  beforeEach(() => {
    originalQuery = TaskTemplate.query;
  });

  afterEach(() => {
    TaskTemplate.query = originalQuery;
  });

  it('getSharedWithDetails returns null for a tenant-scoped template', async () => {
    TaskTemplate.query = async (sql, params) => {
      if (sql.includes('FROM task_templates') && params[0] === 999) {
        // Simulate PostgreSQL applying the organization_id IS NULL filter
        if (sql.includes('tt.organization_id IS NULL')) {
          return [];
        }
        return [{ id: 999, template_name: 'Tenant Template', organization_id: 5 }];
      }
      return [];
    };

    const result = await TaskTemplate.getSharedWithDetails(999);
    assert.strictEqual(result, null);
  });

  it('getSharedWithDetails returns details for a shared template', async () => {
    TaskTemplate.query = async (sql, params) => {
      if (sql.includes('FROM task_templates') && params[0] === 1) {
        // Shared template passes the organization_id IS NULL filter
        if (sql.includes('tt.organization_id IS NULL')) {
          return [{ id: 1, template_name: 'Shared Template', organization_id: null }];
        }
        return [];
      }
      if (sql.includes('FROM task_template_steps')) {
        return [{ id: 101, task_template_id: 1, step_no: 1, instruction: 'Check bearing temperature' }];
      }
      if (sql.includes('FROM task_template_safety_controls')) {
        return [];
      }
      return [];
    };

    const result = await TaskTemplate.getSharedWithDetails(1);
    assert.ok(result);
    assert.strictEqual(result.template_name, 'Shared Template');
    assert.ok(Array.isArray(result.steps));
    assert.strictEqual(result.steps.length, 1);
    assert.strictEqual(result.steps[0].instruction, 'Check bearing temperature');
    assert.ok(Array.isArray(result.safety_controls));
  });

  it('findByEquipmentType with null organization returns only shared templates', async () => {
    let capturedSql = '';
    TaskTemplate.query = async (sql, params) => {
      capturedSql = sql;
      return [];
    };

    await TaskTemplate.findByEquipmentType(42);
    assert.ok(
      capturedSql.includes('tt.organization_id IS NULL'),
      'Expected SQL to scope to shared templates'
    );
    assert.ok(
      !capturedSql.includes('tt.organization_id = ?'),
      'Expected SQL not to include tenant organization filter'
    );
  });

  it('getWithDetails remains available for legacy authoring routes', async () => {
    TaskTemplate.query = async (sql, params) => {
      if (sql.includes('FROM task_templates') && params[0] === 123) {
        // Legacy method does not enforce shared scope; tenant template is returned
        return [{ id: 123, template_name: 'Tenant Template', organization_id: 5 }];
      }
      return [];
    };

    const result = await TaskTemplate.getWithDetails(123);
    assert.ok(result);
    assert.strictEqual(result.template_name, 'Tenant Template');
  });
});
