# US-0050 — Password Reset Flow

## ID
US-0050

## Name
Password Reset Flow (Forgot Password + Update Password)

## As a
Registered user (any role: athlete, coach, admin)

## I Want
To reset my password via email when I have forgotten it, by receiving a secure link that lets me set a new password

## So That
I can regain access to my account without requiring manual intervention from an administrator

---

## Description

### Current State
The login page (`/auth/login`) already has a "¿Olvidaste tu contraseña?" link pointing to `/auth/forgot-password`, but that route does not exist. There is no password reset flow implemented anywhere in the application. Users who forget their password have no self-service way to recover access.

### Proposed Changes

#### Two-step reset flow

**Step 1 — Request reset (`/auth/forgot-password`)**
- A new page renders an email input form.
- The user submits their email address. The app calls `supabase.auth.resetPasswordForEmail()` with a `redirectTo` pointing to the existing `/auth/callback` route with `next=/auth/update-password`.
- Regardless of whether the email exists (to prevent user enumeration), the form transitions to a success state: "Revisa tu correo electrónico. Te enviamos un enlace para restablecer tu contraseña." The submit button is disabled after success.
- If Supabase returns an error (e.g., rate limit), the error is displayed inline.

**Step 2 — Set new password (`/auth/update-password`)**
- Supabase sends an email with a magic link. Clicking it hits `/auth/callback?code=<pkce_code>&next=/auth/update-password`.
- The existing callback route exchanges the code for a session and redirects to `/auth/update-password`.
- The update-password page is a **server component** that checks for an active session using the server Supabase client. If no session is found, it redirects to `/auth/forgot-password`.
- The update-password form has two fields: `Nueva contraseña` and `Confirmar contraseña`.
- Client-side validation: both fields required, passwords must match, minimum 6 characters.
- On success, calls `supabase.auth.updateUser({ password })`. On success, redirects to `/auth/login` with a success message passed via query param `?reset=success`.
- On error, displays inline error message.

#### Login page enhancement
- `/auth/login` reads the `?reset=success` query param and, if present, shows a success banner: "Contraseña actualizada correctamente. Inicia sesión con tu nueva contraseña." This message disappears after the user interacts with the form.

#### Visual design
- Both new pages reuse the existing auth layout: `LoginBenefitsPanel` (left panel) + `LoginCard` (right card wrapper), identical to `/auth/login` and `/auth/signup`.
- Form fields and buttons reuse the same Tailwind class patterns used in `LoginForm.tsx` and `SignupForm.tsx` (dark glass card, `bg-navy-deep` inputs, `text-turquoise` accents).

---

## Database Changes
None. Password reset is handled entirely by Supabase Auth. No custom tables or migrations are required.

---

## API / Server Actions

### `authService.resetPasswordForEmail(email: string)`
- **File**: `src/services/supabase/auth.ts`
- **Input**: `email: string`
- **Return**: `{ errorMessage: string | null }`
- **Implementation**: calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/auth/callback?next=/auth/update-password' })`
- **Auth**: public — no session required

### `authService.updatePassword(password: string)`
- **File**: `src/services/supabase/auth.ts`
- **Input**: `password: string`
- **Return**: `{ errorMessage: string | null }`
- **Implementation**: calls `supabase.auth.updateUser({ password })`
- **Auth**: requires active session (enforced by the page-level session guard)

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Service | `src/services/supabase/auth.ts` | Add `resetPasswordForEmail(email)` and `updatePassword(password)` methods |
| Hook | `src/hooks/auth/useAuth.ts` | Expose `resetPassword(email)` and `updatePassword(password)` with same pattern as existing `signIn`/`signUp` |
| Component | `src/components/auth/ForgotPasswordForm.tsx` | New client component: email input → success state or inline error |
| Component | `src/components/auth/UpdatePasswordForm.tsx` | New client component: password + confirmPassword fields → `router.push('/auth/login?reset=success')` on success |
| Page | `src/app/auth/forgot-password/page.tsx` | New server component: `LoginBenefitsPanel` + `LoginCard` + `ForgotPasswordForm` |
| Page | `src/app/auth/update-password/page.tsx` | New server component: session guard (redirect to `/auth/forgot-password` if no session) + `LoginBenefitsPanel` + `LoginCard` + `UpdatePasswordForm` |
| Component | `src/components/auth/LoginForm.tsx` | Read `?reset=success` query param (via `useSearchParams`) and show success banner — remove banner on any user input |

