# Frontend Completion Instructions — FreeCRM

## Read this first

You are finishing the frontend of an existing project (`apps/web`, a React + Vite + TypeScript app) that talks to an existing, already-complete backend (`apps/api`, a Hono + MongoDB API). **Do not modify `apps/api` unless a phase explicitly says to** — every endpoint you need already exists and works.

Before writing any code, read:
- `docs/screen-spec.md` — the authoritative screen-by-screen spec (routes, layout, states, the "Final Route Map" §84, and "Build Priority" §87)
- `docs/UI-UX.md` — design tokens, spacing, color system, component usage rules
- `docs/RBAC.md` — permission model (you'll consume this, not build it)
- `apps/web/src/router.tsx` — current routes (most CRUD screens for contacts/companies/leads/deals/tasks/etc. already exist — do not rebuild these)
- `apps/web/src/features/contacts/` — treat this as the reference implementation for the api-client + hooks + page pattern used throughout the app. Copy its shape exactly for anything new.
- `apps/web/src/components/RouteGuard.tsx` — currently a stub (`isAuthenticated = true`), this is what Phase 1 fixes.

**Why this app is broken today:** the backend auth system (register/login/logout/me/forgot-password/reset-password) is fully implemented, but the frontend has no login page, no auth state, and `RouteGuard` never actually checks anything. There is also no Settings→Profile or Settings→Organization screen, and no invite-acceptance screen. Everything else (Contacts, Companies, Leads, Deals, Pipelines, Tasks, Calendar, Activities, Notes, Imports, Exports, Custom Fields, Tags, Dashboard, Reports, Team/Roles/Security/Sessions/Audit/API Keys/Webhooks settings) is already built — don't redo it.

## Ground rules for every phase

1. **One phase per session.** Each phase below is scoped to fit in one coding-agent context window without exhausting memory. Do not start the next phase in the same session — stop, summarize what changed, and let a fresh session pick up the next phase.
2. **At the start of a phase**, re-read only the files listed in that phase's "Files to read first" — don't re-read the whole repo.
3. **At the end of a phase**, run `pnpm --filter @crm/web typecheck` and `pnpm --filter @crm/web lint` in `apps/web`, fix any errors introduced, and write a short changelog entry into `docs/frontend-progress.md` (create it in Phase 0 if it doesn't exist) describing exactly what was added/changed and which files.
4. **Never invent new backend endpoints.** If something seems to need a new endpoint, check `apps/api/src/modules/*/*.routes.ts` first — it's very likely already there (this backend is fully built out). Only touch `apps/api` if a phase explicitly authorizes it.
5. **Match existing conventions exactly**: the `request<T>()` fetch wrapper pattern (see `apps/web/src/features/contacts/api/contacts.ts`), TanStack Query hooks per feature (`features/<name>/hooks/use<Name>.ts`), Zod schemas + react-hook-form for every form, `@crm/ui` components (Button, Input, Card, Toast, etc.) instead of raw HTML elements, and Tailwind classes matching `docs/UI-UX.md` tokens.
6. **Every new page needs, per `docs/screen-spec.md` §86 checklist**: loading state, error state, form validation with inline errors, submit-loading state, success toast, and keyboard/aria basics. Don't skip these to save time — incomplete states are exactly what makes a screen feel unfinished.

---

## Phase 0 — Auth foundation (context, API client, session bootstrap)

**Goal:** Build the plumbing that every auth screen will use. No visible UI yet.

**Files to read first:** `apps/api/src/modules/auth/auth.routes.ts`, `auth.controller.ts`, `auth.types.ts`, `auth.schema.ts`; `apps/web/src/features/contacts/api/contacts.ts` (pattern reference); `apps/web/src/query-client.ts`; `apps/web/src/providers.tsx`.

**Backend endpoints available (do not change these):**
- `POST /api/v1/auth/register` — `{ email, password, firstName, lastName }` → creates org + user, sets session cookie, returns `{ data: { user, organization, permissions } }`
- `POST /api/v1/auth/login` — `{ email, password }` → sets session cookie, returns same shape
- `POST /api/v1/auth/logout` → clears cookie, 204
- `GET /api/v1/auth/me` → returns current `{ user, organization, permissions }` or 401
- `POST /api/v1/auth/forgot-password` — `{ email }` → always returns `{ success: true }` (never reveals if email exists)
- `POST /api/v1/auth/reset-password` — `{ token, password }`
- `POST /api/v1/auth/change-password` — `{ currentPassword, newPassword }` (requires auth)

All auth requests must use `credentials: 'include'` (cookie session) — same as the existing `request()` helper already does.

**Build:**
1. `apps/web/src/features/auth/api/auth.ts` — typed functions for all 7 endpoints above, following the exact `request<T>()` pattern from `contacts.ts`.
2. `apps/web/src/features/auth/types.ts` — `User`, `Organization`, `AuthResponse` types matching `auth.types.ts` on the backend.
3. `apps/web/src/features/auth/context/AuthContext.tsx` — a React context providing `{ user, organization, permissions, isLoading, isAuthenticated, login, logout, register, refetchMe }`. On mount, call `GET /me` once to determine session state (don't assume logged out — a valid cookie may already exist). Use `useQuery` for `/me` with `retry: false`, and expose `login`/`logout`/`register` as functions that call the API then invalidate/refetch the `/me` query.
4. `apps/web/src/features/auth/hooks/usePermissions.ts` — a small hook `hasPermission(permission: string): boolean` reading from `AuthContext`, implementing the same wildcard rules as the backend (`exact match`, `resource.*`, `*`). Reference `apps/api/src/middleware/authorization.ts` for the exact matching logic to replicate.
5. Wrap `<Providers>` in `apps/web/src/providers.tsx` with `<AuthProvider>` (inside `QueryClientProvider`, outside `RouterProvider`).

**Do not build any pages yet.** Do not touch `RouteGuard.tsx` yet. Do not touch `router.tsx` yet.

**Definition of done:** `AuthContext` exists, compiles, and `useAuth()` is exported. `pnpm --filter @crm/web typecheck` passes.

---

## Phase 1 — Login, Logout, and real route protection

**Goal:** A user can actually log in, and unauthenticated users can no longer reach `/app/*`.

**Files to read first:** `docs/screen-spec.md` §3 (LOGIN), §71 (SESSION EXPIRATION); `apps/web/src/features/auth/context/AuthContext.tsx` (from Phase 0); `apps/web/src/pages/LandingPage.tsx`; `apps/web/src/router.tsx`; `apps/web/src/components/RouteGuard.tsx`; `apps/web/src/App.tsx` (for the user-menu dropdown, currently likely static).

**Build:**
1. `apps/web/src/features/auth/pages/Login.tsx` — centered card per screen-spec §3: email input, password input with show/hide toggle, "Sign In" button, "Forgot password?" link. Use react-hook-form + Zod (`z.string().email()`, `z.string().min(1)`). On submit call `useAuth().login()`. States: submit-loading (`Signing in...`), invalid-credentials error banner ("Invalid email or password."), suspended-account error ("Your account has been suspended. Contact your administrator." — the backend returns `ACCOUNT_SUSPENDED` via the `authorize` middleware, but login itself returns `Account is not active` — check the actual error message/code from `auth.service.ts` and branch on it). On success, redirect to `/app/dashboard`.
2. Add a "Sign Up" affordance if the landing page links to one — check `LandingPage.tsx`; if it only links to `/login`, that's fine, register can be reached from a link inside `Login.tsx` ("Don't have an account? Create one").
3. `apps/web/src/features/auth/pages/Register.tsx` — email, password, first name, last name. Zod: password `min(8)`. On submit call `useAuth().register()`, redirect to `/app/dashboard` on success (backend auto-creates the org — no separate onboarding step is required for this to work, though Phase 5 below covers optional onboarding polish).
4. Fix `apps/web/src/components/RouteGuard.tsx`: use `const { isAuthenticated, isLoading } = useAuth()`. While `isLoading`, render a full-page loading state (don't flash a redirect). If not authenticated, `<Navigate to="/login" replace />`, preserving the attempted path via `state={{ from: location }}` so Login can redirect back after success (nice-to-have, not blocking).
5. Update `apps/web/src/router.tsx`: add `{ path: '/login', element: <Login /> }` and `{ path: '/register', element: <Register /> }` as top-level routes (siblings of `/` and `/app`, outside `RouteGuard`).
6. Wire real logout: find the user-menu/sign-out control in `apps/web/src/App.tsx` (per screen-spec §2 global header "Sign out" item) and call `useAuth().logout()`, then redirect to `/login`.
7. Session expiration (screen-spec §71): if any API call returns 401 while the user believes they're authenticated, the existing `request()` wrapper should surface this as an error — at minimum, make sure a 401 on any protected page doesn't crash silently. A full modal is optional polish; a redirect-to-login on 401 is the required minimum. You may implement this via a React Query global error handler or an Axios-style interceptor in `request()` — check how `request()` is structured before deciding.

**Do not** build Forgot/Reset/Invite pages yet — that's Phase 2.

**Definition of done:** From a clean browser (no cookie), visiting `/app/dashboard` redirects to `/login`. Registering or logging in lands on `/app/dashboard` and stays there on refresh. Signing out returns to `/login` and `/app/*` becomes unreachable again. Typecheck and lint pass.

---

## Phase 2 — Forgot Password, Reset Password, Invitation Acceptance

**Goal:** Complete the remaining PUBLIC screens from screen-spec §1.

**Files to read first:** `docs/screen-spec.md` §4, §5, §6; `apps/api/src/modules/memberships/memberships.routes.ts` and `memberships.controller.ts` (invite/accept endpoints); `apps/web/src/features/auth/pages/Login.tsx` (Phase 1, for visual/pattern consistency).

**Backend endpoints available:**
- `POST /api/v1/auth/forgot-password` — `{ email }`
- `POST /api/v1/auth/reset-password` — `{ token, password }`
- `POST /api/v1/memberships/accept` — `{ token, ... }` (check `memberships.schema.ts` → `acceptInvitationSchema` for exact fields before building the form)

**Build:**
1. `apps/web/src/features/auth/pages/ForgotPassword.tsx` — per §4: email field, "Send Reset Link" button, generic success message regardless of whether the email exists ("If an account exists for this email, you will receive reset instructions."), "← Back to sign in" link.
2. `apps/web/src/features/auth/pages/ResetPassword.tsx` — reads `token` from query string (`useSearchParams`), fields: new password + confirm password (Zod `.refine` to check they match, `min(8)`), display password requirements before submission, "Reset Password" button. On success, redirect to `/login` with a success toast/message. On invalid/expired token error from the API, show that inline.
3. `apps/web/src/features/auth/pages/AcceptInvitation.tsx` — route `/invite/:token`. Read `token` from `useParams`. Fields per §6: first name, last name, password (email shown read-only — check `acceptInvitationSchema`/the invite-lookup response for how to get the invited email/org name to display; if there's no GET-by-token endpoint, check `memberships.controller.ts` for how `accept` reports errors, and adapt the screen to submit directly with a note above the form showing the organization name only if the API returns it). On success, log the user in (reuse `AuthContext` if `accept` sets a session cookie — check `memberships.controller.ts`'s `accept` handler; if it doesn't set a cookie, redirect to `/login` with a success message instead).
4. Add routes to `router.tsx`: `/forgot-password`, `/reset-password`, `/invite/:token` — all top-level, outside `RouteGuard`.

**Definition of done:** All 4 PUBLIC screens from screen-spec §1 exist and route correctly (Login done in Phase 1). Typecheck and lint pass.

---

## Phase 3 — Settings: Profile & Organization

**Goal:** Fill the two missing Settings screens that block `/app/settings` from being a dead end, per screen-spec §44–45.

**Files to read first:** `docs/screen-spec.md` §44, §45; `apps/web/src/features/settings/pages/SettingsTeam.tsx` (structural template — copy its layout/card/form conventions); `apps/api/src/modules/users/users.routes.ts` + `users.controller.ts` + `users.schema.ts` (for the profile update shape — `PATCH /api/v1/users/:id`); `apps/api/src/modules/organizations/organizations.routes.ts` + `organizations.controller.ts` (for `PATCH /api/v1/organizations/:id`); `apps/web/src/features/auth/context/AuthContext.tsx` (for current user/org id).

**Build:**
1. `apps/web/src/features/settings/api/profile.ts` (or extend existing `settings/api/settings.ts` if that's the established location — check it) — functions for `GET/PATCH /users/:id` using the authenticated user's own id from `AuthContext`.
2. `apps/web/src/features/settings/pages/SettingsProfile.tsx` — per §44: first name, last name, email, phone, timezone, language fields; "Save Changes" button; avatar upload/remove (check whether the backend actually supports avatar upload — search `apps/api/src/services/storage` and `attachments` module; if no avatar endpoint exists, omit the avatar section rather than faking it, and note this in the changelog file). Standard form states: loading, validation errors, submit-loading, success toast, server-error banner.
3. `apps/web/src/features/settings/pages/SettingsOrganization.tsx` — per §45: organization name, industry, website, country, timezone, currency; logo upload (same caveat as above — check backend support before building); "Save Changes". Restrict editing to admins/owners: use `usePermissions()` from Phase 0 (check the actual permission name in `apps/api/src/modules/organizations` — likely `organizations.update` or similar, confirm in `organizations.permissions.ts` if it exists, otherwise check how the route is protected) — if the user lacks permission, render the fields as read-only rather than hiding the page.
4. Add routes in `router.tsx`: `{ path: 'settings/profile', element: <SettingsProfile /> }`, `{ path: 'settings/organization', element: <SettingsOrganization /> }` inside the existing `/app` guarded tree.
5. Replace the bare `settings` index placeholder (`{ path: 'settings', element: <Placeholder title="Settings" /> }`) with a redirect to `settings/profile`, or a real Settings index page listing all settings sections as cards/links (check §1 Settings inventory for the full list — most already have pages; this index just needs to link to them).

**Definition of done:** `/app/settings` no longer shows "under construction." Both new pages load real data, save successfully, and show proper validation/error/success states. Typecheck and lint pass.

---

## Phase 4 — Global session-expiry polish, permission-aware UI, and final QA pass

**Goal:** Close the smaller gaps noted in the project's own QA notes (`todo.md` P45) so the app feels finished, not just functional.

**Files to read first:** `todo.md` (search for "P45" section — it lists exactly what's deferred); `docs/screen-spec.md` §71 (Session Expiration), §83 (Permission UX Matrix), §86 (checklist); everything built in Phases 0–3.

**Build:**
1. **Session expiration modal** (§71): if not already handled with a redirect in Phase 1, implement the modal version — "Please sign in again to continue." + "Sign In" button — triggered by any 401 response after the user was previously authenticated. Clear local auth state and show this instead of a raw error screen.
2. **Permission-aware UI**: audit the primary action buttons across the existing feature pages (Create/Edit/Delete buttons in Contacts, Companies, Leads, Deals, etc.) and hide or disable actions the current user's permissions don't allow, using `usePermissions()` from Phase 0, matching §83's matrix pattern (e.g., don't show "Delete" to a Viewer). Do this only for the top-level list/detail action buttons — don't attempt a full audit of every nested control in one pass.
3. **404 / not-found route**: confirm `router.tsx` has a catch-all; if not, add a simple `NotFound` page.
4. **Final route check**: diff the live `router.tsx` against `docs/screen-spec.md` §84 "Final Route Map." Anything still missing after Phases 0–3 should be listed explicitly in `docs/frontend-progress.md` as a known gap — do not silently skip items.
5. Run the full checklist from screen-spec §86 against every screen touched in Phases 0–3 specifically (not the whole app) and fix anything missing (loading/empty/error, aria-labels, keyboard focus on modals/forms).

**Definition of done:** `pnpm --filter @crm/web typecheck`, `pnpm --filter @crm/web lint`, and `pnpm --filter @crm/web test` (if tests exist for these areas) all pass. `docs/frontend-progress.md` has one entry per phase summarizing what was built and any known remaining gaps.

---

## What is explicitly out of scope for these phases

- Full onboarding wizard (`/onboarding/*` — organization/team/pipeline/import steps from screen-spec §7–12). Registration already auto-creates a working organization, so onboarding is a UX nicety, not a blocker. Only attempt this after Phases 0–4 are done and verified, as its own separate phase.
- Two-factor auth setup (§61) — no evidence the backend supports this yet; verify `apps/api` support before ever starting this.
- Any backend changes. If a phase seems to require one, stop and flag it rather than modifying `apps/api`.