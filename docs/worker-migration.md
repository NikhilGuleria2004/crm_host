# Background Worker Migration Strategy

## Current Architecture

The application uses Vercel Cron (`apps/api/src/queue/cron.ts`) to process jobs from the MongoDB `queue_jobs` collection. The cron runs every 5 minutes and processes jobs in batches.

### Current Flow
1. Controllers/services enqueue jobs via `createQueue().enqueue(message)`
2. Jobs are stored in MongoDB `queue_jobs` collection with status `pending`
3. Vercel Cron (`cron.ts`) runs every 5 minutes:
   - Calls `queue.processAll(10)` to claim and process jobs
   - Runs `runCleanup()` to purge old failed jobs, expired invitations, and soft-deleted records

### Existing Job Types

| Job Type | Consumer | Trigger | Retry Behavior | Idempotency |
|----------|----------|---------|----------------|-------------|
| `export` | `exportConsumer` | Vercel Cron / API trigger | 3 attempts, 5s backoff | `type + jobId` unique index |
| `import` | `importConsumer` | Vercel Cron / API trigger | 3 attempts, 5s backoff | `type + jobId` unique index |
| `webhook` | `createWebhookConsumer()` | Vercel Cron / API trigger | 3 attempts, 5s backoff | `type + jobId` unique index |
| `outbox` | `outboxConsumer` | Vercel Cron / API trigger | 3 attempts, 5s backoff | `type + jobId` unique index |
| `report` | `reportConsumer` | Vercel Cron / API trigger | 3 attempts, 5s backoff | `type + jobId` unique index |

## Migration Strategy

### Phase 1: Preserve Existing Worker (Current State)
- `apps/api/src/worker/index.ts` has been removed
- Continue using `MongoQueue` for local development and Vercel
- `cron.ts` provides Vercel-compatible entry point

### Phase 2: Vercel Cron Integration
1. **Deploy `cron.ts` as Vercel Cron Job**
   - Path: `apps/api/src/queue/cron.ts`
   - Schedule: Every 1-5 minutes (configurable via `vercel.json`)
   - Calls `queue.processAll(10)` per invocation

2. **Keep Worker for Local Development**
   - Worker continues to work alongside Cron in production
   - No changes needed to existing job producers

3. **Monitor Queue Depth**
   - Add metrics/alerting for pending job count
   - If queue consistently grows, increase Cron frequency or batch size

### Phase 3: Event-Driven Alternatives (Future)
For high-priority job types, consider:
- **Webhooks**: Replace polling with event-driven delivery via `outbox` pattern
- **Reports**: Trigger directly from API response with async polling
- **Exports/Imports**: Already async via queue; no change needed

### Idempotency Guarantees
- `MongoQueue.enqueue()` checks for existing `pending`/`processing` jobs with same `type + jobId`
- Duplicate enqueue returns existing job ID
- Safe to call from multiple Cron invocations or worker instances

### Retry Behavior
- Max 3 attempts per job
- Backoff: 5s × attempt count
- After max attempts: job marked `failed` with `lastError`
- Failed jobs remain in DB for manual inspection

## Decision Matrix

| Job Type | Migration Priority | Recommended Trigger | Notes |
|----------|-------------------|---------------------|-------|
| `export` | Low | Vercel Cron | Already works via queue abstraction |
| `import` | Low | Vercel Cron | Already works via queue abstraction |
| `webhook` | Medium | Vercel Cron | Consider event-driven in future |
| `outbox` | Medium | Vercel Cron | Consider event-driven in future |
| `report` | Low | Vercel Cron | Already works via queue abstraction |

## Phase 27 — Scheduled Jobs

The worker currently only polls `queue_jobs` for pending jobs. It does **not** periodically check outbox events, expired sessions, cleanup, or scheduled work.

### Mapping

| Concern | Current Handling | Scheduled Job Mapping | Notes |
|---------|-----------------|----------------------|-------|
| Queue jobs (export, import, webhook, outbox, report) | Worker poll / Vercel Cron | **Vercel Cron** (`/api/cron/queue` every 5 min) → **Function** (`cron.ts`) → **Queue** (`processAll`) | Already implemented |
| Expired sessions | MongoDB TTL index on `sessions.expiresAt` | No application cron needed | MongoDB automatically removes expired sessions |
| Expired password reset tokens | MongoDB TTL index on `password_reset_tokens.expiresAt` | No application cron needed | MongoDB automatically removes expired tokens |
| Rate limit resets | MongoDB TTL index on `rate_limits.resetAt` | No application cron needed | MongoDB automatically removes stale rate limits |
| Old files | MongoDB TTL index on `files.updatedAt` | No application cron needed | MongoDB automatically removes old files |
| Outbox events | Queue + `outboxConsumer` | **Vercel Cron** → **Function** (`cron.ts`) → **Queue** (`outboxConsumer`) | Already implemented |
| Failed queue jobs | None | **Vercel Cron** → **Function** (`cron.ts`) direct cleanup | Delete jobs with `status: 'failed'` older than 7 days |
| Expired invitations | None | **Vercel Cron** → **Function** (`cron.ts`) direct cleanup | Mark `status: 'invited'` older than 7 days as `status: 'expired'` |
| Old soft-deleted records | None | **Vercel Cron** → **Function** (`cron.ts`) batched cleanup | Hard-delete contacts, companies, leads, deals, notes with `deletedAt` older than 90 days, 10 orgs per run |

### Implementation

- `apps/api/src/queue/cron.ts` — Added `runCleanup()` function executed before `queue.processAll()` on every cron invocation
- Cleanup operations are bounded and lightweight:
  - Single `deleteMany` for failed queue jobs
  - Single `updateMany` for expired invitations
  - `countDocuments` + `deleteMany` per entity type, capped at 10 organizations per run for soft-delete purging

### Action Items
- [x] Document scheduled job mapping in `docs/worker-migration.md`
- [x] Add cleanup logic to `cron.ts` (Vercel Cron path)
- [x] Add tests for cleanup in `tests/queue/cron.test.ts`
- [x] Remove `apps/api/src/worker/index.ts` after verifying cron handles all responsibilities
- [ ] Monitor cleanup metrics in production (failedJobs, expiredInvitations, purgedOrgs)
- [ ] Adjust retention periods (`CLEANUP_FAILED_JOB_RETENTION_DAYS`, `CLEANUP_INVITATION_RETENTION_DAYS`, `CLEANUP_SOFT_DELETE_RETENTION_DAYS`) based on operational requirements
