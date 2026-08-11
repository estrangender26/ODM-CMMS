# ATM-013 — Atiman Knowledge Foundation Gap Analysis

Repository: `estrangender26/ODM-CMMS`
Base: `main @ 31c9610`
Date: 2026-08-10
Status: Investigation only — no code, schema, or production changes.

> **Documentation status notice**
> - **Status:** Historical investigation evidence.
> - **Authority:** Not approved architecture. Provides the baseline gap inventory taken from the legacy MySQL bootstrap.
> - **Historical base:** `main @ 31c9610`.
> - **Reviewed against:** `main @ 34cae1fad779ff45220fd1783025e6cfc442b44f`.
> - **Superseding work:** Later migrations `009`–`012` and the publication implementation resolved some safety-control and versioning gaps noted here. The original evidence remains historical.

## Executive Summary

The approved Atiman Knowledge Foundation is **partially populated** from legacy ODM-CMMS maintenance knowledge. The bootstrap imported the equipment taxonomy and task-template library successfully, but several structural and content gaps remain before Atiman can claim a *substantially complete* engineering knowledge base.

**What is present:** 282 equipment types, each with three shared templates (Inspection, Safety_check, Testing) totaling 846 templates and 3,099 steps; generic activity/cause/failure codes; and 6 industries.

**What is missing or thin:** meaningful reliability taxonomy linkage, damage codes, object parts / maintainable items / subunits, safety controls, task master breadth, and taxonomy completeness (98 equipment classes have zero types; 13 categories have zero classes).

**Key architectural finding:** the legacy source itself contains zero rows for damage_codes, object_parts, maintainable_items, subunits, and task_template_safety_controls. These gaps cannot be closed by migration; they require new engineering content or a deliberate decision to defer them.

## Data Sources Used

| Source | Purpose |
|--------|---------|
| `/Users/gcb/Downloads/odm_cmms_backup.sql` restored to `odm_mysql_rehearsal_59813` | Authoritative legacy MySQL data |
| Current PostgreSQL schema deployed to `odm_pg_rehearsal_59813` | Target Atiman schema |
| `scripts/bootstrap-knowledge/*.jsonl` | Approved bootstrap extract |
| `src/routes/mobile.routes.js` (Knowledge Browser) | Current UX exposure |

## Coverage Counts — Legacy Source vs. Atiman Target

| Domain | Legacy MySQL Count | PostgreSQL / Bootstrap Count | Status |
|--------|-------------------:|-----------------------------:|--------|
| industries | 6 | 6 | Complete |
| equipment_categories | 65 | 65 | Complete |
| equipment_classes | 311 | 311 | Complete |
| equipment_types | 282 | 282 | Complete |
| equipment_type_industries | 647 | 647 | Complete |
| task_templates | 846 | 846 | Complete |
| task_template_steps | 3,099 | 3,099 | Complete |
| task_master | 5 | 5 | Minimal |
| activity_codes | 19 | 19 | Generic |
| cause_codes | 16 | 16 | Generic, unlinked |
| failure_modes | 12 | 12 | Sparse, mostly unlinked |
| damage_codes | 0 | 0 | **Missing in source** |
| object_parts | 0 | 0 | **Missing in source** |
| maintainable_items | 0 | 0 | **Excluded / empty in source** |
| subunits | 0 | 0 | **Excluded / empty in source** |
| task_template_safety_controls | 0 | 0 | **Missing in source** |

## Taxonomy Structure Gaps

### Categories with Zero Classes

13 of 65 equipment categories (20%) have no classes, types, or templates:

- Rotating Equipment
- Static Equipment
- Instrumentation and Control
- Valves
- Piping Systems
- Utility Equipment
- UPS
- Safety Systems
- SCADA
- Structures
- Heat Exchanger
- (and 3 additional small categories)

These appear to be **legacy category duplicates or supersets** of classes that live under other categories. For example, “Heat Exchanger” exists as both an empty category and as a class under “Static Equipment.” “Pump,” “Motor,” “Compressor,” etc. are both top-level categories and classes under “Rotating Equipment.”

**Implication:** Atiman needs a taxonomy reconciliation pass, not more migration. Either flatten the hierarchy, mark these as abstract groupings, or merge them.

### Classes with Zero Types

98 of 311 equipment classes (31.5%) have no equipment types. Examples include:

- Belt Conveyor, Pneumatic Conveyor (under Conveyor)
- Centrifugal Compressor, Scroll Compressor (under Compressor)
- Bevel / Helical / Planetary / Worm Gearbox
- Diesel / Gas / Hydro / Wind Generator
- Analyzer, Differential Pressure, Vibration Sensor
- Submersible Mixer, Surface Aerator
- AC Synchronous / DC / Explosion Proof / Servo / Submersible Motor
- Ductile Iron / HDPE / PVC / Stainless / Steel Pipeline
- And many more

**Implication:** 282 types cover a representative sample of the legacy class list, but a large portion of the engineering taxonomy is **class-only**. Without types, these classes cannot have task templates in the current schema (task_templates.equipment_type_id is NOT NULL).

## Task Template Coverage

### Template Distribution by Kind

Every one of the 282 equipment types has exactly three shared templates:

| Template Kind | Count | Avg Steps |
|---------------|------:|----------:|
| Inspection | 282 | ~4.9 |
| Safety_check | 282 | 3.0 |
| Testing | 282 | 3.0 |
| **Total** | **846** | **~11.0 per type** |

### Step-Level Observations

- All 846 templates have at least one step.
- Steps are `instruction`-type only; no measurement, numeric, checklist, or pass/fail step types are used.
- No templates reference `activity_code_id` in a meaningful way (the field exists but is not populated from the legacy extract).
- `task_template_safety_controls` is empty, so safety-critical instructions live only as text inside step `safety_note` or `instruction`.

### Task Master

Only 5 generic `task_master` records exist, all SMP-named:

| id | task_code | title | task_type |
|--:|-----------|-----------------------|-------------|
| 1 | SMP-DAILY-001 | Daily Pump Inspection | inspection |
| 2 | SMP-WEEKLY-001 | Weekly Motor Check | maintenance |
| 3 | SMP-MONTHLY-001 | Monthly HVAC Service | maintenance |
| 4 | SMP-DAILY-002 | Forklift Safety Check | inspection |
| 5 | SMP-WEEKLY-002 | Generator Test Run | inspection |

`task_master` is **not linked** to `task_templates` (no FK), so it currently adds little practical value beyond placeholder records.

## Reliability Taxonomy Gaps

### Activity Codes

19 generic maintenance verbs imported (e.g., ADJUST, ALIGN, ANALYZE, CALIBRATE, CHECK, CLEAN, INSPECT, LUBRICATE, MEASURE). They are **not linked to task steps** in the bootstrap.

### Cause Codes

16 generic cause codes imported (e.g., Aging, Contamination, Corrosion, Fatigue, Misalignment). All have `equipment_class_id = 0` (unlinked). They cannot yet drive cause-code selection per equipment class.

### Failure Modes

12 failure-mode records imported, but only a handful are linked to specific equipment types. Most are generic or orphaned. Examples:

| Failure Mode | Linked Equipment Types |
|--------------|-------------------------:|
| High Vibration | 2 |
| Insulation Failure | 1 |
| Low Flow | 1 |
| Motor Overload | 1 |
| Overheating | 1 |
| Seal Leakage | 1 |
| (remaining 6) | ≤1 |

### Damage Codes / Object Parts / Maintainable Items / Subunits

All zero in both legacy source and Atiman target. These are **not migration gaps** — the legacy system simply never populated them. Closing these requires deliberate engineering authorship or integration with an external taxonomy (e.g., ISO 14224, manufacturer BOMs).

## Source-to-Target Mapping Assessment

| Legacy Table | Atiman Table | Classification | Notes |
|--------------|--------------|----------------|-------|
| industries | industries | DIRECT | 6 rows, complete |
| equipment_categories | equipment_categories | DIRECT | 65 rows; needs reconciliation |
| equipment_classes | equipment_classes | DIRECT | 311 rows; 98 need types |
| equipment_types | equipment_types | DIRECT | 282 rows; complete |
| equipment_type_industries | equipment_type_industries | DIRECT | 647 mappings; complete |
| task_templates | task_templates | DIRECT | 846 rows; complete |
| task_template_steps | task_template_steps | DIRECT | 3,099 rows; complete |
| task_master | task_master | DIRECT | 5 rows; minimal |
| activity_codes | activity_codes | DIRECT | 19 rows; unlinked |
| cause_codes | cause_codes | DIRECT | 16 rows; unlinked |
| failure_modes | failure_modes | DIRECT | 12 rows; sparse links |
| damage_codes | damage_codes | **NO SOURCE DATA** | Empty in MySQL and JSONL |
| object_parts | object_parts | **NO SOURCE DATA** | Empty in MySQL and JSONL |
| maintainable_items | maintainable_items | **EXCLUDED / EMPTY** | Not in KEEP list; 0 in MySQL |
| subunits | subunits | **EXCLUDED / EMPTY** | Not in KEEP list; 0 in MySQL |
| task_template_safety_controls | task_template_safety_controls | **NO SOURCE DATA** | 0 in MySQL and JSONL |

