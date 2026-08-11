# ATM-013C — Atiman Canonical Maintenance Knowledge Model

Repository: `estrangender26/ODM-CMMS`
Base: `main @ 31c9610`
Date: 2026-08-10
Status: Architecture investigation only — no schema, code, or data changes.

> **Documentation status notice**
> - **Status:** Proposed design reference; not approved architecture.
> - **Authority:** Proposed canonical model only. No new schema fields are approved by this document.
> - **Historical base:** `main @ 31c9610`.
> - **Reviewed against:** `main @ 34cae1fad779ff45220fd1783025e6cfc442b44f`.
> - **Clarification:** The three strategies are a proposed starter pattern, not a mandatory fixed template count for every equipment type.

## Purpose

Define the canonical maintenance-knowledge model that Atiman should use to classify, improve, and expand the imported legacy task-template library. This model becomes the standard against which existing templates are scored and future templates are authored.

## Findings from ATM-013B

The legacy library has two layers:

1. **A valuable but inconsistent content layer.** Some templates are technically specific and reusable (pumps, blowers, reverse osmosis, instrumentation). Others are generic electrical-machine boilerplate reused across unrelated assets (turbo generators, transformers, motors).
2. **A rigid but usable structural layer.** Every equipment type has exactly three templates named `{Type} - Inspection`, `{Type} - Safety_check`, and `{Type} - Testing`, all with frequency=1 month, duration=60 minutes, and `preventive` maintenance type.

The canonical model must preserve the useful structure while fixing the content and metadata.

## 1. Canonical Template Structure

### Recommended: retain the three-template family, but rename it as maintenance strategies.

Instead of treating Inspection / Safety_check / Testing as arbitrary template names, Atiman should adopt them as **maintenance strategies** or **task kinds** that apply to every equipment type.

| Atiman Strategy | Purpose | Typical Frequency | Typical Duration |
|-----------------|---------|-------------------|------------------|
| **Inspect** | Observe condition, detect anomalies, capture evidence | condition-based or periodic (daily to monthly) | short (15–45 min) |
| **Verify Safety** | Confirm protective devices, isolation, guarding, alarms, emergency systems | periodic (weekly to monthly) | short (15–30 min) |
| **Test / Measure** | Quantify performance, calibrate, validate function, record readings | periodic (monthly to annual) | medium (30–120 min) |

Rationale:
- The three-strategy split mirrors operator workflows: look, protect, prove.
- It is simple enough to be taught to non-specialists.
- It is rich enough to cover preventive, condition-based, and compliance needs.
- It maps directly to the existing legacy template kinds, so migration is lossless.

### What NOT to do

- Do not invent a different set of strategies for every asset class. Atiman needs a small, consistent vocabulary.
- Do not overload one strategy with unrelated work. Safety checks should not be hidden inside Inspection.
- Do not keep the legacy names “Safety_check” and “Testing” as user-facing labels; use “Verify Safety” and “Test / Measure.”

## 2. Required Template-Level Fields

| Field | Status | Notes |
|-------|--------|-------|
| `equipment_type_id` | Required | What asset this template applies to. |
| `organization_id` | Nullable | NULL = shared Atiman knowledge; non-NULL = tenant-specific. |
| `template_name` | Required | Human-readable, strategy-qualified name. |
| `template_code` | Optional | Stable short code for imports, APIs, and QR workflows. |
| `maintenance_type` | Required | `preventive`, `predictive`, `condition_based`, `corrective`, `compliance`. Legacy default `preventive` is too narrow. |
| `task_kind` | Required | Canonical strategy: `inspect`, `verify_safety`, `test_measure`. Maps from legacy `Inspection`, `Safety_check`, `Testing`. |
| `task_scope` | Optional | `operator`, `technician`, `specialist`, `contractor`. |
| `frequency_value` + `frequency_unit` | Optional but recommended | Must vary per strategy and asset. Remove the fixed 1-month / 60-minute default. |
| `estimated_duration_minutes` | Optional | Should reflect actual expected effort. |
| `priority` | Optional | `low`, `medium`, `high`, `critical`. |
| `required_skills` | Optional | List of skills/certifications. |
| `required_tools` | Optional | List of tools/instruments. |
| `description` | Optional | Long-form context for the template. |
| `activity_code_id` | Optional | High-level activity classification (e.g., INSPECT, TEST). |
| `is_system` | Required | TRUE for shared Atiman knowledge; FALSE for tenant-authored. |
| `is_editable` | Required | FALSE for shared knowledge; TRUE for tenant copies. |
| `version` | Required | Increment when content changes. |
| `parent_template_id` | Optional | For tenant copies that trace back to a shared template. |
| `provenance` / `source` | Proposed | Free-text or JSON describing origin, author, standard (e.g., OEM manual, ISO 14224, company SME). |

