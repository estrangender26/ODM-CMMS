# ATM-001 — Atiman Knowledge Foundation

**Document ID:** ATM-001  
**Title:** Atiman Knowledge Foundation  
**Status:** Controlled Architecture Document — Draft for Review  
**Repository:** `/Users/gcb/Documents/GitHub/ODM-CMMS`  
**Branch:** `atm-001-knowledge-foundation`  
**Date:** 2026-08-10  
**Author:** Implementation Architect  
**Reviewer:** Chief Architect / Product Architect

---

## Executive Summary

The **Knowledge Foundation** is the second layer of the Atiman architecture (ATM-000). It is the authoritative, versioned, reusable repository of maintenance and engineering knowledge that makes Atiman an Asset Operations and Intelligence Platform rather than a generic work-order system.

This document defines the domains, entities, relationships, lifecycle, governance, and boundaries of the Atiman Knowledge Foundation. It is a design document only. No schema changes, code, or database modifications are included.

---

## 1. Purpose

The Knowledge Foundation exists to:

1. Capture institutional maintenance knowledge independently of any customer, asset, or operational moment.
2. Provide a governed, versioned reference that operational applications and asset intelligence can consume.
3. Enable reuse of knowledge across customers, assets, and industries without duplication.
4. Support continuous improvement of knowledge based on operational evidence and expert review.
5. Keep knowledge separate from operational/transactional data.

---

## 2. Constitutional Alignment

The Knowledge Foundation directly supports the seven axioms of ATM-000:

| Axiom | Knowledge Foundation Contribution |
|-------|-------------------------------------|
| **Knowledge Before Transactions** | Knowledge exists and is validated before any operational finding or escalation is created. |
| **Findings Before Work Orders** | Findings are assessed against knowledge; knowledge provides the basis for recommended action outcomes. |
| **Operators Are the First Sensors** | Knowledge encodes what operators should look for, how to interpret observations, and when to escalate. |
| **Integrate Rather Than Replace** | Knowledge is shared reference data exchanged with enterprise systems; it does not replace EAM master data ownership. |
| **AI Augments Human Judgment** | AI consumes governed knowledge and evidence; it does not author authoritative knowledge. |
| **Evidence Before Assumption** | Knowledge is updated based on validated operational evidence, not speculation. |
| **Experience Follows Work** | Knowledge is surfaced in task-first workflows for operators, supervisors, and engineers. |

---

## 3. Knowledge Domains

The Knowledge Foundation is organized into four domains.

### 3.1 Engineering / Equipment Taxonomy

Defines the classification system for physical assets and their components.

| Entity | Purpose | Retain / Refactor / Remove |
|--------|---------|---------------------------|
| `industries` | Industries in which assets operate. | **Retain** |
| `equipment_categories` | Top-level equipment categories (e.g., Rotating, Electrical, Instrumentation). | **Retain** |
| `equipment_classes` | Classes within a category (e.g., Centrifugal Pump, Motor). | **Retain** |
| `equipment_types` | Specific equipment types within a class. | **Retain** |
| `equipment_type_industries` | Maps types to industries with criticality. | **Retain** |
| `subunits` | Sub-assemblies within an equipment type. | **Retain** |
| `maintainable_items` | Components within a subunit that can be maintained. | **Retain** |
| `object_parts` | Parts/objects associated with an equipment class for failure context. | **Retain** |
| `equipment` | Customer-specific installed assets. | **Remove from Knowledge Foundation** — belongs to operational/tenant data. |
| `equipment_subunits` | Instance mapping of subunits to installed equipment. | **Remove from Knowledge Foundation** — belongs to operational/tenant data. |
| `equipment_mapping_change_log` | Audit of equipment reclassifications. | **Remove from Knowledge Foundation** — belongs to operational/tenant data. |

### 3.2 Reliability Taxonomy

Defines failure language and maintenance activity language.

| Entity | Purpose | Retain / Refactor / Remove |
|--------|---------|---------------------------|
| `activity_codes` | Standard maintenance activities (Inspect, Lubricate, Replace, etc.). | **Retain** |
| `cause_codes` | Failure cause taxonomy. | **Retain** |
| `damage_codes` | Damage mode taxonomy. | **Retain** |
| `failure_modes` | Equipment-type-specific failure modes. | **Retain** |

### 3.3 Knowledge Organization

Defines how knowledge is grouped into reusable, versioned packs.

