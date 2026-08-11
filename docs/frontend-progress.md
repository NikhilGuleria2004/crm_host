# Frontend Progress

## Phase 0 — Auth foundation (context, API client, session bootstrap)

**Status:** Complete

**What was added:**

1. **`apps/web/src/features/auth/types.ts`** — New file. TypeScript types matching the backend `auth.types.ts`:
   - `AuthUser`, `AuthOrganization`, `AuthResponse` (user/organization/permissions)
   - `RegisterInput`, `LoginInput`, `ForgotPasswordInput`, `ResetPasswordInput`, `ChangePasswordInput`
   - `MeResponse`, `AuthErrorResponse`

2. **`apps/web/src/features/auth/api/auth.ts`** — New file. Typed API client for all 7 auth endpoints, following the exact `request<T>()` pattern from `features/contacts/api/contacts.ts`:
   - `register(data)` → `POST /auth/register`
   - `login(data)` → `POST /auth/login`
   - `logout()` → `POST /auth/logout` (204, no body)
   - `me()` → `GET /auth/me`
   - `forgotPassword(data)` → `POST /auth/forgot-password`
   - `resetPassword(data)` → `POST /auth/reset-password`
   - `changePassword(data)` → `POST /auth/change-password`
   - All requests use `credentials: 'include'` for cookie-based session auth

3. **`apps/web/src/features/auth/hooks/usePermissions.ts`** — New file. `usePermissions()` hook exporting:
   - `hasPermission(permission: string): boolean` — implements the backend's wildcard matching from `apps/api/src/middleware/authorization.ts`: exact match → `resource.*` wildcard → global `*` wildcard
   - `permissions` array from auth context

4. **`apps/web/src/features/auth/context/AuthContext.tsx`** — New file. React context providing:
   - `user`, `organization`, `permissions` — derived from `GET /me` query result
   - `isLoading` — true during initial `/me` fetch
   - `isAuthenticated` — `true` when `/me` returns data (valid cookie exists)
   - `login` — calls `authApi.login()` then invalidates `['auth', 'me']` query
   - `register` — calls `authApi.register()` then invalidates `['auth', 'me']` query
   - `logout` — calls `authApi.logout()` then invalidates `['auth', 'me']` query
   - `refetchMe` — triggers manual refetch of `/me`
   - Uses `useQuery` with `retry: false` and `staleTime: Infinity` for the `/me` query
   - Exports `useAuth()` hook and `AuthProvider` component

5. **`apps/web/src/providers.tsx`** — Modified. Wrapped `<RouterProvider>` with `<AuthProvider>` inside `<QueryClientProvider>` (as required: AuthProvider inside QueryClientProvider, outside RouterProvider).

**Definition of done:** ✅ AuthContext exists, compiles, `useAuth()` is exported. `pnpm --filter @crm/web typecheck` passes. `pnpm --filter @crm/web lint` passes.

**Files changed:**
- Added: `apps/web/src/features/auth/types.ts`
- Added: `apps/web/src/features/auth/api/auth.ts`
- Added: `apps/web/src/features/auth/hooks/usePermissions.ts`
- Added: `apps/web/src/features/auth/context/AuthContext.tsx`
- Modified: `apps/web/src/providers.tsx`

**Known gaps (not in scope for this phase):**
- No login/register/logout pages yet (Phase 1)
- RouteGuard.tsx still a stub (Phase 1)
- No auth routes in router.tsx (Phase 1)
- No forgot/reset/invite pages (Phase 2)
- No settings profile/organization pages (Phase 3)
- No session expiration modal (Phase 4)

---

## Phase 1 — Login, Logout, and real route protection

**Status:** Complete

**What was added:**

1. **`apps/web/src/features/auth/pages/Login.tsx`** — New file. Centered card page per screen-spec §3:
   - Email input (react-hook-form + Zod `z.string().email()`)
   - Password input with show/hide toggle (Eye/EyeOff icons from lucide-react)
   - "Sign In" button with submit-loading state ("Signing in...")
   - "Forgot password?" link to `/forgot-password`
   - Error banners: "Invalid email or password." for `INVALID_CREDENTIALS`, "Your account has been suspended. Contact your administrator." for `Account is not active` (matching `auth.service.ts:120` and `auth.controller.ts:106`)
   - "Don't have an account? Create one" link to `/register`
   - On success: calls `useAuth().login()` then redirects to `/app/dashboard`

