# ATM-000 — Atiman Product Vision & Architecture

**Document ID:** ATM-000  
**Title:** Atiman Product Vision & Architecture  
**Status:** Controlled Architecture Document — Draft for Review  
**Repository:** `/Users/gcb/Documents/GitHub/ODM-CMMS`  
**Branch:** `atm-000-product-architecture`  
**Date:** 2026-08-10  
**Author:** Implementation Architect  
**Reviewer:** Chief Architect / Product Architect

---

## Executive Summary

Atiman is a knowledge-first maintenance operations platform. It is the successor concept to ODM-CMMS, but it is not an incremental redesign of ODM-CMMS. Atiman starts from a new premise: **maintenance knowledge is the platform's most valuable asset**, and operational applications exist to put that knowledge to work.

Atiman permanently separates institutional knowledge from operational data:

- **Knowledge** is curated, versioned, reusable, and shared.
- **Operational data** is per-customer, per-asset, and per-moment.

This architecture document defines what Atiman is, what it is not, and the layered foundation that every future feature, screen, API, database change, AI capability, and customer workflow must respect.

---

## 1. What Atiman IS

Atiman is:

1. **A knowledge-first maintenance platform.** Engineering taxonomy, maintenance procedures, failure modes, and best practices are first-class citizens.
2. **A multi-tenant SaaS platform.** Each customer organization operates in its own bounded workspace while benefiting from shared knowledge.
3. **A system of operational applications built on top of a common knowledge foundation.** Work management, inspections, operator-driven maintenance, planning, reliability, and integrations are consumers of knowledge, not owners of it.
4. **An AI-assisted platform.** Artificial intelligence is used contextually to help users make decisions, never to become the source of truth.
5. **A mobile-first, role-aware, task-first experience.** The interface is organized around what a person must do, not around backend modules.
6. **An extensible platform.** New knowledge domains, operational apps, and integrations can be added without rewriting the core.

---

## 2. What Atiman is NOT

Atiman is explicitly NOT:

1. **A traditional CMMS clone.** It does not start from work orders and asset registers; it starts from knowledge.
2. **A generic project management or ticket system.** Maintenance domain semantics are intrinsic, not bolted on.
3. **An AI replacement for human judgment.** AI assists; humans remain accountable.
4. **A static document library.** Knowledge is structured, validated, versioned, and executable inside operational workflows.
5. **A one-size-fits-all UI.** The experience adapts to the role: operator, supervisor, engineer, planner, reliability analyst.
6. **A marketing concept.** This document controls implementation; it is not aspirational prose.

---

## 3. Mission

**Make institutional maintenance knowledge actionable, trustworthy, and continuously improving across every asset and every role.**

Atiman exists so that organizations can capture, validate, and reuse the maintenance knowledge that would otherwise live only in senior engineers' heads, scattered spreadsheets, or legacy systems. When knowledge is authoritative and accessible, operators make better decisions, supervisors spend less time firefighting, and reliability improves.

---

## 4. Vision

**Become the industry's default knowledge operating system for physical asset maintenance.**

In the long term, Atiman is the platform where:

- Maintenance knowledge is bought, sold, shared, and continuously improved (knowledge marketplace).
- Every asset class has a validated, community-curated knowledge pack.
- Operational applications are composable and role-aware.
- AI is a trusted assistant that never overrides human accountability.
- Customers can start simple and grow into enterprise reliability without replacing platforms.

---

## 5. Core Product Principles

| # | Principle | Meaning |
|---|-----------|---------|
| 1 | **Knowledge first** | The knowledge foundation is built before operational features consume it. |
| 2 | **Separation of knowledge and operations** | Knowledge is shared and versioned; operational data is per-customer and ephemeral. |
| 3 | **Role-aware by default** | Every screen and workflow is designed for a specific maintenance role. |
| 4 | **Task-first UX** | Users arrive at actions, not modules. |
| 5 | **Trust through validation** | Knowledge is validated against rules, real outcomes, and human review. |
| 6 | **Progressive disclosure** | Simple for operators, deep for engineers and analysts. |
| 7 | **Extensible by design** | New domains, apps, and integrations plug into the architecture without forks. |
| 8 | **Human accountability** | AI may recommend; humans approve, execute, and own the outcome. |