| Entity | Purpose | Retain / Refactor / Remove |
|--------|---------|---------------------------|
| `task_template_equipment_types` | **Proposed.** Many-to-many applicability between task templates and equipment types. | **Add** — replaces family-based mapping. |
| `seed_batches` / `seed_batch_entities` | Legacy batch tracking for template seeding. | **Remove** — replace with explicit Knowledge Pack provenance. |
| `equipment_type_family_proposals` | Customer proposals for new family mappings. | **Remove** — replace with governed knowledge contribution workflow. |
| `template_families` | Named families of maintenance templates. | **Remove** — legacy Manila Water organization construct; not Atiman architecture. |
| `template_family_rules` | Default rules per family. | **Remove** — depends on removed `template_families`. |
| `equipment_type_family_mappings` | Maps equipment types to template families. | **Remove** — replaced by `task_template_equipment_types`. |
| `smp_families` | Standard Maintenance Procedure families. | **Remove** — associated with the excluded legacy family/SMP architecture; not retained. |
| `smp_tasks` | Tasks within an SMP family. | **Remove** — depends on removed `smp_families`. |

### 3.4 Maintenance Knowledge

Defines the actual executable maintenance content.

| Entity | Purpose | Retain / Refactor / Remove |
|--------|---------|---------------------------|
| `task_master` | Canonical master task definitions. | **Retain and refactor** — must become organization-agnostic or scoped to Atiman shared knowledge. |
| `task_templates` | Maintenance procedures applicable to one or more equipment types. | **Retain** |
| `task_template_steps` | Individual steps within a template. | **Retain** |
| `task_template_safety_controls` | Safety controls linked to a template. | **Retain** |
| `task_template_equipment_types` | **Proposed.** Many-to-many mapping of task templates to equipment types. | **Add** — replaces family-based and SMP-based task grouping. |

---

## 4. Refactoring Requirements

### 4.1 Separate operational data from knowledge domain

The following tables belong to the operational/transactional domain, not the Knowledge Foundation. They must be conceptually separated and should not be treated as knowledge entities. The physical implementation (same schema with tenant discriminator, separate schema, or separate database) is an open implementation decision for ATM-003 / platform foundation.

- `equipment`
- `equipment_subunits`
- `equipment_mapping_change_log`
- `schedules`
- `maintenance_plans`
- `plan_equipment`
- `work_orders`
- `work_order_notes`
- `work_order_failures`
- `findings`
- `inspection_points`
- `inspection_readings`
- `inspection_results`

### 4.2 Replace legacy seed-batch provenance

`seed_batches` and `seed_batch_entities` are operational artifacts from a one-time legacy import. They should be replaced with a first-class **Knowledge Pack provenance** model that records:

- Pack name and version.
- Author / source.
- Import timestamp.
- Approval state.
- Origin reference (e.g., legacy dump, expert authoring, marketplace).

### 4.3 Decouple knowledge from operational organizations

Several knowledge tables currently carry `organization_id` and `created_by` columns that tie them to tenant operational data:

- `task_master.organization_id`
- `task_master.created_by`
- `task_templates.organization_id`
- `task_templates.created_by`

**Refactor:**

- Shared knowledge must not have `organization_id`.
- Customer knowledge may have `organization_id`.
- Authorship should be tracked through provenance, not operational user IDs.
- Introduce a `knowledge_scope` discriminator (`shared`, `customer`, `marketplace`) or equivalent.

### 4.4 Introduce lifecycle state

Every knowledge entity must have a lifecycle state:

- `draft`
- `review`
- `published`
- `deprecated`
- `retired`

The current schema has `is_active` booleans but no lifecycle model. `is_active` should become a derived or supplementary flag.

### 4.5 Introduce versioning

Knowledge entities must support explicit versioning:

- `version` integer or semantic version string.
- `replaced_by_version_id` (self-reference for history chain).
- `effective_from` / `effective_to` timestamps.
- `published_at` timestamp.

Currently, `task_templates` has a `version` integer but no history chain. This must be generalized across the Knowledge Foundation.

### 4.6 Strengthen provenance and evidence

Add provenance tracking to knowledge entities:

- `author_source` (expert, import, AI-suggested, customer).
- `origin_id` (link to import batch / marketplace pack / contribution request).
- `evidence_summary` (why this knowledge exists; references to findings, standards, or expert review).
- `review_status` and `reviewed_by` / `reviewed_at`.

---

## 5. Knowledge Relationships

The Knowledge Foundation forms a directed acyclic graph. Core relationships:

```
equipment_categories
  └─ equipment_classes
       ├─ equipment_types
       │    ├─ equipment_type_industries → industries
       │    ├─ task_template_equipment_types → task_templates
       │    ├─ failure_modes
       │    ├─ subunits
       │    │    └─ maintainable_items
       │    ├─ task_master
       │    └─ task_templates
       │         ├─ task_template_steps → activity_codes
       │         └─ task_template_safety_controls
       ├─ damage_codes
       ├─ object_parts
       └─ cause_codes (nullable)
```

Most relationships within the Knowledge Foundation are many-to-one. Task-template-to-equipment-type applicability is intentionally many-to-many. There are no cyclic FK dependencies within the Knowledge Foundation.

Cross-boundary references (e.g., operational findings referencing `task_template_id`) are allowed from operational layers upward, but operational data does not reside in the Knowledge Foundation.

---


### 5.1 Proposed Physical Schema: `task_template_equipment_types`

The legacy family-based indirection (`equipment_type_family_mappings` → `template_families` → `template_family_rules`) is removed. In its place, Atiman uses a direct many-to-many applicability table:

```sql
CREATE TABLE task_template_equipment_types (
    task_template_id INTEGER NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
    equipment_type_id INTEGER NOT NULL REFERENCES equipment_types(id) ON DELETE CASCADE,
    PRIMARY KEY (task_template_id, equipment_type_id)
);
```

Rationale:
- A task template may apply to multiple equipment types.
- An equipment type may have multiple applicable task templates.
- No legacy family or SMP constructs are retained.
- Scope and lifecycle of the applicability row follow the referenced task template.

This table is **proposed physical schema** pending ATM-003 / platform-foundation decisions on schema organization.

## 6. Knowledge Packs

A **Knowledge Pack** is a curated, versioned, deployable bundle of knowledge.

### 6.1 Pack Contents

A pack may contain:

- A subset of engineering taxonomy.
- Reliability taxonomy.
- Maintenance knowledge (task master, templates, steps, safety controls).
- Equipment-type applicability for templates (`task_template_equipment_types`).

### 6.2 Pack Metadata

| Field | Purpose |
|-------|---------|
| `pack_code` | Unique canonical identifier. |
| `pack_name` | Human-readable name. |
| `version` | Semantic version. |
| `description` | What the pack covers. |
| `applicable_industries` | Industries for which the pack is designed. |
| `author` | Origin of the pack. |
| `status` | Lifecycle state. |
| `published_at` | When the pack became available. |
| `dependencies` | Other packs required. |

### 6.3 Pack Lifecycle

```
Draft → Review → Published → Deprecated → Retired
```

### 6.4 Pack Deployment

*Open architectural question — pending ATM-002 / implementation review.*

Possible deployment models include:

- **Snapshot copy:** The tenant receives a point-in-time copy scoped as customer knowledge. Updates to the shared pack are offered separately.
- **Reference with overlay:** The tenant references shared knowledge and stores only customizations as customer knowledge.
- **Hybrid:** Core shared knowledge is referenced; adopted templates are copied for customization.

The exact model will be decided during platform-foundation and experience-architecture design.

### 6.5 Future Marketplace

*Proposed Future Architecture.* A marketplace may allow third-party authors to publish packs. Governance, certification, ownership, and licensing are not defined in ATM-001 and require a separate Project Source.

---

## 7. Provenance and Evidence

Every knowledge entity must carry provenance metadata:

| Field | Purpose |
|-------|---------|
| `author_source` | How the entity was created (expert, import, AI-suggested, customer). |
| `origin_id` | Link to import batch, pack, or contribution request. |
| `evidence_summary` | Human-readable justification. |
| `review_status` | `pending`, `approved`, `rejected`. |
| `reviewed_by` | Identifier of approving entity. |
| `reviewed_at` | Approval timestamp. |

Evidence for knowledge updates may come from:

- Expert engineering review.
- Operational findings and outcomes.
- Customer feedback.
- Standards or manufacturer documentation.
- AI-suggested drafts validated by humans.

---

## 8. Versioning and Lifecycle

### 8.1 Lifecycle States

| State | Meaning |
|-------|---------|
| `draft` | Under construction; not visible to operational apps. |
| `review` | Pending validation and approval. |
| `published` | Available for operational use. |
| `deprecated` | Still usable but no longer recommended for new use. |
| `retired` | Not available for new operational use; retained for history. |

### 8.2 Versioning Rules

- A published version is immutable except for lifecycle state changes.
- Edits create a new version.
- Historical versions remain readable.
- Operational references point to a specific published version.
- A version may be deprecated or retired independently of newer versions.

### 8.3 Effective Dates

- `effective_from` / `effective_to` define when a version is the active default.
- Operational apps may continue using an explicitly selected older version.

---

## 9. Validation and Approval