The existing schema already contains most of these fields. The proposed additions are conceptual (`provenance`) or value changes (`maintenance_type`, `task_kind`).

## 3. Required Step-Level Fields

The existing `task_template_steps` schema is already well-designed; it is simply underutilized.

| Field | Status | Canonical Use |
|-------|--------|---------------|
| `step_no` | Required | Order within the template. |
| `step_type` | Required | `instruction`, `measurement`, `check`, `selection`, `photo`, `note`. Legacy uses only `instruction`. |
| `instruction` | Required | Clear, equipment-specific action. |
| `activity_code_id` | Optional but recommended | Link to `activity_codes` (e.g., INSPECT, LUBRICATE, CALIBRATE). |
| `data_type` | Optional | For `measurement`/`selection`: `number`, `text`, `boolean`, `enum`, `photo`, `timestamp`. |
| `expected_value` | Optional | Target value or pass/fail criterion text. |
| `min_value`, `max_value`, `unit` | Optional | Numeric acceptance limits. |
| `options` (jsonb) | Optional | Enum choices for `selection` steps. |
| `is_required` | Required | Whether the step must be completed. |
| `safety_note` | Optional but strongly recommended | Step-specific hazard and mitigation. Currently 0 populated. |
| `is_visual_only` | Optional | Step can be completed by visual inspection only. |
| `requires_equipment_stopped` | Optional | Lockout/tagout required. |
| `prohibit_if_running` | Optional | Step must not be performed while equipment is running. |
| `prohibit_opening_covers` | Optional | Guard/cover removal prohibited for this step. |

### Step-type semantics

| Step Type | Example |
|-------------|---------|
| `instruction` | “Inspect impeller wear rings for erosion.” |
| `measurement` | “Measure bearing housing temperature” with max=85°C. |
| `check` | “Confirm coupling guard is in place” with expected=Yes. |
| `selection` | “Select seal condition: dry / leaking / weeping.” |
| `photo` | “Photograph oil sight glass level.” |
| `note` | “Record any unusual odor or noise.” |

## 4. Coexistence of Maintenance Strategies

Atiman must support multiple maintenance philosophies without confusing users:

| Philosophy | How it maps to the canonical model |
|------------|-----------------------------------|
| **Operator rounds / inspections** | `Inspect` templates with short, visual, pass/fail steps. |
| **Preventive maintenance** | Scheduled `Inspect` + `Verify Safety` + `Test / Measure` at fixed frequencies. |
| **Predictive / condition-based maintenance** | `Test / Measure` templates with numeric thresholds and trendable readings. |
| **Compliance / regulatory checks** | `Verify Safety` templates with required evidence and audit trail. |
| **Corrective / reactive tasks** | Author-on-demand; not part of the canonical three-strategy shared library, but may be created by tenants from a template or from a Finding. |

Shared Atiman knowledge should focus on **operator inspection**, **preventive**, and **condition-based** templates. Compliance and corrective tasks are tenant-specific operational workflows.

## 5. Quality-Scoring Rubric

Each existing or candidate template should be scored against five dimensions. A template scores **Retain** if it passes all dimensions at a basic level, **Revise** if it fails 1–2 dimensions, and **Reject** if it fails 3+ dimensions or contains unsafe/misleading guidance.

### Dimensions

| # | Dimension | What to look for | Retain threshold |
|---|-----------|------------------|------------------|
| D1 | Equipment specificity | Instructions mention real components of the equipment type, not generic electrical/mechanical boilerplate. | ≥60% of steps are type-specific. |
| D2 | Technical meaningfulness | Steps describe observable, measurable, or verifiable actions an operator or technician can perform. | All steps are actionable and unambiguous. |
| D3 | Acceptance criteria | At least one step has expected value, min/max, unit, or pass/fail criterion. | ≥1 measurement or check step with criteria. |
| D4 | Safety content | Template has safety-specific steps or step-level safety notes for hazards (lockout, high voltage, pressure, chemical, rotating parts). | Safety hazards are addressed explicitly. |
| D5 | Frequency and duration realism | Frequency and duration are plausible for the strategy and asset type, not default 1 month / 60 minutes. | Values differ from defaults or are justified. |

### Classification

