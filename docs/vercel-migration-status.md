# Vercel Migration Status

## Baseline

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

## Next Phase

**Phase 1:** Vercel/Hono Entrypoint