### 9.1 Automated Validation

Every knowledge entity must pass automated checks before publication:

- **Referential integrity:** All FK targets exist and are published (or nullable where allowed).
- **Uniqueness:** Canonical codes are unique within their scope.
- **Completeness:** Required fields, steps, and safety controls are present.
- **Rule conformance:** Frequency units, durations, and categorical values are valid.
- **No cycles:** Template parent/child relationships must not form cycles.

### 9.2 Human Approval

- Draft → Review requires submission.
- Review → Published requires approval by a qualified reviewer.
- Retirement or deprecation requires approval.

### 9.3 Approval Records

- Approval is recorded in provenance metadata.
- Rejection includes reason and recommended corrections.

---

## 10. Organization and Customer Knowledge

### 10.1 Shared Knowledge

- Scoped globally (no `organization_id`).
- Available to all tenants for reference and adoption.
- Immutable to tenants.

*Ownership, licensing, and intellectual-property models for shared knowledge are **Proposed Future Architecture** — not established policy.*

### 10.2 Customer Knowledge

- Scoped to a tenant via `organization_id`.
- May be a customization, extension, or private creation.
- Subject to the same lifecycle and validation rules as shared knowledge.
- Does not leak to other tenants.

*Whether tenants hold intellectual-property rights in their customizations is **Proposed Future Architecture** — not established policy.*

### 10.3 Knowledge Adoption

- A tenant adopts shared knowledge by deploying a Knowledge Pack.
- The tenant receives a scoped view or copy of the pack's knowledge as customer knowledge.
- The tenant may customize it without affecting the shared original.

*Whether adoption is implemented as a snapshot copy, a reference, or a hybrid is an **open architectural question** pending ATM-002 / implementation review.*

---

## 11. Governance

### 11.1 Governance Principles

- Knowledge quality is measurable and enforced.
- Changes to published knowledge require review.
- Customer customizations are governed by the tenant.

*Ownership of shared knowledge, contributor certification, and marketplace governance are **Proposed Future Architecture** — not established policy.*

### 11.2 Governance Roles

| Role | Responsibility |
|------|----------------|
| Knowledge Author | Creates and updates knowledge. |
| Knowledge Reviewer | Validates knowledge for publication. |
| Knowledge Steward | Responsible for a domain or pack; decides deprecation/retirement. |
| Tenant Admin | Manages customer knowledge and pack adoption. |

### 11.3 Quality Metrics

- Completeness score per template.
- Validation failure rate.
- Review cycle time.
- Operational outcome correlation (evidence quality).

---

## 12. Boundaries with Operational / Transactional Data

### 12.1 Knowledge Foundation Does NOT Contain

- Installed assets (`equipment`).
- Asset instances and runtime data.
- Work orders or work-order history.
- Findings, inspection readings, or inspection results.
- Schedules and maintenance plans.
- User operational activity.
- Commercial subscriptions or payments.
- Audit logs.

### 12.2 Operational Data May Reference Knowledge

- A finding may reference `failure_mode_id`.
- An inspection may reference `task_template_id`.
- An escalation may include `task_master_id`.

These references are upward-pointing only. Knowledge does not depend on operational data.

### 12.3 Data Scope and Lifespan

| Type | Scope | Lifespan |
|------|-------|----------|
| Shared knowledge | Global / no `organization_id` | Long-term, versioned. |
| Customer knowledge | Tenant-scoped via `organization_id` | Tenant lifetime, versioned. |
| Operational evidence | Tenant-scoped | Tenant-defined retention. |

*Ownership, licensing, and data-residency policy for any of the above are **Proposed Future Architecture** — not established policy.*

---

## 13. Requirements for Knowledge Services

The Knowledge Foundation imposes these requirements on Knowledge Services (ATM-003+):

1. **Query by context:** Given an asset type, industry, role, and task, return the right knowledge version.
2. **Validate before use:** Ensure referenced knowledge is published and not retired.
3. **Resolve packs:** Return all knowledge included in a pack version.
4. **Track adoption:** Know which tenant has adopted which pack versions.
5. **Support customization:** Allow tenant-specific overrides that remain scoped.
6. **Publish events:** Emit events when knowledge is published, deprecated, or retired.

---

## 14. Requirements for AI

The Knowledge Foundation imposes these requirements on AI (Intelligence Layer):

1. **Authoritative source:** AI must consume published knowledge; it may not create authoritative knowledge directly.
2. **Evidence-based suggestions:** AI-suggested knowledge updates must include evidence and enter the review workflow.
3. **Traceability:** AI recommendations must cite the knowledge entities they rely on.
4. **No hallucination:** AI cannot invent procedures, failure modes, or safety controls outside governed knowledge.
5. **Human gate:** AI drafts may accelerate authoring; human reviewers must approve publication.

