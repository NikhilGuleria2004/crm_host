# VERCEL HOSTING / COMPATIBILITY MIGRATION PLAN

## Purpose

This document is an implementation specification for modifying the existing CRM backend so it can be deployed reliably on **Vercel using the Node.js runtime / Vercel Functions**, while preserving the current API, authentication, MongoDB data model, RBAC, frontend behavior, imports, exports, webhooks, and background processing.

This document is intended to be handed directly to a coding agent.

The migration should be **minimal and conservative**.

Unlike a Cloudflare Workers migration, this project should remain a normal Node.js application wherever possible.

The target is not to rewrite the backend into a new runtime.

The target is:

```text
Existing Hono + Node.js backend
              |
              v
       Vercel Node.js
          Functions
              |
      +-------+--------+
      |       |        |
      v       v        v
   MongoDB  Blob     Queues /
    Atlas             Workflow
```

---

# 0. Current codebase

The repository is a pnpm monorepo.

Relevant structure:

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

The API currently uses:

- Node.js 20+
- Hono
- `@hono/node-server`
- MongoDB Node.js driver
- dotenv
- Pino
- bcrypt
- argon2
- Node `crypto`
- MongoDB-backed repositories
- authentication/session middleware
- RBAC
- imports/exports
- webhooks
- a separate Node background worker
- in-memory rate limiting
- in-memory export file storage
- Docker files

Important files include:

```text
apps/api/src/index.ts
apps/api/src/app.ts
apps/api/src/config/env.ts
apps/api/src/db/client.ts
apps/api/src/db/index.ts
apps/api/src/db/collections.ts
apps/api/src/middleware/rate-limit.ts
apps/api/src/middleware/logging.ts
apps/api/src/middleware/auth.ts
apps/api/src/middleware/error-handler.ts
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

The exact paths may vary if the repository has changed. The coding agent must inspect the repository before making assumptions.

---

# 1. Target architecture

The preferred final architecture is:

```text
                         INTERNET
                            |
                            v
                   +-------------------+
                   |      Vercel       |
                   |                   |
                   | React/Vite        |
                   |       +           |
                   | Hono API          |
                   | Node.js Functions |
                   +---------+---------+
                             |
                +------------+-------------+
                |            |             |
                v            v             v
           MongoDB Atlas   Blob        Queues /
                                       Workflow
                |                          |
                |                          v
                |                    background work
                |                          |
                +------------+-------------+
                             |
                             v
                       integrations
```

The backend should remain a Node.js application.

Do NOT convert the backend to Cloudflare Workers APIs.

Do NOT replace Node's cryptographic APIs solely for Vercel compatibility.

Do NOT replace MongoDB merely to use Vercel.

Do NOT introduce a new framework.

---

# 2. Migration principles

## 2.1 Preserve the existing API

Do not change:

- route paths
- HTTP methods
- request formats
- response formats
- authentication semantics
- RBAC
- organization/tenant scoping
- error response shape
- pagination
- filtering
- sorting

unless a change is genuinely required.

If a behavior must change, add a regression test and document it.

## 2.2 Preserve Node.js dependencies where possible

Unlike a Workers migration, Vercel's Node.js runtime should allow the project to retain normal Node dependencies.

Do NOT unnecessarily replace:

```text
argon2
bcrypt
node:crypto
pino
mongodb
```

with browser/WASM alternatives.

First attempt to run the existing dependencies on Vercel's Node.js runtime.

## 2.3 Make the API stateless

The biggest serverless requirement is that the API must not depend on one long-running process.

Avoid using process memory as durable state.

Bad:

```ts
const jobs = new Map();
```

Good:

```text
MongoDB
Vercel Blob
Vercel Queue / Workflow
Redis-compatible service
```

## 2.4 Background work must not depend on an infinite process

The existing Node worker must eventually be migrated to an event-driven background mechanism.

Do not run:

```ts
while (true) {
  ...
}
```

inside a Vercel Function.

## 2.5 Keep Node-only administrative scripts

These may remain Node programs:

```text
seed
backup
restore
index creation
data migration
local development
```

They should not be part of the deployed HTTP function.

---

# 3. Phase 0 — establish baseline

Before changing anything:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Record failures.

Create:

```text
docs/vercel-migration-status.md
```

with:

```text
Baseline date:
Node version:
pnpm version:
Vercel CLI version:
Typecheck:
Lint:
Tests:
Web build:
API build:
```

Create a rollback commit before making migration changes.

## Acceptance criteria

- baseline is documented
- current API still works
- current frontend still builds
- tests can run
- rollback point exists

---

# 4. Phase 1 — inspect the existing API entrypoint

The current API uses Hono and likely starts a Node HTTP server with:

```ts
import { serve } from '@hono/node-server';
```

This is the first runtime-specific piece to adapt.

## Goal

Make the Hono application exportable to Vercel without changing the application itself.

Keep:

```text
app.ts
routes
controllers
services
repositories
```

intact.

## Preferred structure

Create:

```text
apps/api/src/app.ts
apps/api/src/vercel.ts
apps/api/src/node.ts
```

if needed.

The conceptual split is:

```text
app.ts
    |
    +--> Hono application

vercel.ts
    |
    +--> Vercel Function adapter

