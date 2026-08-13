# US-0104 — Google OAuth Login

## ID
US-0104

## Name
Add "Continue with Google" login/signup via Supabase OAuth

## As a
visitor or existing user of GRIT Arena

## I Want
to sign in or sign up using my Google account instead of an email/password form

## So That
I can access the platform faster without creating and remembering a new password

---

## Description

### Current State
`LoginForm.tsx` and `SignupForm.tsx` only support email/password auth via `authService.signInWithPassword` / `authService.signUpWithPassword` (`src/services/supabase/auth.ts`). Both forms already render a visual divider ("O continúa con") below the submit button, but no social login button exists underneath it — it's an unused placeholder. The Supabase client setup (`@supabase/ssr`, browser/server clients, `middleware.ts`, and `src/app/auth/callback/route.ts`) is already provider-agnostic: `callback/route.ts` calls `supabase.auth.exchangeCodeForSession(code)`, which works identically for OAuth and email-confirmation/password-reset redirects, so it requires no changes.

New users today are provisioned by the `handle_new_auth_user()` Postgres trigger (`supabase/migrations/20260223000100_seed_inicial.sql`), which reads `nombre`, `apellido`, `telefono`, `fecha_nacimiento`, `foto_url` from `auth.users.raw_user_meta_data`. These are the keys the app itself writes on password signup (currently none are actually populated at signup time — they stay null and get filled later via `/portal/perfil`). Google's OAuth provider populates `raw_user_meta_data` under different keys (`full_name` or `name`, `avatar_url` or `picture`), which the trigger does not currently read, so a Google signup would leave `nombre`/`foto_url` null even though Google provided them.

### Proposed Changes

**Auth service**
- Add `signInWithOAuth(next?: string)` to `authService` (`src/services/supabase/auth.ts`), following the same `redirectTo` construction pattern already used in `signUpWithPassword`:
  ```ts
  async signInWithOAuth(next?: string): Promise<{ errorMessage: string | null }> {
    const supabase = createClient();
    const redirectTo = next
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`
      : `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    return { errorMessage: error ? error.message : null };
  }
  ```
  Unlike `signIn`/`signUp`, this call redirects the browser away immediately on success — there is no `user`/`session` to return synchronously; the session is established when Supabase redirects back to `/auth/callback`.

**Hook**
- Expose `signInWithGoogle` from `useAuth.ts` (`src/hooks/auth/useAuth.ts`), wrapping `authService.signInWithOAuth` and setting `errorMessage` on failure, mirroring the existing `resetPassword`/`updatePassword` wrappers.

**UI**
- In `LoginForm.tsx` and `SignupForm.tsx`, render a "Continuar con Google" button under the existing divider (`<span className="bg-navy-soft px-4 text-turquoise">O continúa con</span>`), styled consistently with the existing input/button classes (rounded-xl, border-slate-700, hover states) and an inline Google "G" SVG icon (no new dependency). On click, call `signInWithGoogle(nextPath)` (Login already derives `nextPath`; Signup receives it as an optional prop — pass it through the same way `signUp` does). Show a disabled/loading state while redirecting, and render `errorMessage` in the existing error banner if the call fails before redirecting (e.g., provider not configured, network error).

**Profile metadata mapping (DB)**
- New migration `supabase/migrations/<timestamp>_google_oauth_profile_metadata_mapping.sql` that `create or replace function public.handle_new_auth_user()` (same body as today) with `nombre` and `foto_url` resolution widened to `coalesce` across both key sets:
  - `nombre`: `coalesce(nullif(new.raw_user_meta_data ->> 'nombre', ''), nullif(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'name', ''))`
  - `foto_url`: `coalesce(nullif(new.raw_user_meta_data ->> 'foto_url', ''), nullif(new.raw_user_meta_data ->> 'avatar_url', ''), nullif(new.raw_user_meta_data ->> 'picture', ''))`
  - `apellido`, `telefono`, `fecha_nacimiento` keep reading only the existing keys (Google does not provide them); users complete these later via `/portal/perfil`, exactly as password-signup users do today.
  - Everything else in the function (tenant/role lookup, `miembros_tenant` upsert, `on conflict do update` clauses) stays unchanged.

**External configuration (not code, prerequisite for this story to work end-to-end)**
- A Google Cloud OAuth 2.0 Client ID/Secret must be created (OAuth consent screen + Web application credential, redirect URI = `https://<project-ref>.supabase.co/auth/v1/callback`), and the Google provider must be enabled with those credentials in Supabase Dashboard → Authentication → Providers. No new app-level environment variables are required — this is out of scope for code review but is a hard blocker for manual testing.

---

## Database Changes