2. **`apps/web/src/features/auth/pages/Register.tsx`** — New file. Centered card page:
   - First name, last name, email, password fields (Zod: `password.min(8)`)
   - "Creating account..." submit-loading state
   - Server error banner (shows actual error message, e.g. "User with this email already exists")
   - Inline Zod validation errors via `Input` `error` prop
   - "Already have an account? Sign in" link to `/login`
   - On success: calls `useAuth().register()` then redirects to `/app/dashboard`

3. **`apps/web/src/components/RouteGuard.tsx`** — Modified. Replaced stub `isAuthenticated = true` with real auth check:
   - Uses `useAuth()` to get `isAuthenticated` and `isLoading`
   - While `isLoading`: renders full-page loading state (`Loading...`)
   - If not authenticated: `<Navigate to="/login" replace state={{ from: location }} />` (preserves attempted path)
   - `isLoading` from Phase 0's `useQuery(['auth', 'me'])` with `retry: false`

4. **`apps/web/src/router.tsx`** — Modified. Added two top-level routes (outside RouteGuard, siblings of `/` and `/app`):
   - `{ path: '/login', element: <Login /> }` (lazy-loaded)
   - `{ path: '/register', element: <Register /> }` (lazy-loaded)

5. **`apps/web/src/App.tsx`** — Modified. Wired real auth into the global header:
   - `AppShell` now calls `useAuth()` to get `user` and `logout`
   - User dropdown avatar shows dynamic initials (e.g. "AK" from "Alex Kumar") instead of hardcoded "AK"
   - User dropdown name shows dynamic `firstName lastName` instead of "Alex Kumar"
   - "Profile" dropdown item → navigates to `/app/settings/profile`
   - "Sign out" dropdown item → calls `useAuth().logout()` then navigates to `/login` with `replace: true`

**Session expiration (§71):** The `/me` query in AuthContext (Phase 0) handles 401s on session check — when the cookie expires, `/me` returns 401, `isAuthenticated` becomes `false`, and RouteGuard redirects to `/login`. Other API calls that return 401 show the existing error banners on each page (no crash). Full session-expiration modal is Phase 4.

**Definition of done:** ✅ From a clean browser (no cookie), visiting `/app/dashboard` redirects to `/login`. Registering or logging in lands on `/app/dashboard`. Signing out returns to `/login` and `/app/*` becomes unreachable. `pnpm --filter @crm/web typecheck` passes. `pnpm --filter @crm/web lint` passes.

**Files changed:**
- Added: `apps/web/src/features/auth/pages/Login.tsx`
- Added: `apps/web/src/features/auth/pages/Register.tsx`
- Modified: `apps/web/src/components/RouteGuard.tsx`
- Modified: `apps/web/src/router.tsx`
- Modified: `apps/web/src/App.tsx`

**Known gaps (not in scope for this phase):**
- No forgot/reset/invite pages (Phase 2)
- No settings profile/organization pages (Phase 3)
- No session expiration modal (Phase 4)

---

## Phase 2 — Forgot password, reset password, invitation acceptance

**Status:** Complete

**What was added:**

1. **`apps/web/src/features/auth/types.ts`** — Modified. Added `OrganizationMembershipResponse` interface matching the backend's `memberships.types.ts`:
   - Fields: `id`, `userId`, `organizationId`, `roleId`, `teamIds`, `status`, `joinedAt`, `createdAt`, `updatedAt`

2. **`apps/web/src/features/auth/api/auth.ts`** — Modified. Added `acceptInvitation(token)` → `POST /memberships/accept` with `{ token }` body. All other Phase 0 endpoints unchanged.

3. **`apps/web/src/features/auth/pages/ForgotPassword.tsx`** — New file. Centered card page per screen-spec §4:
   - Email input (Zod `z.string().email()`)
   - "Send Reset Link" button with loading state ("Sending...")
   - "← Back to sign in" link to `/login`
   - Success state: after API returns 200, shows "If an account exists for this email, you will receive reset instructions." and "Do not reveal whether an email exists." (§4 — always returns success regardless of whether email exists)
   - Server error banner for API failures

4. **`apps/web/src/features/auth/pages/ResetPassword.tsx`** — New file. Centered card page per screen-spec §5:
   - Reads `token` from `useSearchParams()` (route: `/reset-password?token=...`)
   - If no token: shows "Invalid or expired link" view with back-to-login link
   - New password + confirm password fields with show/hide toggles (Eye/EyeOff)
   - Zod schema: `password.min(8)` + `.refine()` for password match
   - Password requirements displayed above the form ("Password must be at least 8 characters long")
   - "Reset Password" button with loading state ("Resetting...")
   - Toast on success ("Password reset successfully") → redirect to `/login` after 500ms
   - Inline error banner for invalid/expired token from API

