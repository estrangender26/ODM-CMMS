# ATM-013C2 — Atiman Knowledge Governance & Traceability Architecture

Repository: `estrangender26/ODM-CMMS`
Base: `main @ 31c9610`
Date: 2026-08-10
Status: Architecture investigation only — no schema, code, or data changes.

> **Documentation status notice**
> - **Status:** Superseded design proposal; retained as decision history.
> - **Authority:** Not approved architecture. Snapshot/JSON and unselected governance extensions are preserved only as history.
> - **Historical base:** `main @ 31c9610`.
> - **Reviewed against:** `main @ 34cae1fad779ff45220fd1783025e6cfc442b44f`.
> - **Superseded by:** ATM-013D2 and migrations `009`–`012`.

## Purpose

Strengthen the canonical maintenance-knowledge model from ATM-013C so that it satisfies Atiman’s core competitive requirement: **maintenance knowledge must be evidence-backed, traceable, versioned, reviewable, and historically reproducible.** This document separates concepts, defines provenance, lifecycle, versioning, Knowledge Packs, and traceability, and assesses the actual PostgreSQL schema for each requirement.

## 1. Canonical Conceptual Model

### 1.1 Maintenance Strategy vs. Task Family

Two different dimensions must not be collapsed into a single enum.

**Maintenance Strategy** — answers *why* the work is done:

| Strategy | Meaning |
|----------|---------|
| `preventive` | Scheduled to prevent failure |
| `predictive` | Based on condition indicators or trends |
| `condition_based` | Triggered when a condition threshold is crossed |
| `compliance` | Required by regulation, standard, or policy |
| `corrective` | Performed after a Finding or failure |

**Task Family** — answers *what kind of action* is performed:

| Family | Meaning |
|--------|---------|
| `inspect` | Observe, detect, capture evidence |
| `verify_safety` | Confirm protective devices, isolation, alarms, PPE |
| `test_measure` | Quantify, calibrate, validate function |
| `lubricate` | Apply or check lubricant condition |
| `clean` | Remove contamination or restore cleanliness |
| `adjust` | Restore setpoints, alignment, tension |
| `replace` | Exchange worn/consumable parts |

**Decision:**
- A template has **one** maintenance strategy and **one** primary task family.
- A template may contain steps from multiple families (e.g., a `test_measure` template may include an `inspect` step before taking a reading), but its primary family determines UX grouping and skill expectations.
- Legacy names `Inspection`, `Safety_check`, `Testing` map to families `inspect`, `verify_safety`, `test_measure`. Their strategy is currently `preventive` for all, which is wrong for many cases. Future content may reclassify some as `condition_based` or `compliance`.

### 1.2 Why Not Preserve the Legacy Three-Template Pattern Blindly

The legacy pattern is a convenient migration artifact, not a product axiom. Atiman should not add a third template to every future equipment type if only two are justified. Conversely, some asset classes may need additional families (e.g., `lubricate` for bearings, `clean` for filters). The canonical model therefore defines a **default three-family starter set** (`inspect`, `verify_safety`, `test_measure`) with the explicit rule that additional families are allowed where engineering evidence supports them.

## 2. Structured Provenance Model

A single free-text provenance field is insufficient. Atiman needs a first-class provenance record for every piece of governed knowledge.

### 2.1 Provenance Record Entity

```
provenance_records
  id (PK)
  subject_type (enum: template, step, criterion, safety_control, failure_mode, cause_code, damage_code, object_part, equipment_type, knowledge_pack)
  subject_id
  provenance_type (enum: manufacturer_manual, engineering_standard, internal_standard, regulatory_source, legacy_migration, engineering_authored, ai_assisted_draft, ai_reviewed, operator_feedback, field_evidence)
  source_title
  issuing_organization
  reference_number
  edition_or_revision
  publication_date
  effective_date
  source_location (URL, document ID, library path)
  section_or_clause
  page_or_paragraph
  derivation_notes (how the knowledge was adapted)
  confidence_level (enum: established, provisional, experimental, uncertain)
  created_by_user_id
  created_at
  updated_at
```

A governed knowledge row may have **multiple** provenance records (e.g., a step derived from both an OEM manual and an internal standard).

### 2.2 AI-Assisted Content Marking

Any content where AI assisted generation or review must be explicitly tagged:

- `provenance_type = 'ai_assisted_draft'` or `'ai_reviewed'`
- Additional flag `ai_involvement` (jsonb) capturing model, date, prompt version, human reviewer

**Rule:** AI-assisted content is **never authoritative**. It remains in `Draft` or `Under Review` until accountable human engineering approval moves it to `Approved`.

### 2.3 Source Authority Levels

| Source Type | Typical Authority |
|-------------|-------------------|
| Manufacturer manual | High for specific equipment |
| Engineering standard (ISO, IEC, ASME, API) | High for generic discipline |
| Internal engineering standard | High within the organization |
| Regulatory / compliance source | High for mandatory requirements |
| Legacy migration | Medium; subject to review |
| Engineering-authored | High after human approval |
| AI-assisted draft | Low until approved |
| Operator feedback / field evidence | Medium; supports revision |

## 3. Knowledge Lifecycle and Authority

### 3.1 Lifecycle States

```
Draft → Under Review → Approved → Published → Superseded → Retired
```

| State | Meaning |
|-------|---------|
| `draft` | Initial creation, may be AI-assisted, not yet reviewable |
| `under_review` | Submitted for engineering/technical review |
| `approved` | Reviewer accepted; awaiting publication scheduling |
| `published` | Approved and visible for operational use |
| `superseded` | Replaced by a newer version; historical executions still reference it |
| `retired` | No longer available for new use; retained for audit |

### 3.2 Authority and Review Metadata

Stored on the versioned knowledge record:

- `origin` — `engineering`, `imported`, `ai_assisted`, `operator_feedback`
- `author_user_id`
- `ai_assisted` (boolean)
- `ai_assistance_detail` (jsonb)
- `reviewer_user_id`
- `approver_user_id`
- `reviewed_at`
- `approved_at`
- `effective_at`
- `next_review_at`
- `change_rationale`
- `review_status` (enum)

**Rule:** Only lifecycle state `published` may be used operationally. `approved` alone is not enough; publication is the explicit operational gate.

## 4. Versioning and Historical Reproducibility

### 4.1 Immutable Version Identity

Every governed knowledge entity must have:

- `logical_id` — stable identity across versions (e.g., `task_template:123`)
- `version_id` — immutable, unique version identifier
- `version_number` — human-readable sequence
- `superseded_by_version_id` — pointer to next version
- `effective_from` / `effective_until` — validity interval

When a template is revised, a **new row** is created; the old row is marked `superseded` with `effective_until` set. Existing `inspection_results`, `findings`, and `work_orders` continue to reference the exact `version_id` that governed the execution.

### 4.2 Answering Historical Questions

> “What exact knowledge governed this inspection when it was performed?”

Traceability path:

```
inspection_result.version_id
  → task_template_versions.version_id (exact template content)
    → task_template_step_versions (each step version)
      → step_criteria_versions (numeric limits at that time)
        → step_safety_control_versions (safety requirements at that time)
          → provenance_records (evidence chain)
```

The execution record stores the version IDs, not just logical IDs. Later knowledge revisions never rewrite historical meaning.

## 5. Knowledge Pack Model

A Knowledge Pack is the unit of publication, distribution, and governance for Atiman shared knowledge.

### 5.1 Knowledge Pack Entity

```
knowledge_packs
  id (PK)
  pack_code (unique, stable)
  pack_name
  pack_version (semantic version, e.g., 1.2.0)
  pack_status (draft, under_review, approved, published, superseded, retired)
  effective_from
  effective_until
  superseded_by_pack_id
  author_user_id
  reviewer_user_id
  approver_user_id
  approved_at
  published_at
  change_summary
  ai_assisted
  created_at
  updated_at
```

### 5.2 Pack Membership

```
knowledge_pack_items
  id (PK)
  knowledge_pack_id
  item_type (equipment_category, equipment_class, equipment_type, task_template, task_template_step, activity_code, cause_code, damage_code, failure_mode, object_part, maintainable_item, subunit, industry, safety_control, acceptance_criterion)
  item_logical_id
  item_version_id
  added_at
  added_by_user_id
  change_type (added, updated, removed)
```

### 5.3 Pack Semantics

- A pack is a **snapshot** of approved knowledge versions.
- A tenant subscribes to a pack version or a pack release channel.
- Pack publication is the operational gate: only `published` packs may be used to create schedules or inspections.
- A new pack version supersedes the old one; historical operational records remain tied to the pack version they used.

