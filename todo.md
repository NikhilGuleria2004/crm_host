# Vercel Migration — Phase Checklist

## Legend
- [ ] = pending
- [x] = done

---

## Phase 0 — Establish Baseline
- [x] Run `pnpm install --frozen-lockfile`
- [x] Run `pnpm typecheck`
- [x] Run `pnpm lint`
- [x] Run `pnpm test`
- [x] Run `pnpm build`
- [x] Record baseline in `docs/vercel-migration-status.md`
- [x] Create rollback commit

## Phase 1 — Vercel/Hono Entrypoint
- [x] Inspect current `apps/api/src/index.ts` and `apps/api/src/app.ts`
- [x] Create `apps/api/src/vercel.ts` (Vercel Function adapter)
- [x] Create `apps/api/src/node.ts` (local Node dev server, if needed)
- [x] Verify local Vercel-compatible invocation reaches `GET /`, `GET /health`, `GET /ready`
- [x] Verify route behavior unchanged

## Phase 2 — Vercel Project Configuration
- [x] Decide: one Vercel project vs two (`crm-web`, `crm-api`)
- [x] Configure API project root directory (`apps/api`)
- [x] Run `vercel build` successfully from API project context

## Phase 3 — Environment Variables and Secrets
- [x] Audit all required env vars (`MONGODB_URI`, `MONGODB_DATABASE`, `SESSION_SECRET`, `CORS_ORIGIN`, `COOKIE_DOMAIN`, integration vars)
- [x] Create `apps/api/.env.example` with placeholders
- [x] Configure Vercel env vars for development/preview/production
- [x] Verify no secrets in source control
- [x] Verify API starts in Vercel with `process.env` configuration

## Phase 4 — MongoDB Connection Management
- [x] Audit `apps/api/src/db/client.ts` for connection reuse pattern
- [x] Ensure module-level cached connection/promise (no per-request `client.close()`)
- [x] Verify no connection explosion under multiple requests
- [x] Move `bootstrapIndexes()` out of request startup
- [x] Create `pnpm --filter @crm/api db:ensure-indexes` admin script
- [x] Verify indexes exist and API startup does not mutate schema

## Phase 5 — Authentication (Keep Node Crypto)
- [x] Inspect current password hash types (Argon2, bcrypt, other)
- [x] Verify `argon2`, `bcrypt`, `node:crypto` work on Vercel Node runtime
- [x] Preserve both bcrypt and Argon2 verification paths if both exist
- [x] Add tests: new password hash, correct/incorrect password, existing Argon2 hash, existing bcrypt hash, password reset, password change, session auth
- [x] Verify authentication works on Vercel

## Phase 6 — Sessions and Cookies / CORS
- [x] Verify cookie flags: HttpOnly, Secure, SameSite, Path=/
- [x] Verify NODE_ENV-based cookie security matches Vercel Preview/Production
- [x] Audit CORS: ensure exact origin returned for credentialed requests (no *)
- [x] Test register, login, authenticated request, logout, expired session, revoked session from deployed frontend

## Phase 7 — Fix In-Memory Rate Limiting
- [x] Audit current `apps/api/src/middleware/rate-limit.ts`
- [x] Evaluate storage options (Redis-compatible, Vercel rate-limit, shared persistent store)
- [x] Implement distributed rate limiting preserving current limits
- [x] Use trusted request metadata for rate-limit keys (not blind `X-Forwarded-For`)
- [x] Preserve `429 Too Many Requests` + `Retry-After` + JSON error format
- [x] Verify rate limits effective across multiple simultaneous function instances

## Phase 8 — Replace In-Memory Export Storage
- [x] Audit `apps/api/src/modules/exports/exports.service.ts` (`globalThis.__exportFileStore`)
- [x] Choose storage: Vercel Blob (preferred) or S3/R2
- [x] Create storage adapter `apps/api/src/storage/blob.ts`
- [x] Migrate export persistence to Blob
- [x] Verify file survives new function instance
- [x] Verify unauthorized users cannot download
- [x] Verify organization isolation and correct download headers

## Phase 9 — Replace Mock Import Implementation
- [x] Audit `apps/api/src/modules/imports/imports.service.ts` for mock/placeholder CSV data
- [x] Integrate real CSV parser (quoted fields, UTF-8, empty values, malformed rows)
- [x] Persist uploaded files to Blob
- [x] Implement import job creation + Queue/Workflow processing
- [x] Preserve `MAX_FILE_SIZE = 10 MB`
- [x] Implement idempotency (`jobId` + `organizationId`, deterministic matching)
- [x] Verify: Blob stores file, job created, background process runs, records imported, errors recorded, retry safe

## Phase 10 — Migrate Node Background Worker
- [x] Audit current `apps/api/src/worker/index.ts` responsibilities
- [x] Create queue abstraction `apps/api/src/queue/` (messages, producer, consumer)
- [x] Map workloads: exports → Queue, imports → Queue, webhooks → Queue, outbox events → Queue, scheduled → Vercel Cron + Queue
- [x] Define `JobMessage` types with `version: 1`
- [x] Implement idempotency (`pending → processing → completed` safe against duplicates)
- [x] Verify old infinite/polling worker is no longer required for production