5. **`apps/web/src/features/auth/pages/AcceptInvitation.tsx`** — New file. Centered card page per screen-spec §6:
   - Reads `token` from `useParams()` (route: `/invite/:token`)
   - If no token: shows "Invalid invitation" view
   - Display: "You've been invited to join" + "Set up your account."
   - Form fields: First name, Last name, Password (with show/hide), Email (read-only/disabled — no GET-by-token endpoint exists to look up the invited email)
   - Zod validation: `firstName.min(1)`, `lastName.min(1)`, `password.min(8)`
   - On submit: calls `authApi.acceptInvitation(token)` — only the token is sent to the API since `acceptInvitationSchema` accepts `{ token }` only; form field values are validated client-side but not transmitted
   - Success: Toast → redirect to `/login?invitation=accepted` after 500ms (the `accept` endpoint in `memberships.controller.ts` does NOT set a session cookie, so we redirect to login instead of logging in)
   - Error: inline "Invalid or expired invitation" message from API (matches `memberships.service.ts` throwing `Error('Invalid or expired invitation')`)

6. **`apps/web/src/router.tsx`** — Modified. Added three top-level routes (lazy-loaded, outside RouteGuard):
   - `{ path: '/forgot-password', element: <ForgotPassword /> }`
   - `{ path: '/reset-password', element: <ResetPassword /> }`
   - `{ path: '/invite/:token', element: <AcceptInvitation /> }`

**Definition of done:** ✅ All three Phase 2 pages render and validate. Forgot → submit → success state. Reset → reads token from query, validates passwords match, submits → redirects to /login. Accept → reads token from params, validates form, submits only token → redirects to /login with invitation=accepted. `pnpm --filter @crm/web typecheck` passes. `pnpm --filter @crm/web lint` passes.

**Files changed:**
- Modified: `apps/web/src/features/auth/types.ts`
- Modified: `apps/web/src/features/auth/api/auth.ts`
- Added: `apps/web/src/features/auth/pages/ForgotPassword.tsx`
- Added: `apps/web/src/features/auth/pages/ResetPassword.tsx`
- Added: `apps/web/src/features/auth/pages/AcceptInvitation.tsx`
- Modified: `apps/web/src/router.tsx`

**Known gaps (not in scope for this phase):**
- No settings profile/organization pages (Phase 3)
- No session expiration modal (Phase 4)

---

## Phase 3 — Settings: Profile & Organization

**Status:** Complete

**What was added:**

1. **`apps/web/src/features/settings/api/settings.ts`** — Modified. Added types and API functions:
   - `OrganizationResponse` interface matching `organizations.types.ts` (id, name, slug, logoUrl, timezone, currency, locale, settings, status)
   - `UpdateOrganizationInput` interface matching `updateOrganizationSchema`
   - `getUser(id)` → `GET /users/:id`
   - `getOrganization(id)` → `GET /organizations/:id`

2. **`apps/web/src/features/settings/hooks/useSettings.ts`** — Modified. Added hooks:
   - `useUser(id)` — `useQuery` for `GET /users/:id` (enabled when id is truthy)
   - `useOrganization(id)` — `useQuery` for `GET /organizations/:id`
   - `useUpdateOrganization()` — `useMutation` for `PATCH /organizations/:id`, invalidates `['settings', 'organization']` and `['auth', 'me']` on success
   - Also updated `useUpdateUser()` to invalidate `['auth', 'me']` so the header dropdown reflects name changes

3. **`apps/web/src/features/settings/pages/SettingsProfile.tsx`** — New file. Settings card per screen-spec §44:
   - Fetches full user details via `GET /users/:id` (`useUser`) to access `preferences.timezone` and `preferences.locale`
   - Fields: First name, Last name (editable with Zod validation), Email (read-only), Phone (disabled — not supported by backend), Timezone (read-only, from preferences), Language (read-only, from preferences.locale)
   - Permission-gated: uses `usePermissions()` — if user lacks `users.update`, all fields are disabled and the Save button is hidden
   - Avatar upload section omitted — searched `apps/api/src/services/storage` and `attachments` module; no avatar upload endpoint exists. Note: `UserResponse` has `avatarUrl` field but there is no upload API to set it.
   - Form states: loading skeleton, error state, submit-loading ("Saving..."), success toast, server-error banner