## 6. End-to-End Traceability Model

### 6.1 Forward Traceability

```
Source / Evidence
  → provenance_records
    → Governed Knowledge Entity (template, step, criterion, safety control, failure mode, cause code, damage code, object part)
      → knowledge_pack_items
        → knowledge_packs (published version)
          → equipment_type
            → task_template_version
              → task_template_step_version
                → inspection_results / findings / work_orders
```

### 6.2 Backward Traceability

```
Executed Inspection / Finding / Work Order
  → task_template_version_id + task_template_step_version_id
    → task_template_version
      → equipment_type
        → knowledge_pack_items
          → knowledge_packs (exact published pack)
            → provenance_records
              → Source / Evidence
```

### 6.3 What Already Exists vs. What Is Missing

| Relationship | Current Schema | Status |
|--------------|----------------|--------|
| Equipment → Category/Class/Type | FKs exist | SUPPORTED |
| Task Template → Equipment Type | `equipment_type_id` FK | SUPPORTED |
| Task Step → Task Template | `task_template_id` FK | SUPPORTED |
| Inspection Result → Template/Step | `task_template_id`, `task_template_step_id` | SUPPORTED |
| Finding → Template/Step | `task_template_id`, `task_template_step_id` | SUPPORTED |
| Work Order → Task Template | `task_template_id` | SUPPORTED |
| Schedule → Task Master | `task_master_id` | SUPPORTED |
| Template/Step Versioning | `version` integer only; no immutable version rows | **PARTIALLY SUPPORTED** |
| Knowledge Pack | No table | **MISSING** |
| Pack Membership | No table | **MISSING** |
| Structured Provenance | No table | **MISSING** |
| Lifecycle / Review / Approval Metadata | No lifecycle columns on templates/steps | **MISSING** |
| Step-Level Acceptance Criteria | Columns exist (`min_value`, `max_value`, `expected_value`, `unit`) but unpopulated | **PARTIALLY SUPPORTED** |
| Step Safety Notes | Column exists (`safety_note`) but unpopulated | **PARTIALLY SUPPORTED** |
| Step Operating-State Constraints | Columns exist (`requires_equipment_stopped`, `prohibit_if_running`, `prohibit_opening_covers`) | **SUPPORTED** |
| Activity Code Linkage | Columns exist (`activity_code_id`) but unpopulated | **PARTIALLY SUPPORTED** |
| AI-Assisted Flagging | No column or provenance type | **MISSING** |
| Historical Reproducibility (version IDs on execution records) | Execution records reference logical IDs only, not version IDs | **MISSING** |

## 7. Actual-Schema Fitness Matrix

| Requirement | Schema Support | Notes |
|-------------|----------------|-------|
| Taxonomy (category/class/type) | SUPPORTED | Tables and FKs exist. |
| Task templates | SUPPORTED | `task_templates` table. |
| Task steps | SUPPORTED | `task_template_steps` table. |
| Maintenance strategy | PARTIALLY SUPPORTED | `maintenance_type` exists but legacy values are all `preventive`. |
| Task family | PARTIALLY SUPPORTED | `task_kind` exists; legacy values map to inspect/verify_safety/test_measure. |
| Acceptance criteria | PARTIALLY SUPPORTED | Columns exist but unpopulated. |
| Safety notes | PARTIALLY SUPPORTED | Column exists but unpopulated. |
| Activity taxonomy linkage | PARTIALLY SUPPORTED | `activity_code_id` exists on template and step but unpopulated. |
| Versioning | PARTIALLY SUPPORTED | `version` integer only; no immutable rows or supersession. |
| Lifecycle governance | MISSING | No state machine, reviewer/approver, effective dates. |
| Structured provenance | MISSING | No provenance table. |
| Knowledge Packs | MISSING | No pack or pack-membership tables. |
| Historical reproducibility | MISSING | Execution records lack version IDs. |
| AI-assisted marking | MISSING | No flag or provenance type. |
| Review/approval audit | MISSING | No review/approval metadata. |

**Conclusion:** The existing schema is **not sufficient** for full knowledge governance and traceability. Minimum additions are required.

## 8. Improved Quality-Scoring Rubric

