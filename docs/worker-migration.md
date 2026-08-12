# Background Worker Migration Strategy

## Current Architecture

The application uses a long-running worker process (`apps/api/src/worker/index.ts`) that polls the MongoDB `queue_jobs` collection for pending jobs and processes them in batches.

### Current Flow
1. Controllers/services enqueue jobs via `createQueue().enqueue(message)`
2. Jobs are stored in MongoDB `queue_jobs` collection with status `pending`
3. Worker process (`worker/index.ts`) runs in an infinite loop:
   - Calls `queue.processAll(BATCH_SIZE)` to claim and process jobs
   - Sleeps for `SLEEP_MS` between batches
4. `cron.ts` exists as a Vercel Cron-compatible handler (same `processAll` logic)

### Existing Job Types

| Job Type | Consumer | Current Trigger | New Trigger | Retry Behavior | Idempotency |
|----------|----------|-----------------|-------------|----------------|-------------|
| `export` | `exportConsumer` | Worker poll | Vercel Cron / API trigger | 3 attempts, 5s backoff | `type + jobId` unique index |
| `import` | `importConsumer` | Worker poll | Vercel Cron / API trigger | 3 attempts, 5s backoff | `type + jobId` unique index |
| `webhook` | `createWebhookConsumer()` | Worker poll | Vercel Cron / API trigger | 3 attempts, 5s backoff | `type + jobId` unique index |
| `outbox` | `outboxConsumer` | Worker poll | Vercel Cron / API trigger | 3 attempts, 5s backoff | `type + jobId` unique index |
| `report` | `reportConsumer` | Worker poll | Vercel Cron / API trigger | 3 attempts, 5s backoff | `type + jobId` unique index |

## Migration Strategy

### Phase 1: Preserve Existing Worker (Current State)
- Keep `apps/api/src/worker/index.ts` intact
- Continue using `MongoQueue` for local development and Docker
- `cron.ts` already provides Vercel-compatible entry point

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

## Action Items
- [ ] Configure `vercel.json` cron schedule for `apps/api/src/queue/cron.ts`
- [ ] Monitor queue depth in production
- [ ] Adjust `BATCH_SIZE` and `SLEEP_MS` based on load
- [ ] Add alerting for failed jobs
- [ ] Do NOT delete `worker/index.ts` until Cron proven stable in production