---

## 6. Architectural Principles

| # | Principle | Meaning |
|---|-----------|---------|
| 1 | **Layered architecture** | Each layer has a single responsibility and depends only on layers below it. |
| 2 | **Knowledge services are APIs** | Operational apps consume knowledge through well-defined services, not direct database coupling. |
| 3 | **Database schema reflects knowledge boundaries** | Schema changes are driven by knowledge-domain evolution, not by UI convenience. |
| 4 | **Tenant isolation** | Customer data is isolated; shared knowledge is referenceable but immutable to tenants. |
| 5 | **Event-ready** | State changes publish events so future analytics, integrations, and AI can react. |
| 6 | **Idempotent deployments** | Schema and knowledge deployments are rerunnable and safe. |
| 7 | **Security by default** | Authentication, authorization, audit, and data isolation are non-negotiable. |

---

## 7. Knowledge-First Philosophy

Atiman treats maintenance knowledge as a durable, reusable asset:

- **Engineering Taxonomy** defines what can fail, what can be done, and how things relate.
- **Maintenance Knowledge** defines the actual procedures, checks, and safe practices.
- **Knowledge Packs** are curated, versioned bundles of taxonomy and maintenance knowledge for an asset class or industry.
- **Customer Knowledge** is the subset a tenant adopts, customizes, or creates.

Knowledge is:

- **Authored** by domain experts.
- **Validated** against rules and real-world feedback.
- **Versioned** so changes are traceable.
- **Governed** so quality is maintained.
- **Executable** inside operational workflows.

Knowledge is never buried in operational records. Operational records may reference knowledge, but they do not define it.

---

## 8. Operational Philosophy

Operational applications exist to apply knowledge to real assets at real moments:

- **Work Management** turns procedures into work orders.
- **Inspections** execute checklists and capture findings.
- **Operator Driven Maintenance** empowers frontline operators with guided actions.
- **Planning** schedules maintenance based on knowledge, asset condition, and constraints.
- **Reliability** analyzes outcomes to improve knowledge.

Operational data belongs to the customer. It is created, modified, and archived per tenant. Operational applications do not own the knowledge they use.

---

## 9. AI Philosophy

AI in Atiman is a capability, not a module.

- **AI assists users.** It suggests, summarizes, predicts, and answers questions.
- **AI never becomes the source of truth.** Knowledge remains authoritative.
- **AI recommendations are traceable.** A user can see why a recommendation was made.
- **AI learns from outcomes.** Closed work orders, inspection findings, and reliability data refine future suggestions.
- **Human approval is required for consequential actions.** AI may draft a work order; a human approves it.

AI operates on knowledge and operational context. It does not hallucinate procedures into existence.

---

## 10. Product Boundaries

### In Scope

- Knowledge foundation and knowledge services.
- Operational applications that consume knowledge.
- Role-aware, task-first user experiences.
- AI assistance within operational and knowledge workflows.
- Multi-tenant platform services (auth, organizations, users, audit).
- APIs and future integration points.

### Out of Scope (for Atiman core)

- General-purpose ERP.
- Generic project management unrelated to maintenance.
- Asset design / digital twin simulation (may integrate in future).
- Unstructured document storage as a primary feature.
- Social networking or community features outside knowledge marketplace governance.

---

## 11. Permanent Architecture

Atiman is organized into five permanent layers. Each layer depends only on the layers below it.

