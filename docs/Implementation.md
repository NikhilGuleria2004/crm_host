# CRM Platform — Implementation Guide (Agent Entry Point)

**Read this file first.** It is the operating manual for building this CRM. It doesn't
repeat every detail from the other docs — it tells you the rules, the order, and where
to look. The full source-of-truth documents live alongside this file:

| Doc | Purpose | When to consult |
|---|---|---|
| `SRS.md` | Product requirements, scope, MVP staging | Before starting any new module |
| `TDS.md` | Technical architecture, module pattern, event/outbox model | Before writing backend code |
| `RBAC.md` | Authorization model, roles, scopes, permission catalogue | Before writing ANY protected route |
| `DATABASE.md` | MongoDB schemas, indexes, full REST API contract | Before writing schema, repository, or route |
| `UI-UX.md` | Design tokens, layout, component behavior, states | Before building any screen |
| `screen-spec.md` | Route-by-route screen breakdown | Before building a specific screen |

If two documents conflict, **stop and report the conflict** — do not guess.

---

## 1. Stack (fixed, do not substitute)

- Frontend: React + TypeScript + Tailwind CSS
- Backend: Hono + TypeScript
- Database: MongoDB
- Architecture: modular monolith (no microservices)
- API: REST/JSON at `/api/v1`
- Validation: Zod, shared between frontend/backend where practical
- Auth: HTTP-only secure session cookies (not JWT-in-localStorage)
- Package manager: pnpm, monorepo workspace
- Font: JetBrains Mono; design tokens in §5

---

## 2. Five rules that override everything else

These are repeated across every source document because violating any one of them is
a security or maintainability failure, not a style preference.

1. **Backend is authoritative.** Never trust frontend-supplied role, permission,
   organizationId, or ownership data. Frontend permission checks are UX only.
2. **Every organization-owned MongoDB query must include `organizationId`,** sourced
   from the authenticated session context — never from a request parameter or body.
3. **No frontend component may call MongoDB or contain business logic.** React does
   presentation, state, forms, navigation. Hono does authorization, validation,
   business rules, persistence, audit logging.
4. **Every protected endpoint requires: authentication → organization context →
   permission check → scope check**, in that order, before touching data.
5. **Don't build microservices, don't skip RBAC to "get to features faster."**
   RBAC (Milestone 2) must be built and tested before any CRM entity (Contacts,
   Companies, etc.) is built on top of it.

---

## 3. Repository layout

```
crm/
├── apps/
│   ├── web/            React app
│   └── api/             Hono app
├── packages/
│   ├── shared/           types, zod schemas, constants, permissions
│   ├── ui/                shared React components
│   └── config/            eslint, tsconfig, tailwind config
├── docs/                  this file + SRS/TDS/RBAC/DATABASE/UI-UX/screen-spec
├── scripts/
├── package.json
└── pnpm-workspace.yaml
```

Backend module pattern (apply to every module — see `TDS.md` §5):

```
modules/<name>/
├── <name>.routes.ts
├── <name>.controller.ts
├── <name>.service.ts
├── <name>.repository.ts
├── <name>.schema.ts        (Zod)
├── <name>.types.ts
├── <name>.permissions.ts
└── index.ts
```

Frontend feature pattern (see `UI-UX.md` §82):

```
features/<name>/
├── api/
├── components/
├── hooks/
├── pages/
├── schemas/
└── types/
```

Request flow, always: `Route → Controller → Service → Repository → MongoDB`.
Never skip layers. Never let a repository perform authorization.

---

## 4. Build order (do not reorder milestones)

Build **vertical slices**, not "all frontend then all backend." Every phase below
must be schema + API + RBAC + service + React page + forms + loading/error states +
tests before moving to the next. Milestones (M1–M9) are the checkpoints; phases
(P0, P1, P2…) are the actual units of work — hand phases to the agent one at a time,
in order, using the task format in §11. Don't start a phase whose `Depends on` isn't
fully at Definition of Done (§9).

### M1 — Foundation

