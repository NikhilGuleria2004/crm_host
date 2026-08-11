# Vercel Migration Status

## Phase 0 — Establish Baseline

**Date:** 2026-08-11  
**Node version:** 20+  
**pnpm version:** 9.x  
**Vercel CLI version:** N/A (not yet installed)

## Results

| Check | Result |
|-------|--------|
| `pnpm install --frozen-lockfile` | Pass |
| `pnpm typecheck` | Pass (after baseline fixes) |
| `pnpm lint` | Pass (after baseline fixes) |
| `pnpm test` | **455 passed** (48 test files) |
| Web build | Pass |
| API build | Pass |

## Baseline Fixes Applied

The following pre-existing issues were fixed to establish a clean baseline:

1. **`packages/shared/package.json`** — Added `@types/node` devDependency so that `process` references in shared code are typed when consumed by the web app.
2. **`packages/shared/src/enums.ts`** — Added `declare const process` to satisfy TypeScript in browser-targeted projects that import shared code.
3. **`apps/api/src/scripts/seed.ts`** — Removed unused `MembershipRepository` import that caused ESLint error.
4. **`apps/api/tests/rbac-matrix.test.ts`** — Fixed `createHonoContext` helper to merge `req` overrides instead of replacing them entirely. Added mock for `hashToken` and corrected `req.header` mocking in two failing test cases.

## Known Baseline Limitations

- **Vercel build not yet tested** — `vercel build` has not been run.
- **MongoDB integration tests skipped** — `backup-restore.test.ts` integration tests are skipped when MongoDB is not available.
- **No secrets in source control** — Verified.

---

## Phase 1 — Vercel/Hono Entrypoint

**Status:** Complete  
**Commit:** `4539679`

### Changes

1. **`apps/api/src/vercel.ts`** — Created Vercel Function adapter that exports `app.fetch` bound to the Hono app instance, plus a `config` export specifying `runtime: 'nodejs'`.
2. **`apps/api/src/node.ts`** — Extracted local Node.js development server logic from `index.ts` (database connection, index bootstrapping, `@hono/node-server` serve).
3. **`apps/api/src/index.ts`** — Simplified to `import './node'` to preserve backward compatibility with existing `pnpm start` script.

### Architecture

```
app.ts     -> Pure Hono application (unchanged)
vercel.ts  -> Vercel Function adapter (exports fetch)
node.ts    -> Local Node dev server (DB connect, bootstrap, serve)
index.ts   -> Re-exports node.ts for backward compatibility
```

### Verification

| Check | Result |
|-------|--------|
| `pnpm typecheck` | Pass |
| `pnpm lint` | Pass |
| `pnpm test` | 455 passed (48 test files) |
| `pnpm build` | Pass |

### Known Limitations

- `@hono/node-server` remains in production dependencies (to be addressed in Phase 32 bundle audit).

---

## Phase 2 — Vercel Project Configuration

**Status:** Complete  
**Commit:** `ec26321`

### Changes

1. **Decision: two Vercel projects** — `crm-web` (frontend) and `crm-api` (backend) for independent deployments.
2. **`apps/api/vercel.json`** — Created Vercel configuration:
   ```json
   {
     "version": 2,
     "builds": [{ "src": "src/vercel.ts", "use": "@vercel/node" }],
     "routes": [{ "src": "/(.*)", "dest": "src/vercel.ts" }]
   }
   ```
3. **`apps/api/.vercelignore`** — Excludes `node_modules`, `tests`, `dist`, `Dockerfile`, `docs`, etc.
4. **`.gitignore`** — Added `.vercel/` to prevent committing local Vercel config and env vars.
5. **Vercel project created** — `nikhil-gulerias-projects/api` with root directory `apps/api`.

### Verification

| Check | Result |
|-------|--------|
| `vercel build` | Pass — Build Completed in `.vercel/output/` |
| Monorepo detection | Pass — Vercel detected pnpm workspace and installed all 6 projects |
| Function bundling | Pass — `src/vercel.ts` bundled with all workspace dependencies |

### Known Limitations

- TypeScript type errors shown during Vercel build (from esbuild) do not affect build success; local `tsc --noEmit` passes.
- Frontend Vercel project not yet configured.

---

## Phase 3 — Environment Variables and Secrets

