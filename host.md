# HOSTING / CLOUDFLARE WORKERS MIGRATION PLAN

## Purpose

This document is the implementation plan for making the **FreeCRM backend** in this repository deployable as a **Cloudflare Worker** while preserving the existing API contract, MongoDB data model, authentication behavior, RBAC, and frontend compatibility.

This is intended to be handed directly to a coding agent.

The agent should treat this file as an engineering specification, not as a suggestion list.

---

# 0. Current repository and target architecture

## Current repository

This is a pnpm monorepo:

```text
/
├── apps/
│   ├── api/
│   │   └── src/
│   └── web/
├── packages/
│   ├── shared/
│   ├── ui/
│   └── config/
├── package.json
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

The API is currently a Node.js application using:

- Hono
- `@hono/node-server`
- MongoDB Node.js driver
- dotenv
- Pino
- bcrypt
- argon2
- Node `crypto`
- process signals / `process.exit`
- a separate Node background worker
- in-memory rate limiting
- in-memory export file storage

Important current files include:

```text
apps/api/src/index.ts
apps/api/src/app.ts
apps/api/src/config/env.ts
apps/api/src/db/client.ts
apps/api/src/db/index.ts
apps/api/src/middleware/rate-limit.ts
apps/api/src/middleware/logging.ts
apps/api/src/middleware/auth.ts
apps/api/src/utils/crypto.ts
apps/api/src/utils/logger.ts
apps/api/src/modules/auth/auth.service.ts
apps/api/src/modules/api-keys/api-keys.service.ts
apps/api/src/modules/webhooks/webhooks.service.ts
apps/api/src/modules/exports/exports.service.ts
apps/api/src/modules/imports/imports.service.ts
apps/api/src/worker/index.ts
apps/api/worker.Dockerfile
packages/shared/src/enums.ts
```

## Target architecture

The desired production architecture is:

```text
                           INTERNET
                              |
                              v
                    +-------------------+
                    | Cloudflare Worker |
                    |      Hono API     |
                    +---------+---------+
                              |
              +---------------+----------------+
              |               |                |
              v               v                v
         MongoDB Atlas       R2             Queues
              |                                |
              |                                v
              |                       Worker Queue Consumer
              |                                |
              +----------------+---------------+
                               |
                               v
                       External integrations
                       / webhook destinations

Frontend:
    Cloudflare Pages or a separate Cloudflare Worker
          |
          v
    https://api.example.com
```

The API should become a **Workers-native Hono application**.

There must no longer be a requirement for:

- a listening TCP HTTP server
- `@hono/node-server`
- `process.on('SIGTERM')`
- `process.exit()`
- a permanently running Node worker
- local process memory as durable application state
- filesystem access at request time
- Node-only native crypto packages

---

# 1. Non-negotiable migration rules

The coding agent MUST follow these rules throughout the migration.

## 1.1 Preserve API behavior

Do not casually change:

- route paths
- HTTP methods
- request schemas
- response schemas
- authentication semantics
- RBAC semantics
- organization scoping
- error codes
- pagination formats
- frontend-facing URLs

If a migration requires a behavioral change, document it explicitly and add a regression test.

## 1.2 Do not rewrite the application unnecessarily

The existing Hono route/controller/service/repository architecture is useful.

Prefer:

```text
existing controller
        |
existing service
        |
existing repository
        |
new Worker-compatible infrastructure adapter
```

over rewriting modules.

## 1.3 No fake compatibility

Do NOT solve Worker incompatibilities by:

- silently catching unsupported runtime errors
- adding huge polyfills without testing them
- disabling authentication
- weakening password hashing
- replacing persistence with global variables
- replacing database operations with mocks
- making endpoints return fake data
- removing background work from the product
- swallowing queue/database errors

The final Worker must perform real work.

## 1.4 Keep Node-only tooling separate

Database backup, restore, local seed scripts, test utilities, and migration scripts may remain Node-only if they are explicitly separated from the Worker bundle.

For example:

```text
apps/api/src/scripts/
    seed.ts
    backup.ts
    restore.ts
```

may remain Node scripts.

They must NOT be imported by the Worker entrypoint or any code reachable from the Worker bundle.

## 1.5 No secret leakage

Never place secrets in:

- source code
- committed `.env`
- `wrangler.jsonc` `vars`
- frontend Vite variables
- logs
- API responses
- error messages

Cloudflare Worker secrets must be injected through Worker secrets.

---

# 2. Phase 0 — establish a clean baseline

Before changing runtime architecture, create a reproducible baseline.

## Tasks

Run:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Record every failure.

Do not assume existing tests are green.

Create a migration branch or commit before modifying runtime infrastructure.

Add a document:

```text
docs/cloudflare-migration-status.md
```

with:

```text
Baseline date:
Node version:
pnpm version:
Typecheck:
Lint:
Tests:
Web build:
API build:
```

## Add a Worker compatibility test command

Eventually the API package should have:

```json
{
  "scripts": {
    "dev": "...",
    "build": "...",
    "build:worker": "...",
    "dev:worker": "...",
    "test": "...",
    "test:worker": "...",
    "typecheck": "...",
    "lint": "..."
  }
}
```

The exact command can be selected after installing/configuring Wrangler.

## Acceptance criteria

Phase 0 is complete when:

- baseline failures are documented
- existing Node API still builds
- existing tests still run
- a rollback point exists
- no production behavior has changed

---

# 3. Phase 1 — create a Worker-native entrypoint

## Goal

Separate the Hono application from the Node HTTP server.

The current file:

```text
apps/api/src/index.ts
```

starts a Node server using:

```ts
import { serve } from '@hono/node-server';
```

This must stop being the production Worker entrypoint.

## Desired structure

Create something similar to:

```text
apps/api/
├── src/
│   ├── worker.ts
│   ├── node.ts
│   ├── app.ts
│   └── ...
├── wrangler.jsonc
└── ...
```

### Worker entrypoint

The Worker entrypoint should be conceptually:

```ts
import app from './app';

export default app;
```

or:

```ts
export default {
  fetch: app.fetch,
};
```

Use the Hono-supported Workers pattern.

Do not call:

```ts
serve(...)
```

inside the Worker.

### Keep Node development entrypoint temporarily

The existing Node development server can remain as a separate file while migration is underway:

```text
apps/api/src/node.ts
```

It may use:

```ts
@hono/node-server
```

but it must not be imported by `worker.ts`.

This allows local development to continue while Worker compatibility is being migrated.

Eventually the Node entrypoint may be removed if Worker-only deployment becomes the permanent architecture.

## Wrangler

Add a Worker configuration.

Use the current Wrangler configuration format supported by the installed Wrangler version.

Minimum configuration should define:

- Worker name
- Worker entrypoint
- compatibility date
- `nodejs_compat` only where required
- environments if staging/production are used
- required secrets
- R2 bindings later
- Queue bindings later

Use the latest compatible Wrangler release rather than pinning to an obsolete version.

## Important

`nodejs_compat` is allowed during migration, but it is NOT permission to keep using arbitrary Node APIs.

The objective is:

```text
Web APIs / Workers APIs
        >