| Phase | Title | Depends on | Deliverable | Exit check |
|---|---|---|---|---|
| P0 | Repo init | — | `apps/web`, `apps/api`, `packages/shared`, `packages/ui`, `packages/config`; TS/ESLint/Prettier/Tailwind configured; env var loading; path aliases | `pnpm install && pnpm dev && pnpm build && pnpm test && pnpm lint && pnpm typecheck` all exit 0 |
| P1 | MongoDB infra | P0 | DB client, connection handling, index-bootstrap script (`db/indexes.ts`), health check util | App connects on boot; index bootstrap is idempotent (safe to re-run) |
| P2 | Shared contracts | P0 | `packages/shared/types`, `/schemas`, `/constants`, `/permissions` scaffolding | Both apps import from `packages/shared` without circular deps |
| P3 | Design system | P0 | Design tokens wired into Tailwind config; UI primitives (Button, Input, Select, Table, Modal, Drawer, Badge, Toast, EmptyState, LoadingState, ErrorState, ConfirmDialog — full list in `UI-UX.md` §84) | Each primitive has a Storybook-less manual smoke render; no component hardcodes a hex color outside the token file |
| P4 | Table system | P3 | Reusable `DataTable`, `ColumnVisibility`, `SortControl`, `FilterControl`, `Pagination`, `BulkSelection`, `BulkActionBar` in `packages/ui` | One implementation reused later by Contacts/Companies/Leads/Deals — do not fork it per entity |
| P5 | App shell | P3 | `AppShell`, `Sidebar`, `Topbar`, `PageHeader`, responsive collapse behavior | `/app` route renders shell with placeholder content at desktop/tablet/mobile widths |

### M2 — Identity (do not skip or reorder any phase here)

| Phase | Title | Depends on | Deliverable | Exit check |
|---|---|---|---|---|
| P6 | Organizations | P1, P2 | `organizations` collection + indexes; `POST/GET/PATCH /organizations` | Org created, fetched, updated; `slug` uniqueness enforced |
| P7 | Users & Sessions | P6 | `users`, `sessions` collections; password hashing (Argon2id); session create/revoke; TTL index on `sessions.expiresAt` | No plaintext passwords anywhere, incl. logs/audit |
| P8 | Authentication | P7 | `/auth/register or invite-flow`, `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/forgot-password`, `/auth/reset-password`; login rate limiting; secure HTTP-only cookies | Login sets cookie; `/auth/me` returns user+org+permissions; forgot-password never reveals account existence |
| P9 | Memberships & Teams | P6, P7 | `organization_memberships`, `teams` collections; invite → accept flow; membership status (`invited/active/suspended/removed`) | Suspended membership blocks org access even with a valid session |
| P10 | Roles & Permission catalogue | P9 | `roles` collection; seed default roles (Owner, Administrator, Sales Manager, Sales Representative, Support Agent, Viewer) per `RBAC.md` §7–13; permission catalogue seeded | Seed script produces all 6 roles with correct default scopes |
| P11 | RBAC engine | P10 | `authenticate()`, `organizationContext()`, `authorize(permission, scope)`, `checkRecordScope()` middleware chain | Full RBAC test matrix from §6 of this doc passes |
| P12 | Audit infrastructure | P11 | `audit_logs` collection; `audit.log()` service helper wired into the request lifecycle | Login, logout, and one CRUD action each produce an audit record with no sensitive data in `metadata` |

**Gate: do not proceed to M3 until every RBAC test in §6 is green.**

### M3 — CRM Core

| Phase | Title | Depends on | Deliverable | Exit check |
|---|---|---|---|---|
| P13 | Contacts | M2 complete, P4 | Full vertical slice per `DATABASE.md` §16/§40–44: schema, indexes, repository, service, routes, RBAC wiring, list/create/detail/edit pages | Definition of Done (§9) fully checked; cross-org access returns 404 |
| P14 | Companies | P13 | Same pattern as Contacts, incl. `contactsCount`/`openDealsCount` rollups on detail view | Same DoD; company↔contact relationship correct in both directions |
| P15 | Activities | P13, P14 | Unified activity model/timeline reusable across Contact/Company/Lead/Deal | One `ActivityTimeline` component reused everywhere, not rebuilt per entity |
| P16 | Notes | P13, P14 | Notes CRUD, always parented to one entity | Note requires exactly one parent entity reference |

### M4 — Sales

| Phase | Title | Depends on | Deliverable | Exit check |
|---|---|---|---|---|
| P17 | Leads | M3 complete | Lead CRUD + status lifecycle (`new→contacted→qualified→unqualified/converted`), List + Kanban views | Status transitions match `SRS.md` §16 |
| P18 | Pipelines & Stages | M3 complete | Pipeline/PipelineStage CRUD; enforce single default pipeline per org via transaction | Race-safe: concurrent "set default" requests never leave two defaults |
| P19 | Deals | P18 | Deal CRUD, Kanban view (drag calls backend, not just client state), dedicated `/stage`, `/won`, `/lost` endpoints | Moving a deal always creates an activity + audit event, per `DATABASE.md` §54–56 |
| P20 | Lead conversion | P17, P18, P19 | `POST /leads/:id/convert` as a single MongoDB transaction (lead→company→contact→deal→activity→audit→outbox) | Partial failure never leaves an orphaned contact/company/deal; full E2E test per `DATABASE.md` §103 passes |