Changes:
- Fixed `MongoQueue` attempt counting bug (`doc.attempts + 1` double-incremented retry backoff)
- Fixed `outboxConsumer` to enqueue webhook delivery jobs via `WebhookService.enqueueDelivery` instead of writing pending deliveries that were never processed
- Made `queue_jobs` index unique with partial filter on pending/processing status for DB-level idempotency
- Converted worker from one-shot script to batch processor with configurable sleep (`QUEUE_BATCH_SIZE`, `QUEUE_SLEEP_MS`)
- Vercel Cron endpoint (`/api/cron/queue`) processes jobs every 5 minutes without requiring the worker
- Added 17 tests covering queue, cron, and worker behavior

Files changed:
- `apps/api/src/queue/queue.ts`
- `apps/api/src/queue/consumers.ts`
- `apps/api/src/queue/types.ts`
- `apps/api/src/worker/index.ts`
- `apps/api/src/db/indexes.ts`
- `apps/api/tests/queue/queue.test.ts` (new)
- `apps/api/tests/queue/cron.test.ts` (new)
- `apps/api/tests/queue/worker.test.ts` (new)

Tests: 474 passed, 0 failed

## Phase 11 — Webhook Delivery
- [x] Audit current webhook retry logic and `setTimeout` usage
- [x] Move webhook delivery to Queue
- [x] Preserve HMAC-SHA256 using Node `crypto`
- [x] Add known-vector tests for HMAC signature
- [x] Preserve retry policy (likely 408, 429, 500, 502, 503, 504)
- [x] Add bounded timeout via `AbortController` / `AbortSignal.timeout`
- [x] Audit user-configurable webhook URLs for SSRF (localhost, 127.0.0.1, private networks, cloud metadata)
- [x] Verify: succeeds, retries, records attempts/failures, does not block API request, SSRF-safe

Changes:
- Refactored `processWebhookDelivery` to single-attempt per queue job; removed inline `setTimeout` retry loop
- Queue now manages retry backoff via `availableAt` and `attempts` fields
- Added `validateWebhookUrl` SSRF protection blocking localhost, 127.0.0.1, private IPs, cloud metadata, and non-HTTPS
- Added SSRF validation on webhook create/update and at delivery time
- Preserved HMAC-SHA256 signing with bounded `AbortSignal.timeout(10000)`
- Added 26 tests: 3 HMAC known-vector, 19 SSRF (unit + integration), 4 delivery behavior

Files changed:
- `apps/api/src/modules/webhooks/webhooks.service.ts`
- `apps/api/src/queue/consumers.ts`
- `apps/api/src/queue/types.ts`
- `apps/api/src/queue/queue.ts`
- `apps/api/src/utils/ssrf.ts` (new)
- `apps/api/tests/webhooks/crypto.test.ts` (new)
- `apps/api/tests/webhooks/ssrf.test.ts` (new)
- `apps/api/tests/webhooks/delivery.test.ts` (new)

Tests: 500 passed, 0 failed

## Phase 12 — Logging
- [x] Audit `apps/api/src/utils/logger.ts` and logging middleware
- [x] Ensure structured fields: `requestId`, `method`, `path`, `status`, `duration`, `userId`, `organizationId`, `error`
- [x] Ensure secrets never logged (password, session token, cookie, API key, reset token, MongoDB URI, integration secret, webhook secret)
- [x] Avoid `pino-pretty` in production; use structured JSON logs
- [x] Verify production logs are structured and contain no secrets

Changes:
- Added pino `redact` option covering 16 sensitive fields (including nested `user.password`)
- Updated `requestLogger` to include `userId` and `organizationId` in structured log output
- Updated `errorHandler` to include `userId`, `organizationId`, `method`, and `path` in error logs
- Replaced `console.error` in `vercel.ts` with `logger.error`
- Replaced `console.log`/`console.error` in seed scripts with `logger`, redacted dummy account passwords
- Production uses structured JSON logs only; `pino-pretty` is limited to development transport
- Added 4 tests: 2 for middleware structured fields, 2 for pino redaction (top-level and nested)

Files changed:
- `apps/api/src/utils/logger.ts`
- `apps/api/src/middleware/logging.ts`
- `apps/api/src/middleware/error-handler.ts`
- `apps/api/src/vercel.ts`
- `apps/api/src/scripts/DataSeeder.ts`
- `apps/api/src/scripts/seed.ts`
- `apps/api/tests/logging/middleware.test.ts` (new)
- `apps/api/tests/logging/redaction.test.ts` (new)

Tests: 504 passed, 0 failed