Node compatibility shims
```

Use native Workers APIs whenever practical.

## Acceptance criteria

The following must work:

```bash
pnpm exec wrangler dev
```

and:

```text
GET /
GET /health
GET /ready
```

The Worker must start without:

```text
@hono/node-server
process.exit
process.on
```

being involved.

---

# 4. Phase 2 — replace process/global environment configuration

## Problem

Current configuration uses:

```ts
dotenv
process.env
```

through:

```text
apps/api/src/config/env.ts
```

Workers should receive configuration through the Worker `env` binding.

Cloudflare distinguishes normal configuration variables from secrets. Sensitive values must be Worker secrets.

## Desired model

Create a Worker environment type.

Conceptually:

```ts
export interface Env {
  MONGODB_URI: string;
  MONGODB_DATABASE: string;
  SESSION_SECRET: string;
  CORS_ORIGIN: string;
  COOKIE_DOMAIN: string;

  // later
  EXPORTS_BUCKET: R2Bucket;
  JOBS_QUEUE: Queue;
}
```

Do not hard-code this exact interface if Wrangler type generation provides a better generated type.

## Refactor configuration

Do NOT keep a module-level:

```ts
export const env = envSchema.parse(process.env);
```

because that is incompatible with request-scoped Worker bindings and makes testing harder.

Instead create:

```text
apps/api/src/config/env.ts
```

with something conceptually like:

```ts
export function getEnv(rawEnv: WorkerEnv) {
  return envSchema.parse(rawEnv);
}
```

or a typed configuration object constructed from the Worker environment.

The application should receive configuration explicitly.

Prefer:

```text
request
  -> Worker env
  -> app context
  -> service/repository
```

rather than hidden global configuration.

## Local development

Use one of:

```text
.dev.vars
```

or:

```text
.env
```

according to current Wrangler guidance.

Do not commit either file.

Add:

```text
apps/api/.dev.vars.example
```

with placeholder values only.

## Required secret names

At minimum:

```text
SESSION_SECRET
MONGODB_URI
```

Any integration secrets discovered during the audit must also be classified.

Normal non-secret configuration can include:

```text
MONGODB_DATABASE
CORS_ORIGIN
COOKIE_DOMAIN
APP_ENV
```

Do not put credentials in `vars`.

## Remove dotenv from Worker dependency graph

`dotenv` may remain for Node-only scripts if necessary, but it must not be imported by Worker-reachable code.

If practical, remove it from the API runtime dependencies entirely.

## Acceptance criteria

A Worker can boot using only:

```text
wrangler dev
```

and Worker bindings.

No Worker request path depends on:

```ts
process.env
```

or:

```ts
dotenv
```

---

# 5. Phase 3 — make MongoDB access Worker-compatible

## This phase is critical

The current code uses:

```ts
import { MongoClient } from 'mongodb';
```

with a module-level connection:

```ts
let client: MongoClient | null = null;
let db: Db | null = null;
```

The current architecture assumes a conventional long-running Node process.

Cloudflare now documents MongoDB Atlas as a database that Workers can connect to, but the practical compatibility of the exact MongoDB driver/runtime combination must be verified against the current Wrangler/workerd/runtime version rather than assumed.

## First rule

DO NOT switch to MongoDB Atlas Data API.

Do not build the migration around the old Data API.

Instead, first test the current official MongoDB Node driver against the current Workers runtime.

## Build an isolated MongoDB Worker probe

Before modifying the CRM repositories, create a tiny Worker test.

For example:

```text
apps/api/src/db/worker-probe.ts
```

or a temporary test Worker.

The probe must test:

1. Worker startup
2. MongoClient import
3. TLS connection
4. Atlas authentication
5. `ping`
6. one `findOne`
7. one `insert`
8. one `update`
9. one indexed query
10. proper error handling

Do this against a non-production database.

## Important connection model

Do NOT connect and close on every request.

Do not write:

```ts
await client.connect();
...
await client.close();
```

inside every request.

Prefer a reusable module-level client/cache where the runtime permits reuse.

The Worker runtime may recycle isolates, so the code must tolerate:

```text
cold isolate -> new client
warm isolate -> reused client
recycled isolate -> new client
```

This is normal.

## Refactor database module

The current:

```text
apps/api/src/db/client.ts
```

should become a Worker-aware adapter.

Conceptually:

```ts
let client: MongoClient | undefined;

export async function getDatabase(env: Env): Promise<Db> {
  if (!client) {
    client = new MongoClient(env.MONGODB_URI, {
      // only options proven compatible with Workers
    });
  }

  await ensureConnected(client);

  return client.db(env.MONGODB_DATABASE);
}
```

Do not copy this exact implementation blindly. Verify the current MongoDB driver behavior under Workers.

## Connection pooling

Measure before adding complexity.

If normal module-scope reuse is sufficient, keep it simple.

If repeated cold connections create unacceptable latency or connection pressure, evaluate a Durable Object-based connection manager.

Do NOT introduce a Durable Object merely because it sounds architecturally sophisticated.

## Database context

Repositories currently call:

```ts
collections.users()
collections.sessions()
...
```

which ultimately depend on global database state.

This should be changed to a request-safe database context.

Preferred direction:

```text
Worker request
    |
    v
db = await getDatabase(env)
    |
    v
request context
    |
    v