node.ts
    |
    +--> local Node development server
```

The exact Vercel adapter should follow the current Hono/Vercel integration supported by the installed versions.

Do not invent an adapter.

Use the current official Hono Vercel integration pattern.

## Important

The application itself should remain:

```ts
const app = new Hono();
```

and routes should continue to be registered normally.

The Vercel entrypoint should simply expose that Hono application through the Node.js function runtime.

## Acceptance criteria

A local Vercel-compatible invocation can reach:

```text
GET /
GET /health
GET /ready
```

without changing route behavior.

---

# 5. Phase 2 — create Vercel project configuration

Create a Vercel configuration only where necessary.

Prefer minimal configuration.

Do not create a large custom build system.

The configuration should define:

- API function entrypoint
- frontend deployment if the same Vercel project handles both
- build settings only when automatic detection is insufficient

## Monorepo considerations

Determine whether the repository should use:

### Option A

Two Vercel projects:

```text
crm-web
crm-api
```

Recommended if frontend and backend need independent deployments.

### Option B

One Vercel project.

Use only if the existing monorepo setup makes this clean.

For this repository, prefer **two projects** unless there is a strong reason to combine them.

This gives:

```text
Frontend:
https://app.example.com

API:
https://api.example.com
```

and allows independent deployments.

## Root directory

The API project should point at:

```text
apps/api
```

if that is compatible with the current workspace setup.

The agent must test:

```bash
vercel build
```

from the API project context.

## Acceptance criteria

The API project can execute:

```bash
vercel build
```

successfully.

---

# 6. Phase 3 — environment variables and secrets

The current application likely reads:

```ts
process.env
```

This is compatible with Vercel's Node.js runtime.

Do NOT rewrite the application to Cloudflare-style `env` bindings.

Instead, improve validation and deployment configuration.

## Current approach

If the project currently has:

```text
apps/api/src/config/env.ts
```

keep it.

Make sure it validates required environment variables once per process/runtime instance.

## Required variables

At minimum identify:

```text
MONGODB_URI
MONGODB_DATABASE
SESSION_SECRET
CORS_ORIGIN
COOKIE_DOMAIN
```

and all integration-specific variables found by the audit.

## Secrets

Sensitive values must be configured through Vercel environment variables with appropriate protection.

Never commit:

```text
.env
.env.production
```

containing real values.

Create:

```text
apps/api/.env.example
```

with placeholders.

## Environment separation

Use separate values for:

```text
development
preview/staging
production
```

At minimum:

```text
development -> local/test database
preview     -> staging database
production  -> production database
```

Do not let preview deployments access production data accidentally.

## Acceptance criteria

The API starts in Vercel with:

```text
process.env
```

configuration.

No secret exists in source control.

---

# 7. Phase 4 — MongoDB connection management

This is one of the easiest areas compared with Cloudflare.

Keep the MongoDB Node.js driver.

Do NOT migrate the database API.

## Problem to solve

A serverless function can be instantiated multiple times.

This means:

```text
request 1 -> instance A
request 2 -> instance A
request 3 -> instance B
request 4 -> instance C
```

Do not create a new MongoDB connection on every request.

## Desired pattern

Use a cached connection/promise at module scope.

Conceptually:

```ts
let clientPromise: Promise<MongoClient> | undefined;

export function getMongoClient() {
  if (!clientPromise) {
    clientPromise = new MongoClient(process.env.MONGODB_URI!).connect();
  }

  return clientPromise;
}
```

The exact implementation must match the current MongoDB driver version and existing repository abstractions.

## Important

Do not call:

```ts
client.close()
```

at the end of every request.

Allow the function runtime to reuse connections where possible.

## Database selection

Keep:

```text
MONGODB_URI
MONGODB_DATABASE
```

explicit.

Do not infer production database names from the hostname.

## Index creation

Do NOT create indexes on every Function invocation.

The existing:

```text
bootstrapIndexes()
```

behavior must be moved out of request startup.

Create a Node administrative command:

```bash
pnpm --filter <api-package> db:ensure-indexes
```

This command can run against the target database before deployment.

## Acceptance criteria

Run multiple requests locally and on Vercel.

Verify:

- MongoDB works
- connection reuse works
- no connection explosion occurs
- indexes already exist
- API startup does not mutate database schema

---

# 8. Phase 5 — authentication: keep Node crypto

This is intentionally different from the Cloudflare plan.

Vercel's Node.js runtime should allow the existing Node-oriented crypto dependencies.

The coding agent should first preserve:

```text
argon2
bcrypt
node:crypto
```

and test them.

## Do not perform a crypto rewrite unless required

Keep:

```ts
randomBytes(...)
createHmac(...)
```

if the existing implementation is correct.

Keep:

```ts
argon2
bcrypt
```

if they build and execute correctly.

This reduces security risk.

## Existing password hashes

Do not invalidate existing users.

Inspect the database only in aggregate.

Determine whether password hashes currently include:

```text
Argon2
bcrypt
other
```

Never print actual hashes.

If both bcrypt and Argon2 are present, preserve both verification paths.

## Opportunistic upgrade

If the existing application supports legacy bcrypt:

```text
login
  |
bcrypt verification
  |
success
  |
Argon2id rehash
  |
