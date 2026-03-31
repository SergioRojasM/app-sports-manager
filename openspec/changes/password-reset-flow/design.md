## Context

The application uses Supabase Auth with the PKCE flow (`@supabase/ssr`). An existing `/auth/callback` route already handles `?code=` → session exchange and supports an arbitrary `?next=` redirect path. The `authService` in `src/services/supabase/auth.ts` is a plain object with browser-client methods. The `useAuth` hook wraps that service and exposes auth operations to client components. All auth pages follow a two-panel layout (left benefits panel + right card).

The "¿Olvidaste tu contraseña?" link already exists in `LoginForm.tsx` pointing to `/auth/forgot-password` — the route just doesn't exist yet.

## Goals / Non-Goals

**Goals:**
- Implement a two-screen self-service password reset: email request → email link → new password form.
- Reuse the existing PKCE callback route (`/auth/callback`) untouched.
- Reuse existing auth layout components (`LoginBenefitsPanel`, `LoginCard`).
- Stay consistent with existing `authService` and `useAuth` patterns.
- Show a one-time success banner on the login page after a successful reset.

**Non-Goals:**
- Custom Supabase email templates.
- Password strength indicators beyond a 6-character minimum.
- Admin-initiated resets.
- Social/OAuth password reset paths.
- Server actions — all auth calls remain client-side (browser client only).

## Decisions

### Decision 1: Reuse existing `/auth/callback` route
The PKCE callback already exchanges a `?code=` for a session and redirects to `?next=`. By passing `redirectTo: origin + '/auth/callback?next=/auth/update-password'` in `resetPasswordForEmail()`, the reset link from Supabase lands in the existing handler with zero code changes. **Alternative considered**: a dedicated `/auth/password-reset-callback` route — rejected as unnecessary duplication.

### Decision 2: Server-side session guard on `/auth/update-password`
The update-password page is a **server component** that calls `createClient()` (server) and checks for a session before rendering. If absent, it performs a server-side `redirect('/auth/forgot-password')`. **Alternative considered**: client-side session check — rejected because it would flash the form to unauthenticated users before redirecting.

### Decision 3: `authService` extended, not a new file
`resetPasswordForEmail` and `updatePassword` are added to the existing `authService` object following the same pattern. A separate `passwordResetService` was considered but rejected — the feature touches no new domain boundary and keeping it co-located simplifies imports.

### Decision 4: No user enumeration on forgot-password
The forgot-password form always shows the success state after submit, regardless of whether the email exists. This is intentional to prevent user enumeration. Supabase itself does not return an error for non-existent emails in `resetPasswordForEmail`.

### Decision 5: `?reset=success` param for post-reset login banner
After `updateUser` succeeds, the client redirects to `/auth/login?reset=success`. `LoginForm` reads this via `useSearchParams()` and shows a dismissible banner. The banner clears on first user input. **Alternative considered**: a React context/state — rejected because it doesn't survive the navigation to `/auth/login`.

## Risks / Trade-offs

- **[Risk] Reset link valid once**: The PKCE code is single-use. If the user clicks the email link twice the second attempt will hit `/auth/callback` with an invalid code and be redirected to `/auth/login`. → Mitigation: user is redirected to `/auth/login`, not an error page; they can request a new reset link.
- **[Risk] Session cookie after reset**: After `updateUser`, the user remains logged in. Redirecting to `/auth/login` with `?reset=success` means the session is still active; they can navigate away without re-authenticating. → Acceptable trade-off: standard expected behavior in most password-reset flows.
- **[Risk] Supabase email delays**: In production, reset emails may arrive with delay. → Mitigation: success message copy says "Revisa tu correo electrónico" without implying immediacy.

## Migration Plan

No database migrations. Deploy is straightforward — new routes are additive. No rollback steps needed; removing the two new pages restores the previous state.

## Open Questions

None — all decisions are covered by the User Story and existing codebase patterns.
