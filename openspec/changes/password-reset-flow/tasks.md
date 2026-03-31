## 1. Branch Setup

- [x] 1.1 Create a new git branch: `feat/password-reset-flow`
- [x] 1.2 Verify the working branch is not `main`, `master`, or `develop`

## 2. Service Layer

- [x] 2.1 Add `resetPasswordForEmail(email: string): Promise<{ errorMessage: string | null }>` to `src/services/supabase/auth.ts` — calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/auth/callback?next=/auth/update-password' })`
- [x] 2.2 Add `updatePassword(password: string): Promise<{ errorMessage: string | null }>` to `src/services/supabase/auth.ts` — calls `supabase.auth.updateUser({ password })`

## 3. Hook

- [x] 3.1 Expose `resetPassword(email: string)` in `src/hooks/auth/useAuth.ts` — delegates to `authService.resetPasswordForEmail(email)`, follows same pattern as `signIn`/`signUp`
- [x] 3.2 Expose `updatePassword(password: string)` in `src/hooks/auth/useAuth.ts` — delegates to `authService.updatePassword(password)`

## 4. Components

- [x] 4.1 Create `src/components/auth/ForgotPasswordForm.tsx` — client component with: email input, submit button, loading state, inline error display (`role="alert"`), and a post-success state showing the confirmation message with the submit button disabled
- [x] 4.2 Create `src/components/auth/UpdatePasswordForm.tsx` — client component with: "Nueva contraseña" + "Confirmar contraseña" inputs, client-side validation (required, match, min 6 chars), inline error display (`role="alert"`), loading state, and `router.push('/auth/login?reset=success')` on success
- [x] 4.3 Update `src/components/auth/LoginForm.tsx` — read `?reset=success` query param via `useSearchParams()`, display success banner (`role="status"`) when present, clear banner on any input field change

## 5. Pages

- [x] 5.1 Create `src/app/auth/forgot-password/page.tsx` — server component that renders `LoginBenefitsPanel` + `LoginCard` wrapping `ForgotPasswordForm`
- [x] 5.2 Create `src/app/auth/update-password/page.tsx` — server component that uses `createClient()` (server) to check session; if no session calls `redirect('/auth/forgot-password')`; otherwise renders `LoginBenefitsPanel` + `LoginCard` wrapping `UpdatePasswordForm`

## 6. Manual Testing

- [ ] 6.1 Navigate to `/auth/forgot-password` — verify page renders without errors
- [ ] 6.2 Submit a valid email — verify success state appears and submit button is disabled
- [ ] 6.3 Check Supabase inbucket at `http://127.0.0.1:54324` and verify the reset email was received
- [ ] 6.4 Click the link in the email — verify redirect lands on `/auth/update-password`
- [ ] 6.5 Test mismatched passwords — verify "Las contraseñas no coinciden" error appears
- [ ] 6.6 Test password shorter than 6 chars — verify "La contraseña debe tener al menos 6 caracteres" error appears
- [ ] 6.7 Submit valid new password — verify redirect to `/auth/login?reset=success`
- [ ] 6.8 Verify success banner "Contraseña actualizada correctamente..." is visible on login page
- [ ] 6.9 Start typing in the login form — verify banner disappears
- [ ] 6.10 Login with the new password — verify authentication succeeds
- [ ] 6.11 Navigate to `/auth/update-password` directly (no session) — verify redirect to `/auth/forgot-password`

## 7. Commit and PR

- [ ] 7.1 Stage all changes and create a commit with message: `feat(auth): implement password reset flow (US-0050)`
- [ ] 7.2 Write PR description:
  - **Title**: `feat(auth): password reset flow`
  - **Summary**: Implements two-step self-service password reset using Supabase PKCE flow. Adds `/auth/forgot-password` and `/auth/update-password` pages, extends `authService` and `useAuth`, and adds a post-reset success banner to the login form.
  - **Related**: US-0050
  - **Changes**: new `ForgotPasswordForm`, `UpdatePasswordForm`, two new pages, two new `authService` methods, two new `useAuth` methods, `LoginForm` banner enhancement
  - **Testing**: all manual test cases in section 6 verified
