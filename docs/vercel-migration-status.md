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
**Commit:** (pending)

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

## Next Phase

**Phase 3:** Environment Variables and Secrets