### M5 — Productivity

| Phase | Title | Depends on | Deliverable | Exit check |
|---|---|---|---|---|
| P21 | Tasks | M3 complete | Task CRUD, `/complete` endpoint, assignment, priority/status | Overdue detection works against `dueDate` index |
| P22 | Calendar | P21 | Month/Week/Day/Agenda views over tasks + activities | No separate calendar-only backend model — reads existing tasks/activities |
| P23 | Notifications | P21, P19 | `notifications` collection, bell UI, mark-read/read-all, generated on task-assigned/deal-assigned/stage-changed/mention/invitation events | Notification created via the outbox/event path, not inline in unrelated services |

### M6 — Data

| Phase | Title | Depends on | Deliverable | Exit check |
|---|---|---|---|---|
| P24 | Global search | M3, M4 complete | `GET /search`, grouped results across contacts/companies/leads/deals/tasks | Debounced client-side (250–400ms); server never scans without org scope |
| P25 | Filtering engine | P4 | Generic, whitelisted filter/sort engine reused by every list screen | No endpoint accepts raw Mongo operators from the client (`RBAC.md` §31, `TDS.md` §50 rule) |
| P26 | Import | M3, M4 complete | Upload→parse→validate→preview→confirm→process pipeline, async for large files, per-row error reporting | 1 malformed row never aborts the whole import; downloadable error file works |
| P27 | Export | M3, M4 complete | Async export job + signed, short-lived download URL, respecting current filters/permissions | `contacts.export` checked separately from `contacts.read` |
| P28 | Custom Fields | M3, M4 complete | Definitions CRUD for contact/company/lead/deal; values embedded on the entity document (not EAV) | New custom field appears on the correct entity's form without a schema migration |
| P29 | Tags | M3, M4 complete | Tags CRUD, org-scoped, usable in filters | Deleting a tag removes it from all tagged records within the same transaction/flow |

### M7 — Intelligence

| Phase | Title | Depends on | Deliverable | Exit check |
|---|---|---|---|---|
| P30 | Dashboard | M4, M5 complete | Aggregation-endpoint-backed KPI widgets (`/dashboard/summary`, `/dashboard/pipeline`) | Aggregation happens in MongoDB, never by loading raw docs into Node and summing in JS |
| P31 | Reports | P30 | Sales/Revenue/Won-Lost/Lead-Conversion/Activity/Team-Performance reports with filters + export | Report matches the same numbers as Dashboard for overlapping metrics |

### M8 — Administration

| Phase | Title | Depends on | Deliverable | Exit check |
|---|---|---|---|---|
| P32 | User administration | M2 complete | User list, invite, edit, deactivate (never hard-delete) | Deactivation revokes all sessions and is audited |
| P33 | Role administration | P32 | Role CRUD, clone-system-role flow, privilege-escalation guard | User cannot assign a role with more privilege than their own |
| P34 | Security settings | P32 | Password change, session list/revoke, (MFA architecture stubbed if not in scope yet) | Revoking a session immediately invalidates that cookie |
| P35 | Audit log UI | P12 | Filterable audit log viewer (actor/entity/action/date) | Only roles with `audit_logs.read`/equivalent scope can view; audit entries are never editable |
| P36 | API Keys | P33 | Create/list/revoke; secret shown once; restricted permission subset | Effective permission = user permissions ∩ key permissions, enforced server-side |
| P37 | Webhooks | P36 | Register/list/update/delete; signing secret; delivery log with retry on 408/429/5xx | Secret never re-displayed or logged after creation |
| P38 | Integrations shell | P37 | `IntegrationProvider` interface + connect/disconnect/status abstraction; no concrete providers required yet | Adding a new provider doesn't require touching CRM modules |

### M9 — Production

