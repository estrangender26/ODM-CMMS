# ATM-003 — Atiman Platform Foundation

**Document ID:** ATM-003  
**Title:** Atiman Platform Foundation  
**Status:** Controlled Architecture Document — Draft for Review  
**Repository:** `/Users/gcb/Documents/GitHub/ODM-CMMS`  
**Branch:** `atm-003-platform-foundation`  
**Date:** 2026-08-10  
**Author:** Implementation Architect  
**Reviewer:** Chief Architect / Product Architect

---

## Executive Summary

The **Platform Foundation** is the bottom layer of the Atiman architecture (ATM-000). It provides the runtime, identity, tenancy, security, audit, API, event, storage, deployment, and observability services that all higher layers depend on. It contains no maintenance-domain logic; it enables the Knowledge Foundation, Knowledge Services, Operational Applications, Asset Intelligence, and Enterprise Integration to operate safely and consistently.

This document defines the required platform capabilities, boundaries, and treatment of the existing ODM-CMMS codebase. It is a design document only: no code, schema, or deployment changes are included.

---

## 1. Purpose

The Platform Foundation exists to:

1. Authenticate and authorize users and services.
2. Isolate tenant data and configuration.
3. Provide a stable, versioned API surface.
4. Publish and route events across layers.
5. Secure data at rest and in transit.
6. Enable idempotent, repeatable deployments.
7. Observe health, performance, and audit activity.
8. Provide integration foundations for enterprise systems and future connectors.

---

## 2. Constitutional Alignment

| Axiom | Platform Foundation Contribution |
|-------|----------------------------------|
| **Knowledge Before Transactions** | The platform deploys the Knowledge Foundation before operational features are enabled. |
| **Findings Before Work Orders** | Tenant isolation and audit ensure findings are trustworthy and attributable. |
| **Operators Are the First Sensors** | Mobile-friendly auth, offline sync, and low-friction identity support field capture. |
| **Integrate Rather Than Replace** | APIs and integration foundations connect Atiman to enterprise systems without forcing migration. |
| **AI Augments Human Judgment** | Identity, audit, and event streams make AI recommendations traceable and accountable. |
| **Evidence Before Assumption** | Audit logs and immutable event history preserve evidence of decisions. |
| **Experience Follows Work** | Auth and APIs are designed around task context, not module boundaries. |

---

## 3. Platform Capabilities

### 3.1 Identity and Authentication

| Requirement | Description |
|-------------|-------------|
| User identity | Every user has a unique, tenant-scoped identity. |
| Password-based auth | bcrypt password hashes; strong password policy. |
| Session management | Secure, time-bounded sessions. Access/refresh token split is an optional implementation choice. |
| SSO readiness | Support SAML/OIDC integration for enterprise customers. |
| Service accounts | API keys for machine-to-machine integration. |
| Multi-factor authentication | Optional MFA for privileged roles. |

### 3.2 Tenancy and Isolation

| Requirement | Description |
|-------------|-------------|
| Organization as tenant | Each customer organization is a tenant. |
| Data isolation | Tenant data is not visible or mutable by other tenants. |
| Shared knowledge access | Shared knowledge is readable by all tenants but immutable to them. |
| Customer knowledge scoping | Customer knowledge carries `organization_id`. |
| Tenant-aware connections | All queries, APIs, and events carry tenant context. |

*The physical implementation (row-level tenant column, separate schema, or separate database) is an open implementation decision. The design must support any of these models without domain-layer changes.*

### 3.3 Authorization and Roles

| Role | Primary Permissions |
|------|-------------------|
| **System Admin** | Platform-level configuration, cross-tenant health, no domain access. |
| **Tenant Admin** | User management, pack adoption, tenant settings. |
| **Knowledge Author** | Create and edit drafts; submit for review. |
| **Knowledge Reviewer** | Approve or reject knowledge for publication. |
| **Knowledge Steward** | Manage a knowledge domain or pack. |
| **Operator** | Execute inspections, report findings, record operator-corrected outcomes. |
| **Supervisor** | Assess findings, approve escalations, review operator work. |
| **Engineer** | Author and review knowledge, analyze reliability signals. |
| **Planner** | View prioritization and escalation readiness. |
| **Reliability Analyst** | Access trends and knowledge-improvement signals. |
| **API Service Account** | Scoped integration access. |

Authorization is enforced at the API and service layers, not only in UI code.

### 3.4 Auditability

| Requirement | Description |
|-------------|-------------|
| Immutable audit log | Record who did what, when, and in what tenant context. |
| Knowledge audit | Lifecycle transitions, publication, deprecation, retirement. |
| Operational audit | Finding creation, assessment, escalation, closure. |
| API audit | Sensitive operations and service account usage. |
| Retention policy | Configurable retention aligned with customer/regulatory needs. |