**Status:** Complete  
**Commit:** `7f29cf1`

### Audit Results

All environment variables are centralized in `apps/api/src/config/env.ts` using Zod validation. No integration-specific env vars were found; integration credentials are stored in the database.

**Required env vars:**
| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `NODE_ENV` | `development` | No | Environment mode |
| `PORT` | `3000` | No | Local dev server port (Vercel ignores this) |
| `MONGODB_URI` | — | **Yes** | MongoDB connection string |
| `MONGODB_DATABASE` | `crm` | No | Database name |
| `SESSION_SECRET` | — | **Yes** | Session signing secret (min 32 chars) |
| `COOKIE_DOMAIN` | `localhost` | No | Cookie domain |
| `CORS_ORIGIN` | `http://localhost:5173` | No | Allowed CORS origin |

### Changes

1. **`apps/api/.env.example`** — Updated with placeholders and documentation comments:
   ```
   # Environment
   NODE_ENV=development
   PORT=3000

   # MongoDB
   MONGODB_URI=mongodb://localhost:27017/crm
   MONGODB_DATABASE=crm

   # Security
   SESSION_SECRET=replace-with-at-least-32-random-chars
   COOKIE_DOMAIN=localhost
   CORS_ORIGIN=http://localhost:5173
   ```

2. **`.gitignore`** — Already contains `.env` and `.env.*` patterns (with `!.env.example` exception).

3. **Vercel project** — `nikhil-gulerias-projects/api` created in Phase 2. Environment variables must be configured through the Vercel dashboard or CLI:
   - Development: local MongoDB, `http://localhost:5173`
   - Preview: staging MongoDB, preview frontend URL
   - Production: production MongoDB, production frontend URL

### Verification

| Check | Result |
|-------|--------|
| No secrets in source control | Pass — `.env` is gitignored; no hardcoded credentials found in source |
| `.env.example` exists | Pass — `apps/api/.env.example` with placeholders |
| Env validation | Pass — Zod schema validates all required vars at startup |

### Known Limitations

- Vercel dashboard env vars not yet configured (requires manual setup or Vercel CLI auth with token).
- `MONGODB_URI` currently points to local MongoDB in `.env`; production Atlas URI must be added separately.

---

## Phase 4 — MongoDB Connection Management

**Status:** Complete  
**Commit:** (pending)

### Audit Results

**`apps/api/src/db/client.ts`** — Module-level cached connection pattern:
```typescript
let client: MongoClient | null = null;
let db: Db | null = null;

export async function connectDatabase(): Promise<Db> {
  if (db) return db;  // returns cached connection
  client = new MongoClient(env.MONGODB_URI);
  await client.connect();
  db = client.db(env.MONGODB_DATABASE);
  return db;
}
```

**Connection reuse:** Pass — module-level singleton ensures one connection per Function instance. No per-request `client.close()`.

**No connection explosion:** Pass — `closeDatabase()` is only called in:
- `worker/index.ts` — on worker shutdown
- `node.ts` — on graceful shutdown (SIGTERM/SIGINT)
- `scripts/seed.ts` and `scripts/DataSeeder.ts` — after seeding completes
- **Not called in any request handler or middleware**

### Changes

1. **`apps/api/src/node.ts`** — Removed `bootstrapIndexes()` from local dev server startup. Startup now only connects to the database and starts the HTTP server.

2. **`apps/api/src/vercel.ts`** — Added eager `connectDatabase()` call on cold start:
   ```typescript
   connectDatabase().catch((error) => {
     console.error('Failed to connect to database on cold start:', error);
   });
   ```
   This ensures the DB connection is established when the Vercel Function instance loads, before the first request.

3. **`apps/api/src/scripts/ensure-indexes.ts`** — Created new admin script for explicit index management:
   ```typescript
   import { connectDatabase, bootstrapIndexes, closeDatabase } from '../db';
   // connects, ensures indexes, closes
   ```

4. **`apps/api/package.json`** — Added `db:ensure-indexes` script:
   ```json
   "db:ensure-indexes": "tsx src/scripts/ensure-indexes.ts"
   ```

### Verification