```
┌─────────────────────────────────────┐
│      Intelligence Layer              │  AI, analytics, recommendations
├─────────────────────────────────────┤
│   Operational Applications           │  Work, inspections, ODM, planning, reliability
├─────────────────────────────────────┤
│      Knowledge Services              │  Query, composition, validation, lifecycle
├─────────────────────────────────────┤
│      Knowledge Foundation            │  Taxonomy, procedures, knowledge packs, versioning
├─────────────────────────────────────┤
│      Platform Foundation             │  Tenancy, identity, audit, events, APIs
└─────────────────────────────────────┘
```

### 11.1 Platform Foundation

**Responsibilities:**

- Multi-tenant organizations and workspaces.
- Identity, authentication, and role-based authorization.
- Audit logging and compliance.
- Event bus for cross-layer communication.
- Core APIs and API governance.
- Database infrastructure and idempotent schema deployment.

**Boundaries:**

- The platform foundation does not contain maintenance domain logic.
- It provides the runtime and governance that everything else uses.

**Dependencies:**

- None (base layer).

### 11.2 Knowledge Foundation

**Responsibilities:**

- Store and version engineering taxonomy:
  - Equipment categories, classes, types.
  - Failure modes, damage codes, cause codes.
  - Activity codes, object parts, maintainable items.
- Store and version maintenance knowledge:
  - Task master definitions.
  - Task templates and steps.
  - Safety controls and precautions.
- Organize knowledge into packs:
  - Template families and rules.
  - Standard maintenance procedure (SMP) families and tasks.
- Govern knowledge lifecycle:
  - Draft → Review → Published → Deprecated → Retired.
- Validate knowledge integrity:
  - FK correctness, uniqueness, rule conformance.

**Boundaries:**

- Knowledge foundation does not store customer assets, work orders, or inspection results.
- It may store customer-specific customizations to knowledge (Customer Knowledge), but those remain knowledge, not operations.

**Dependencies:**

- Platform Foundation.

### 11.3 Knowledge Services

**Responsibilities:**

- Provide query and composition APIs for operational apps.
- Resolve the right knowledge for an asset, role, and context.
- Validate knowledge before it is used operationally.
- Manage knowledge pack import, export, and versioning.
- Enforce knowledge governance rules.

**Boundaries:**

- Services expose knowledge; they do not mutate operational data.
- They may read customer context to select the right knowledge variant.

**Dependencies:**

- Knowledge Foundation.
- Platform Foundation.

### 11.4 Operational Applications

**Responsibilities:**

- Deliver task-first, role-aware experiences.
- Consume knowledge services to populate workflows.
- Capture operational data: work orders, inspections, findings, readings, schedules.
- Enforce operational business rules.

**Examples:**

- Work Management
- Inspections
- Operator Driven Maintenance (ODM)
- Planning and Scheduling
- Reliability Analysis
- Inventory (future)
- Mobile Field App
- QR / NFC Asset Tagging
- SAP / ERP Integration
- Future integrations

**Boundaries:**

- Operational apps do not bypass knowledge services to read knowledge tables directly.
- Operational apps do not store shared knowledge definitions.

**Dependencies:**

- Knowledge Services.
- Platform Foundation.

### 11.5 Intelligence Layer

**Responsibilities:**

- Provide contextual AI assistance across all layers.
- Generate suggestions based on knowledge + operational context.
- Summarize operational history and reliability trends.
- Recommend knowledge improvements based on outcomes.
- Surface insights to the right role at the right time.

**Boundaries:**

- The Intelligence Layer never writes authoritative knowledge or operational decisions without human approval.
- It reads knowledge services and operational data; it does not own them.

**Dependencies:**

- Operational Applications (for context).
- Knowledge Services (for authoritative reference).
- Platform Foundation (for identity and events).

---

## 12. Knowledge Foundation Detail

### 12.1 Engineering Taxonomy

The classification system that gives maintenance knowledge structure:

- `equipment_categories`
- `equipment_classes`
- `equipment_types`
- `industries`
- `failure_modes`
- `damage_codes`
- `cause_codes`
- `object_parts`
- `subunits`
- `maintainable_items`
- `activity_codes`

Taxonomy is shared or customer-extended. It is validated for referential integrity.

### 12.2 Maintenance Knowledge

The executable content of maintenance:

- `task_master`
- `task_templates`
- `task_template_steps`
- `task_template_safety_controls`

This is the core intellectual property that Atiman preserves and evolves.

### 12.3 Knowledge Packs

Curated bundles of taxonomy and maintenance knowledge:

- `template_families`
- `template_family_rules`
- `smp_families`
- `smp_tasks`

Knowledge packs are versioned, importable, and eventually marketable.

### 12.4 Customer Knowledge

Tenant-specific adaptations:

- Approved subset of shared knowledge.
- Custom task templates.
- Custom taxonomy extensions.
- Localized or regulatory variants.

Customer knowledge still lives in the Knowledge Foundation; it is not operational data.

### 12.5 Versioning

Every knowledge entity has a lifecycle state:

- **Draft** — under construction.
- **Review** — pending validation.
- **Published** — available for operational use.
- **Deprecated** — still usable but no longer recommended.
- **Retired** — not available for new operational use.

Versioning is explicit. Historical versions remain readable for audit and reference.

### 12.6 Governance

- Knowledge must pass automated validation before publication.
- Changes to published knowledge require review.
- Knowledge quality metrics are tracked.
- Customers can subscribe to knowledge pack updates.

### 12.7 Validation

- Referential integrity within the knowledge graph.
- Completeness (required fields, steps, safety controls).
- Rule conformance (frequency units, durations, allowed values).
- No duplicate canonical identifiers.

### 12.8 Future Marketplace Capability

Long-term, Atiman supports a knowledge marketplace where:

- Vendors and experts author knowledge packs.
- Customers purchase or subscribe to packs.
- Usage and outcome feedback improve pack quality.
- Governance and certification maintain trust.

Marketplace is a future capability, not a near-term implementation requirement.

### 12.9 Knowledge Ownership

- Shared knowledge is owned by Atiman or certified contributors.
- Customer knowledge is owned by the tenant.
- Marketplace packs are owned by their authors, licensed to subscribers.

### 12.10 Knowledge Evolution

Knowledge improves through:

- Expert authoring and review.
- Customer customization and feedback.
- Operational outcomes (what worked, what failed, what was missed).
- AI-assisted suggestions that are validated by humans.

---

## 13. Experience Philosophy

- **Task-first, not module-first.** A user opens Atiman to perform a task: inspect an asset, close a work order, review a failure. The UI starts with the task.
- **Role-aware.** Operators see simple, guided actions. Supervisors see queues and exceptions. Engineers see taxonomy and reliability. Planners see schedules and resources.
- **Action-oriented.** Every screen has a clear primary action.
- **Knowledge is first-class.** Procedures, safety controls, and failure context are visible in context, not hidden in documents.
- **AI appears contextually.** AI help is offered where it adds value, not as a separate chat window bolted onto every screen.
- **Mobile-first.** Field workflows are designed for mobile first; desktop is for authoring, planning, and analysis.
- **Operator-first.** The frontline operator is the most important user. If the operator cannot use it in the field, the feature is wrong.
- **Supervisor-first.** Supervisors need visibility and control without drowning in data.
- **Engineer-first.** Engineers need precision, version history, and governance.

---

## 14. AI Philosophy (Reinforced)

- AI is a capability distributed across the platform.
- AI reads authoritative knowledge and operational context.
- AI generates recommendations, summaries, predictions, and explanations.
- AI never overrides governance or human approval.
- AI mistakes are traceable and correctable through knowledge updates.

---

## 15. Knowledge Pack Philosophy

A Knowledge Pack is the unit of reusable maintenance knowledge:

- It contains taxonomy and maintenance knowledge for a domain.
- It is versioned and validated.
- It can be imported into a tenant workspace.
- It can be extended, but core pack updates can still flow to subscribers.
- It is the foundation of the future marketplace.

Knowledge packs are how Atiman scales domain expertise without rebuilding it per customer.

---

## 16. Long-Term Evolution

| Phase | Focus |
|-------|-------|
| **Foundation** | Knowledge model, taxonomy, core platform, bootstrap admin/organization. |
| **Knowledge Ingestion** | Import curated knowledge from legacy sources (ATM-001). |
| **Operational Core** | Work management, inspections, operator driven maintenance. |
| **Intelligence** | AI-assisted recommendations, summaries, and reliability insights. |
| **Marketplace** | Certified knowledge packs, subscriptions, contributor governance. |
| **Enterprise Scale** | Advanced planning, inventory, SAP integrations, analytics. |

---

## 17. Guiding Principles for Future Decisions

When a future decision is uncertain, apply these rules in order:

1. **Does it strengthen the knowledge foundation?** If yes, prioritize.
2. **Does it respect the knowledge/operations separation?** If no, reject or refactor.
3. **Does it serve the operator, supervisor, or engineer directly?** If none, reconsider.
4. **Can it be expressed as a knowledge service consumed by apps?** If not, redesign.
5. **Does it preserve human accountability when AI is involved?** If not, reject.
6. **Is it safe to deploy idempotently?** If not, fix before shipping.

---

## 18. Decision Record

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Knowledge-first architecture | Maintenance expertise is the durable asset; operational apps are consumers. |
| 2 | Separate knowledge and operational data | Enables reuse, versioning, governance, and multi-tenant scaling. |
| 3 | Five-layer architecture | Clear boundaries, independent evolution, testable dependencies. |
| 4 | AI as capability, not module | AI should be pervasive and contextual, not isolated. |
| 5 | Task-first, role-aware UX | Field usability is the primary success metric. |
| 6 | Mobile-first | Maintenance happens at the asset, not at a desk. |
| 7 | Knowledge packs as reusable units | Scales expertise and enables future marketplace. |
| 8 | Human accountability for AI | Trust and safety require human ownership of consequential actions. |
| 9 | Idempotent deployments | Production safety and repeatability are non-negotiable. |
| 10 | Exclude operational legacy data | Atiman is a fresh product; only institutional knowledge is preserved. |

---

## 19. Open Questions

1. What is the exact identity model for the bootstrap administrator (username, email, role naming)?
2. Which roles are defined at launch versus added later?
3. What is the initial Knowledge Pack release scope beyond the ATM-001 legacy extraction?
4. What certification/governance process applies to marketplace knowledge packs?
5. Which operational application is built first after the knowledge foundation?
6. What is the AI provider and integration model (self-hosted, API, hybrid)?
7. What is the event schema for cross-layer communication?
8. What are the exact mobile platform targets (PWA, iOS, Android)?

---

## 20. Roadmap

| Milestone | Deliverable | Depends On |
|-----------|-------------|------------|
| ATM-000 | Product vision and architecture (this document) | — |
| ATM-001 | Knowledge bootstrap from legacy source | ATM-000 |
| ATM-002 | Platform foundation hardening (auth, orgs, audit) | ATM-000 |
| ATM-003 | Knowledge services API | ATM-001, ATM-002 |
| ATM-004 | Work Management operational app | ATM-003 |
| ATM-005 | Inspections operational app | ATM-003 |
| ATM-006 | Operator Driven Maintenance app | ATM-003 |
| ATM-007 | Intelligence layer MVP | ATM-004–006 |
| ATM-008 | Knowledge Pack marketplace design | ATM-007 |

---

## STOP

This document is implementation preparation only.  
No code, no migrations, no UI redesign, and no production changes have been made.  
Awaiting ChatGPT architectural review.