save
```

Only implement this if it is needed by the current database.

Do not introduce a password migration just because the hosting platform changed.

## Tests

Add:

- new password hash
- correct password
- incorrect password
- existing Argon2 hash
- existing bcrypt hash if present
- password reset
- password change
- session authentication

## Acceptance criteria

Authentication works on Vercel using the same security primitives as the current Node application.

---

# 9. Phase 6 — sessions and cookies

The backend uses session cookies.

Review:

```text
packages/shared/src/enums.ts
apps/api/src/modules/auth/
apps/api/src/middleware/auth.ts
```

## Production cookie requirements

Verify:

```text
HttpOnly
Secure
SameSite
Path=/
```

are correctly set.

If frontend and API are:

```text
app.example.com
api.example.com
```

test cookie behavior in an actual browser.

## Do not use NODE_ENV incorrectly

If cookie security currently depends on:

```ts
process.env.NODE_ENV
```

verify that Vercel Preview/Production behavior matches expectations.

It is preferable to explicitly determine production security from deployment environment/configuration.

## CORS

If using credentialed browser requests:

```text
credentials: include
```

the server must return the exact allowed origin.

Never use:

```text
Access-Control-Allow-Origin: *
```

with credentialed cookies.

## Acceptance criteria

Test:

```text
register
login
authenticated request
logout
expired session
revoked session
```

from the deployed frontend.

---

# 10. Phase 7 — fix in-memory rate limiting

This is a real serverless issue and must be fixed.

The current implementation uses something like:

```ts
const limits = new Map(...)
```

That cannot be the production source of truth.

Multiple Vercel function instances may exist simultaneously.

## Required behavior

Preserve current application limits.

For example:

```text
login:
5 / 15 minutes

forgot password:
3 / hour

reset password:
3 / hour
```

Use the exact limits currently present in the codebase.

## Storage options

Evaluate:

1. Redis-compatible service
2. Vercel-compatible rate-limit package/service
3. another shared persistent store

For authentication throttling, prefer a strongly reliable shared mechanism.

Do not use a plain MongoDB collection for every request unless there is a clear reason and performance is acceptable.

## Rate-limit key

Use trusted request metadata.

Do not blindly trust arbitrary client-provided:

```text
X-Forwarded-For
```

headers.

Vercel provides request information that should be used according to its current documentation.

## Response

Preserve:

```http
429 Too Many Requests
Retry-After: <seconds>
```

and the existing JSON error format.

## Acceptance criteria

Rate limits remain effective across multiple simultaneous function instances.

No production rate limit relies on a process-local Map.

---

# 11. Phase 8 — replace in-memory export storage

The current export service contains:

```ts
globalThis.__exportFileStore
```

This is not durable.

Do not keep it.

## Preferred Vercel solution

Use Vercel Blob if it fits the application's requirements.

Alternative:

```text
Amazon S3
Cloudflare R2
other object storage
```

is also acceptable.

If the project is intended to be Vercel-centric, prefer Vercel Blob.

## Export architecture

For small exports:

```text
HTTP Function
    |
    v
generate CSV
    |
    v
Blob
    |
    v
return metadata
```

For large exports:

```text
HTTP request
    |
    v
create MongoDB export job
    |
    v
queue/workflow
    |
    v
generate CSV
    |
    v
Blob
    |
    v
mark job complete
```

Use the second approach if export generation can exceed a normal request's safe duration.

## File security

Do not make CRM export files public merely to simplify downloads.

Downloads must verify:

1. authentication
2. organization
3. export ownership
4. permissions

## Acceptance criteria

Generate a real export.

Verify:

- file persists
- file survives a new function instance
- unauthorized users cannot download it
- organization isolation works
- download returns correct headers

---

# 12. Phase 9 — replace mock import implementation

The existing import implementation contains placeholder/mock CSV data.

This is a functional issue independent of Vercel.

It must be replaced.

## Target

Use persistent file storage.

```text
Browser
   |
   v
Vercel Function
   |
   v
Blob
   |
   v
Import job
   |
   v
Queue / Workflow
   |
   v
MongoDB
```

## File size

Preserve the existing limit:

```text
MAX_FILE_SIZE = 10 MB
```

unless the product requirements explicitly change it.

## CSV parser

Use a real CSV parser capable of:

- quoted fields
- escaped quotes
- commas in fields
- UTF-8
- empty values
- malformed rows

Do not use:

```ts
csv.split('\n')
```

as a general CSV parser.

## Idempotency

Import jobs must tolerate retries.

Use:

```text
jobId
organizationId
```

and deterministic record matching where appropriate.

Do not create duplicate contacts when a job is retried.

## Acceptance criteria

Upload a real CSV.

Verify:

```text
Blob stores file
job created
background process runs
records imported
errors recorded
retry is safe
```

---

# 13. Phase 10 — migrate the Node background worker

The current worker is a long-running Node process.

It should not be run as an infinite polling process inside a Vercel Function.

## First choice

Use Vercel's current background processing primitives:

- Vercel Queues
- Vercel Workflow

Choose based on the exact workload.

## Do not migrate everything blindly

Separate workloads into:

```text
short async task
long-running task
retryable delivery
multi-step workflow
```

### Recommended mapping

```text
exports       -> Queue / Workflow
imports       -> Queue / Workflow
webhooks      -> Queue
outbox events -> Queue
scheduled jobs -> Vercel Cron + Queue where appropriate
```

## Queue message

Use small messages.

Example:

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
      eventId: string;
      version: 1;
    };
```