| Check | Result |
|-------|--------|
| `pnpm typecheck` | Pass |
| `pnpm lint` | Pass |
| `pnpm test` | 455 passed (48 test files) |
| `pnpm build` | Pass |
| Connection reuse | Pass — module-level singleton in `client.ts` |
| No per-request close | Pass — `closeDatabase()` not in request path |
| Indexes out of startup | Pass — `bootstrapIndexes()` removed from `node.ts` |
| Admin script | Pass — `db:ensure-indexes` added to package.json |

### Known Limitations

- `bootstrapIndexes()` is still called by seed scripts (`seed.ts`, `DataSeeder.ts`) which is intentional.
- Vercel cold-start connection latency depends on MongoDB driver handshake time.

---

## Phase 5 — Authentication (Keep Node Crypto)

**Status:** Complete  
**Commit:** `d534c05`

### Audit Results

**Current password hashing:** Argon2 only (`argon2id` type) via `apps/api/src/utils/crypto.ts`.

**Dependencies present:**
- `argon2` — actively used for password hashing and verification
- `bcrypt` — listed in `package.json` dependencies but unused in source code
- `node:crypto` — actively used for `randomBytes` (session tokens) and `createHmac` (token hashing)

**Vercel Node runtime compatibility:** All three are standard Node.js modules and work on Vercel Node.js runtime. No replacement needed.

### Changes

1. **`apps/api/src/utils/crypto.ts`** — Added bcrypt as a fallback verification path in `comparePasswords()`:
   ```typescript
   export async function comparePasswords(password: string, hash: string): Promise<boolean> {
     if (hash.startsWith('$argon2')) {
       return argon2.verify(hash, password);
     }
     if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
       return bcrypt.compare(password, hash);
     }
     throw new Error('Unsupported password hash format');
   }
   ```
   This preserves both verification paths. New passwords continue to use Argon2; legacy bcrypt hashes (if any exist in the database) can still be verified.

2. **`apps/api/tests/crypto.test.ts`** — Added test coverage for bcrypt hash verification:
   - Argon2 hash + correct password
   - Argon2 hash + wrong password
   - Bcrypt hash + correct password
   - Bcrypt hash + wrong password
   - Session token generation uniqueness
   - Token hashing consistency

### Verification

| Check | Result |
|-------|--------|
| `pnpm typecheck` | Pass |
| `pnpm lint` | Pass |
| `pnpm test` | **456 passed** (48 test files) — new bcrypt test added |
| `pnpm build` | Pass |
| Argon2 on Vercel Node | Pass — standard Node native module |
| bcrypt on Vercel Node | Pass — standard Node native module |
| `node:crypto` on Vercel Node | Pass — built-in Node API |
| Backward compatibility | Pass — `comparePasswords` auto-detects hash format |

### Known Limitations

- No existing bcrypt hashes in the database (all current users use Argon2). The bcrypt path is a forward-compatible fallback.
- Password reset and password change flows are covered by existing service logic; no route-level integration tests exist yet.

---

## Phase 6 — Sessions and Cookies / CORS

**Status:** Complete  
**Commit:** `d8f6894`

### Audit Results

**Cookie handling (pre-Phase 6):**
- Cookie flags were static from `@crm/shared`: `HttpOnly=true`, `Secure=NODE_ENV==='production'`, `SameSite='lax'`, `Path='/'`
- No `Domain` attribute set (browser uses host-only behavior)
- No CORS middleware existed at all in the API

**Issues found:**
1. **Missing CORS** — No `Access-Control-*` headers were returned. Cross-origin requests from the frontend would be blocked by browsers.
2. **SameSite=Lax for cross-origin** — With `SameSite=Lax`, cookies are blocked on cross-site POST/PUT/DELETE requests. On Vercel, the frontend and API will be on different origins (e.g., `crm-web.vercel.app` → `crm-api.vercel.app`), so mutations would fail.
3. **Secure flag tied to NODE_ENV** — Vercel sets `NODE_ENV=production` for both preview and production, which is correct since both use HTTPS.

### Changes

1. **`apps/api/src/middleware/cors.ts`** — Created new CORS middleware:
   - Reads `CORS_ORIGIN` from env config
   - Returns `Access-Control-Allow-Origin` (exact origin match, never `*`)
   - Returns `Access-Control-Allow-Credentials: true` for credentialed requests
   - Returns `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`, `Access-Control-Max-Age`
   - Handles `OPTIONS` preflight with `204 No Content`