repository(db)
```

A transitional helper is acceptable, but no request must accidentally use a database belonging to another environment.

## Collections

Refactor:

```text
apps/api/src/db/collections.ts
```

so collections are created from an explicit `Db` instance.

Prefer:

```ts
export function createCollections(db: Db) {
  return {
    users: () => db.collection('users'),
    ...
  };
}
```

over a singleton that secretly calls `getDatabase()`.

If changing every constructor immediately is too invasive, introduce a request-scoped database accessor first, then migrate repositories systematically.

## Index bootstrap

The current API starts by running:

```ts
bootstrapIndexes();
```

This must NOT happen during every Worker startup.

Do not run index creation on every request or every isolate cold start.

Move index creation into:

```text
Node migration/admin script
```

for example:

```bash
pnpm --filter @crm/api db:ensure-indexes
```

or keep it in the existing seed/bootstrap tooling.

Production Worker startup must assume indexes already exist.

## Health endpoint

`/health` and `/ready` can still run a Mongo ping.

But avoid excessive database health checks from automated probes.

The endpoint should:

```text
ping database
return status
```

without modifying state.

## Acceptance criteria

The MongoDB Worker probe passes.

Then the actual API passes:

```text
GET /health
POST /api/v1/auth/register
POST /api/v1/auth/login
GET /api/v1/auth/me
GET /api/v1/contacts
```

against a real test Atlas database.

No fake database adapter is acceptable.

---

# 6. Phase 4 — replace Node crypto and native password packages

## Current problem

The code currently imports:

```ts
argon2
bcrypt
crypto
```

The Worker must not depend on native Node password-hashing modules.

The current crypto file contains:

```text
apps/api/src/utils/crypto.ts
```

and uses:

```ts
argon2
createHmac
randomBytes
```

There are also direct Node `crypto` imports in:

```text
apps/api/src/modules/webhooks/webhooks.service.ts
apps/api/src/modules/api-keys/api-keys.service.ts
```

## Goal

Use Workers/Web Crypto-compatible implementations.

### Random bytes

Replace:

```ts
randomBytes(...)
```

with:

```ts
crypto.getRandomValues(...)
```

or the appropriate Web Crypto API.

Create helpers:

```text
randomBytes
randomHex
randomToken
```

so application code does not care about the runtime.

### HMAC

Replace Node:

```ts
createHmac('sha256', secret)
```

with Web Crypto:

```ts
crypto.subtle.importKey(...)
crypto.subtle.sign('HMAC', ...)
```

The helper should return the same deterministic hexadecimal digest format currently expected by the database.

IMPORTANT:

Changing `hashToken()` from synchronous to asynchronous is acceptable and likely necessary.

Update every caller.

Search all usages before editing:

```bash
rg "hashToken|createHmac|randomBytes|argon2|bcrypt" apps/api/src
```

Do not miss:

- sessions
- password reset tokens
- invitations
- API keys
- webhook signatures
- authentication middleware

## Password hashing strategy

The application currently has both:

```text
argon2
bcrypt
```

Do not simply delete support for existing hashes.

Existing production users may already have password hashes.

The migration must preserve login compatibility.

### Preferred target

Use Argon2id as the long-term password hashing algorithm if a properly maintained Workers-compatible WASM implementation is selected and verified.

The implementation must:

- run in Workers
- verify the existing PHC-style Argon2 hashes currently stored
- generate new Argon2id hashes
- have reasonable CPU/memory settings for Workers
- have tests for known vectors
- not expose passwords in logs

A maintained WebAssembly Argon2 implementation may be used if the agent verifies its API and compatibility.

### Legacy bcrypt

If the database contains bcrypt hashes, retain verification support.

A Workers-compatible pure-JavaScript bcrypt implementation may be used for legacy verification if necessary.

Do NOT use native `bcrypt`.

### Opportunistic migration

When a user logs in successfully with a legacy bcrypt hash:

```text
bcrypt verification succeeds
        |
        v
generate Argon2id hash
        |
        v
update user.passwordHash
```

This gradually removes legacy hashes.

For existing Argon2id hashes:

```text
verify
    |
if parameters are weak/old:
    rehash
```

only if the chosen library can reliably detect and verify them.

## Password migration tests

Add tests for:

1. new Argon2id hash verifies
2. wrong password fails
3. existing Argon2 hash verifies
4. legacy bcrypt hash verifies
5. successful legacy bcrypt login upgrades hash
6. upgraded hash no longer needs bcrypt
7. reset-password creates new target hash
8. change-password creates new target hash

## Session token hashing

Make token hashing asynchronous if using Web Crypto.

Update:

```text
apps/api/src/middleware/auth.ts
apps/api/src/modules/auth/auth.service.ts
apps/api/src/modules/api-keys/api-keys.service.ts
apps/api/src/modules/memberships/memberships.service.ts
apps/api/src/modules/sessions/sessions.service.ts
```

and every other caller.

## Acceptance criteria

No Worker-reachable code imports:

```text
argon2
bcrypt
node:crypto
crypto.createHmac
crypto.randomBytes
```

The only crypto runtime should be:

- Web Crypto
- Workers-supported libraries proven compatible

All authentication tests pass against a real test database.

---

# 7. Phase 5 — fix session/cookie handling

## Current issue

`packages/shared/src/enums.ts` currently determines cookie security using:

```ts
process.env.NODE_ENV
```

This is not a good Worker design.

## Refactor

Cookie security must be based on explicit runtime configuration.

For production:

```text
Secure
HttpOnly
SameSite=Lax
Path=/
```

The cookie domain should be explicitly configured when required.

If frontend and API are on:

```text
app.example.com
api.example.com
```

verify browser cookie behavior carefully.

Do not automatically set an overly broad domain such as:

```text
.example.com
```

unless required.

## Session token

The cookie currently contains the raw session token.

That is acceptable if:

- Secure is enabled
- HttpOnly is enabled
- SameSite is correct
- token entropy remains strong
- only the hash is stored in MongoDB
- logout/revocation works

Do not change the session model unnecessarily.

## Cookie serialization

Use Hono's supported cookie utilities if they satisfy the project's requirements.

If keeping the custom serializer, add tests for:

- Secure
- HttpOnly
- SameSite
- Max-Age
- Path
- URL encoding

## Acceptance criteria

Browser login works against the deployed Worker.

Verify:

```text
register
login
authenticated request
refresh
logout
revoked session
expired session
```

---

# 8. Phase 6 — replace in-memory rate limiting

## Current problem

`apps/api/src/middleware/rate-limit.ts` uses:

```ts
const limits = new Map(...)
```

This is not a durable/distributed rate limiter.

In Workers:

- different isolates can have different Maps
- isolates can be recycled
- traffic may execute in different locations

Therefore the current implementation must not be considered production-safe.

## Required behavior

Preserve current limits:

```text
login:
5 / 15 minutes

forgot password:
3 / hour

reset password:
3 / hour
```

Any broader API limit must also be preserved if currently used.

## Preferred implementation

Use a Cloudflare-native shared state mechanism.

Evaluate:

1. Durable Objects
2. Workers KV
3. another Cloudflare-supported rate-limit primitive

For security-sensitive login throttling, prefer a strongly consistent mechanism over eventually consistent storage.

Durable Objects are a strong candidate.

Do not use KV for strict security guarantees unless the resulting semantics are explicitly accepted.

## Rate-limit key

Do not trust arbitrary user-provided:

```text
x-forwarded-for
```

without understanding Cloudflare's trusted request metadata.

Use Cloudflare's request metadata / `CF-Connecting-IP` where appropriate.

For login throttling, consider combining:

```text
IP
+
normalized email
```

so a single IP cannot attack every account while a single account cannot be attacked from unlimited IPs.

Do not overcomplicate this unless tests demonstrate the requirement.

## Response

Preserve:

```http
429
Retry-After: <seconds>
```

and:

```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests"
  }
}
```

## Acceptance criteria

Load-test the same endpoint through multiple Worker invocations and verify the limit is shared.

A process-local `Map` must no longer be the source of truth.

---

# 9. Phase 7 — replace in-memory export storage with R2

## Current problem

`apps/api/src/modules/exports/exports.service.ts` currently does:

```ts
globalThis.__exportFileStore
```

This is not durable.

Files disappear when the Worker isolate is recycled.

## Target

Use Cloudflare R2.

Create an R2 bucket:

```text
crm-exports
```

or environment-specific equivalents.

Bind it to the Worker:

```text
EXPORTS_BUCKET
```

## Storage key

Preserve the existing convention:

```text
exports/<export-id>.csv
```

unless a better documented naming scheme is required.

## Export flow

The final architecture should be:

```text
POST /exports
      |
      v