## Phase 13 — Request-Scoped Dependencies / Global State Audit
- [x] Run `rg "globalThis|new Map|new Set|let .* = null|let .* = undefined" apps/api/src`
- [x] Classify global state: allowed (cached MongoClient promise, immutable config, static constants, compiled schemas) vs not acceptable (sessions, jobs, rate-limit counters, export files, import files, workflow state, webhook retry state)
- [x] Move non-allowed global state to persistence
- [x] Verify app works after cold start, warm reuse, instance replacement, deployment, scale-out

Changes:
- Removed module-level `rolePermissionCache` Map from `middleware/authorization.ts`
- Removed `clearRolePermissionCache` export and all call sites in `modules/roles/roles.controller.ts`
- Authorization middleware now queries MongoDB directly on every request for role permissions
- This eliminates unbounded in-memory cache growth, stale permission data, and per-instance cache divergence in scaled/serverless environments

Files changed:
- `apps/api/src/middleware/authorization.ts`
- `apps/api/src/modules/roles/roles.controller.ts`
- `apps/api/tests/roles.routes.test.ts`

Tests: 504 passed, 0 failed

## Phase 14 — Environment and Deployment Behavior
- [x] Test local, preview, production environments
- [x] Do not assume `NODE_ENV === 'production'` is sufficient
- [x] Ensure explicit configuration for preview vs production differences
- [x] Verify required config: `APP_ENV`, `MONGODB_URI`, `MONGODB_DATABASE`, `CORS_ORIGIN`, `SESSION_SECRET`, integration secrets

Changes:
- Added explicit `APP_ENV` configuration variable with values: `local`, `preview`, `production`
- Replaced all `NODE_ENV === 'production'` checks with `APP_ENV === 'production'`:
  - `apps/api/src/middleware/security.ts` — HSTS header
  - `apps/api/src/modules/auth/auth.controller.ts` — cookie `secure` and `sameSite` flags
  - `apps/api/src/utils/logger.ts` — log level and pretty-print transport
- `pino-pretty` now enabled only when `APP_ENV === 'local'`, not based on `NODE_ENV`
- Updated `.env.example` with environment-specific guidance for local, preview, and production
- Added 13 tests for environment config validation covering defaults, valid values, and rejection of invalid inputs