| Result | Score | Action |
|--------|-------|--------|
| **Retain** | Passes all 5 dimensions | Keep as shared Atiman knowledge with minor copy edits if needed. |
| **Revise** | Fails 1–2 dimensions | Rewrite weak steps, add acceptance criteria or safety notes, adjust frequency/duration. Keep the template identity. |
| **Reject** | Fails 3+ dimensions | Remove from shared knowledge. Do not migrate to new leaf types. May be replaced by a new authoritative template later. |

### Examples from ATM-013B

| Template | D1 Specificity | D2 Actionable | D3 Criteria | D4 Safety | D5 Realism | Result |
|----------|----------------|---------------|-------------|-----------|------------|--------|
| End Suction Pump — Inspection | High | Yes | Low (no numeric limits) | Medium (implicit) | Low (default) | **Revise** |
| Multistage Centrifugal — Testing | High | Yes | Medium | High | Low (default) | **Revise** |
| Reverse Osmosis — Inspection | High | Yes | Medium | High | Low (default) | **Revise** |
| Electromagnetic — Testing | High | Yes | Medium | Medium | Low (default) | **Revise** |
| Mine Hoist — Safety Check | High | Yes | Medium | High | Low (default) | **Revise** |
| TEFC Motor — Inspection | Medium | Yes | Low | Low | Low (default) | **Revise** |
| Turbo Generator — Inspection | Low (generic) | Yes | Low | Low | Low (default) | **Revise** or **Reject** |
| Step-Up Transformer — Inspection | Low (generic) | Yes | Low | Low | Low (default) | **Revise** or **Reject** |

**Important:** Almost every legacy template will land in **Revise**, not Retain, because D5 (fixed defaults) is universally failed. A template should not be rejected merely for default frequency/duration; it should be rejected only when content is misleading or generic across unrelated assets.

## 6. Recommended First Normalization Batch

Do not attempt to normalize all 846 templates at once. Start with a representative batch that tests the canonical model and delivers immediate value.

### Batch 1 — Pump Family

- 22 existing pump types.
- Content is already strong.
- Work:
  - Convert `maintenance_type` from `preventive` to strategy-appropriate values.
  - Map `task_kind`: Inspection → `inspect`, Safety_check → `verify_safety`, Testing → `test_measure`.
  - Add numeric acceptance criteria to Testing steps (e.g., vibration ISO limits, bearing temperature max, NPSH margin).
  - Add safety notes for lockout/tagout and pressure release.
  - Adjust frequencies: Inspect = 1 week, Verify Safety = 1 month, Test / Measure = 3 months.
  - Adjust durations based on complexity.

### Batch 2 — Electrical Rotating Machines

- TEFC Motor, Winder Motor, Explosion Proof, Turbo Generator, Hydrogen-Cooled Generator.
- Work:
  - Rewrite generic electrical boilerplate into machine-specific instructions.
  - Add insulation-resistance, vibration, and temperature-rise criteria.
  - Add arc-flash and lockout safety notes.

### Batch 3 — Static Electrical Assets

- Step-Up Transformer, Unit Transformer, GIS Switchgear, Air-Insulated Switchgear.
- Work:
  - Replace generic steps with transformer/switchgear-specific diagnostics (oil analysis, Buchholz relay, turns ratio, contact resistance, partial discharge).

### Batch 4 — Remaining Strong Families

- Blowers, filters (RO, UF, MF), instrumentation flow meters, mine hoist.
- Work: enrich with criteria and safety notes; fix defaults.

### Batch 5 — New Leaf Types

- Only after Batches 1–4 prove the canonical model.
- Add ~58 missing equipment types using the same three-strategy pattern, authored from class identity and authoritative generic maintenance guidance.

## Schema and Code Impact

The canonical model can be implemented **without schema changes** because the existing `task_templates` and `task_template_steps` tables already contain the necessary fields. The required changes are:

1. Value normalization in existing rows (`maintenance_type`, `task_kind`, frequency, duration, priority).
2. Content enrichment (instructions, safety notes, criteria, activity_code_id).
3. A governance process for future shared-knowledge authoring.

If `provenance` is deemed required, a single JSON/text column can be added to `task_templates` in a future migration.

## Conclusion

Atiman should adopt a **three-strategy canonical model** (Inspect, Verify Safety, Test / Measure) applied consistently to every equipment type. The existing legacy template library maps cleanly to this model and should be retained structurally. Most templates need revision, not rejection. The revision work should be batched, starting with the highest-quality families and using the five-dimension quality rubric to prioritize effort.

**Next step:** ATM-013D — Normalization Implementation Plan, which selects the exact templates in Batch 1, defines the SQL/content updates, and proposes a safe update procedure against the existing shared knowledge set.

STOP for ChatGPT architecture review.