create export job in MongoDB
      |
      v
enqueue export job
      |
      v
return job status
```

Then:

```text
Queue consumer
      |
      v
query MongoDB
      |
      v
generate CSV
      |
      v
R2.put(fileKey, content)
      |
      v
mark MongoDB job completed
```

Do not generate large exports synchronously in the HTTP request.

## Download flow

The API should expose a secure download path.

Possible design:

```text
GET /api/v1/exports/:id/download
```

The handler must:

1. authenticate
2. verify organization ownership
3. verify export ownership/permissions
4. obtain R2 object
5. return it with correct content headers

Do not expose unrestricted public R2 URLs for private CRM exports.

## Signed URLs

If signed URLs are used, ensure:

- expiration is short
- authorization is checked before issuing the URL
- the URL cannot access another organization's file

## Acceptance criteria

Create a real export.

Verify:

```text
Mongo job created
queue message created
consumer processes job
CSV stored in R2
job becomes completed
download returns correct CSV
unauthorized user cannot download it
file survives Worker restart
```

---

# 10. Phase 8 — redesign imports around R2 + Queues

## Current problem

`apps/api/src/modules/imports/imports.service.ts` contains placeholder/mock CSV content.

It currently uses hard-coded rows such as:

```text
John,Doe,...
Jane,Smith,...
```

This must not remain in the production implementation.

## Target import architecture

```text
Browser
   |
   | upload CSV
   v
R2
   |
   v
create import job in MongoDB
   |
   v
Cloudflare Queue
   |
   v
consumer
   |
   +--> download CSV from R2
   |
   +--> parse
   |
   +--> validate
   |
   +--> write MongoDB
   |
   +--> update progress
   |
   v
completed/failed
```

## Upload

Do not send arbitrarily large files through the API if direct-to-R2 upload is practical.

A better flow is:

```text
POST /imports/upload-url
        |
        v
authenticated + authorized
        |
        v
presigned/controlled upload target
        |
        v
browser -> R2
```

If direct upload adds too much complexity for the current UI, implement a Worker-mediated upload first, but keep file size limits explicit.

Current application limits include:

```text
MAX_FILE_SIZE = 10 MB
```

Preserve or explicitly revise this limit.

## Parsing

The CSV parser must handle:

- quoted fields
- escaped quotes
- commas inside quotes
- newlines inside quoted fields if supported
- UTF-8
- empty values
- malformed CSV

Do not assume that splitting by newline is sufficient for arbitrary CSV.

Use a Workers-compatible CSV parser if needed.

## Job state

Use explicit states:

```text
pending
processing
completed
failed
cancelled
```

Ensure state transitions are idempotent.

## Idempotency

Queue consumers may retry.

Therefore processing must be safe if the same job is delivered more than once.

Use MongoDB state checks and/or a job attempt/idempotency key.

Never create duplicate contacts simply because a queue message was retried.

## Acceptance criteria

Upload a real CSV through the frontend.

Verify:

- file stored in R2
- import job created
- queue message created
- job processed
- records created/updated correctly
- progress is persisted
- failure is visible
- retry does not duplicate records

---

# 11. Phase 9 — replace the Node background worker with Cloudflare Queues

## Current worker

The existing file:

```text
apps/api/src/worker/index.ts
```

starts a Node process, connects to MongoDB, finds one outbox event, updates it, and calls:

```ts
process.exit(...)
```

This is not a Worker background architecture.

## Target

Use Cloudflare Queues.

Suggested queues:

```text
crm-jobs
```

or separate queues if workloads need isolation:

```text
crm-imports
crm-exports
crm-webhooks
```

Do not create many queues without a reason.

Start with one general queue if the workload is small.

## Queue message schema

Create a discriminated union:

```ts
type JobMessage =
  | {
      type: 'import.process';
      jobId: string;
      organizationId: string;
      version: 1;
    }
  | {
      type: 'export.process';
      jobId: string;
      organizationId: string;
      version: 1;
    }
  | {
      type: 'webhook.deliver';
      webhookId: string;
      organizationId: string;
      eventType: string;
      payload: Record<string, unknown>;
      version: 1;
    };
```

Keep messages small.

Do not put entire CSV files or large payloads in queue messages.

Use R2/MongoDB for large data.

## Queue consumer

The Worker should expose a queue consumer handler.

Conceptually:

```ts
export default {
  fetch: app.fetch,

  async queue(batch, env, ctx) {
    for (const message of batch.messages) {
      await processMessage(message.body, env);
    }
  },
};
```

Use the current Cloudflare queue handler API.

## Retry behavior

Let transient failures retry.

For permanent failures:

```text
mark job failed
```

and use a dead-letter queue if appropriate.

Do not implement arbitrary `setTimeout` retries inside a Worker request.

## Existing outbox

The MongoDB outbox pattern may be preserved if it provides business value.

Possible flow:

```text
Mongo transaction/business action
      |
      v
outbox event
      |
      v
queue producer
      |
      v
queue consumer
```

But do not leave a polling Node worker behind.

## Acceptance criteria

The old Node worker is no longer required.

Queue jobs are processed in Workers.

Retrying a message does not corrupt state.

---

# 12. Phase 10 — redesign webhook retries

## Current problem

`apps/api/src/modules/webhooks/webhooks.service.ts` uses:

```ts
setTimeout(...)
```

inside a retry loop.

That is not a good serverless retry mechanism.

## Target

Webhook delivery should become a queue job.

```text
application event
      |
      v
queue
      |
      v
webhook consumer
      |
      v
HTTP request
      |
   +--+--+
   |     |
success failure
         |
         v
      retry queue