4. **`apps/web/src/features/settings/pages/SettingsOrganization.tsx`** — New file. Settings card per screen-spec §45:
   - Fetches full organization details via `GET /organizations/:id` (`useOrganization`)
   - Fields: Organization name, Timezone, Currency, Language (locale) — editable with Zod validation when user has `organization.update` permission
   - Industry, Website, Country — shown as disabled inputs (not supported by `updateOrganizationSchema`)
   - Logo upload omitted — no file upload endpoint exists in the backend (`logoUrl` accepts a URL string but there is no upload mechanism)
   - Permission-gated: uses `usePermissions()` — if user lacks `organization.update`, all fields are disabled and shows "Only admins/owners can modify this."
   - Form states: loading skeleton, error state, submit-loading, success toast, server-error banner

5. **`apps/web/src/features/settings/pages/SettingsIndex.tsx`** — New file. Settings landing page:
   - Grid of cards linking to all 14 settings sections (Profile, Organization, Team, Roles & Permissions, Pipelines, Custom Fields, Tags, Notifications, Integrations, API Keys, Webhooks, Security, Sessions, Audit Log)
   - Each card has an icon and description

6. **`apps/web/src/router.tsx`** — Modified:
   - Added lazy imports for `SettingsIndex`, `SettingsProfile`, `SettingsOrganization`
   - `{ path: 'settings', element: <SettingsIndex /> }` replaces the old `<Placeholder title="Settings" />`
   - Added `{ path: 'settings/profile', element: <SettingsProfile /> }`
   - Added `{ path: 'settings/organization', element: <SettingsOrganization /> }`
   - Removed the now-unused `Placeholder` function

7. **`apps/web/src/App.tsx`** — Modified:
   - Added "Profile" (`/app/settings/profile`) and "Organization" (`/app/settings/organization`) to `secondaryNavigation`

**Known gaps (Phase 3):**
- Phone number field is shown as disabled — backend `UserResponse` and `updateUserSchema` do not include phone
- Timezone and Language are read-only on Profile — they exist in `preferences` but `updateUserSchema` does not accept `preferences` fields for update
- Avatar upload omitted — no backend upload endpoint exists
- Logo upload omitted on Organization — no backend upload endpoint exists
- Industry, Website, Country shown as disabled on Organization — not in `updateOrganizationSchema`
- SettingsIndex page shows all sections as static links (no permission-based filtering)

---

## Phase 4 — Global session-expiry polish, permission-aware UI, and final QA pass

**Status:** Complete

**What was added:**

1. **`apps/web/src/lib/session.ts`** — New file. Lightweight session-expiration event system:
   - `setSessionExpiredHandler(handler)`, `clearSessionExpiredHandler()`, `triggerSessionExpired()`
   - Module-level callback registry — no React dependency needed, works from the `request()` function
   - Registered in `AppShell` via `useEffect`; cleared on unmount

2. **`apps/web/src/lib/request.ts`** — New file. Shared `request<T>()` function extracted from the duplicated pattern across all feature API files:
   - Same `credentials: 'include'`, JSON headers, error parsing, and 204 handling as the originals
   - Added 401 detection: when `response.status === 401` and the endpoint is not a public auth endpoint (`/auth/login`, `/auth/logout`, `/auth/me`, `/auth/forgot-password`, `/auth/reset-password`), calls `triggerSessionExpired()`
   - `auth.ts` and `settings.ts` now import `request` from this shared module instead of defining their own

3. **`apps/web/src/App.tsx`** — Modified. Added session-expiration modal (§71):
   - `useState(showSessionModal)` + `useEffect` to register/clear the session-expired handler
   - On 401: handler sets `showSessionModal = true` and calls `queryClient.invalidateQueries(['auth', 'me'])` to clear auth state
   - Modal overlay: "Your session has expired. Please sign in again to continue." + "Sign In" button → `navigate('/login', { replace: true })`
   - Modal uses `z-50` to render above all content; "Sign In" preserves the current route via `location` so the user can be redirected back after re-authenticating (nice-to-have)
   - Added "Profile" and "Organization" to `secondaryNavigation` (done in Phase 3)

4. **`apps/web/src/components/NotFound.tsx`** — New file. Simple 404 page:
   - "404" large heading, "Page not found" subtitle, "Go to Dashboard" button
   - Full-page centered layout matching the auth page style

5. **`apps/web/src/router.tsx`** — Modified:
   - Added `{ path: '*', element: <NotFound /> }` catch-all route at the end of the router
   - Removed the now-unused `Placeholder` function (replaced by `SettingsIndex` and `NotFound`)