### 3.5 APIs

| Requirement | Description |
|-------------|-------------|
| Versioned REST API | Stable public API with explicit versioning. |
| Internal service APIs | Well-defined internal boundaries between layers. |
| Tenant context | API requests carry and enforce tenant context. |
| Rate limiting | Prevent abuse and ensure fair usage. |
| Documentation | OpenAPI / Swagger-style documentation for public endpoints. |
| GraphQL readiness | Optional future query pattern; not a current requirement. |

### 3.6 Events

| Requirement | Description |
|-------------|-------------|
| Event bus | Cross-layer communication mechanism. Message-broker choice is an open implementation decision. |
| Domain events | Knowledge published, finding created, assessment completed, escalation submitted. |
| Integration events | Outbound/inbound event translation for Enterprise Integration. |
| Event schema | Stable, versioned event envelope with tenant context. |
| Replay capability | Support audit reconstruction and retry scenarios. |

### 3.7 Storage

| Requirement | Description |
|-------------|-------------|
| Primary database | PostgreSQL for transactional and knowledge data. |
| Blob storage | Images, videos, and documents attached to evidence. |
| Caching | Optional hot-path caching for knowledge lookups and session data. Cache technology is an open implementation decision. |
| Search index | Optional full-text search over knowledge and operational evidence. Search technology is an open implementation decision. |
| Backup and point-in-time recovery | Production operational requirement. |

### 3.8 Security

| Requirement | Description |
|-------------|-------------|
| Encryption in transit | TLS for all external and internal service communication. |
| Encryption at rest | Database and blob storage encrypted. |
| Secrets management | Credentials and keys stored in a secrets manager, never in code. |
| Input validation | Strict validation at API boundaries. |
| Injection prevention | Parameterized queries, safe serialization. |
| Least privilege | Service accounts and roles have minimum necessary permissions. |
| Security headers | CSP, HSTS, X-Frame-Options, etc. |

### 3.9 Configuration

| Requirement | Description |
|-------------|-------------|
| Environment-based config | Separate config for local, staging, production. |
| Feature flags | Enable/disable capabilities without deployment. |
| Tenant configuration | Per-tenant settings for branding, integrations, and thresholds. |
| Secrets separation | Secrets loaded from secure stores, not config files. |

### 3.10 Deployment and Runtime

| Requirement | Description |
|-------------|-------------|
| Containerized runtime | Deployed as a runnable service appropriate to the chosen hosting environment. Specific container orchestration is an open implementation choice. |
| Idempotent schema deployment | PostgreSQL migrations are rerunnable and safe. |
| Zero-downtime readiness | Deployment process should minimize downtime. Specific rolling-blue-green strategy is an open implementation choice. |
| Health checks | `/health`, `/ready`, `/live` endpoints. |
| Dependency readiness | Application waits for database and required services. |

### 3.11 Observability

| Requirement | Description |
|-------------|-------------|
| Structured logging | JSON logs with correlation IDs and tenant context. |
| Metrics | Latency, throughput, error rates, business metrics. |
| Tracing | Optional distributed tracing across API and event flows for operational maturity. |
| Alerting | Alerts for errors, latency spikes, and resource exhaustion. |
| Dashboards | Operational and business health dashboards. |

### 3.12 Integration Foundations

| Requirement | Description |
|-------------|-------------|
| Outbound connectors | Webhooks, EAM adapters, message queues. |
| Inbound connectors | Receiving outcomes, schedules, and master-data updates. |
| Protocol support | HTTPS, REST, SOAP where required by enterprise systems, message queues. |
| Mapping layer | Transform Atiman semantics to/from enterprise system semantics. |
| Connector lifecycle | Versioned, configurable, tenant-scoped connectors. |

---

## 4. Platform Boundaries

### 4.1 Inside the Platform Foundation

- Authentication and session management.
- Tenant context and isolation enforcement.
- Authorization and role enforcement.
- Audit logging infrastructure.
- API gateway / routing and versioning.
- Event bus infrastructure.
- Database connection management and migrations.
- Secrets and configuration management.
- Deployment, health, and observability infrastructure.
- Integration connector runtime and mapping utilities.

### 4.2 Outside the Platform Foundation

- Maintenance-domain logic (Knowledge Foundation).
- Knowledge query/composition APIs (Knowledge Services).
- Inspection, finding, and escalation workflows (Operational Applications).
- Asset health, risk, and recommendation models (Asset Intelligence).
- EAM-specific connector implementations (Enterprise Integration).

The Platform Foundation enables these layers but does not implement their domain logic.

---

## 5. Database and Storage Boundaries

### 5.1 PostgreSQL as Primary Store

PostgreSQL remains the primary database. The existing ODM-CMMS schema is the starting point but must be conceptually partitioned:

- **Platform Foundation tables:** `organizations`, `users`, `invitations`, `api_keys`, `audit_log`, `audit_logs`, `audit_logs_archive`, `audit_configurations`, `audit_retention_policies`, `api_usage_logs`, `api_rate_limit_tracking`.
- **Knowledge Foundation tables:** defined in ATM-001.
- **Operational tables:** `equipment`, `facilities`, `work_orders`, `findings`, `inspection_*`, `schedules`, `maintenance_plans`, etc.
- **Commercial tables:** `subscription_plans`, `organization_subscriptions`, `stripe_customers`, `payments`.
  - *These support Atiman SaaS operation (billing/subscription management) but are not Atiman financial-system product capabilities. They do not replace customer ERP/accounting systems.*
- **Legacy / to-evaluate:** `dashboard_widgets`, `sso_*`, `custom_field_*`, `attachments`, `uploaded_files`, `asset_*`, `seed_batches`.

### 5.2 Physical Partitioning is an Open Decision

Whether knowledge, operational, and platform data live in:

- one PostgreSQL database with naming/schema conventions,
- separate PostgreSQL schemas,
- or separate databases,

is an implementation decision. The domain architecture must not depend on a specific physical layout.

### 5.3 Tenant Data Isolation

At minimum, tenant-scoped tables must include `organization_id` or equivalent. Enforcement may be row-level security, query scoping, or physical separation.

---

## 6. Treatment of Existing ODM-CMMS Code

### 6.1 What Can Be Retained

| Area | Rationale |
|------|-----------|
| PostgreSQL schema deployment pattern | Idempotent SQL files are aligned with Atiman deployment principles. |
| `organizations` and `users` table structure | Core identity and tenancy model. |
| `industries` table | Shared taxonomy; fits Knowledge Foundation. |
| Authentication patterns | bcrypt hashing, session concepts can be retained or upgraded. |
| API framework / routing | If based on a modern, maintainable stack, retain as runtime base. |
| Health check endpoint | Required by Platform Foundation. |
| Render / container deployment setup | Existing runtime target may remain. |

### 6.2 What Requires Refactoring

| Area | Rationale |
|------|-----------|
| Role and permission model | Legacy roles may not match Atiman roles. Refactor to RBAC/ABAC model. |
| SSO tables | Update to support modern OIDC/SAML patterns. |
| Audit tables | Expand to cover knowledge lifecycle, finding lifecycle, and API actions. |
| API structure | Reorganize around Atiman domain layers and versioning. |
| Configuration management | Move secrets out of code/env files into secure stores. |
| Custom fields system | Evaluate whether it belongs in operational or knowledge domain. |
| File/attachment storage | Integrate with blob storage and tenant scoping. |
| Dashboard widgets | Re-evaluate; may belong to operational analytics layer. |

### 6.3 What Should Be Discarded

| Area | Rationale |
|------|-----------|
| Legacy module-first UI structure | Replaced by task-first experience (ATM-002). |
| Work-order-centric business logic | Replaced by finding-centric model (ATM-000). |
| Seed-batch import artifacts | Replaced by Knowledge Pack provenance (ATM-001). |
| CMMS-specific workflows that conflict with EAM boundary | Atiman does not own EAM planning/execution. |
| Direct knowledge/operational coupling | Refactor to layer boundaries via services and events. |

---

## 7. API Governance

### 7.1 Public vs Internal APIs

| API Category | Audience | Stability |
|--------------|----------|-----------|
| Public API | External integrations, customers, partners | Versioned and stable. |
| Internal service API | Atiman services | Stable within a release; may evolve with architecture. |
| Admin / platform API | Platform operators | Stable, restricted access. |

### 7.2 API Versioning

- Major versions in URL path (e.g., `/api/v1/...`).
- Breaking changes require a new major version.
- Deprecation window for old versions.

### 7.3 Tenant Context in APIs

- Authenticated requests derive tenant from user identity.
- Service-account requests include explicit tenant scope.
- API layer rejects cross-tenant access attempts.

---

## 8. Event Architecture

### 8.1 Event Envelope

A standard event envelope must include:

- `event_id` — unique identifier.
- `event_type` — domain event name.
- `tenant_id` — organization context.
- `timestamp` — ISO 8601.
- `actor` — user or service that triggered the event.
- `payload` — event-specific data.
- `correlation_id` — ties related events and requests.

### 8.2 Event Categories

| Category | Examples |
|----------|----------|
| Knowledge lifecycle | `knowledge.published`, `knowledge.deprecated`, `knowledge.retired`. |
| Operational | `finding.created`, `finding.assessed`, `finding.escalated`, `finding.closed`. |
| Integration | `escalation.submitted`, `outcome.received`. |
| Platform | `user.authenticated`, `api_key.created`, `audit.event_recorded`. |

### 8.3 Event Consumption

