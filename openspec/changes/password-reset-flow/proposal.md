## Why

The login page already has a "¿Olvidaste tu contraseña?" link pointing to `/auth/forgot-password`, but that route does not exist. Users who forget their password have no self-service recovery path and must contact an administrator, creating friction and support overhead.

## What Changes

- Add `/auth/forgot-password` page: email input form that triggers `supabase.auth.resetPasswordForEmail()`, redirecting through the existing PKCE callback to a new update-password page.
- Add `/auth/update-password` page: server-guarded page (redirects to forgot-password if no session) with a password + confirm-password form that calls `supabase.auth.updateUser({ password })`.
- Add `resetPasswordForEmail(email)` and `updatePassword(password)` methods to `authService` in `src/services/supabase/auth.ts`.
- Expose `resetPassword(email)` and `updatePassword(password)` from the `useAuth` hook.
- Enhance `LoginForm` to read a `?reset=success` query param and display a one-time success banner.

## Non-goals

- Social/OAuth password reset flows.
- Admin-initiated password resets.
- Password strength meters or complexity rules beyond a 6-character minimum (Supabase default).
- Custom email templates (uses Supabase default email template).

## Capabilities

### New Capabilities
- `password-reset-flow`: Covers the two-step password reset user journey: email request form, Supabase email delivery via PKCE, and server-guarded update-password form.

### Modified Capabilities
- `login-page-redesign`: The login form gains a `?reset=success` success banner — a minor additive UI change to an existing capability.

## Impact

- **New files**: `src/components/auth/ForgotPasswordForm.tsx`, `src/components/auth/UpdatePasswordForm.tsx`, `src/app/auth/forgot-password/page.tsx`, `src/app/auth/update-password/page.tsx`
- **Modified files**: `src/services/supabase/auth.ts`, `src/hooks/auth/useAuth.ts`, `src/components/auth/LoginForm.tsx`
- **No database migrations** required — handled entirely by Supabase Auth.
- **No new dependencies** — uses existing `@supabase/ssr` and `@supabase/supabase-js`.
- The existing `/auth/callback` route handles the PKCE code exchange without modification.