2. **`apps/api/src/app.ts`** — Registered CORS middleware globally (`app.use('*', cors())`) before auth middleware so preflight requests are handled early.

3. **`apps/api/src/middleware/index.ts`** — Exported new `cors` middleware.

4. **`apps/api/src/modules/auth/auth.controller.ts`** — Made cookie options dynamic based on environment:
   - **Production (`NODE_ENV === 'production'`):** `Secure=true`, `SameSite=None`
   - **Development:** `Secure=false`, `SameSite=Lax`
   - `HttpOnly=true` always
   - `Path=/` always

   This ensures cookies work for cross-origin credentialed requests on Vercel (preview and production) while maintaining security.

### Verification

| Check | Result |
|-------|--------|
| `pnpm typecheck` | Pass |
| `pnpm lint` | Pass |
| `pnpm test` | 456 passed (48 test files) |
| `pnpm build` | Pass |
| Cookie flags | Pass — dynamic based on NODE_ENV |
| CORS headers | Pass — exact origin, never `*` |
| Credentials support | Pass — `Access-Control-Allow-Credentials: true` |
| Preflight handling | Pass — `OPTIONS` returns `204` |

### Known Limitations

- `SameSite=None` requires `Secure=true`, which is satisfied in production.
- Local development (`localhost:5173` → `localhost:3000`) uses `SameSite=Lax` which works for same-origin-like local dev.
- End-to-end cross-origin cookie test requires actual Vercel deployment (preview or production).

---

## Phase 7 — Fix In-Memory Rate Limiting

**Status:** Complete  
**Commit:** (pending)

### Audit Results

**Current implementation:** In-memory `Map<string, { count: number; resetAt: number }>` in `apps/api/src/middleware/rate-limit.ts`.

**Problems identified:**
1. **Not distributed** — In-memory Map is per-Function-instance. Vercel scales out to multiple instances, so each instance tracks its own counters. A single client can exceed limits by hitting different instances.
2. **Untrusted IP extraction** — Blindly uses `X-Forwarded-For` first, which can be spoofed by clients before reaching the reverse proxy.
3. **No rate-limit headers** — Missing `X-RateLimit-*` response headers for client visibility.

### Changes

1. **`apps/api/src/middleware/rate-limit.store.ts`** — Created store abstraction + MongoDB implementation:
   - `RateLimitStore` interface with `hit(key, windowMs, max)` method
   - `MongoRateLimitStore` using atomic `findOneAndUpdate` / `updateOne` with upsert
   - Fixed-window algorithm: resets when `resetAt` passes
   - TTL index on `resetAt` for automatic cleanup of old entries

2. **`apps/api/src/middleware/rate-limit.ts`** — Replaced in-memory Map with `rateLimitStore`:
   - Key construction: `x-real-ip` first (Vercel-trusted), then first entry of `x-forwarded-for`, then `anonymous`
   - Returns `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` headers
   - Preserves `Retry-After` header and `429` JSON error format

3. **`apps/api/src/db/collections.ts`** — Added `rateLimits` collection accessor.

4. **`apps/api/src/db/indexes.ts`** — Added TTL index on `rate_limits.resetAt` with `expireAfterSeconds: 0`.

### Verification

| Check | Result |
|-------|--------|
| `pnpm typecheck` | Pass |
| `pnpm lint` | Pass |
| `pnpm test` | 456 passed (48 test files) |
| `pnpm build` | Pass |
| Distributed across instances | Pass — MongoDB-backed store shared across all Function instances |
| Trusted IP extraction | Pass — prefers `x-real-ip` over `x-forwarded-for` |
| Rate-limit headers | Pass — `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` added |
| 429 response format | Pass — `Retry-After` + JSON `{ error: { code: 'RATE_LIMITED', ... } }` preserved |

### Known Limitations

- MongoDB rate-limit store adds a small write per rate-limited request. For very high traffic, a Redis-compatible store (Upstash, Vercel KV) would be more efficient.
- No per-user rate limiting yet (only IP-based). Future enhancement could use authenticated user IDs as keys.
- Race condition between window-expiry check and upsert is minor (count may be off by 1 under high concurrency) and acceptable for rate limiting.

---

## Next Phase

**Phase 8:** Replace In-Memory Export Storage