| Phase | Title | Depends on | Deliverable | Exit check |
|---|---|---|---|---|
| P39 | Performance pass | All prior | Pagination/projection/index review, code splitting, virtualization on large tables | API p95 < 500ms; no screen fetches thousands of rows to render 25 |
| P40 | Security hardening | All prior | Full pass over `RBAC.md` §54 required tests + `TDS.md` §93 multi-tenant tests | Every test in both lists passes in CI |
| P41 | Observability | P39 | Structured logs, `requestId`, `/health`, `/ready` | `/ready` fails correctly when MongoDB is unreachable |
| P42 | Backups & recovery | — | Backup schedule + a **tested** restore procedure | A restore has actually been executed once, not just documented |
| P43 | Seed & demo data | M2–M5 complete | `pnpm db:seed` producing realistic org/users/contacts/deals per `SRS.md` seed spec | Demo accounts (`owner@example.test`, etc.) log in and see populated data |
| P44 | Deployment | P39–P42 | Dockerized `web`/`api`/`worker`, env validation on boot, graceful shutdown | Container fails fast (not silently) on invalid/missing env vars |
| P45 | Final QA pass | All prior | Screen-by-screen checklist from `screen-spec.md` §86, run against every route | Every screen has loading/empty/error/permission-denied/mobile states verified |

Gate reminder: **P11 (RBAC engine) must be green before P13 (Contacts) starts.**
**P20 (lead conversion) must pass its full transactional E2E test before M5 starts.**

---

## 5. Design tokens (copy verbatim, do not invent new colors)

```css
--color-primary: #0F4C81;
--color-accent: #2563EB;
--color-background: #F5F7FA;
--color-card: #FFFFFF;
--color-border: #D6DCE5;
--color-foreground: #1F2937;
--color-muted: #6B7280;
--color-success: #15803D;
--color-warning: #CA8A04;
--color-danger: #B91C1C;
```

Aesthetic: dense, flat, government/enterprise administrative portal. No gradients,
glassmorphism, large hero sections, or decorative animation. Full component and
screen inventory is in `UI-UX.md` and `screen-spec.md` — build the shared `DataTable`,
`FilterBar`, and form primitives once in `packages/ui`, then reuse across every
entity. Never build a second table implementation for Leads/Deals/etc.

---

## 6. RBAC quick reference

Full model in `RBAC.md`. Minimum an agent must hold in working memory:

- Decision = `authenticated AND organizationMember AND hasPermission AND withinScope`
- Default is **deny**.
- Permission format: `resource.action` (e.g. `contacts.update`).
- Scopes: `NONE | OWN | TEAM | ORGANIZATION | GLOBAL`.
- Default roles to seed: Owner, Administrator, Sales Manager, Sales Representative,
  Support Agent, Viewer.
