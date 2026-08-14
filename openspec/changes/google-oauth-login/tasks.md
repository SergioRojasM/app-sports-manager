## 1. Branch Setup

- [x] 1.1 Create a new branch `feat/google-oauth-login` from the current base branch
- [x] 1.2 Verify the working branch is not `main`, `master`, or `develop` before making any changes

## 2. Database Migration

- [x] 2.1 Create `supabase/migrations/<timestamp>_google_oauth_profile_metadata_mapping.sql` with `create or replace function public.handle_new_auth_user()`, widening the `nombre`/`foto_url` resolution to `coalesce` across the existing keys (`nombre`, `foto_url`) and Google's OAuth keys (`full_name`/`name`, `avatar_url`/`picture`), keeping the existing keys first in each `coalesce` chain
- [x] 2.2 Apply the migration to the **local** Supabase instance only (e.g. `npx supabase db reset` or the project's local migration workflow) — do not push to the remote/hosted project
- [x] 2.3 Verify locally (Supabase Studio or SQL) that the updated `on conflict (id) do update` clause still preserves existing non-null `nombre`/`foto_url` values on repeat trigger runs

## 3. Service Layer

- [x] 3.1 Add `signInWithOAuth(next?: string)` to `authService` in `src/services/supabase/auth.ts`, mirroring `signUpWithPassword`'s `redirectTo` construction and calling `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`, returning `{ errorMessage }`

## 4. Hook Layer

- [x] 4.1 Expose `signInWithGoogle` from `useAuth()` in `src/hooks/auth/useAuth.ts`, wrapping `authService.signInWithOAuth` and setting `errorMessage` state on failure, following the existing `resetPassword`/`updatePassword` wrapper pattern

## 5. UI Components

- [x] 5.1 Add an inline Google "G" SVG icon and a "Continuar con Google" button under the existing divider in `src/components/auth/LoginForm.tsx`, styled with the existing button/input class patterns, calling `signInWithGoogle(nextPath)` on click with a disabled/loading state while the redirect is pending
- [x] 5.2 Add the same button to `src/components/auth/SignupForm.tsx`, passing through its `nextPath` prop the same way `signUp` already does
- [x] 5.3 Ensure `errorMessage` from `signInWithGoogle` renders in the existing `role="alert"` error banner on both forms, and the button returns to its enabled state after a failure

## 6. External Configuration (manual, non-code prerequisite)

- [ ] 6.1 Create Google Cloud OAuth 2.0 credentials (consent screen + Web application Client ID/Secret) with redirect URI `https://<project-ref>.supabase.co/auth/v1/callback`
- [ ] 6.2 Enable the Google provider with those credentials in the local/dev Supabase project's Dashboard → Authentication → Providers

## 7. Manual Verification

- [ ] 7.1 Test a brand-new Google user via `/auth/signup`: lands authenticated on the expected destination, `public.usuarios.nombre`/`foto_url` populated from Google metadata
- [ ] 7.2 Test an existing Google user via `/auth/login`: lands authenticated on the expected destination
- [ ] 7.3 Test that an existing password-based user's `nombre`/`foto_url` are not cleared after any subsequent login
- [ ] 7.4 Test that a guided-booking `next` param (via `buildGuidedNextPath`) survives the full Google OAuth round trip to the correct destination
- [ ] 7.5 Regression-test existing email/password flows (`signIn`, `signUp`, `resetPassword`, `updatePassword`) to confirm no behavior change

## 8. Documentation

- [x] 8.1 Update `projectspec/03-project-structure.md` entries for `src/services/supabase/auth.ts` and `src/hooks/auth/useAuth.ts` to mention the new OAuth method/wrapper, if those inline doc comments need refreshing

## 9. Finalize

- [x] 9.1 Run typecheck, lint, and tests (do not run build)
- [x] 9.2 Write the commit message and pull request description summarizing the change