---

## 15. Legacy Concepts That Must NOT Survive

| Legacy Concept | Why It Must Not Survive | Replacement |
|----------------|-------------------------|-------------|
| `seed_batches` / `seed_batch_entities` | One-time operational import artifact. | Knowledge Pack provenance. |
| `equipment_type_family_proposals` | Ad-hoc customer proposal table. | Governed knowledge contribution workflow. |
| `template_families` / `template_family_rules` / `equipment_type_family_mappings` | Legacy family construct associated with the excluded SMP architecture; couples templates to operational groupings. | `task_template_equipment_types` many-to-many applicability. |
| `smp_families` / `smp_tasks` | Legacy SMP construct associated with the excluded family architecture; not retained in Atiman. | Excluded from architecture. |
| `equipment` in knowledge schema | Installed assets are operational data. | Operational tenant schema. |
| `organization_id` on shared knowledge | Ties shared knowledge to a tenant. | Knowledge scope discriminator. |
| `is_active` as only lifecycle flag | Insufficient for draft/review/published/retired. | Full lifecycle state + effective dates. |
| Work-order-centric templates | Templates were written assuming internal work-order execution. | Finding-centric, EAM-agnostic templates. |

---

## 16. What Can Be Retained from Existing Schema

The following tables are structurally sound and require only additive changes (lifecycle, versioning, provenance, scope):

- `industries`
- `equipment_categories`
- `equipment_classes`
- `equipment_types`
- `equipment_type_industries`
- `subunits`
- `maintainable_items`
- `object_parts`
- `activity_codes`
- `cause_codes`
- `damage_codes`
- `failure_modes`
- `task_templates`
- `task_template_steps`
- `task_template_equipment_types` *(proposed many-to-many applicability)*
- `task_template_safety_controls`
- `task_master`

---

## 17. What Is Missing from Existing Schema

| Missing Concept | Needed For |
|-----------------|------------|
| Knowledge Pack entity | Pack versioning, deployment, and marketplace. |
| Lifecycle state column | Governance and operational availability. |
| Version history chain | Traceability and rollback. |
| Effective dates | Safe transitions between versions. |
| Provenance metadata | Trust, audit, and evidence. |
| Knowledge scope discriminator | Shared vs. customer vs. marketplace knowledge. |
| Knowledge Pack adoption records | Tenant deployment tracking. |
| Review / approval workflow | Governance. |
| Knowledge-to-knowledge dependencies | Pack dependency resolution. |
| Contribution request entity | Replacing `equipment_type_family_proposals`. |
| Task-template-to-equipment-type applicability | Replacing family mappings with direct many-to-many relationship. |

---

## 18. Open Questions

1. Should Knowledge Packs be versioned independently of their constituent entities, or should pack versions be snapshots?
2. What is the canonical identifier scheme for customer-customized knowledge to avoid collisions with shared knowledge?
3. Which roles perform knowledge review in a single-tenant bootstrap versus multi-tenant operation?
4. How are manufacturer standards and regulatory requirements represented in knowledge provenance?
5. What is the exact schema location for operational tenant data (separate schema, separate database, tenant column)?
6. Should AI-suggested knowledge be visually distinguishable from expert-authored knowledge in the review queue?
7. What is the retirement policy for knowledge referenced by historical operational evidence?

---

## 19. Decision Record

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Keep taxonomy and maintenance knowledge; remove installed asset tables from Knowledge Foundation. | Knowledge must be independent of customer installations. |
| 2 | Replace `seed_batches` with Knowledge Pack provenance. | Seed batches are operational import artifacts, not a product concept. |
| 3 | Remove `organization_id` from shared knowledge. | Shared knowledge is tenant-agnostic. |
| 4 | Introduce lifecycle state and explicit versioning. | `is_active` alone cannot govern knowledge maturity. |
| 5 | Require provenance on every knowledge entity. | Trust and auditability require origin and evidence. |
| 6 | Keep operational references upward-only. | Knowledge remains authoritative and independent. |
| 7 | Refactor templates to be finding-centric and EAM-agnostic. | Aligns with Atiman's Finding Before Work Orders axiom. |
| 8 | Marketplace is Proposed Future Architecture. | Business rules for external contributors are not yet authorized. |

---

## STOP

This is a design document only.  
No schema changes, code, database modifications, or deployment actions have been performed.  
Awaiting ChatGPT architectural review.
