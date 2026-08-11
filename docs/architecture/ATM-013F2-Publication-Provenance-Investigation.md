# ATM-013F2 — Publication Provenance Integration Investigation (Addendum)

> **Documentation status notice**
> - **Status:** Historical pre-implementation investigation.
> - **Authority:** Not approved architecture. Written before the publication endpoint and migration `012` were implemented.
> - **Historical base:** `main @ 41d526acc10e4e6a8e520a9d192e37c9ce03528e`.
> - **Reviewed against:** `main @ 34cae1fad779ff45220fd1783025e6cfc442b44f`.
> - **Current implementation status:** Migration `012` added `task_template_safety_control_versions`; the `publishVersion()` model and route resolved the publication issues described here. Original investigation retained as history.

**Base:** `main @ 41d526acc10e4e6a8e520a9d192e37c9ce03528e`
**Scope:** Investigation only. No code, migration, test, or production changes.

---

## 1. Correct PostgreSQL transaction pattern

Use `src/config/database.js` `getConnection()`.

- It returns a PostgreSQL `pg` client already inside `BEGIN`.
- It exposes `query(sql, params)`, `execute(sql, params)`, `commit()`, `rollback()`, and `release()`.
- It normalizes results to a `[rows]` tuple shape compatible with existing destructuring.
- This is the same pattern already used in `tests/knowledge-versioning.test.js` for atomically assembling and sealing template versions.

Reference: `src/config/database.js` lines 166–210.

---

## 2. Version tables and child records that publication must create

From `database/postgresql/009_knowledge_versioning.sql`:

| Record | Table | Notes |
|--------|-------|-------|
| Template version header | `task_template_versions` | One per publication event. |
| Step versions | `task_template_step_versions` | One per `task_template_steps` row of the parent template, ordered by `step_no`. |
| Frozen provenance (template-level) | `knowledge_template_version_evidence` | One row per template-level `knowledge_template_evidence` row. |
| Frozen provenance (step-level) | `knowledge_template_version_evidence` | One row per step-level `knowledge_template_evidence` row, mapped through the new step-version IDs. |

**Unresolved child record:** `task_template_safety_controls` has **no version table** in 009. The working table (`003_templates_maintenance.sql:144`) is not carried into the immutable publication. This must be resolved before safety controls can be considered part of a published version.

---

## 3. Required `task_template_versions` columns: source or default

| Column | Source / Default | Resolved? |
|--------|------------------|-----------|
| `task_template_id` | `task_templates.id` | ✅ |
| `version_number` | `SELECT COALESCE(MAX(version_number), 0) + 1 FROM task_template_versions WHERE task_template_id = ?` | ⚠️ concurrency risk (see §5) |
| `equipment_type_id` | `task_templates.equipment_type_id` | ✅ |
| `industry_id` | `task_templates.industry_id` | ✅ nullable |
| `activity_code_id` | **No working equivalent on `task_templates`.** | ❌ unresolved |
| `template_code` | `task_templates.template_code` | ✅ nullable |
| `template_name` | `task_templates.template_name` | ✅ |
| `maintenance_type` | `task_templates.maintenance_type` | ✅ |
| `task_scope` | `task_templates.task_scope` | ✅ nullable |
| `description` | `task_templates.description` | ✅ nullable |
| `frequency_value` | `task_templates.frequency_value` | ✅ nullable |
| `frequency_unit` | `task_templates.frequency_unit` | ✅ nullable |
| `estimated_duration_minutes` | `task_templates.estimated_duration_minutes` | ✅ nullable |
| `required_skills` | `task_templates.required_skills` | ✅ nullable |
| `required_tools` | `task_templates.required_tools` | ✅ nullable |
| `priority` | `DEFAULT 'medium'` | ✅ |
| `task_kind` | `task_templates.task_kind` | ✅ nullable |
| `is_system` | `task_templates.is_system` | ✅ default FALSE |
| `is_editable` | `task_templates.is_editable` | ✅ default TRUE |
| `parent_template_id` | `task_templates.parent_template_id` | ✅ nullable |
| `lifecycle_state_at_publish` | Must be `'published'` | ✅ |
| `is_step_set_sealed` | `FALSE` on insert, `TRUE` after step/provenance assembly | ✅ |
| `published_by_user_id` | `req.user.id` | ✅ |
| `published_at` | `CURRENT_TIMESTAMP` default | ✅ |
| `superseded_by_version_id` | `NULL` | ✅ |
| `change_rationale` | Caller-supplied publish rationale | ✅ nullable |
| `ai_assisted` | `task_templates` has no AI flag; caller-supplied | ⚠️ unresolved default |
| `ai_assistance_detail` | Caller-supplied JSONB | ✅ nullable |

**Unresolved fields:** `activity_code_id` has no source column on `task_templates`; `ai_assisted` has no working-template source and must be caller-supplied or defaulted to `FALSE`.

---

## 4. Lifecycle, seal condition, and provenance-copy ordering