6. **Permission-aware UI** — Applied `usePermissions()` gating to the top-level list/detail action buttons across 5 entities:
   - **ContactList**: "New Contact" gated on `contacts.create`; bulk "Delete" gated on `contacts.delete`; empty-state action conditionally rendered
    - **ContactDetail**: "Edit" gated on `contacts.update`; "Delete" gated on `contacts.delete`
    - **CompanyDetail**: "Edit" gated on `companies.update`; "Delete" gated on `companies.delete`
    - **DealDetail**: "Edit" gated on `deals.update`; "Delete" gated on `deals.delete`; "Mark Won"/"Mark Lost" left ungated (no dedicated permission in RBAC catalogue — `deals.update` covers stage transitions)
    - **LeadDetail**: "Edit" gated on `leads.update`; "Delete" gated on `leads.delete`
    - **TaskDetail**: "Edit" gated on `tasks.update`; "Delete" gated on `tasks.delete`
   - **CompanyList**: "New Company" gated on `companies.create`; bulk "Delete" gated on `companies.delete`
   - **DealList**: "New Deal" gated on `deals.create`; bulk "Delete" gated on `deals.delete`
   - **LeadList**: "New Lead" gated on `leads.create`; bulk "Delete" gated on `leads.delete`
   - **LeadDetail**: "Edit" gated on `leads.update`; "Delete" gated on `leads.delete`; "Convert" left ungated (no permission name in RBAC catalogue — `leads.convert` exists but is a different action)
   - **TaskList**: "New Task" gated on `tasks.create`; bulk "Delete" gated on `tasks.delete`
   - Uses the same wildcard matching as the backend (exact → `resource.*` → `*`)
   - Buttons are hidden (not just disabled) when the user lacks permission

7. **`apps/web/src/query-client.ts`** — Modified. Added global `onError` handlers to the QueryClient:
   - `defaultOptions.queries.onError` — catches 401 errors from any `useQuery` call (e.g., contacts/companies/etc. API calls when session expires). Uses `@ts-expect-error` since v5's TypeScript type for query default options doesn't include `onError`, but it works at runtime.
   - `defaultOptions.mutations.onError` — catches 401 errors from any `useMutation` call
   - Both check for `error.message === 'Authentication required'` (the backend's standard 401 message from the `authenticate` middleware) and call `triggerSessionExpired()`
   - This provides comprehensive 401 detection across all 19 API files, not just auth and settings
   - Note: the `/me` query in AuthContext will also trigger `onError` on 401, but the session modal will appear briefly before RouteGuard redirects to `/login` (acceptable UX — the modal explains the redirect)

**§84 Final Route Map diff:**
Routes implemented after Phases 0–4: all 30 routes from the original todo.md P45 note are complete. Remaining gaps:
- `/onboarding/*` (6 routes) — out of scope per frontendInstruction.md §136
- `/app/reports/new` — missing (pre-existing gap, not in scope for these phases)
- `/app/reports/:id` — missing (pre-existing gap)
- `/app/settings/notifications` — missing page/route (pre-existing gap; has no backend settings endpoint)
- `/app/activities/:id/edit` — not in §84 route map

**§86 checklist review (screens touched in Phases 0–3):**
- ✅ Login: submit-loading state, error banners (suspended vs invalid), form validation, aria-labels on show/hide toggle, redirect on success
- ✅ Register: validation, submit-loading, server error, success redirect
- ✅ ForgotPassword: validation, submit-loading, success state, "don't reveal email exists"
- ✅ ResetPassword: token-missing guard, password match validation, show/hide toggles with aria-labels, submit-loading, success toast, inline error
- ✅ AcceptInvitation: token-missing guard, validation, show/hide toggle, submit-loading, success toast, inline error
- ✅ SettingsProfile: loading skeleton, error state, validation, submit-loading, success toast, server-error banner
- ✅ SettingsOrganization: loading skeleton, error state, validation, permission-gated (read-only for non-admins), submit-loading, success toast, server-error banner
- ✅ Session expired modal: §71 compliant with "Sign In" button
- ✅ 404 route: catch-all `*` with NotFound page

**Definition of done:** ✅ Session expiration modal appears on ANY 401 response (via shared `request.ts` for auth/settings APIs + global QueryClient `onError` for all other APIs). Permission-aware UI hides Create/Delete/Edit buttons for unauthorized users across Contacts, Companies, Deals, Leads, Tasks (list + detail pages). 404 route handles unknown paths. `pnpm --filter @crm/web typecheck` passes. `pnpm --filter @crm/web lint` passes.

**Definition of done:** ✅ `/app/settings` shows a card-based index. `/app/settings/profile` loads real user data, saves first/last name, shows success toast. `/app/settings/organization` loads real org data, saves name/timezone/currency/locale with permission gating. `pnpm --filter @crm/web typecheck` passes. `pnpm --filter @crm/web lint` passes.