Do not put complete CSV contents into queue messages.

Store large data in Blob.

## Idempotency

Assume at-least-once delivery.

A job can be delivered twice.

Therefore:

```text
pending
  ->
processing
  ->
completed
```

must be safe against duplicate processing.

## Acceptance criteria

The old infinite/polling worker is no longer required for production background processing.

---

# 14. Phase 11 — webhook delivery

Current webhook code uses retry logic and `setTimeout`.

Do not rely on sleeping inside a Function.

## Target

```text
event
  |
  v
queue
  |
  v
webhook delivery function
  |
  +--> success
  |
  +--> retry
  |
  +--> permanent failure
```

## Preserve HMAC

Keep the current HMAC-SHA256 implementation using Node `crypto` unless there is a separate reason to change it.

Add known-vector tests.

Example:

```text
secret + payload -> expected signature
```

## Retryable statuses

Preserve the application's current retry policy.

Likely retryable:

```text
408
429
500
502
503
504
```

Do not invent new semantics without checking the current implementation.

## Timeout

Every outbound webhook request must have a bounded timeout.

Use:

```ts
AbortController
AbortSignal.timeout(...)
```

or the equivalent supported by the current Node runtime.

## SSRF

Audit user-configurable webhook URLs.

Prevent access to:

```text
localhost
127.0.0.1
private networks
cloud metadata endpoints
internal services
```

unless explicitly trusted.

## Acceptance criteria

Webhook delivery:

- succeeds
- retries
- records attempts
- records failure
- does not block the original API request
- cannot be used for trivial SSRF

---

# 15. Phase 12 — logging

Pino is compatible with Node.js, so do not replace it unless deployment/build tests reveal an actual issue.

However, inspect the logging configuration.

## Requirements

Logs must include useful structured fields:

```text
requestId
method
path
status
duration
userId
organizationId
error
```

Never log:

```text
password
session token
cookie
API key
reset token
MongoDB URI
integration secret
webhook secret
```

## Production logger

Avoid:

```text
pino-pretty
```

in production if it adds unnecessary overhead.

Use structured JSON logs in production.

Keep pretty logging for local development if useful.

## Acceptance criteria

Production logs are structured and contain no secrets.

---

# 16. Phase 13 — request-scoped dependencies

The current code may use global repository/collection objects.

This can work on Vercel if they are immutable and safe, but audit them carefully.

## Good

```ts
const repo = new UserRepository(collection);
```

where:

```text
collection
```

belongs to the current database.

## Bad

```ts
globalDb = ...
```

where environment/database can change at runtime.

## Preferred architecture

```text
Function invocation
       |
       v
get MongoDB connection
       |
       v
get database
       |
       v
create/request repositories
       |
       v
route
```

Do not create a DI framework.

Use simple factories.

---

# 17. Phase 14 — audit global state

Run:

```bash
rg "globalThis|new Map|new Set|let .* = null|let .* = undefined" apps/api/src
```

Classify each result.

## Allowed global state

These can be acceptable:

```text
cached MongoClient promise
immutable configuration
static constants
compiled schemas
```

## Not acceptable as durable state

These must move to persistence:

```text
sessions
jobs
rate-limit counters
export files
import files
workflow state
webhook retry state
```

## Important

Module-level caches are not guaranteed to exist forever.

The application must work correctly after:

```text
cold start
warm reuse
instance replacement
deployment
scale-out
```

---

# 18. Phase 15 — environment and deployment behavior

Vercel has different deployment contexts.

Test:

```text
local
preview
production
```

Do not assume:

```ts
NODE_ENV === 'production'
```

is enough to distinguish all environments.

If behavior differs between preview and production, use explicit configuration.

## Required configuration

At minimum:

```text
APP_ENV
MONGODB_URI
MONGODB_DATABASE
CORS_ORIGIN
SESSION_SECRET
```

and integration secrets.

---

# 19. Phase 16 — frontend/API split

Prefer two Vercel projects:

```text
crm-web
crm-api
```

Example domains:

```text
https://app.example.com
https://api.example.com
```

## Frontend

The Vite application should use:

```text
VITE_API_URL
```

for the API base URL.

Remember:

```text
VITE_*
```

variables are public.

Never put secrets there.

## Backend

CORS must allow only the frontend origin.

Example:

```text
https://app.example.com
```

not:

```text
*
```

for credentialed requests.

## Acceptance criteria

Production browser tests show:

- login works
- cookies work
- API requests work
- logout works
- no CORS errors

---

# 20. Phase 17 — health endpoints

Keep:

```text
GET /health
GET /ready
```

## `/health`

Should indicate the Function is alive.

Do not make it unnecessarily expensive.

## `/ready`

Can check:

```text
MongoDB connectivity
required configuration
required services
```

Do not expose:

```text
MongoDB URI
internal stack traces
secrets
```

---

# 21. Phase 18 — API function duration review

Review every endpoint for execution time.

Classify:

```text
<1 second
1–5 seconds
5–30 seconds
>30 seconds
```

Anything that may be long-running should be moved to:

```text
Queue
Workflow
background processing
```

Do not depend on maximum Function duration to make long-running APIs work.

Examples:

```text
POST /imports
POST /exports
webhook bulk delivery
large reports
large CSV generation
```

should preferably enqueue work and return a job identifier.

---

# 22. Phase 19 — database query audit

Serverless performance makes database latency more visible.

Audit:

```text
N+1 queries
unbounded queries
large document reads
missing indexes
large sort operations
large aggregation pipelines
```

For every important endpoint:

```text
filter
sort
pagination
projection
```

should be deliberate.

Avoid:

```ts
find({}).toArray()
```

for large collections.

## Pagination

Prefer existing cursor/keyset pagination where practical.

If the current API uses page/offset pagination, preserve the public API unless changing it is necessary.

---

# 23. Phase 20 — database indexes

Do not create indexes from the Function startup.

Create an administrative script.

Audit actual queries.

At minimum inspect indexes for:

```text
users.email
sessions.tokenHash
sessions.expiresAt
password reset tokens
organization membership
API keys
webhooks
imports
exports
outbox events
common contact/company/lead/deal searches
```

Do not blindly create all possible indexes.

Indexes should correspond to actual query patterns.

---

# 24. Phase 21 — error handling

Review:

```text
apps/api/src/middleware/error-handler.ts
```

Production errors must not expose:

```text
stack traces
filesystem paths
MongoDB connection strings
secret values
internal credentials
```

Preserve the current API error schema.

Add tests for:

```text
400
401
403
404
409
422
429
500
```

where relevant.

---

# 25. Phase 22 — tenant isolation

This CRM is multi-tenant.

This is a mandatory security audit.

Create at least:

```text
Organization A
User A

Organization B
User B
```

Verify A cannot access B's:

```text
contacts
companies
leads
deals
tasks
notes
activities
imports
exports
attachments
webhooks
integrations
API keys
audit logs
reports
```

Audit every repository query for:

```text
organizationId
```

where appropriate.

Do not trust resource IDs alone.

---

# 26. Phase 23 — API key security

Audit API key handling.

Verify:

```text
raw key shown only when appropriate
hash stored instead of raw key
constant-time comparison where applicable
revocation works
organization scoping works
permissions work
```

If the current implementation uses Node `crypto`, keep it unless testing identifies a real incompatibility.

---

# 27. Phase 24 — export/import security

Exports and imports contain potentially sensitive CRM data.

Verify:

```text
authentication
authorization
organization ownership
file ownership
size limits
content validation
```

Do not allow a user to supply an export ID belonging to another organization and retrieve it.

Do not allow arbitrary file paths.

Do not use local filesystem storage as persistent application storage.

---

# 28. Phase 25 — Vercel Blob integration

If Vercel Blob is selected, create a small storage adapter:

```text
apps/api/src/storage/blob.ts
```

Conceptual interface:

```ts
interface FileStorage {
  put(key: string, data: BodyInit, options?: PutOptions): Promise<...>;
  get(key: string): Promise<...>;
  delete(key: string): Promise<void>;
}
```

Keep the application independent of the storage provider.

This makes migration to S3/R2 possible later.

Do not spread Blob SDK calls throughout controllers.

---

# 29. Phase 26 — queue abstraction

Likewise, create:

```text
apps/api/src/queue/
```

with a small abstraction.

Conceptual:

```ts
enqueue(message)
```

Do not make controllers know the exact queue provider.

For example:

```text
controller
   |
   v
job service
   |
   v
queue adapter
   |
   v
Vercel Queue
```

This makes testing easier.

---

# 30. Phase 27 — background worker migration strategy

Do not delete:

```text
apps/api/src/worker/index.ts
```

immediately.

First reproduce each job type using the new queue/background mechanism.

For each existing worker job:

```text
job type
current behavior
new trigger
new consumer
retry behavior
idempotency behavior
```

Document it.

Only delete the old worker once every job type has a replacement.

---

# 31. Phase 28 — scheduled jobs

If the current worker periodically checks for:

```text
outbox events
expired sessions
cleanup
scheduled work
```

determine whether each should become:

```text
Vercel Cron
    +
Function
    +
Queue
```

Example:

```text
Cron
  |
  v
find pending jobs
  |
  v
enqueue
  |
  v
worker
```

Do not put large amounts of work directly into a cron request.

---

# 32. Phase 29 — local Vercel development

The project must be testable locally in a way that approximates deployment.

Use the Vercel CLI where appropriate:

```bash
vercel dev
```

and:

```bash
vercel build
```

The exact commands may vary with the monorepo setup.

Test:

```text
health
auth
CRUD
imports
exports
webhooks
```

through the Vercel-compatible entrypoint.

Do not test only through the old Node `@hono/node-server` entrypoint.

---

# 33. Phase 30 — build verification