- **Migration**: `supabase/migrations/<timestamp>_google_oauth_profile_metadata_mapping.sql`
  - `create or replace function public.handle_new_auth_user()` — widen `nombre`/`foto_url` metadata key resolution as described above. No new tables, columns, indexes, or RLS policy changes; the function keeps its existing `security definer` / `search_path = public` settings and the `on_auth_user_created` trigger is untouched (no need to re-create it, only the function body changes).

---

## API / Server Actions

No new API routes or server actions. Reuses:
- `src/app/auth/callback/route.ts` — existing `GET` handler, no changes.
- `src/app/portal/bootstrap/route.ts` — existing post-login bootstrap, no changes (already provider-agnostic).

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Service | `src/services/supabase/auth.ts` | Add `signInWithOAuth(next?: string)` |
| Hook | `src/hooks/auth/useAuth.ts` | Expose `signInWithGoogle` wrapper |
| Component | `src/components/auth/LoginForm.tsx` | Add "Continuar con Google" button under existing divider |
| Component | `src/components/auth/SignupForm.tsx` | Add "Continuar con Google" button under existing divider |
| Migration | `supabase/migrations/<timestamp>_google_oauth_profile_metadata_mapping.sql` | Widen `handle_new_auth_user()` metadata key mapping for `nombre`/`foto_url` |

---

## Acceptance Criteria

1. On `/auth/login`, clicking "Continuar con Google" redirects to Google's consent screen; after granting access, the user lands on `nextPath` (or `/dashboard` by default) authenticated, with a valid Supabase session.
2. On `/auth/signup`, clicking "Continuar con Google" performs the same flow — a brand-new Google user is provisioned (via the existing `on_auth_user_created` trigger) and lands authenticated on the destination page, without going through the manual email/password form.
3. For a first-time Google sign-in, the resulting `public.usuarios` row has `nombre` populated from Google's `full_name`/`name` and `foto_url` populated from Google's `avatar_url`/`picture` (verified via Supabase Studio or `PerfilPage`).
4. For an existing password-based user, `nombre`/`foto_url` values already present in `public.usuarios` are not overwritten with nulls (the `coalesce`/`on conflict` logic preserves existing non-null values).
5. If a guided-booking `next` param is present (per `parseGuidedParams`), it is preserved through the Google OAuth redirect the same way it is for password signup/login — `signInWithGoogle` builds `redirectTo` with the same `next` query param pattern as `signUpWithPassword`.
6. If the OAuth call itself fails client-side (e.g., network error, provider not configured), the existing error banner in `LoginForm`/`SignupForm` displays the error message and the user remains on the page (no broken redirect).
7. The email/password flows (`signIn`, `signUp`, `resetPassword`, `updatePassword`) continue to work unmodified — no regression introduced by the new `signInWithOAuth` method or the trigger change.

---

## Implementation Steps

- [ ] Add `signInWithOAuth` to `src/services/supabase/auth.ts`
- [ ] Expose `signInWithGoogle` from `src/hooks/auth/useAuth.ts`
- [ ] Add "Continuar con Google" button + icon to `LoginForm.tsx`
- [ ] Add "Continuar con Google" button + icon to `SignupForm.tsx`
- [ ] Write and apply the `handle_new_auth_user()` metadata-mapping migration locally (`npx supabase db push` or project's migration flow)
- [ ] Configure Google OAuth credentials in Google Cloud Console (Client ID/Secret, redirect URI)
- [ ] Enable and configure the Google provider in Supabase Dashboard (dev project)
- [ ] Manually test: new Google user via `/auth/signup`, existing Google user via `/auth/login`, existing password user does not get `nombre`/`foto_url` wiped
- [ ] Manually test: guided-booking `next` param survives the Google OAuth round trip
- [ ] Update `projectspec/03-project-structure.md` if the auth service/hook doc comments need refreshing

---

## Non-Functional Requirements

- **Security**: Google Client ID/Secret are stored only in Supabase Dashboard, never in app code or `.env` files. `handle_new_auth_user()` remains `security definer` with `search_path = public` — no widening of its privilege surface. No RLS changes needed since `public.usuarios` write access continues to happen only via the trigger.
- **Performance**: No additional queries introduced; the OAuth flow reuses the existing `exchangeCodeForSession`/`getUser` calls already on the callback/bootstrap path.
- **Accessibility**: The Google button must be a real `<button>` (or `<a>` if navigating directly), keyboard-focusable, with an accessible label (e.g., `aria-label="Continuar con Google"` if the icon+text isn't sufficiently descriptive alone), consistent with existing form control focus states (`focus:ring-turquoise`).
- **Error handling**: Client-side failures (before the redirect fires) surface through the same `errorMessage` state and `role="alert"` banner already used by `signIn`/`signUp`. Failures after Google's redirect (e.g., `exchangeCodeForSession` error) already fall back to `/auth/login` per the existing `callback/route.ts` logic — no new error path needed there.