Updated rubric that also considers provenance, authority, and governance.

| # | Dimension | Retain Threshold |
|---|-----------|------------------|
| D1 | Evidence / provenance | At least one structured provenance record exists and cites a real source, standard, or accountable author. AI-assisted drafts must be flagged and pending approval. |
| D2 | Technical specificity | ≥60% of steps are equipment-type-specific and describe observable/measurable actions. |
| D3 | Actionability | Every step can be executed by an operator or technician without undefined judgment. |
| D4 | Measurable acceptance criteria | ≥1 step has `expected_value`, `min_value`/`max_value`, or pass/fail criterion. |
| D5 | Safety adequacy | Hazards (mechanical, electrical, pressure, chemical, thermal) are explicitly addressed via step-level safety notes or safety-control linkage. |
| D6 | Frequency basis | Frequency and duration are plausible for the strategy and asset; not universal defaults. |
| D7 | Applicability | Template applies to the correct equipment type and task scope (operator/technician/specialist). |
| D8 | Source authority | Provenance source has acceptable authority (manufacturer, standard, internal standard, regulatory) or has been through engineering approval. |
| D9 | Review / approval status | Lifecycle state is `published` (or, during migration, `approved` with documented rationale). |

### Classification

| Result | Criteria |
|--------|----------|
| **Retain** | Passes all dimensions; fully governed and operation-ready. |
| **Revise** | Fails 1–3 dimensions; content is sound but metadata, criteria, safety, or provenance need enrichment. |
| **Reject** | Fails 4+ dimensions, provenance is missing/unknown, or content is misleading/unsafe. |

### Migration Triage Rule

For legacy imported content, the lifecycle state during triage is `under_review`. A template is promoted to `approved` only after provenance is assigned and the rubric passes. It becomes `published` when included in an approved Knowledge Pack.

## 9. Minimum Recommended Architecture Changes

### Required New Tables

1. `knowledge_packs`
2. `knowledge_pack_items`
3. `provenance_records`
4. `knowledge_reviews` (reviewer, review date, comments, disposition)
5. `knowledge_approvals` (approver, approval date, rationale)

### Required Schema Additions to Existing Tables

1. `task_templates`
   - `lifecycle_state` (draft, under_review, approved, published, superseded, retired)
   - `logical_id` or use `id` as logical + add `version_id` if full versioning implemented
   - `effective_from`, `effective_until`
   - `superseded_by_template_id`
   - `author_user_id`, `reviewer_user_id`, `approver_user_id`
   - `reviewed_at`, `approved_at`, `published_at`
   - `change_rationale`
   - `ai_assisted` (boolean)
   - `ai_assistance_detail` (jsonb)

2. `task_template_steps`
   - Same lifecycle/versioning/approval columns.
   - `logical_id` + `superseded_by_step_id` if full versioning.

3. `inspection_results`, `findings`, `work_orders`
   - `task_template_version_id` or `task_template_snapshot_id` (immutable reference)
   - `task_template_step_version_id` or step snapshot reference
   - `knowledge_pack_id`, `knowledge_pack_version_id`

### Simpler Migration-Friendly Alternative

Instead of full row-versioning tables, add:

- `task_templates.content_hash` (or `template_snapshot` jsonb) capturing the exact approved content at execution time.
- `inspection_results.task_template_snapshot_id` referencing a new `template_snapshots` table with immutable JSON snapshots.

This satisfies historical reproducibility without redesigning every knowledge entity table.

## 10. Recommended Next Bounded Task

**ATM-013D — Knowledge Governance Schema Design**

Deliverables:
- Exact DDL for the minimum new tables and column additions.
- Migration path that preserves the 846 existing templates and 3,099 steps while marking them `under_review`.
- Decision on whether to use full row-versioning or snapshot-based versioning.
- Updated bootstrap script requirements so future knowledge imports include provenance and lifecycle metadata.

Do not implement until ChatGPT approves the schema design.

## Conclusion

Atiman’s competitive requirement for evidence-backed, traceable, versioned, and reviewable maintenance knowledge cannot be met by the current schema alone. The legacy three-template pattern can remain as a default task-family starter set, but governance, provenance, versioning, and Knowledge Packs must be added as first-class architecture. AI-assisted content must always remain subordinate to accountable human approval.

STOP for ChatGPT architecture review.