---

## Acceptance Criteria

1. Navigating to `/auth/forgot-password` renders the page without errors.
2. Submitting a valid email address on the forgot-password form shows the success message and disables the submit button; no redirect occurs.
3. Submitting an invalid email format is blocked by HTML5 `type="email"` validation.
4. The success message is shown for both existing and non-existing email addresses (no user enumeration).
5. A Supabase rate-limit or other service error is displayed as an inline error message below the form (not an alert dialog).
6. The email sent by Supabase contains a link that resolves to `/auth/callback?code=...&next=/auth/update-password`.
7. Clicking the email link successfully exchanges the code for a session and redirects to `/auth/update-password`.
8. Accessing `/auth/update-password` directly (without a valid session) redirects the user to `/auth/forgot-password`.
9. On the update-password page, submitting with both password fields empty shows a required-field error.
10. Submitting with mismatched passwords shows the error "Las contraseñas no coinciden."
11. Submitting with a password shorter than 6 characters shows the error "La contraseña debe tener al menos 6 caracteres."
12. Submitting a valid new password successfully calls `supabase.auth.updateUser` and redirects to `/auth/login?reset=success`.
13. The login page at `/auth/login?reset=success` shows a success banner "Contraseña actualizada correctamente. Inicia sesión con tu nueva contraseña."
14. The success banner on the login page disappears once the user starts typing in any input field.
15. After completing the reset flow, the user can log in with the new password.
16. The "¿Olvidaste tu contraseña?" link in `LoginForm.tsx` continues to point to `/auth/forgot-password` without modification (it already exists).

---

## Implementation Steps

- [ ] Add `resetPasswordForEmail(email)` to `src/services/supabase/auth.ts`
- [ ] Add `updatePassword(password)` to `src/services/supabase/auth.ts`
- [ ] Expose `resetPassword(email)` in `src/hooks/auth/useAuth.ts`
- [ ] Expose `updatePassword(password)` in `src/hooks/auth/useAuth.ts`
- [ ] Create `src/components/auth/ForgotPasswordForm.tsx`
- [ ] Create `src/components/auth/UpdatePasswordForm.tsx`
- [ ] Create `src/app/auth/forgot-password/page.tsx`
- [ ] Create `src/app/auth/update-password/page.tsx`
- [ ] Update `src/components/auth/LoginForm.tsx` to read `?reset=success` and show banner
- [ ] Test manually: happy path (submit email → receive email → set new password → login)
- [ ] Test edge case: visit `/auth/update-password` without session → redirect to forgot-password
- [ ] Test edge case: mismatched passwords → inline error
- [ ] Test edge case: password too short → inline error
- [ ] Test edge case: confirm success banner appears on login page and disappears on input
- [ ] Verify locally using Supabase inbucket at `http://127.0.0.1:54324` to inspect the reset email

---

## Non-Functional Requirements

- **Security**:
  - The forgot-password endpoint must not reveal whether an email address is registered (always show success state).
  - The update-password page performs a server-side session check before rendering; unauthenticated requests are redirected server-side, not client-side, preventing flash of content.
  - Password input fields use `type="password"` to prevent shoulder surfing.
  - The PKCE flow (handled by existing `/auth/callback` route) ensures the reset link is single-use and tied to the device that initiated the request.
- **Performance**: No new database queries or indexes required.
- **Accessibility**:
  - All form fields have associated `<label>` elements with `htmlFor`.
  - Error messages use `role="alert"` so screen readers announce them immediately.
  - The success banner on the login page uses `role="status"`.
  - Submit buttons reflect loading state (`disabled` + loading text) to prevent double-submit.
- **Error handling**:
  - Service-layer errors surface as inline messages within the form (same `rounded-lg border border-red-500/60 bg-red-950/40` pattern used in existing auth forms).
  - Auth hook errors are surfaced identically to the pattern in `SignupForm.tsx` (merge `formErrorMessage ?? authErrorMessage` via `useMemo`).