Run:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
```

Then:

```bash
vercel build
```

Inspect the resulting build.

Ensure:

- Hono is bundled correctly
- MongoDB driver is included correctly
- argon2/bcrypt are included correctly if used
- native modules are handled correctly by Vercel
- no accidental frontend dependencies are bundled into API
- no secrets are embedded

---

# 34. Phase 31 — production dependency audit

Run:

```bash
pnpm why @hono/node-server
pnpm why argon2
pnpm why bcrypt
pnpm why mongodb
pnpm why pino
```

Determine which are required at runtime.

Do not remove:

```text
argon2
bcrypt
mongodb
pino
```

just because they are Node-specific.

The point is to verify they work under Vercel's Node runtime.

---

# 35. Phase 32 — Vercel function bundle audit

Inspect the built function.

Look for accidental inclusion of:

```text
frontend source
test files
fixtures
large CSV samples
backup files
Docker files
development-only packages
```

Do not package unnecessary files.

---

# 36. Phase 33 — security headers

Review API responses.

Where appropriate, add:

```text
X-Content-Type-Options: nosniff
Referrer-Policy
Content-Security-Policy
```

Be careful not to add a CSP that breaks the frontend.

For an API, the header set can be simpler than the frontend's.

---

# 37. Phase 34 — request size limits

Audit:

```text
JSON body
multipart body
CSV uploads
query parameters
webhook payloads
```

Do not allow unexpectedly large requests.

Preserve existing application limits.

If a large upload is required, prefer:

```text
direct Blob upload
```

rather than routing large files through the Function.

---

# 38. Phase 35 — timeout and outbound requests

Audit every:

```ts
fetch(...)
```

in the backend.

Every outbound call should have:

- timeout
- bounded response size where applicable
- error handling
- retry behavior if appropriate

Do not let external APIs hold a Function open indefinitely.

---

# 39. Phase 36 — idempotency audit

Serverless functions can be retried or requests can be repeated.

Audit:

```text
POST endpoints
webhooks
imports
exports
payment-like actions if any
email sending
integration actions
```

Where a duplicate operation would be harmful, implement idempotency.

Use:

```text
idempotency key
unique database constraint
job ID
event ID
```

where appropriate.

---

# 40. Phase 37 — observability

Every HTTP request should have:

```text
requestId
```

Every background job should have:

```text
jobId
eventId
```

Logs should allow tracing:

```text
HTTP request
  ->
Mongo job
  ->
queue
  ->
consumer
  ->
Blob
  ->
webhook
```

Do not expose internal identifiers unnecessarily in public responses.

---

# 41. Phase 38 — staging deployment

Create a dedicated Vercel preview/staging environment.

Use:

```text
staging MongoDB
staging Blob
staging Queue
staging secrets
```

Never use production data for ordinary staging tests.

## Smoke tests

Run:

```text
GET /health
GET /ready

register
login
me
logout

CRUD

import
export
webhook

API key
RBAC
tenant isolation
```

---

# 42. Phase 39 — concurrency testing

Test:

```text
10 concurrent requests
50 concurrent requests
100 concurrent requests where appropriate
```

Pay particular attention to:

```text
MongoDB connection reuse
duplicate writes
rate limiting
race conditions
job duplication
webhook duplication
```

The application must remain correct when multiple Function instances execute simultaneously.

---

# 43. Phase 40 — cold-start testing

Test after deployment/redeployment.

Verify:

```text
first request
second request
parallel first requests
```

Do not assume module-level state exists.

The application must correctly initialize after a cold start.

---

# 44. Phase 41 — failure testing

Simulate:

```text
MongoDB temporarily unavailable
Blob unavailable
queue failure
webhook timeout
webhook 500
malformed import
invalid session
invalid API key
```

Verify errors are:

```text
safe
recoverable
observable
```

and do not leave jobs permanently stuck.

---

# 45. Phase 42 — old Docker deployment

Do not delete Docker files immediately.

Determine whether these are still needed:

```text
apps/api/Dockerfile
apps/api/worker.Dockerfile
docker-compose.yml
```

If Docker is no longer used:

1. remove deployment references
2. update README
3. remove CI references
4. then delete files in a separate cleanup change

---

# 46. Phase 43 — old worker cleanup

After the new background architecture is verified:

```text
apps/api/src/worker/index.ts
```

may be removed.

Before removal, confirm all worker responsibilities are replaced.

Do not remove it merely because the API works.

---

# 47. Phase 44 — deployment scripts

Add useful package scripts.

Example:

```json
{
  "scripts": {
    "dev": "...",
    "dev:vercel": "...",
    "build": "...",
    "build:vercel": "vercel build",
    "test": "...",
    "typecheck": "...",
    "lint": "...",
    "db:ensure-indexes": "...",
    "db:seed": "...",
    "db:backup": "...",
    "db:restore": "..."
  }
}
```

Use the repository's actual package name and existing scripts.

Do not blindly overwrite existing scripts.

---

# 48. Phase 45 — CI

CI should run:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
vercel build
```

if Vercel CLI authentication/setup allows it.

CI must fail when:

- TypeScript fails
- tests fail
- Vercel build fails
- required environment validation fails
- forbidden production artifacts are included

---

# 49. Phase 46 — final API compatibility audit

Before production, compare the old API and new Vercel API.

For every route record:

```text
method
path
request
response
status codes
auth requirement
permissions
```

Use automated API tests where possible.

No route should silently disappear.

---

# 50. Phase 47 — final security audit

Verify:

## Authentication