## Major Gaps

1. **Taxonomy incompleteness:** 31.5% of classes have no types, blocking template creation for them under the current schema.
2. **Duplicate/ambiguous categories:** 12 category names also exist as classes under other categories (e.g., Pump, Motor, Heat Exchanger).
3. **Reliability taxonomy is unlinked:** activity/cause/failure codes are generic and not associated with steps, classes, or types.
4. **Safety controls are absent:** no structured safety-control records; safety guidance is embedded as free text only.
5. **Damage codes / object parts are absent:** these are empty in the legacy source and cannot be migrated.
6. **Maintainable items / subunits absent:** empty in source; required for detailed asset decomposition.
7. **Task master is thin:** only 5 generic tasks, none linked to templates.
8. **Template content is repetitive:** every type has the same three template kinds; no preventive/predictive/corrective variety.

## Recommended Phased Population Plan

### Phase 1 — Taxonomy Reconciliation (Design)

- Decide whether the 13 empty categories are abstract groupings, duplicates, or should be removed.
- Resolve 12 category/class name collisions.
- Decide whether classes with no types should get synthetic types or remain class-only.
- Result: a clean, non-redundant equipment taxonomy.

### Phase 2 — Expand Equipment Types (Data Engineering)

- Create equipment types for the 98 classes that currently have none, or explicitly mark those classes as abstract.
- Ensure every remaining concrete class has at least one type before task templates can attach.

### Phase 3 — Reliability Taxonomy Linkage (Architecture + Content)

- Link activity_codes to task_template_steps via `activity_code_id`.
- Link cause_codes to equipment_classes and/or equipment_types.
- Expand failure_modes and link them to equipment_types.
- Introduce damage_codes only if authoritative engineering content is available.

### Phase 4 — Safety Controls (New Content)

- Because legacy source has zero safety-control records, design a safety-control data model and populate it from engineering standards or manufacturer data.
- Link safety controls to task templates or steps.

### Phase 5 — Asset Decomposition (Future)

- Introduce maintainable_items, subunits, and object_parts only when Atiman needs detailed asset-BOM or component-level maintenance. Populate from external sources, not legacy migration.

### Phase 6 — Task Master Expansion (Future)

- Decide whether `task_master` becomes the canonical task catalog that `task_templates` reference, or whether it remains a legacy table.
- If it becomes canonical, migrate/author task master records and add a FK from `task_templates` to `task_master`.

## First Smallest Implementation Batch

To move from “partially populated” to “first usable complete slice,” the smallest bounded work is:

1. **Taxonomy cleanup design document** (ATM-013A)
   - Classify the 13 empty categories and 98 class-without-type cases.
   - Propose merges/abstract flags.

2. **Reliability taxonomy linkage** (ATM-013B)
   - Populate `task_template_steps.activity_code_id` from step text where a verb match exists.
   - Link `cause_codes.equipment_class_id` to the relevant class.
   - Expand and link `failure_modes` to the top 20 equipment types.

3. **Knowledge Browser enhancement** (already partially built)
   - Expose activity/cause/failure context per equipment type once linked.
   - Show “no task templates” truthfully for classes/types without templates.

**Excluded from the first batch:** damage codes, object parts, maintainable items, subunits, safety controls, and task-master expansion. These require net-new content or architectural decisions and should not be inferred from the empty legacy source.

## Knowledge Browser Current Exposure

The existing mobile Knowledge Browser exposes:

- `/mobile/templates` — all categories
- `/mobile/templates/classes/:categoryId`
- `/mobile/templates/types/:classId`
- `/mobile/templates/type/:equipmentTypeId` — templates for a type
- `/mobile/templates/:templateId` — template detail with steps

It correctly filters to `organization_id IS NULL` (shared knowledge only). It does not yet surface reliability codes, safety controls, or taxonomy gaps.

## Conclusion

**DATA MIGRATION STATUS: PARTIAL — TAXONOMY AND TASK LIBRARY MIGRATED; RELIABILITY AND SAFETY KNOWLEDGE REQUIRES NEW ENGINEERING WORK.**

The legacy dump contains a usable core of equipment taxonomy and inspection/safety/testing templates. It does **not** contain enough data for a complete Atiman Knowledge Foundation. The next architectural decisions should focus on taxonomy reconciliation and deliberate, governed authoring of reliability/safety content rather than additional migration.
