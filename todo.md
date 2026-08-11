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
- [ ] Inspect current `apps/api/src/index.ts` and `apps/api/src/app.ts`
- [ ] Create `apps/api/src/vercel.ts` (Vercel Function adapter)
- [ ] Create `apps/api/src/node.ts` (local Node dev server, if needed)
- [ ] Verify local Vercel-compatible invocation reaches `GET /`, `GET /health`, `GET /ready`
- [ ] Verify route behavior unchanged

## Phase 2 — Vercel Project Configuration
- [ ] Decide: one Vercel project vs two (`crm-web`, `crm-api`)
- [ ] Configure API project root directory (`apps/api`)
- [ ] Run `vercel build` successfully from API project context

## Phase 3 — Environment Variables and Secrets
- [ ] Audit all required env vars (`MONGODB_URI`, `MONGODB_DATABASE`, `SESSION_SECRET`, `CORS_ORIGIN`, `COOKIE_DOMAIN`, integration vars)
- [ ] Create `apps/api/.env.example` with placeholders
- [ ] Configure Vercel env vars for development/preview/production
- [ ] Verify no secrets in source control
- [ ] Verify API starts in Vercel with `process.env` configuration

## Phase 4 — MongoDB Connection Management
- [ ] Audit `apps/api/src/db/client.ts` for connection reuse pattern
- [ ] Ensure module-level cached connection/promise (no per-request `client.close()`)
- [ ] Verify no connection explosion under multiple requests
- [ ] Move `bootstrapIndexes()` out of request startup
- [ ] Create `pnpm --filter @crm/api db:ensure-indexes` admin script
- [ ] Verify indexes exist and API startup does not mutate schema

## Phase 5 — Authentication (Keep Node Crypto)
- [ ] Inspect current password hash types (Argon2, bcrypt, other)
- [ ] Verify `argon2`, `bcrypt`, `node:crypto` work on Vercel Node runtime
- [ ] Preserve both bcrypt and Argon2 verification paths if both exist
- [ ] Add tests: new password hash, correct/incorrect password, existing Argon2 hash, existing bcrypt hash, password reset, password change, session auth
- [ ] Verify authentication works on Vercel

## Phase 6 — Sessions and Cookies / CORS
- [ ] Verify cookie flags: `HttpOnly`, `Secure`, `SameSite`, `Path=/`
- [ ] Verify `NODE_ENV`-based cookie security matches Vercel Preview/Production
- [ ] Audit CORS: ensure exact origin returned for credentialed requests (no `*`)
- [ ] Test register, login, authenticated request, logout, expired session, revoked session from deployed frontend

## Phase 7 — Fix In-Memory Rate Limiting
- [ ] Audit current `apps/api/src/middleware/rate-limit.ts`
- [ ] Evaluate storage options (Redis-compatible, Vercel rate-limit, shared persistent store)
- [ ] Implement distributed rate limiting preserving current limits
- [ ] Use trusted request metadata for rate-limit keys (not blind `X-Forwarded-For`)
- [ ] Preserve `429 Too Many Requests` + `Retry-After` + JSON error format
- [ ] Verify rate limits effective across multiple simultaneous function instances

## Phase 8 — Replace In-Memory Export Storage
- [ ] Audit `apps/api/src/modules/exports/exports.service.ts` (`globalThis.__exportFileStore`)
- [ ] Choose storage: Vercel Blob (preferred) or S3/R2
- [ ] Create storage adapter `apps/api/src/storage/blob.ts`
- [ ] Migrate export persistence to Blob
- [ ] Verify file survives new function instance
- [ ] Verify unauthorized users cannot download
- [ ] Verify organization isolation and correct download headers

## Phase 9 — Replace Mock Import Implementation
- [ ] Audit `apps/api/src/modules/imports/imports.service.ts` for mock/placeholder CSV data
- [ ] Integrate real CSV parser (quoted fields, UTF-8, empty values, malformed rows)
- [ ] Persist uploaded files to Blob
- [ ] Implement import job creation + Queue/Workflow processing
- [ ] Preserve `MAX_FILE_SIZE = 10 MB`
- [ ] Implement idempotency (`jobId` + `organizationId`, deterministic matching)
- [ ] Verify: Blob stores file, job created, background process runs, records imported, errors recorded, retry safe

## Phase 10 — Migrate Node Background Worker
- [ ] Audit current `apps/api/src/worker/index.ts` responsibilities
- [ ] Create queue abstraction `apps/api/src/queue/` (messages, producer, consumer)
- [ ] Map workloads: exports → Queue, imports → Queue, webhooks → Queue, outbox events → Queue, scheduled → Vercel Cron + Queue
- [ ] Define `JobMessage` types with `version: 1`
- [ ] Implement idempotency (`pending → processing → completed` safe against duplicates)
- [ ] Verify old infinite/polling worker is no longer required for production

## Phase 11 — Webhook Delivery
- [ ] Audit current webhook retry logic and `setTimeout` usage
- [ ] Move webhook delivery to Queue
- [ ] Preserve HMAC-SHA256 using Node `crypto`
- [ ] Add known-vector tests for HMAC signature
- [ ] Preserve retry policy (likely 408, 429, 500, 502, 503, 504)
- [ ] Add bounded timeout via `AbortController` / `AbortSignal.timeout`
- [ ] Audit user-configurable webhook URLs for SSRF (localhost, 127.0.0.1, private networks, cloud metadata)
- [ ] Verify: succeeds, retries, records attempts/failures, does not block API request, SSRF-safe