- [ ] passwords never logged
- [ ] password hashes never returned
- [ ] session tokens never logged
- [ ] API keys never logged
- [ ] reset tokens never logged
- [ ] cookies are secure
- [ ] authentication works after cold start

## Authorization

- [ ] organization isolation
- [ ] role checks
- [ ] resource ownership
- [ ] API key permissions

## Files

- [ ] imports private
- [ ] exports private
- [ ] file authorization checked
- [ ] file size limits
- [ ] no path traversal

## Webhooks

- [ ] SSRF reviewed
- [ ] outbound timeout
- [ ] HMAC signature
- [ ] retries
- [ ] no secret leakage

## Database

- [ ] no production URI in source
- [ ] indexes present
- [ ] queries scoped
- [ ] connection reuse

---

# 51. Phase 48 — final production readiness checklist

The coding agent MUST NOT mark this migration complete until:

## Vercel runtime

- [ ] API builds on Vercel
- [ ] Hono runs correctly
- [ ] Node.js runtime selected
- [ ] no accidental Edge runtime
- [ ] all Node dependencies work
- [ ] API routes work through Vercel

## MongoDB

- [ ] Atlas connection works
- [ ] connection reuse works
- [ ] no connection per request
- [ ] indexes exist
- [ ] no startup index creation
- [ ] tenant isolation passes

## Authentication

- [ ] registration
- [ ] login
- [ ] logout
- [ ] session
- [ ] password reset
- [ ] password change
- [ ] API keys
- [ ] existing password hashes remain valid

## Storage

- [ ] no in-memory export storage
- [ ] Blob/S3/R2 persistence
- [ ] private file access
- [ ] authorization

## Background jobs

- [ ] old infinite worker replaced or explicitly retained outside Vercel
- [ ] imports processed asynchronously
- [ ] exports processed asynchronously
- [ ] webhook retries asynchronous
- [ ] retries are idempotent

## Rate limiting

- [ ] no production process-local Map
- [ ] shared state
- [ ] 429 behavior preserved

## Frontend

- [ ] API URL configurable
- [ ] CORS correct
- [ ] cookies work
- [ ] production login works
- [ ] no CORS errors

## Testing

- [ ] typecheck
- [ ] lint
- [ ] unit tests
- [ ] integration tests
- [ ] Vercel build
- [ ] staging smoke test
- [ ] concurrency test
- [ ] cold-start test
- [ ] tenant-isolation test

---

# 52. Recommended implementation order

Follow this order:

```text
PHASE 0
Baseline

   ↓

PHASE 1
Vercel/Hono entrypoint

   ↓

PHASE 2
Vercel project configuration

   ↓

PHASE 3
Environment/secrets

   ↓

PHASE 4
MongoDB connection management

   ↓

PHASE 5
Authentication verification

   ↓

PHASE 6
Sessions/cookies/CORS

   ↓

PHASE 7
Distributed rate limiting

   ↓

PHASE 8
Persistent exports

   ↓

PHASE 9
Real imports

   ↓

PHASE 10
Background worker migration

   ↓

PHASE 11
Webhook background processing

   ↓

PHASE 12
Logging

   ↓

PHASE 13
Global state audit

   ↓

PHASE 14+
Security/performance/testing

   ↓

STAGING

   ↓

PRODUCTION
```

Do not attempt all phases in one giant commit.

---

# 53. Critical decision: do NOT over-migrate

The biggest mistake the coding agent can make is taking a Cloudflare-style migration plan and applying it to Vercel.

Do NOT:

- replace Node `crypto` with Web Crypto unnecessarily
- replace Argon2 with WASM unnecessarily
- replace bcrypt unnecessarily
- replace MongoDB
- remove Pino just because it is Node-oriented
- remove Node APIs that Vercel supports
- rewrite Hono routes
- rewrite repositories
- convert everything to fetch-only APIs
- introduce Durable Objects
- introduce Cloudflare-specific APIs

The desired result is a **Vercel-compatible Node application**, not a generic serverless abstraction.

---

# 54. Critical decision: what must actually change

The following are the areas that genuinely need attention:

```text
1. Vercel/Hono entrypoint
2. serverless-safe MongoDB connection reuse
3. process-local rate limiting
4. process-local file storage
5. long-running background worker
6. long-running imports/exports
7. webhook retry architecture
8. environment/deployment configuration
9. CORS/cookie behavior
10. global-state audit
11. tenant isolation testing
12. Vercel build/runtime testing
```

Everything else should remain as close to the existing implementation as possible.

---

# 55. Important decision: background worker can temporarily remain separate

If Vercel background processing cannot be migrated safely in the first pass, it is acceptable to temporarily deploy:

```text
Vercel
  |
  +--> API

Separate Node service
  |
  +--> existing worker

MongoDB Atlas
```

This is preferable to deleting functionality or forcing a fragile queue migration.

The migration can then proceed:

```text
Phase 1
API -> Vercel

Phase 2
Frontend -> Vercel

Phase 3
worker -> queue/workflow

Phase 4
retire Node worker
```

This staged approach is explicitly allowed.

---

# 56. Important decision: keep a conventional Node deployment fallback

Until Vercel staging has passed all tests, keep the existing Node deployment path working.

This means:

```text
Node entrypoint
```

should remain available during migration.

