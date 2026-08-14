## Why

`/auth/login` and `/auth/signup` already render an unused "O continúa con" divider with no social login option beneath it. Email/password is the only way to authenticate today, which adds friction (users must create and remember a new password) even though the underlying Supabase client setup (`@supabase/ssr`, provider-agnostic callback route, session-refreshing middleware) already supports OAuth without modification.

## What Changes

- Add `signInWithOAuth` to `authService` (`src/services/supabase/auth.ts`), calling `supabase.auth.signInWithOAuth({ provider: 'google', ... })` with the same `redirectTo`/`next` pattern already used by `signUpWithPassword`.
- Expose `signInWithGoogle` from `useAuth()` (`src/hooks/auth/useAuth.ts`).
- Render a functioning "Continuar con Google" button under the existing divider in `LoginForm.tsx` and `SignupForm.tsx`, reusing existing input/button styling.
- Widen the `handle_new_auth_user()` Postgres trigger (new migration) so a first-time Google sign-in also populates `public.usuarios.nombre`/`foto_url` from Google's metadata keys (`full_name`/`name`, `avatar_url`/`picture`), coalesced alongside the existing keys the password flow uses.
- No changes to `/auth/callback/route.ts`, `middleware.ts`, or `/portal/bootstrap/route.ts` — all already provider-agnostic.

## Capabilities

### New Capabilities
- `google-oauth-login`: OAuth sign-in/sign-up via Google through Supabase Auth — covers the `signInWithOAuth` service/hook contract, the login/signup button behavior and redirect-preservation semantics, and the profile-metadata mapping for auto-provisioned Google users.

### Modified Capabilities
(none — `login-page-redesign` and `signup-page` already specify the "Or continue with" divider as a static element; this change makes it functional without altering their existing requirements)

## Impact

- **Code**: `src/services/supabase/auth.ts`, `src/hooks/auth/useAuth.ts`, `src/components/auth/LoginForm.tsx`, `src/components/auth/SignupForm.tsx`.
- **Database**: one new migration widening `public.handle_new_auth_user()` (no new tables/columns/RLS policies; `on_auth_user_created` trigger binding is unchanged).
- **External configuration (non-code, required for end-to-end use)**: Google Cloud OAuth 2.0 Client ID/Secret, Google provider enabled in Supabase Dashboard. No new app-level env vars.
- **No breaking changes**: existing email/password flows (`signIn`, `signUp`, `resetPassword`, `updatePassword`) are untouched.