- **Lifecycle value at publish:** `lifecycle_state_at_publish = 'published'`.
- **Seal rule:** `is_step_set_sealed` starts `FALSE`, must become `TRUE` only after at least one `task_template_step_versions` row exists.
- **Deferred constraint:** `trg_task_template_versions_seal_constraint` (009:123-160) fires `AFTER INSERT OR UPDATE DEFERRABLE INITIALLY DEFERRED` and rejects the commit if any committed `task_template_versions` row is unsealed.
- **Seal irreversibility:** `trg_task_template_versions_seal_check` (009:515-555) blocks `TRUE → FALSE` and insertion with `is_step_set_sealed = TRUE`.
- **Step-set immutability after seal:** `trg_task_template_step_versions_sealed_check` (009:562-625) blocks `INSERT/UPDATE/DELETE` on `task_template_step_versions` once the parent version is sealed.
- **Provenance-copy deadline:** `trg_knowledge_template_version_evidence_insert_guard` (011:325-358) blocks any `INSERT` into `knowledge_template_version_evidence` after `is_step_set_sealed = TRUE`.

Therefore the transaction must insert frozen provenance **before** the final `UPDATE task_template_versions SET is_step_set_sealed = TRUE`.

---

## 5. Minimum concurrency protection

`version_number` is currently generated by the application reading `MAX(version_number)` from `task_template_versions` for the given `task_template_id`. To avoid duplicate version numbers under concurrent publications:

1. **Serialize version-number allocation** by `SELECT ... FOR UPDATE` on a row-lock target, or
2. **Use an advisory lock** (`pg_advisory_xact_lock(hashtextextended('task_template_versions:' || task_template_id, 0))`) for the duration of the transaction.

A `FOR UPDATE` on the latest `task_template_versions` row for that template is insufficient because a new row may not exist. The simplest safe pattern is an advisory transaction-level lock keyed by `task_template_id` taken immediately after `BEGIN`, before reading the current max version.

For a consistent snapshot of the working template and its steps/evidence, the single serializable transaction (default `READ COMMITTED` is adequate because all writes happen within the same transaction; the advisory lock only protects version-number allocation).

---

## 6. Smallest implementation surface and complete transaction sequence

### Files to touch

| File | Responsibility |
|------|----------------|
| `src/models/task-template.model.js` | Add `publishVersion(templateId, userId, options)` as a PostgreSQL transaction. |
| `src/controllers/task-template.controller.js` | Add `publish` action; validate ownership/editable state; call model. |
| `src/routes/task-template.routes.js` | Add `POST /api/task-templates/:id/publish` behind existing auth/RBAC. |
| `tests/knowledge-versioning.test.js` (or new file) | Add publication/provenance integration tests. |

### Complete publication transaction sequence

```text
BEGIN
  -- 1. Serialize version-number allocation for this task_template_id.
  SELECT pg_advisory_xact_lock(hashtextextended('publish_template:' || :templateId, 0));

  -- 2. Validate the working template exists, is editable, and is owned
  --    by the caller's organization (or is a publishable system template).
  --    Also lock the latest version row if one exists (optional).

  -- 3. Compute next version number.
  SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version
  FROM task_template_versions
  WHERE task_template_id = :templateId;

  -- 4. Insert task_template_versions header unsealed.
  INSERT INTO task_template_versions (...)
  VALUES (...)
  RETURNING id AS versionId;

  -- 5. Insert task_template_step_versions from task_template_steps,
  --     preserving step_no and task_template_step_id,
  --     and capturing step_type, instruction, data_type, expected_value,
  --     min_value, max_value, unit, is_required, options, safety_note,
  --     is_visual_only, requires_equipment_stopped, prohibit_if_running,
  --     prohibit_opening_covers, ai_assisted, ai_assistance_detail.
  --     Build a mapping { task_template_step_id -> task_template_step_version_id }.

  -- 6. Copy template-level provenance.
  INSERT INTO knowledge_template_version_evidence (
      task_template_version_id, knowledge_source_version_id,
      section_or_clause, page_or_paragraph, derivation_notes,
      confidence_level, supporting_role, copied_from_template_evidence_id
  )
  SELECT versionId, knowledge_source_version_id,
         section_or_clause, page_or_paragraph, derivation_notes,
         confidence_level, supporting_role, id
  FROM knowledge_template_evidence
  WHERE task_template_id = :templateId;

  -- 7. Copy step-level provenance using the step-version ID map.
  INSERT INTO knowledge_template_version_evidence (
      task_template_step_version_id, knowledge_source_version_id,
      section_or_clause, page_or_paragraph, derivation_notes,
      confidence_level, supporting_role, copied_from_template_evidence_id
  )
  SELECT stepVersionMap[step_id], knowledge_source_version_id,
         section_or_clause, page_or_paragraph, derivation_notes,
         confidence_level, supporting_role, id
  FROM knowledge_template_evidence
  WHERE task_template_step_id IN (stepIds...);

  -- 8. Seal the version. This commits only if steps exist and provenance
  --    was copied before this UPDATE.
  UPDATE task_template_versions
  SET is_step_set_sealed = TRUE
  WHERE id = versionId;
COMMIT
```

### Important unresolved items

- `activity_code_id` on `task_template_versions` has no source on `task_templates`.
- `task_template_safety_controls` are not versioned; publishing currently would drop safety controls from the immutable record.
- `ai_assisted` on the version record has no working-template source; must be caller-supplied or defaulted.

---

ATM-013F2 ADDENDUM COMPLETE — IMPLEMENTATION NOT STARTED — AWAITING CHATGPT ARCHITECTURAL REVIEW