- HTTP semantics: unauthenticated → 401; authenticated but lacking permission → 403;
  record exists but out of scope/other org → 404 (don't leak existence across tenants).
- Bulk operations must authorize every record individually — never assume a
  `deleteMany({_id: {$in: ids}})` is safe just because the user has the base permission.
- API keys get their own restricted permission set; effective permission = user
  permissions ∩ key permissions.

RBAC test matrix (must pass before M3, re-run in CI thereafter):

- Admin can manage users / Sales rep cannot
- Viewer cannot create contacts
- Sales rep can edit own deal / cannot edit another rep's deal
- Manager can edit team deals / cannot edit other-team deals
- Org A cannot access Org B under any circumstance (including guessing a valid Mongo `_id`)
- Suspended user cannot access the CRM
- Privilege escalation attempts (assigning a role above one's own) are rejected

---

## 7. Database & API — what to check before coding any module

For every entity, before writing code, confirm in `DATABASE.md`:

1. The exact document interface and required fields
2. The exact index list (every organization-owned collection needs `organizationId`
   as a index prefix; see `DATABASE.md` §11 for the pattern)
3. The exact route list, request/response shape, and required permission per route
4. Soft-delete convention: default queries always filter `deletedAt: { $exists: false }`
5. Referential integrity: any foreign ID (pipelineId, stageId, ownerId, companyId...)
   must be re-validated server-side as belonging to the same `organizationId` —
   never assume a client-supplied ID is trustworthy

API conventions (see `DATABASE.md` §2–9 for full detail):

- Base path `/api/v1`, envelope `{ data, meta }` or `{ error }`
- Cursor pagination only (`limit` + `cursor`), max `limit=100`
- Sorting/filtering fields must be explicitly whitelisted per endpoint — never pass
  user input directly into a Mongo operator
- Standard error codes are fixed (see `DATABASE.md` §5) — don't invent new ones
  without updating that doc first

---

## 8. Cross-cutting infrastructure (build once, reuse everywhere)

- **Audit logging**: every sensitive write goes through one `audit.log()` service call
  inside the service layer, never scattered through controllers.
- **Domain events / outbox**: state-changing operations that need to notify
  automation/webhooks/notifications should emit through the `outbox_events`
  collection and a background worker, not inline side effects in the request path
  (see `TDS.md` §41–46 for the pattern).
- **Validation**: all external input (query, params, body, uploads, webhook
  payloads) goes through Zod. No exceptions.
- **Error handling**: standardized `{ error: { code, message, fields?, requestId } }`
  shape; never leak MongoDB errors, stack traces, or file paths to the client.
- **Observability**: every request gets a `requestId`; structured JSON logs; never
  log passwords, session tokens, API keys, or OAuth secrets.

---

## 9. Definition of Done (per feature/module)

A module is not complete until every box below is true — this applies at the end of
every milestone slice, not just at the very end of the project:

```
Backend
[ ] MongoDB document type + indexes
[ ] Zod request/response schemas
[ ] Repository (tenant-scoped queries only)
[ ] Service (business rules, audit, events)
[ ] Controller + routes
[ ] Permission definitions wired to authorize()
[ ] Unit tests (service/business rules)
[ ] Integration tests (route + db + auth + authz, incl. cross-tenant negative tests)

Frontend
[ ] API client module (no raw fetch() in components)
[ ] React Query hooks
[ ] List / Create / Detail / Edit pages as applicable
[ ] Loading, empty, error, permission-denied states
[ ] Form validation + unsaved-changes handling
[ ] Responsive behavior (desktop/tablet/mobile)
[ ] Keyboard + accessibility pass

Quality gates
[ ] typecheck, lint, unit, integration tests pass
[ ] No TODO/mock implementations left in the code path
[ ] No console errors
```

---

## 10. Agent operating rules

1. Read the relevant source doc(s) before modifying architecture or schema.
2. Never invent a requirement when an existing doc defines the behavior — cite which
   doc/section you're following if asked.
3. If two docs conflict, stop and report the conflict instead of picking one.
4. Implement vertically complete features (§9), not isolated UI or isolated API.
5. Keep TypeScript strict; no `any` without explicit justification.
6. Do not duplicate a component/table/form pattern that already exists — extend it.
7. Run typecheck, lint, and tests before declaring a task complete.
8. Every organization-owned query must include `organizationId` — this is the single
   most common way this kind of app gets a security bug; treat it as non-negotiable.
9. After completing every phase, mark that phase as done in `todo.md` before moving
   to the next phase.

---

## 11. Task format for delegating work to the coding agent

Use this template per task; keep tasks scoped to one vertical slice where possible.

```
TASK ID:        CRM-XXX
TITLE:
OBJECTIVE:
CONTEXT:
DEPENDENCIES:   (prior task IDs)

BACKEND:
FRONTEND:
DATABASE:
AUTHORIZATION:  (required permission(s) + scope)
API:            (routes touched)
TESTS:          (incl. authorization/cross-tenant cases)

ACCEPTANCE CRITERIA:
OUT OF SCOPE:
```

Example:

```
TASK ID: CRM-042
TITLE: Implement Contact Creation
OBJECTIVE: Allow authorized users to create contacts.
DEPENDENCIES: CRM-001 (foundation), CRM-010 (auth), CRM-020 (RBAC engine)

BACKEND:
- Contact schema + repository + service
- POST /api/v1/contacts
- organizationId and createdBy set from auth context only (never from body)
- Audit event: contact.created

AUTHORIZATION:
Required: contacts.create

FRONTEND:
- Create-contact form, validation, loading/error/success states, redirect on success

TESTS:
- authorized create succeeds; viewer create is 403
- organizationId cannot be spoofed via request body
- invalid email rejected (422)

ACCEPTANCE CRITERIA:
- Contact persisted with correct organizationId
- Unauthorized users receive 403
- All tests pass
```

---

## 12. Release gate (before calling anything "production ready")

```
TypeScript compilation        PASS
ESLint                        PASS
Unit / Integration / E2E      PASS
Multi-tenant isolation tests  PASS
Authorization tests           PASS
Security scan                 PASS
MongoDB indexes               VERIFIED
Backups + restore test        VERIFIED
Docker build + health check   PASS
Production smoke test         PASS
```

Product boundary reminder (see `SRS.md` §119): this is a CRM, not an ERP/accounting
system. Do not let scope creep into general ledger, payroll, or a full email client —
`Deal.amount` is a sales figure, not an accounting ledger entry.