## Phase 12 — Logging
- [ ] Audit `apps/api/src/utils/logger.ts` and logging middleware
- [ ] Ensure structured fields: `requestId`, `method`, `path`, `status`, `duration`, `userId`, `organizationId`, `error`
- [ ] Ensure secrets never logged (password, session token, cookie, API key, reset token, MongoDB URI, integration secret, webhook secret)
- [ ] Avoid `pino-pretty` in production; use structured JSON logs
- [ ] Verify production logs are structured and contain no secrets

## Phase 13 — Request-Scoped Dependencies / Global State Audit
- [ ] Run `rg "globalThis|new Map|new Set|let .* = null|let .* = undefined" apps/api/src`
- [ ] Classify global state: allowed (cached MongoClient promise, immutable config, static constants, compiled schemas) vs not acceptable (sessions, jobs, rate-limit counters, export files, import files, workflow state, webhook retry state)
- [ ] Move non-allowed global state to persistence
- [ ] Verify app works after cold start, warm reuse, instance replacement, deployment, scale-out

## Phase 14 — Environment and Deployment Behavior
- [ ] Test local, preview, production environments
- [ ] Do not assume `NODE_ENV === 'production'` is sufficient
- [ ] Ensure explicit configuration for preview vs production differences
- [ ] Verify required config: `APP_ENV`, `MONGODB_URI`, `MONGODB_DATABASE`, `CORS_ORIGIN`, `SESSION_SECRET`, integration secrets

## Phase 15 — Frontend/API Split
- [ ] Configure two Vercel projects: `crm-web` (frontend) and `crm-api` (backend)
- [ ] Set frontend `VITE_API_URL` for API base URL
- [ ] Ensure CORS allows only frontend origin (no `*` with credentialed requests)
- [ ] Verify production browser tests: login works, cookies work, API requests work, logout works, no CORS errors

## Phase 16 — Health Endpoints
- [ ] Keep `GET /health` (lightweight liveness)
- [ ] Keep `GET /ready` (MongoDB connectivity, required config, required services)
- [ ] Ensure no MongoDB URI, stack traces, or secrets exposed

## Phase 17 — API Function Duration Review
- [ ] Review every endpoint for execution time: `<1s`, `1–5s`, `5–30s`, `>30s`
- [ ] Move long-running operations to Queue/Workflow: `POST /imports`, `POST /exports`, webhook bulk delivery, large reports, large CSV generation
- [ ] Ensure long-running APIs enqueue work and return job ID

## Phase 18 — Database Query Audit
- [ ] Audit for N+1 queries, unbounded queries, large document reads, missing indexes, large sort operations, large aggregation pipelines
- [ ] Ensure every important endpoint has deliberate filter, sort, pagination, projection
- [ ] Avoid `find({}).toArray()` for large collections
- [ ] Prefer cursor/keyset pagination where practical

## Phase 19 — Database Indexes
- [ ] Do not create indexes from Function startup
- [ ] Audit actual queries for: users.email, sessions.tokenHash, sessions.expiresAt, password reset tokens, organization membership, API keys, webhooks, imports, exports, outbox events, common contact/company/lead/deal searches
- [ ] Ensure indexes correspond to actual query patterns

## Phase 20 — Error Handling
- [ ] Review `apps/api/src/middleware/error-handler.ts`
- [ ] Ensure production errors do not expose stack traces, filesystem paths, MongoDB connection strings, secret values, internal credentials
- [ ] Preserve current API error schema
- [ ] Add tests for 400, 401, 403, 404, 409, 422, 429, 500 where relevant

## Phase 21 — Tenant Isolation (Security Audit)
- [ ] Create Organization A + User A, Organization B + User B
- [ ] Verify A cannot access B's: contacts, companies, leads, deals, tasks, notes, activities, imports, exports, attachments, webhooks, integrations, API keys, audit logs, reports
- [ ] Audit every repository query for `organizationId` scoping
- [ ] Do not trust resource IDs alone

## Phase 22 — API Key Security
- [ ] Audit API key handling
- [ ] Verify: raw key shown only when appropriate, hash stored instead of raw key, constant-time comparison where applicable, revocation works, organization scoping works, permissions work
- [ ] Keep Node `crypto` unless testing identifies incompatibility

## Phase 23 — Export/Import Security
- [ ] Verify: authentication, authorization, organization ownership, file ownership, size limits, content validation
- [ ] Do not allow user to supply export ID from another organization
- [ ] Do not allow arbitrary file paths
- [ ] Do not use local filesystem storage as persistent application storage

## Phase 24 — Vercel Blob Integration
- [ ] Create storage adapter `apps/api/src/storage/blob.ts`
- [ ] Define `FileStorage` interface (`put`, `get`, `delete`)
- [ ] Keep application independent of storage provider
- [ ] Do not spread Blob SDK calls throughout controllers

## Phase 25 — Queue Abstraction
- [ ] Create `apps/api/src/queue/` with small abstraction
- [ ] Define `enqueue(message)` interface
- [ ] Ensure controllers do not know exact queue provider
- [ ] Use simple factories (no DI framework)

## Phase 26 — Background Worker Migration Strategy
- [ ] Do not delete `apps/api/src/worker/index.ts` immediately
- [ ] For each existing worker job: document current behavior, new trigger, new consumer, retry behavior, idempotency behavior
- [ ] Only delete old worker once every job type has a replacement

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