Do not delete it until:

- Vercel staging is stable
- all major API routes work
- background work is migrated or intentionally externalized
- rollback has been tested

---

# 57. Suggested final structure

The final repository should trend toward:

```text
apps/api/
├── src/
│   ├── app.ts
│   ├── vercel.ts
│   ├── node.ts                 # temporary/fallback if needed
│   ├── config/
│   │   └── env.ts
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
│   │   └── blob.ts
│   ├── utils/
│   │   ├── crypto.ts
│   │   └── logger.ts
│   └── scripts/
│       ├── seed.ts
│       ├── backup.ts
│       ├── restore.ts
│       └── ensure-indexes.ts
├── .env.example
├── vercel.json                # only if actually required
└── package.json
```

The exact filenames may differ.

Do not create files solely to match this diagram.

---

# 58. Suggested production architecture

The preferred final setup is:

```text
                        VERCEL
             +------------------------+
             |                        |
             |   React/Vite           |
             |        |               |
             |        v               |
             |   Hono API             |
             |   Node.js Functions    |
             |                        |
             +----------+-------------+
                        |
           +------------+-------------+
           |            |             |
           v            v             v
      MongoDB Atlas   Blob        Queue/Workflow
                                      |
                                      v
                              Background processing
                                      |
                          +-----------+----------+
                          |                      |
                          v                      v
                       Imports               Webhooks
                       Exports               Integrations
```

The system should remain:

```text
Node.js
Hono
MongoDB
Argon2/bcrypt
Node crypto
```

where those technologies already work.

---

# 59. Final instructions to the coding agent

You are modifying an existing CRM codebase.

Do not treat this as a greenfield rewrite.

The application is already substantially Node-compatible.

Your job is to make it **safe and reliable on Vercel Functions** with the minimum necessary architectural changes.

For every phase:

1. inspect the current implementation
2. make the smallest coherent change
3. update/add tests
4. run typecheck
5. run lint
6. run relevant tests
7. run Vercel build/runtime tests
8. document findings
9. continue only after the phase is stable

At the end of each phase, record:

```text
Phase:
Changes:
Files changed:
Tests:
Deployment result:
Known limitations:
Next phase:
```

If a dependency does not work on Vercel:

1. reproduce the problem
2. identify the exact runtime/build error
3. check the current official Vercel documentation
4. determine whether configuration fixes it
5. only then consider replacing the dependency

Do not replace secure cryptographic code merely because it is Node-specific.

Do not weaken authentication.

Do not replace persistence with process memory.

Do not remove organization isolation.

Do not make large API changes.

Do not delete the existing Node worker until its responsibilities have been migrated or explicitly kept in a separate Node service.

The final objective is:

```text
Existing CRM
    |
    v
Vercel Node.js Functions
    |
    +---- MongoDB Atlas
    |
    +---- persistent file storage
    |
    +---- background queue/workflow
    |
    +---- external integrations
```

with:

```text
minimal code changes
stateless request handling
persistent application state
safe serverless concurrency
working authentication
working MongoDB
working imports/exports
working webhooks
working tenant isolation
reliable background processing
```

---

# 60. Final acceptance scenario

The migration is complete only when this entire staging scenario works.

## User journey

1. Open the deployed frontend.
2. Register a user.
3. Create an organization.
4. Log in.
5. Verify session cookie.
6. Load current user.
7. Create contacts.
8. Create companies.
9. Create leads.
10. Create deals.
11. Create tasks.
12. Create notes.
13. Create an API key.
14. Authenticate through the API key.
15. Create an export.
16. Export is persisted.
17. Download the export.
18. Upload a real CSV.
19. Import job is created.
20. Background processing runs.
21. Imported records appear.
22. Create a webhook.
23. Trigger the webhook.
24. Verify delivery/retry behavior.
25. Log out.
26. Verify session is rejected.
27. Create a second organization.
28. Verify organization A cannot access organization B.
29. Redeploy/restart.
30. Verify persistent state still exists.
31. Verify imports/exports still work.
32. Verify authentication still works.
33. Verify rate limits work across concurrent Function instances.

Only after this passes should the old Node deployment be considered removable.

---

# 61. Official documentation references

Use current official documentation whenever implementation details have changed.

Vercel:
https://vercel.com/docs

Vercel Functions:
https://vercel.com/docs/functions

Vercel Node.js runtime:
https://vercel.com/docs/functions/runtimes/node-js

Vercel Fluid Compute:
https://vercel.com/docs/fluid-compute

Hono on Vercel:
https://vercel.com/docs/frameworks/backend/hono

Vercel environment variables:
https://vercel.com/docs/environment-variables

Vercel Blob:
https://vercel.com/docs/storage/vercel-blob

Vercel Queues:
https://vercel.com/docs/queues

Vercel Workflow:
https://vercel.com/docs/workflow

Vercel Cron:
https://vercel.com/docs/cron-jobs

Vercel CLI:
https://vercel.com/docs/cli

MongoDB Node.js Driver:
https://www.mongodb.com/docs/drivers/node/current/

MongoDB Atlas:
https://www.mongodb.com/docs/atlas/

When this document conflicts with current official documentation, use the current official documentation and record the deviation in:

```text
docs/vercel-migration-status.md
```