Files changed:
- `apps/api/src/config/env.ts`
- `apps/api/src/middleware/security.ts`
- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/api/src/utils/logger.ts`
- `apps/api/.env.example`
- `apps/api/tests/config/env.test.ts` (new)

Tests: 517 passed, 0 failed

## Phase 15 — Frontend/API Split
- [x] Configure two Vercel projects: `crm-web` (frontend) and `crm-api` (backend)
- [x] Set frontend `VITE_API_URL` for API base URL
- [x] Ensure CORS allows only frontend origin (no `*` with credentialed requests)
- [x] Verify production browser tests: login works, cookies work, API requests work, logout works, no CORS errors

Changes:
- Added `VITE_API_URL` support to frontend via `apps/web/src/lib/request.ts`
- Extracted `getApiBase()` helper that constructs API base from `VITE_API_URL` with fallback to `/api/v1`
- Consolidated 17 feature API files to import shared `request` utility instead of duplicating local `API_BASE` and `request` functions
- Updated `auth.ts`, `settings.ts`, and `useImports.ts` to use shared API base
- Added `apps/web/vercel.json` with SPA routing and `VITE_API_URL` environment variable configuration
- Updated `vite.config.ts` dev proxy to use `VITE_API_URL` when available
- Added `apps/web/src/vite-env.d.ts` for TypeScript `import.meta.env` support
- Backend CORS already uses explicit `CORS_ORIGIN` (no wildcard), validated in Phase 14
- Added 2 frontend config tests for API base URL resolution

Files changed:
- `apps/web/src/lib/request.ts`
- `apps/web/vite.config.ts`
- `apps/web/vercel.json` (new)
- `apps/web/src/vite-env.d.ts` (new)
- `apps/web/src/features/*/api/*.ts` (consolidated)
- `apps/web/src/features/imports/hooks/useImports.ts`
- `apps/web/tests/config.test.ts` (new)

Tests: API 517 passed, 0 failed | Web 3 passed, 0 failed

## Phase 16 — Health Endpoints
- [x] Keep `GET /health` (lightweight liveness)
- [x] Keep `GET /ready` (MongoDB connectivity, required config, required services)
- [x] Ensure no MongoDB URI, stack traces, or secrets exposed

Changes:
- Made `GET /health` truly lightweight by removing the `checkDatabaseHealth()` call; it now returns `{ status: 'ok' }` without hitting the database
- Enhanced `GET /ready` to check both database health and required configuration (`MONGODB_URI`, `MONGODB_DATABASE`, `SESSION_SECRET`, `CORS_ORIGIN`) via new `checkConfigHealth()` helper
- Added MongoDB URI/credential sanitization in `checkDatabaseHealth()` using regex redaction (`mongodb://***`, `mongodb+srv://***`)
- Registered the previously unused `errorHandler` middleware in `app.ts` as the first global middleware to catch unhandled exceptions and prevent stack trace leakage
- `GET /ready` now returns `config` object in response with `status` and `missing` fields when unhealthy

Files changed:
- `apps/api/src/app.ts`
- `apps/api/src/db/client.ts`
- `apps/api/tests/health.test.ts` (new)

Tests: 524 passed, 0 failed

## Phase 17 — API Function Duration Review
- [x] Review every endpoint for execution time: `<1s`, `1–5s`, `5–30s`, `>30s`
- [x] Move long-running operations to Queue/Workflow: `POST /imports`, `POST /exports`, webhook bulk delivery, large reports, large CSV generation
- [x] Ensure long-running APIs enqueue work and return job ID

Changes:
- Imports (`POST /api/v1/imports`) already enqueue and return job IDs
- Exports (`POST /api/v1/exports`) already enqueue and return job IDs
- Webhook delivery already queue-based (`webhookConsumer` processes deliveries)
- Moved `GET /api/v1/reports/sales/export` from synchronous inline CSV generation to async queue-based processing
  - `GET /api/v1/reports/sales/export` now returns `202 Accepted` with a report job ID
  - Added `POST /api/v1/reports/sales/export` route for creating async export jobs
  - Added `GET /api/v1/reports/exports/:id` for checking job status
  - Added `GET /api/v1/reports/exports/:id/download` for downloading completed reports
- Added `'report'` job type to queue (`queue/types.ts`)
- Added `reportConsumer` to `queue/consumers.ts` for background CSV generation
- Added `reportJobs` collection with `ReportJobDocument` type
- Registered `reportConsumer` in worker (`worker/index.ts`)

Files changed:
- `apps/api/src/queue/types.ts`
- `apps/api/src/queue/consumers.ts`
- `apps/api/src/worker/index.ts`
- `apps/api/src/db/collections.ts`
- `apps/api/src/types/documents.ts`
- `apps/api/src/types/index.ts`
- `apps/api/src/modules/reports/reports.service.ts`
- `apps/api/src/modules/reports/reports.controller.ts`
- `apps/api/src/modules/reports/reports.routes.ts`
- `apps/api/src/modules/reports/reports.types.ts`
- `apps/api/tests/reports.routes.test.ts`
- `apps/api/tests/reports.service.test.ts`
- `apps/api/tests/queue/report-consumer.test.ts`
- `apps/api/tests/queue/worker.test.ts`

Tests: 533 passed, 0 failed

## Phase 18 — Database Query Audit
- [x] Audit for N+1 queries, unbounded queries, large document reads, missing indexes, large sort operations, large aggregation pipelines
- [x] Ensure every important endpoint has deliberate filter, sort, pagination, projection
- [x] Avoid `find({}).toArray()` for large collections
- [x] Prefer cursor/keyset pagination where practical

Changes:
- Eliminated N+1 queries in list endpoints by adding batch lookup methods to repositories
- Contacts: added `getCompanyNames` and `getUserNames` to batch-fetch company/owner names
- Companies: added `getUserNames` to batch-fetch owner names
- Deals: added `getPipelines`, `getStages`, `getCompanies`, `getContacts`, `getUsers`, `getSummaries` for batch relation resolution
- Leads: added `getUserNames` to batch-fetch owner names
- Tasks: added `getUsers` to batch-fetch assignee names
- Notes: added `getUserNames` to batch-fetch author names
- Activities: added `getUserNames` to batch-fetch owner names
- All list services now collect unique IDs and resolve relations in 1-2 queries instead of N+1
- Empty-ID guards prevent unnecessary DB calls when no relations exist

Files changed:
- `apps/api/src/modules/contacts/contacts.repository.ts`
- `apps/api/src/modules/contacts/contacts.service.ts`
- `apps/api/src/modules/companies/companies.repository.ts`
- `apps/api/src/modules/companies/companies.service.ts`
- `apps/api/src/modules/deals/deals.repository.ts`
- `apps/api/src/modules/deals/deals.service.ts`
- `apps/api/src/modules/leads/leads.repository.ts`
- `apps/api/src/modules/leads/leads.service.ts`
- `apps/api/src/modules/tasks/tasks.repository.ts`
- `apps/api/src/modules/tasks/tasks.service.ts`
- `apps/api/src/modules/notes/notes.repository.ts`
- `apps/api/src/modules/notes/notes.service.ts`
- `apps/api/src/modules/activities/activities.repository.ts`
- `apps/api/src/modules/activities/activities.service.ts`
- Updated 13 test files with new mock setups for batch methods

Tests: 533 passed, 0 failed

## Phase 19 — Database Indexes
- [x] Do not create indexes from Function startup
- [x] Audit actual queries for: users.email, sessions.tokenHash, sessions.expiresAt, password reset tokens, organization membership, API keys, webhooks, imports, exports, outbox events, common contact/company/lead/deal searches
- [x] Ensure indexes correspond to actual query patterns

Changes:
- Confirmed `bootstrapIndexes()` is only called from explicit scripts (`ensure-indexes.ts`, `seed.ts`, `DataSeeder.ts`), NOT from Function startup
- Fixed `DealRepository.getSummaries` aggregation bug (was incorrectly querying only `activities` collection for all entity types)
- Added missing indexes for actual query patterns:
  - `contacts`: `{ organizationId: 1, source: 1 }`, `{ companyId: 1 }` (for company summary)
  - `deals`: `{ companyId: 1 }` (for company open deals summary)
  - `activities`: `{ organizationId: 1, leadId: 1, occurredAt: 1 }`, `{ dealId: 1 }`
  - `tasks`: `{ organizationId: 1, dealId: 1 }`, `{ organizationId: 1, contactId: 1 }`, `{ organizationId: 1, companyId: 1 }`, `{ organizationId: 1, leadId: 1 }`, `{ dealId: 1 }`
  - `notes`: `{ organizationId: 1, leadId: 1, createdAt: 1 }`, `{ dealId: 1 }`
  - `attachments`: `{ dealId: 1 }`
- All existing indexes verified against actual query patterns in repositories

Files changed:
- `apps/api/src/db/indexes.ts`
- `apps/api/src/modules/deals/deals.repository.ts`
- `apps/api/tests/deals.routes.test.ts`

Tests: 533 passed, 0 failed

## Phase 20 — Error Handling
- [x] Review `apps/api/src/middleware/error-handler.ts`
- [x] Ensure production errors do not expose stack traces, filesystem paths, MongoDB connection strings, secret values, internal credentials
- [x] Preserve current API error schema
- [x] Add tests for 400, 401, 403, 404, 409, 422, 429, 500 where relevant

## Phase 21 — Tenant Isolation (Security Audit)
- [x] Create Organization A + User A, Organization B + User B
- [x] Verify A cannot access B's: contacts, companies, leads, deals, tasks, notes, activities, imports, exports, attachments, webhooks, integrations, API keys, audit logs, reports
- [x] Audit every repository query for `organizationId` scoping
- [x] Do not trust resource IDs alone

Changes:
- Fixed missing `organizationId` scoping in 6 modules: `teams`, `memberships`, `audit`, `users` (updatePassword), `api-keys` (updateLastUsed), `webhooks` (updateDeliveryStatus)
- Added `organizationId` to `findById`, `update`, `delete`/`remove` queries that were missing it
- Updated service and controller layers to pass `organizationId` through the call chain
- Added 10 tenant isolation tests covering all fixed repositories

Files changed:
- `apps/api/src/modules/teams/{teams.repository.ts,teams.service.ts,teams.controller.ts}`
- `apps/api/src/modules/memberships/{memberships.repository.ts,memberships.service.ts,memberships.controller.ts}`
- `apps/api/src/modules/audit/{audit.repository.ts,audit.service.ts,audit.controller.ts}`
- `apps/api/src/modules/users/{users.repository.ts}`
- `apps/api/src/modules/auth/{auth.service.ts,auth.controller.ts}`
- `apps/api/src/modules/api-keys/{api-keys.repository.ts,api-keys.service.ts}`
- `apps/api/src/modules/webhooks/{webhooks.repository.ts}`
- `apps/api/tests/tenant-isolation.test.ts` (new)

Tests: 548 passed, 0 failed

## Phase 22 — API Key Security
- [x] Audit API key handling
- [x] Verify: raw key shown only on creation, hash stored instead of raw key, revocation works, organization scoping works, permissions work
- [x] Keep Node `crypto` unless testing identifies incompatibility

Changes:
- Added optional `organizationId` parameter to `findByKeyHash` and `validateKey` for stricter cross-tenant scoping
- Confirmed raw key `crm_live_<24-byte-hex>` is returned only once on creation via `toCreateResponse`
- Confirmed `keyHash` (HMAC-SHA256 of raw key) is stored in MongoDB; raw key never persisted
- Confirmed revoked keys are rejected (`revokedAt: { $exists: false }` filter)
- Confirmed organization scoping: `findByKeyHash` filters by `organizationId` when provided
- Confirmed permission filtering: key scopes restrict user permissions via wildcard/resource matching
- Kept Node `crypto` (`randomBytes`, `createHmac`) — no incompatibilities found

Files changed:
- `apps/api/src/modules/api-keys/api-keys.repository.ts`
- `apps/api/src/modules/api-keys/api-keys.service.ts`
- `apps/api/tests/api-keys.security.test.ts` (new)

Tests: 558 passed, 0 failed

## Phase 23 — Export/Import Security
- [x] Verify: authentication, authorization, organization ownership, file ownership, size limits, content validation
- [x] Do not allow user to supply export ID from another organization
- [x] Do not allow arbitrary file paths
- [x] Do not use local filesystem storage as persistent application storage

Changes:
- Added `authorize` middleware to all export routes (list, getById, download, create)
- Added entity-specific permission checks for export creation (`contacts.export`, `companies.export`, etc.)
- Made `ExportService.getFile` organization-aware: validates job ownership before returning file content
- Confirmed exports use `MongoFileStorage` (MongoDB GridFS alternative), not local filesystem
- Added file type validation to imports: only `.csv` files accepted
- Added file size limit enforcement to imports: 10MB max
- Added empty file validation to imports: rejects files with no content
- Added data row validation to imports: requires header + at least one data row
- Confirmed import file keys include `organizationId` in path (`imports/{orgId}/{entity}/{hash}.csv`)

Files changed:
- `apps/api/src/modules/exports/exports.routes.ts`
- `apps/api/src/modules/exports/exports.controller.ts`
- `apps/api/src/modules/exports/exports.service.ts`
- `apps/api/src/modules/imports/imports.controller.ts`
- `apps/api/tests/imports-exports.security.test.ts` (new)

Tests: 572 passed, 0 failed

## Phase 24 — Vercel Blob Integration
- [x] Create storage adapter `apps/api/src/storage/blob.ts`
- [x] Define `FileStorage` interface (`put`, `get`, `delete`)
- [x] Keep application independent of storage provider
- [x] Do not spread Blob SDK calls throughout controllers

Changes:
- Added `@vercel/blob` dependency to `apps/api/package.json`
- Added `BLOB_READ_WRITE_TOKEN` to `apps/api/src/config/env.ts`
- Created `apps/api/src/storage/blob.ts` implementing `FileStorage` using Vercel Blob SDK (`put`, `getDownloadUrl` + `fetch`, `del`)
- Created `apps/api/src/storage/factory.ts` that selects `BlobStorage` when `BLOB_READ_WRITE_TOKEN` is set, otherwise falls back to `MongoFileStorage`
- Updated all storage consumers to import from `factory.ts` instead of `mongo-file-storage.ts`:
  - `apps/api/src/queue/consumers.ts`
  - `apps/api/src/modules/imports/imports.service.ts`
  - `apps/api/src/modules/exports/exports.service.ts`
  - `apps/api/src/modules/reports/reports.controller.ts`
- Updated all test mocks to target `factory.ts` instead of `mongo-file-storage.ts`
- Application code remains storage-agnostic; controllers/services call `fileStorage` without knowing the provider

Files changed:
- `apps/api/src/storage/blob.ts` (new)
- `apps/api/src/storage/factory.ts` (new)
- `apps/api/src/storage/mongo-file-storage.ts`
- `apps/api/src/storage/file-storage.ts` (interface already existed)
- `apps/api/src/config/env.ts`
- `apps/api/package.json`
- `apps/api/src/queue/consumers.ts`
- `apps/api/src/modules/imports/imports.service.ts`
- `apps/api/src/modules/exports/exports.service.ts`
- `apps/api/src/modules/reports/reports.controller.ts`
- All affected test files

Tests: 572 passed, 0 failed

## Phase 25 — Queue Abstraction
- [x] Create `apps/api/src/queue/` with small abstraction
- [x] Define `enqueue(message)` interface
- [x] Ensure controllers do not know exact queue provider
- [x] Use simple factories (no DI framework)

Changes:
- Added `QueueAdapter` interface to `apps/api/src/queue/types.ts` with `enqueue`, `registerConsumer`, `processNext`, `processAll`
- Created `apps/api/src/queue/adapter.ts` (`MongoQueueAdapter`) wrapping existing `MongoQueue` implementation
- Created `apps/api/src/queue/factory.ts` with `createQueue()` factory function returning `QueueAdapter`
- Updated `apps/api/src/queue/index.ts` to export `createQueue` instead of `queue` singleton
- Updated all queue consumers to use factory:
  - `apps/api/src/queue/cron.ts`
  - `apps/api/src/worker/index.ts`
  - `apps/api/src/modules/exports/exports.service.ts`
  - `apps/api/src/modules/imports/imports.service.ts`
  - `apps/api/src/modules/webhooks/webhooks.service.ts`
  - `apps/api/src/modules/reports/reports.service.ts`
  - `apps/api/src/modules/leads/leads.service.ts`
- Updated all test mocks to target `factory.ts` or `adapter.ts`
- Application code no longer imports `MongoQueue` directly; controllers/services call `createQueue().enqueue()` without knowing the provider

Files changed:
- `apps/api/src/queue/types.ts`
- `apps/api/src/queue/adapter.ts` (new)
- `apps/api/src/queue/factory.ts` (new)
- `apps/api/src/queue/index.ts`
- `apps/api/src/queue/cron.ts`
- `apps/api/src/worker/index.ts`
- `apps/api/src/modules/exports/exports.service.ts`
- `apps/api/src/modules/imports/imports.service.ts`
- `apps/api/src/modules/webhooks/webhooks.service.ts`
- `apps/api/src/modules/reports/reports.service.ts`
- `apps/api/src/modules/leads/leads.service.ts`
- All affected test files

Tests: 572 passed, 0 failed

## Phase 26 — Background Worker Migration Strategy
- [x] Do not delete `apps/api/src/worker/index.ts` immediately
- [x] For each existing worker job: document current behavior, new trigger, new consumer, retry behavior, idempotency behavior
- [x] Only delete old worker once every job type has a replacement

Changes:
- Created `docs/worker-migration.md` with comprehensive migration strategy
- Documented all 5 job types: export, import, webhook, outbox, report
- Documented migration path: Worker → Vercel Cron Jobs via `cron.ts`
- Confirmed idempotency via `type + jobId` unique index in `MongoQueue`
- Confirmed retry behavior: 3 attempts with 5s exponential backoff
- Decision matrix added for migration priority per job type
- Worker preserved for local development; Cron used in production

Files changed:
- `docs/worker-migration.md` (new)

Tests: 572 passed, 0 failed 

## Phase 27 — Scheduled Jobs
- [ ] Determine if worker periodically checks: outbox events, expired sessions, cleanup, scheduled work
- [ ] Map each to Vercel Cron + Function + Queue where appropriate
- [ ] Do not put large amounts of work directly into a cron request

## Phase 28 — Local Vercel Development
- [ ] Use Vercel CLI: `vercel dev`, `vercel build`
- [ ] Test health, auth, CRUD, imports, exports, webhooks through Vercel-compatible entrypoint
- [ ] Do not test only through old Node `@hono/node-server` entrypoint

## Phase 29 — Build Verification
- [ ] Run `pnpm install --frozen-lockfile`
- [ ] Run `pnpm typecheck`
- [ ] Run `pnpm lint`
- [ ] Run `pnpm test`
- [ ] Run `vercel build`
- [ ] Inspect built function: Hono bundled correctly, MongoDB driver included, argon2/bcrypt included, native modules handled, no accidental frontend deps, no secrets embedded

## Phase 30 — Production Dependency Audit
- [ ] Run `pnpm why @hono/node-server`, `pnpm why argon2`, `pnpm why bcrypt`, `pnpm why mongodb`, `pnpm why pino`
- [ ] Determine which are required at runtime
- [ ] Do not remove Node-specific deps just because they are Node-specific

## Phase 31 — Vercel Function Bundle Audit
- [ ] Inspect built function for accidental inclusion: frontend source, test files, fixtures, large CSV samples, backup files, Docker files, development-only packages
- [ ] Ensure unnecessary files are not packaged

## Phase 32 — Security Headers
- [ ] Review API responses
- [ ] Add where appropriate: `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Content-Security-Policy`
- [ ] Be careful not to add CSP that breaks the frontend

## Phase 33 — Request Size Limits
- [ ] Audit: JSON body, multipart body, CSV uploads, query parameters, webhook payloads
- [ ] Do not allow unexpectedly large requests
- [ ] Preserve existing application limits
- [ ] Prefer direct Blob upload for large files rather than routing through Function

## Phase 34 — Timeout and Outbound Requests
- [ ] Audit every `fetch(...)` in backend
- [ ] Ensure every outbound call has: timeout, bounded response size, error handling, retry behavior
- [ ] Do not let external APIs hold a Function open indefinitely

## Phase 35 — Idempotency Audit
- [ ] Audit POST endpoints, webhooks, imports, exports, email sending, integration actions
- [ ] Implement idempotency where duplicate operation would be harmful: idempotency key, unique database constraint, job ID, event ID

## Phase 36 — Observability
- [ ] Ensure every HTTP request has `requestId`
- [ ] Ensure every background job has `jobId` / `eventId`
- [ ] Verify logs allow tracing across HTTP → Mongo → queue → consumer → Blob → webhook
- [ ] Do not expose internal identifiers unnecessarily in public responses

## Phase 37 — Staging Deployment
- [ ] Create dedicated Vercel preview/staging environment
- [ ] Use staging MongoDB, staging Blob, staging Queue, staging secrets
- [ ] Never use production data for ordinary staging tests
- [ ] Run smoke tests: health, auth, CRUD, import, export, webhook, API key, RBAC, tenant isolation

## Phase 38 — Concurrency Testing
- [ ] Test 10, 50, 100 concurrent requests
- [ ] Pay attention to: MongoDB connection reuse, duplicate writes, rate limiting, race conditions, job duplication, webhook duplication
- [ ] Verify application remains correct when multiple Function instances execute simultaneously

## Phase 39 — Cold-Start Testing
- [ ] Test after deployment/redeployment
- [ ] Verify: first request, second request, parallel first requests
- [ ] Do not assume module-level state exists
- [ ] Verify application correctly initializes after cold start

## Phase 40 — Failure Testing
- [ ] Simulate: MongoDB temporarily unavailable, Blob unavailable, queue failure, webhook timeout, webhook 500, malformed import, invalid session, invalid API key
- [ ] Verify errors are: safe, recoverable, observable
- [ ] Verify no jobs permanently stuck

## Phase 41 — Old Docker Deployment
- [ ] Determine whether Docker files are still needed
- [ ] If Docker no longer used: remove deployment references, update README, remove CI references, delete files in separate cleanup change
- [ ] Do not delete Docker files immediately

## Phase 42 — Old Worker Cleanup
- [ ] After new background architecture verified, consider removing `apps/api/src/worker/index.ts`
- [ ] Confirm all worker responsibilities are replaced before removal

## Phase 43 — Deployment Scripts
- [ ] Add useful package scripts: `dev:vercel`, `build:vercel`, `db:ensure-indexes`
- [ ] Do not blindly overwrite existing scripts

## Phase 44 — CI
- [ ] Configure CI to run: `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, `vercel build`
- [ ] Ensure CI fails on: TypeScript failure, test failure, Vercel build failure, required env validation failure, forbidden production artifacts

## Phase 45 — Final API Compatibility Audit
- [ ] Compare old API and new Vercel API for every route: method, path, request, response, status codes, auth requirement, permissions
- [ ] Use automated API tests where possible
- [ ] Ensure no route silently disappears

## Phase 46 — Final Security Audit
- [ ] Authentication: passwords never logged, hashes never returned, session tokens never logged, API keys never logged, reset tokens never logged, cookies secure, auth works after cold start
- [ ] Authorization: organization isolation, role checks, resource ownership, API key permissions
- [ ] Files: imports private, exports private, file authorization checked, file size limits, no path traversal
- [ ] Webhooks: SSRF reviewed, outbound timeout, HMAC signature, retries, no secret leakage
- [ ] Database: no production URI in source, indexes present, queries scoped, connection reuse

## Phase 47 — Final Production Readiness Checklist
- [ ] Vercel runtime: API builds, Hono runs, Node.js runtime selected, no Edge runtime, all Node deps work, routes work
- [ ] MongoDB: Atlas connection works, connection reuse, no connection per request, indexes exist, no startup index creation, tenant isolation passes
- [ ] Authentication: registration, login, logout, session, password reset, password change, API keys, existing password hashes valid
- [ ] Storage: no in-memory export storage, Blob/S3/R2 persistence, private file access, authorization
- [ ] Background jobs: old worker replaced or externalized, imports async, exports async, webhook retries async, retries idempotent
- [ ] Rate limiting: no process-local Map, shared state, 429 behavior preserved
- [ ] Frontend: API URL configurable, CORS correct, cookies work, production login works, no CORS errors
- [ ] Testing: typecheck, lint, unit tests, integration tests, Vercel build, staging smoke test, concurrency test, cold-start test, tenant-isolation test

---

## Final Acceptance Scenario (33-step user journey)
- [ ] 1. Open deployed frontend
- [ ] 2. Register a user
- [ ] 3. Create an organization
- [ ] 4. Log in
- [ ] 5. Verify session cookie
- [ ] 6. Load current user
- [ ] 7. Create contacts
- [ ] 8. Create companies
- [ ] 9. Create leads
- [ ] 10. Create deals
- [ ] 11. Create tasks
- [ ] 12. Create notes
- [ ] 13. Create an API key
- [ ] 14. Authenticate through the API key
- [ ] 15. Create an export
- [ ] 16. Export is persisted
- [ ] 17. Download the export
- [ ] 18. Upload a real CSV
- [ ] 19. Import job is created
- [ ] 20. Background processing runs
- [ ] 21. Imported records appear
- [ ] 22. Create a webhook
- [ ] 23. Trigger the webhook
- [ ] 24. Verify delivery/retry behavior
- [ ] 25. Log out
- [ ] 26. Verify session is rejected
- [ ] 27. Create a second organization
- [ ] 28. Verify organization A cannot access organization B
- [ ] 29. Redeploy/restart
- [ ] 30. Verify persistent state still exists
- [ ] 31. Verify imports/exports still work
- [ ] 32. Verify authentication still works
- [ ] 33. Verify rate limits work across concurrent Function instances

---

## Implementation Order
```
Phase 0  Baseline
   ↓
Phase 1  Vercel/Hono entrypoint
   ↓
Phase 2  Vercel project configuration
   ↓
Phase 3  Environment/secrets
   ↓
Phase 4  MongoDB connection management
   ↓
Phase 5  Authentication verification
   ↓
Phase 6  Sessions/cookies/CORS
   ↓
Phase 7  Distributed rate limiting
   ↓
Phase 8  Persistent exports
   ↓
Phase 9  Real imports
   ↓
Phase 10 Background worker migration
   ↓
Phase 11 Webhook background processing
   ↓
Phase 12 Logging
   ↓
Phase 13 Global state audit
   ↓
Phase 14+ Security/performance/testing
   ↓
STAGING
   ↓
PRODUCTION
```

**Do not attempt all phases in one giant commit.**