- Synchronous handlers for immediate side effects.
- Asynchronous consumers for analytics, AI, and integrations.
- Dead-letter handling for failed async processing.

---

## 9. Security Model

### 9.1 Authentication Flow

1. User or service presents credentials.
2. Platform validates identity and tenant membership.
3. Platform establishes a secure authenticated session or context.
4. Subsequent requests carry that authenticated context.
5. The context includes identity, tenant, and authorization information.

*The exact session/token mechanism (e.g., access/refresh tokens, session cookies, signed assertions) is an implementation decision.*

### 9.2 Authorization Flow

1. API receives request within an authenticated context.
2. Platform extracts tenant and authorization information.
3. Policy engine evaluates permission for requested resource/action.
4. Rejected requests return a forbidden response with an audit record.

*The exact claim format and policy engine implementation are implementation decisions.*

### 9.3 Service Accounts

- Scoped API keys for integrations.
- Keys rotate and are revocable.
- Service accounts have explicit tenant and permission scopes.

---

## 10. Deployment and Operations

### 10.1 Runtime Requirements

- Application runtime and static assets.
- PostgreSQL database(s).
- Blob storage backend where attachments are required.
- Optional cache/session store if performance requires it.
- Secrets manager integration.
- Event transport appropriate to scale; in-app events may suffice initially.

### 10.2 Deployment Pipeline

- Build deployable artifact.
- Run automated tests.
- Deploy to staging with idempotent schema migration.
- Smoke tests against staging.
- Promote to production using a deployment strategy appropriate to the environment.
- Monitor health and error rates post-deployment.

### 10.3 Idempotency

- Schema migrations must be rerunnable.
- Knowledge seeding must be idempotent.
- Configuration application must be idempotent.

---

## 11. Observability

### 11.1 Logging

- Structured JSON logs.
- Correlation ID across requests and events.
- Tenant and user context where appropriate.
- No sensitive data (passwords, secrets) in logs.

### 11.2 Metrics

- Request latency and throughput.
- Error rates by endpoint and layer.
- Business metrics: findings created, knowledge published, escalations submitted.
- Resource utilization.

### 11.3 Tracing

- Trace requests across API, service, and database boundaries.
- Trace event publishing and consumption.

---

## 12. Integration Foundations

### 12.1 Connector Model

- Each enterprise system has a connector.
- Connectors are versioned and tenant-configured.
- Connectors implement inbound and/or outbound adapters.
- Mapping layer translates between Atiman and external semantics.

### 12.2 Outbound Escalation

- Asset Intelligence / Operational Applications prepare escalation package.
- Enterprise Integration sends package via connector.
- Event recorded; retry on failure.

### 12.3 Inbound Outcomes

- Connector receives outcome/schedule data.
- Mapping layer translates to Atiman operational evidence.
- Operational Applications update relevant finding/asset context.

---

## 13. Open Questions

1. Which authentication provider(s) are primary targets (custom auth, Auth0, Supabase Auth, enterprise OIDC)?
2. What is the physical tenant-isolation strategy (RLS, schema separation, database per tenant)?
3. Which message broker or event transport will be used?
4. What is the target cache/session store?
5. What is the blob-storage target and CDN strategy?
6. Which observability stack is preferred (Datadog, Prometheus/Grafana, cloud-native)?
7. What are the target SLAs for availability and recovery?
8. What regulatory/compliance requirements apply to audit retention?
9. Which existing API framework (Express, Fastify, NestJS, etc.) will be retained or replaced?
10. What is the rollout strategy for phasing out legacy ODM-CMMS domain code?

---

## 14. Decision Record

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | PostgreSQL remains primary database. | Existing investment, relational knowledge graph, idempotent deployment pattern. |
| 2 | Tenant isolation enforced at platform layer. | Domain layers should not implement isolation differently per feature. |
| 3 | RBAC/ABAC authorization model. | Supports Atiman's role-aware experience (ATM-002). |
| 4 | Event-driven cross-layer communication. | Decouples operational apps, intelligence, and integrations. |
| 5 | Versioned public API. | Required for enterprise integrations and customer stability. |
| 6 | Idempotent schema and knowledge deployments. | Production safety and repeatability. |
| 7 | Separate platform logic from domain logic. | Keeps the architecture clean and testable. |
| 8 | Retain and refactor existing ODM-CMMS identity/tenancy tables. | Avoids rebuilding core identity; refactor roles and audit to match Atiman. |
| 9 | Discard legacy CMMS/EAM-conflicting domain logic. | Atiman is a new product with different boundaries. |
| 10 | Physical data partitioning is an open implementation decision. | Domain architecture must not depend on a specific PostgreSQL layout. |

---

## STOP

This is a design document only.  
No code, schema, configuration, or deployment changes have been performed.  
Awaiting ChatGPT architectural review.