```

Use Queue retry/delivery mechanisms where appropriate.

## Signature

The webhook signature currently uses HMAC-SHA256.

Preserve that behavior exactly.

Only change the implementation from Node crypto to Web Crypto.

Add known-vector tests:

```text
secret
+
payload
=
expected signature
```

## Timeout

Keep a bounded outbound request timeout.

Do not allow a webhook consumer to hang indefinitely.

## Retry policy

Preserve the existing intent:

```text
408
429
500
502
503
504
```

are retryable.

Maximum attempts:

```text
5
```

Current exponential delay:

```text
1s
2s
4s
8s
16s
```

Cloudflare Queue retry/delay semantics should be used instead of manually sleeping.

## Delivery records

Every attempt should update:

- attempt number
- response status
- response body (bounded/truncated)
- duration
- error
- delivered/failed status

Never store unlimited remote response bodies.

## SSRF/security

Before allowing arbitrary webhook URLs, review SSRF risk.

The webhook system should not permit access to:

```text
internal services
localhost
private IP ranges
metadata endpoints
```

unless there is an explicit trusted integration mechanism.

This is important for a Worker because the Worker has outbound network access.

---

# 13. Phase 11 — replace Pino with Worker-safe logging

## Current logger

The current logger uses:

```ts
pino
pino-pretty
```

This is Node-oriented.

Do not force Pino into Workers unless the bundle is proven clean and the logging behavior is actually useful.

## Target

Create a tiny logger abstraction:

```text
apps/api/src/utils/logger.ts
```

with:

```ts
logger.debug(...)
logger.info(...)
logger.warn(...)
logger.error(...)
```

The implementation should use:

```ts
console.debug
console.info
console.warn
console.error
```

or another Worker-native logging mechanism.

## Structured logs

Preserve useful structured fields:

```text
requestId
method
path
status
duration
userId
organizationId
error code
```

Do not log:

- passwords
- session tokens
- API keys
- cookies
- webhook secrets
- MongoDB credentials
- reset tokens

## Error logging

Log internal error details server-side.

Return sanitized errors to clients.

## Acceptance criteria

No Worker bundle imports:

```text
pino
pino-pretty
```

unless explicitly tested and justified.

---

# 14. Phase 12 — request context and dependency injection

The current code has many global singletons such as:

```text
repositories instantiated at module scope
collections accessed through global database state
configuration imported globally
logger imported globally
```

This can make Worker behavior harder to reason about.

Do a controlled refactor toward request context.

## Preferred context

Create an application context similar to:

```ts
type AppContext = {
  env: Env;
  db: Db;
  collections: Collections;
};
```

Attach it to Hono context.

For example:

```text
request
  |
  +-- env
  +-- db
  +-- collections
  +-- user
  +-- organizationId
  +-- permissions
```

## Do not over-engineer

Do not convert every class into a giant dependency injection framework.

Simple factories are enough.

Example:

```ts
const repos = createRepositories(db);
```

## Authentication

Authentication should use the request's database context rather than a process-global DB singleton.

## Acceptance criteria

Two concurrent requests cannot accidentally use different environments/databases through mutable global state.

---

# 15. Phase 13 — audit all Node-only APIs

Run:

```bash
rg "process\\.|node:|from ['\"]crypto['\"]|from ['\"]fs['\"]|from ['\"]path['\"]|child_process|@hono/node-server|dotenv|pino|argon2|bcrypt" apps/api/src packages
```

Then classify every hit.

Create:

```text
docs/cloudflare-node-api-audit.md
```

with:

| File | API/package | Worker safe? | Action |
|---|---|---:|---|
| ... | ... | ... | ... |

## Categories

### A — Worker-native

Examples:

```text
fetch
Request
Response
Headers
URL
crypto.subtle
crypto.getRandomValues
setTimeout
AbortSignal
Web Streams
```

### B — supported under `nodejs_compat`

Only retain after testing.

### C — Node-only but tooling-only

Examples:

```text
backup scripts
restore scripts
seed scripts
local dev server
```

These may remain outside the Worker bundle.

### D — incompatible runtime dependency

Replace.

---

# 16. Phase 14 — database indexes and operational scripts

Production Worker startup must NOT perform migrations or index creation.

Create/retain Node admin commands:

```bash
pnpm --filter @crm/api db:seed
pnpm --filter @crm/api db:backup
pnpm --filter @crm/api db:restore
pnpm --filter @crm/api db:ensure-indexes
```

These commands can run in a normal Node environment.

Document:

```text
Cloudflare Worker
    |
    | never performs startup migrations
    v
MongoDB Atlas

Admin operator
    |
    v
Node migration/index script
```

## Index verification

Before deployment, verify every important query has the required index.

At minimum audit indexes for:

- users by normalized email
- sessions by token hash
- sessions by expiration
- password reset tokens by token hash
- organization scoping
- memberships
- API keys by key hash
- webhook lookups
- import jobs
- export jobs
- outbox events
- common pagination/sort fields

Do not invent indexes blindly.

Use actual repository queries to derive the index list.

---

# 17. Phase 15 — CORS and frontend integration

The frontend is a React/Vite app.

It will likely be hosted separately from the API.

Example:

```text
Frontend:
https://app.example.com

API:
https://api.example.com
```

Configure:

```text
CORS_ORIGIN=https://app.example.com
```

Do not use:

```text
*
```

when credentials/cookies are involved.

## Cookies

If using cross-origin frontend/API requests:

```text
fetch(..., { credentials: 'include' })
```

must match server CORS configuration.

Server must send:

```text
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Credentials: true
```

Do not combine:

```text
Allow-Origin: *
```

with credentialed requests.

## Acceptance criteria

From the deployed frontend:

- login works
- authenticated API requests work
- logout works
- no CORS console errors
- cookies are stored and sent correctly

---

# 18. Phase 16 — health/readiness endpoints

Keep:

```text
GET /health
GET /ready
```

but make their semantics explicit.

## `/health`

Should answer whether the Worker itself is functioning.

Prefer not to make `/health` depend on a database ping unless that is intentionally the application's liveness definition.

## `/ready`

Can check:

- MongoDB connectivity
- required configuration
- required bindings

Example:

```json
{
  "status": "ready",
  "database": {
    "status": "healthy"
  }
}
```

Do not expose:

- connection strings
- internal errors
- secrets
- stack traces

---

# 19. Phase 17 — error handling

Review:

```text
apps/api/src/middleware/error-handler.ts
```

Ensure errors are Worker-compatible.

## Rules

Production responses must not contain:

```text
stack
file paths
MongoDB connection strings
secret values
```

Preserve existing error shape.

Add tests for:

- validation errors
- authentication failures
- authorization failures
- not found
- conflict
- rate limiting
- database failures
- unexpected exceptions

---

# 20. Phase 18 — observability and request IDs

The current API already has request IDs.

Preserve that behavior.

Every request should have:

```text
requestId
```

and logs should include it.

When a queue job runs, generate/propagate:

```text
jobId
requestId
```

so an operation can be traced across:

```text
HTTP request
 -> MongoDB job
 -> Queue
 -> consumer
 -> R2
 -> webhook
```

Do not log secrets.

---

# 21. Phase 19 — bundle and dependency audit

After migration, inspect the Worker bundle.

Use Wrangler's bundle/metafile capabilities if available.

Look for:

```text
argon2
bcrypt
pino
pino-pretty
@hono/node-server
dotenv
Node filesystem modules
Node child_process
```

They should not appear in the production Worker bundle unless specifically justified and verified.

## Dependency rules

Production Worker dependencies should be minimal.

Do not add a large library merely to replace a 10-line Web API helper.

Before adding a dependency ask:

1. Does it work in Workers?
2. Is it ESM compatible?
3. Does it use Node native modules?
4. Does it contain WASM?
5. Is the WASM loading model compatible with Workers?
6. Does it materially increase bundle size?
7. Is it maintained?
8. Is there a Web API alternative?

---

# 22. Phase 20 — Worker-compatible tests

Create a test suite specifically for the Worker runtime.

At minimum:

## Runtime tests

- Worker boots
- route responds
- environment bindings load
- secrets load
- MongoDB connects
- R2 binding exists
- Queue binding exists

## Auth tests

- registration
- login
- logout
- session authentication
- expired session
- revoked session
- password reset
- password change
- API key auth

## Security tests

- rate limit
- CORS
- authorization
- organization isolation
- SSRF protection for webhooks
- cookie flags
- invalid API key
- invalid session

## Persistence tests

- create/read/update/delete
- pagination
- indexes
- organization filtering

## Queue tests

- enqueue
- consume
- retry
- idempotency
- permanent failure

## R2 tests

- upload
- download
- missing object
- authorization
- deletion

---

# 23. Phase 21 — organization isolation audit

This application is multi-tenant.

This migration must NOT weaken organization scoping.

Every repository/query that operates on organization-owned resources must be audited.

For every endpoint ask:

```text
Can user A from organization A access organization B's record?
```

Test this explicitly.

Especially audit:

- contacts
- companies
- leads
- deals
- tasks
- notes
- activities
- imports
- exports
- attachments
- webhooks
- integrations
- API keys
- audit logs
- reports
- search

The Worker migration is not complete until tenant isolation is tested.

---

# 24. Phase 22 — security review of Cloudflare-specific trust boundaries

Review all client IP usage.

Do not trust arbitrary headers supplied by an attacker.

Review:

```text
x-forwarded-for
x-real-ip
CF-Connecting-IP
```

Use Cloudflare's documented request metadata appropriately.

Review outbound fetches.

Any user-controlled URL must be treated as potentially dangerous.

Review:

```text
webhooks
integrations
external providers
image/file URLs
redirects
```

---

# 25. Phase 23 — deployment configuration

Create environments:

```text
development
staging
production
```

Recommended names:

```text
crm-api-dev
crm-api-staging
crm-api
```

Use separate:

- MongoDB databases/clusters
- R2 buckets
- queues
- secrets

for staging and production.

Never point staging at production data unless explicitly intended.

## Example logical resources

```text
Production:

Worker:
crm-api

MongoDB:
crm-production

R2:
crm-exports-production

Queue:
crm-jobs-production
```

Staging:

```text
crm-api-staging
crm-staging
crm-exports-staging
crm-jobs-staging
```

---

# 26. Phase 24 — secrets

Declare required secret names in Wrangler configuration where supported.

At minimum:

```text
MONGODB_URI
SESSION_SECRET
```

Potential additional secrets:

```text
SMTP/API provider secrets
integration credentials
webhook signing secrets if globally configured
OAuth client secrets
```

Per-webhook secrets should remain in MongoDB if that is the existing data model, but they must never be returned except at creation time if that is the existing intended behavior.

## Secret rotation

Document how to rotate:

```text
SESSION_SECRET
MONGODB_URI
integration credentials
```

Be careful with `SESSION_SECRET`.

If session token hashing does not actually depend on it, do not pretend rotation invalidates sessions.

Audit the current `SESSION_SECRET` usage before deciding its rotation semantics.

---

# 27. Phase 25 — Docker files

The following files may become obsolete for the Worker deployment:

```text
apps/api/Dockerfile
apps/api/worker.Dockerfile
docker-compose.yml
```

Do NOT delete them immediately.

First determine whether they are still useful for:

- local development
- MongoDB local development
- CI
- fallback Node deployment

If no longer needed, remove them in a dedicated cleanup commit.

The production deployment path should not depend on Docker.

---

# 28. Phase 26 — frontend deployment

The frontend already uses Vite.

Deploy:

```text
apps/web
```

to Cloudflare Pages or a Worker-based static deployment.

Set its API URL to:

```text
https://api.example.com
```

Do not hard-code localhost.

Audit:

```text
apps/web/src/lib/request.ts
```

and all API modules for the API base URL.

Use a Vite public environment variable such as:

```text
VITE_API_URL
```

Do not put backend secrets in Vite variables.

Anything prefixed with `VITE_` should be assumed public.

---

# 29. Phase 27 — deployment smoke test

After staging deployment, run the following sequence.

## Public endpoints

```text
GET /
GET /health
GET /ready
```

## Authentication

```text
POST /api/v1/auth/register
POST /api/v1/auth/login
GET /api/v1/auth/me
POST /api/v1/auth/logout
```

## Authorization

Create:

```text
Organization A
User A
Organization B
User B
```

Verify A cannot access B.

## CRUD

Test at least:

```text
contacts
companies
leads
deals
tasks
notes
```

## Async

Test:

```text
export
import
webhook
```

## Persistence

Restart/redeploy the Worker.

Verify:

```text
sessions remain
jobs remain
exports remain
imports remain
files remain
```

---

# 30. Phase 28 — load and concurrency testing

The Worker environment is concurrent and distributed.

Test:

- 10 concurrent requests
- 50 concurrent requests
- repeated login attempts
- concurrent writes to the same resource
- multiple queue messages
- duplicate queue delivery
- concurrent export jobs

Watch for:

```text
race conditions
duplicate records
connection errors
MongoServerSelectionError
socket errors
rate-limit inconsistencies
```

Do not declare the migration successful merely because one request works.

---

# 31. Phase 29 — performance testing

Measure:

```text
cold request
warm request
MongoDB ping
simple read
authenticated read
complex search
export enqueue
queue processing
R2 download
```

Record p50/p95 where possible.

If MongoDB connection establishment dominates cold requests:

1. verify module-level client reuse
2. verify MongoDB region
3. verify Atlas network configuration
4. benchmark again
5. only then consider Durable Object connection management

Do not prematurely introduce a Durable Object.

---

# 32. Phase 30 — production readiness checklist

The coding agent MUST NOT mark the migration complete until all of the following are true.

## Runtime

- [ ] Worker boots
- [ ] Hono uses Worker fetch handler
- [ ] `@hono/node-server` is not in Worker bundle
- [ ] no `process.exit()` in Worker path
- [ ] no `process.on()` in Worker path
- [ ] no filesystem dependency in Worker path
- [ ] no child-process dependency in Worker path

## Configuration

- [ ] Worker env bindings used
- [ ] secrets are Worker secrets
- [ ] no committed secrets
- [ ] no production secrets in frontend
- [ ] development/staging/production separated

## MongoDB

- [ ] current official driver works in the current Worker runtime
- [ ] real Atlas connection tested
- [ ] no fake DB implementation
- [ ] connection reuse implemented
- [ ] cold isolate reconnect works
- [ ] indexes created outside Worker startup
- [ ] tenant isolation tests pass

## Authentication

- [ ] registration works
- [ ] login works
- [ ] logout works
- [ ] session expiry works
- [ ] session revocation works
- [ ] password reset works
- [ ] password change works
- [ ] existing Argon2 hashes can be verified
- [ ] legacy bcrypt hashes can be verified if present
- [ ] new hashes use the selected Worker-compatible secure algorithm
- [ ] Node native crypto is removed from Worker path

## Rate limiting

- [ ] process-local Map removed
- [ ] shared rate limit implemented
- [ ] login limit tested
- [ ] reset limit tested
- [ ] Retry-After works

## Storage

- [ ] exports use R2
- [ ] imports use R2
- [ ] private files are not publicly exposed
- [ ] organization authorization checked before download

## Queues

- [ ] background worker replaced by Queue consumer
- [ ] imports queued
- [ ] exports queued
- [ ] webhook retries queued
- [ ] duplicate delivery is safe
- [ ] permanent failures are recorded
- [ ] dead-letter strategy documented

## Webhooks

- [ ] HMAC signature preserved
- [ ] Web Crypto used
- [ ] retries do not block requests
- [ ] outbound timeout exists
- [ ] SSRF protections reviewed

## Logging

- [ ] Worker-compatible logger
- [ ] request IDs retained
- [ ] secrets never logged
- [ ] errors sanitized for clients

## Frontend

- [ ] API URL configurable
- [ ] CORS configured
- [ ] credentialed cookies work
- [ ] production frontend can log in
- [ ] all major CRUD flows work

## Testing

- [ ] typecheck passes
- [ ] lint passes
- [ ] unit tests pass
- [ ] Worker tests pass
- [ ] staging smoke tests pass
- [ ] concurrency tests pass
- [ ] tenant isolation tests pass

---

# 33. Recommended implementation order

Do NOT attempt the whole migration in one giant change.

Use this order:

```text
PHASE 0
Baseline

      ↓

PHASE 1
Worker entrypoint

      ↓

PHASE 2
Worker environment/config

      ↓

PHASE 3
MongoDB Worker compatibility

      ↓

PHASE 4
Web Crypto + password hashing

      ↓

PHASE 5
Sessions/cookies

      ↓

PHASE 6
Distributed rate limiting

      ↓

PHASE 7
R2 exports

      ↓

PHASE 8
R2 imports

      ↓

PHASE 9
Cloudflare Queues

      ↓

PHASE 10
Webhook queue/retry

      ↓

PHASE 11
Worker logging

      ↓

PHASE 12
Request context / dependency cleanup

      ↓

PHASE 13
Node API audit

      ↓

PHASE 14
Database operations/index tooling

      ↓

PHASE 15
CORS/frontend integration

      ↓

PHASE 16+
Testing, security, performance, staging

      ↓

PRODUCTION
```

Do not move to the next phase if the previous phase has unresolved runtime failures.

---

# 34. Important MongoDB decision gate

This is the most important decision point in the migration.

After Phase 3, classify the MongoDB integration as one of:

### Option A — native driver works

Use:

```text
MongoDB Node driver
+
Cloudflare Workers
+
nodejs_compat if required
```

Continue with the plan.

### Option B — native driver imports but fails at runtime

Do NOT ship a fragile production polyfill immediately.

Stop and document the exact failure.

Then evaluate:

1. current Wrangler/workerd version
2. current MongoDB driver version
3. Cloudflare TCP/socket support
4. MongoDB TLS requirements
5. supported connection pattern
6. bundle/runtime errors

Only adopt a third-party compatibility layer after testing it against:

- Atlas
- TLS
- authentication
- reads
- writes
- concurrency
- retries
- cold starts

### Option C — native driver is operationally unacceptable

If the driver technically works but connection setup is too expensive or unreliable, evaluate:

- Durable Object connection management
- another supported database access layer
- moving the database to a Cloudflare-optimized SQL platform
- keeping the API on a conventional Node host

Do not migrate the database schema merely to satisfy a hosting preference unless the performance/cost tradeoff is justified.

---

# 35. Important password hashing decision gate

The coding agent MUST inspect the actual database before deleting bcrypt/Argon2 support.

Run an administrative query to determine what formats exist.

Do not print password hashes in logs or output.

Only report aggregate counts such as:

```text
Argon2 hashes: N
bcrypt hashes: N
unknown hashes: N
```

Then choose the migration strategy.

If only Argon2 hashes exist:

```text
simpler migration
```

If bcrypt hashes exist:

```text
legacy verification + opportunistic rehash
```

If unknown formats exist:

```text
STOP and investigate
```

Never silently invalidate user passwords.

---

# 36. Important export/import decision gate

The current import/export code contains placeholder/mock processing.

The coding agent MUST distinguish:

```text
hosting migration
```

from:

```text
feature completion
```

Do not claim imports/exports are production-ready merely because they run in a Queue.

Before production, the actual business logic must replace mock data.

For imports, replace hard-coded CSV content with the actual uploaded R2 object.

For exports, query the requested entity and filters from MongoDB rather than generating mock rows.

This is a functional requirement, not merely a Cloudflare requirement.

---

# 37. Important queue idempotency rules

Every queue handler must be safe to retry.

Use:

```text
jobId
eventId
attempt
```

where appropriate.

For a job:

```text
pending -> processing -> completed
```

If a second consumer sees:

```text
completed
```

it should acknowledge/ignore the duplicate rather than execute the operation again.

For record creation, use unique constraints or deterministic keys where possible.

Never assume exactly-once delivery.

Design for:

```text
at-least-once delivery
```

---

# 38. Important R2 security rules

R2 objects for CRM data are private by default.

Never expose a bucket publicly just to simplify downloads.

All download access must go through an authorization boundary.

Verify:

```text
authenticated user
organization
resource ownership
permission
file existence
```

before returning the file.

For deletion:

```text
delete MongoDB metadata
delete R2 object
```

or the reverse, depending on failure-handling strategy.

Do not leave orphaned files indefinitely.

Add cleanup tooling later if necessary.

---

# 39. Important API compatibility rules

Do not change:

```text
/api/v1/...
```

during this migration.

Do not change frontend request formats unless absolutely necessary.

If a route must change:

1. add the new route
2. keep the old route temporarily
3. update frontend
4. test both
5. remove old route in a separate cleanup phase

The goal is infrastructure migration, not API redesign.

---

# 40. Suggested files after migration

The final structure should trend toward:

```text
apps/api/
├── src/
│   ├── worker.ts
│   ├── app.ts
│   ├── config/
│   │   └── env.ts
│   ├── context/
│   │   └── app-context.ts
│   ├── db/
│   │   ├── client.ts
│   │   ├── collections.ts
│   │   └── indexes.ts
│   ├── middleware/
│   ├── modules/
│   ├── queue/
│   │   ├── messages.ts
│   │   ├── producer.ts
│   │   └── consumer.ts
│   ├── storage/
│   │   └── r2.ts
│   ├── utils/
│   │   ├── crypto.ts
│   │   └── logger.ts
│   └── scripts/
│       ├── seed.ts
│       ├── backup.ts
│       ├── restore.ts
│       └── ensure-indexes.ts
├── wrangler.jsonc
├── .dev.vars.example
└── package.json
```

Exact filenames may differ, but the separation of concerns should remain.

---

# 41. Suggested Wrangler resource model

The exact syntax must follow the currently installed Wrangler version, but the conceptual configuration should contain:

```text
Worker
  |
  +-- environment variables
  |
  +-- secrets
  |
  +-- R2 binding
  |
  +-- Queue producer binding
  |
  +-- Queue consumer
```

For example:

```text
EXPORTS_BUCKET
JOBS_QUEUE
```

Use generated Worker types where available.

Do not hand-maintain duplicate environment interfaces if Wrangler can generate them.

---

# 42. Local development model

Local development should support:

```bash
pnpm dev:web
pnpm dev:api
```

and eventually:

```bash
pnpm dev:worker
```

The important requirement is that Worker-specific behavior can be tested locally with Wrangler.

Do not rely exclusively on the old Node server.

There should be a documented path:

```text
local browser
   |
   v
Wrangler Worker
   |
   v
test MongoDB
   |
   +--> local/remote R2
   |
   +--> local/remote Queue
```

Use remote resources only when required and clearly mark them.

---

# 43. CI requirements

CI should eventually run:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build:web
pnpm build:worker
```

If practical, also run a Worker smoke test.

CI must fail if:

- Worker bundle contains known forbidden native dependencies
- typecheck fails
- tests fail
- Wrangler configuration is invalid

---

# 44. Deployment commands

The exact commands depend on the final package scripts, but the target workflow should be approximately:

```bash
pnpm install --frozen-lockfile

pnpm typecheck
pnpm lint
pnpm test

pnpm --filter @crm/api build:worker

pnpm exec wrangler deploy --env staging
```

After staging verification:

```bash
pnpm exec wrangler deploy --env production
```

Secrets should be configured through Wrangler/dashboard secret mechanisms.

Never put secret values into deployment command history when a secure prompt/secret command is available.

---

# 45. Rollback strategy

Before production deployment:

1. keep the previous deployment available
2. keep MongoDB schema/data backward-compatible
3. do not run destructive migrations
4. deploy Worker changes independently where possible
5. test staging
6. deploy production
7. monitor
8. rollback Worker if necessary

Database changes should follow:

```text
expand
  ->
deploy
  ->
migrate data
  ->
verify
  ->
contract
```

not:

```text
destructive migration
  ->
hope deployment works
```

---

# 46. Final acceptance test

The migration is complete only when this entire scenario works against staging:

## User journey

1. Open frontend.
2. Register.
3. Receive authenticated session.
4. Create organization data.
5. Create contacts.
6. Create companies.
7. Create a lead.
8. Create a deal.
9. Create a task.
10. Create an API key.
11. Authenticate using the API key.
12. Create an export.
13. Queue processes export.
14. CSV appears in R2.
15. Download CSV through authorized endpoint.
16. Upload a real CSV.
17. Queue processes import.
18. Imported records appear in MongoDB.
19. Create webhook.
20. Trigger webhook.
21. Webhook delivery succeeds or retries.
22. Log out.
23. Session is revoked.
24. Attempt authenticated request again.
25. Request is rejected.
26. Create a second organization.
27. Verify first organization cannot access second organization's records.

Then restart/redeploy the Worker and repeat critical operations.

---

# 47. Final instructions to the coding agent

You are modifying an existing production-oriented CRM codebase.

Do not treat this as a greenfield rewrite.

Your job is to make the existing backend **Cloudflare Workers friendly while preserving functionality**.

Work phase-by-phase.

For each phase:

1. inspect the current code
2. make the smallest coherent change
3. update tests
4. run typecheck
5. run lint
6. run relevant tests
7. run Worker compatibility tests
8. document anything discovered
9. only then continue

At the end of each phase, record:

```text
Phase:
Changes:
Files changed:
Tests:
Known limitations:
Next phase:
```

If a Cloudflare/MongoDB/runtime compatibility issue is encountered, do not hide it.

Record:

```text
Exact error:
Runtime version:
Wrangler version:
MongoDB driver version:
Minimal reproduction:
What was tested:
```

Then choose the safest supported architecture.

Do not introduce unverified community polyfills into production simply because they make a single test pass.

Do not weaken authentication or data isolation to make deployment easier.

Do not replace real persistence with process memory.

Do not delete Node tooling until it is clear that it is no longer required.

The final objective is:

```text
React/Vite frontend
        |
        v
Cloudflare
   Worker + Hono
        |
        +------ MongoDB Atlas
        |
        +------ R2
        |
        +------ Queues
        |
        +------ external APIs/webhooks
```

with:

```text
no Node HTTP server
no native password hashing dependency
no process-local rate limiter
no process-local file store
no permanently running background worker
no startup database migration
no secret leakage
no tenant-isolation regression
```

The implementation should be boring, testable, explicit, and maintainable.

---

# 48. Official reference material

Use current official documentation when implementation details conflict with this plan.

Cloudflare Workers:
https://developers.cloudflare.com/workers/

Cloudflare Node.js compatibility:
https://developers.cloudflare.com/workers/runtime-apis/nodejs/

Cloudflare environment variables and secrets:
https://developers.cloudflare.com/workers/configuration/environment-variables/
https://developers.cloudflare.com/workers/configuration/secrets/

Wrangler configuration:
https://developers.cloudflare.com/workers/wrangler/configuration/

Cloudflare database connectivity:
https://developers.cloudflare.com/workers/databases/connecting-to-databases/

Cloudflare R2:
https://developers.cloudflare.com/r2/

Cloudflare Queues:
https://developers.cloudflare.com/queues/

MongoDB Node.js driver:
https://www.mongodb.com/docs/drivers/node/current/

MongoDB Atlas:
https://www.mongodb.com/docs/atlas/

When documentation has changed since this document was written, prefer the current official documentation and record the deviation in the migration status document.
