## Context

`LoginForm.tsx` and `SignupForm.tsx` (`src/components/auth/`) already render a static "O continúa con" divider with nothing underneath — a placeholder left by an earlier redesign (US-0003/US-0004). The Supabase auth stack is already provider-agnostic:

- `src/services/supabase/client.ts` / `server.ts` use `@supabase/ssr` (`createBrowserClient`/`createServerClient`) with cookie-based session storage.
- `src/app/auth/callback/route.ts` calls `supabase.auth.exchangeCodeForSession(code)` — this works identically for OAuth and email-link redirects; it does not care which provider issued the code.
- `middleware.ts` → `src/services/supabase/middleware.ts` refreshes the session and gate-keeps `/dashboard`/`/portal` regardless of how the session was created.
- New `auth.users` rows are provisioned into `public.usuarios` (+ default `public.miembros_tenant` membership) by the `handle_new_auth_user()` trigger (`supabase/migrations/20260223000100_seed_inicial.sql`), reading `raw_user_meta_data` keys `nombre`/`apellido`/`telefono`/`fecha_nacimiento`/`foto_url` — keys the app's own password-signup flow writes (currently unpopulated at signup time), not the keys Google's OAuth provider populates (`full_name`/`name`, `avatar_url`/`picture`).

This is a small, additive change: one new client-side auth method, two UI buttons, and one trigger-widening migration. No new architectural pattern or dependency is introduced.

## Goals / Non-Goals

**Goals:**
- Let a user authenticate via Google from both `/auth/login` and `/auth/signup`, landing on the same post-auth destination (`nextPath`/`/dashboard`, `/portal/bootstrap`) as password auth does today.
- Ensure a first-time Google user's `public.usuarios.nombre`/`foto_url` are populated from Google's profile data instead of staying null.
- Preserve the guided-booking `next` query param through the OAuth round trip, matching existing `signUpWithPassword` behavior.

**Non-Goals:**
- No new OAuth providers beyond Google (Facebook, Apple, etc. are out of scope).
- No account-linking UI (merging an existing password account with a Google login by matching email is Supabase's default behavior — this change does not add custom linking logic or a linking confirmation screen).
- No changes to `apellido`/`telefono`/`fecha_nacimiento` provisioning — these remain null after any OAuth signup, same as after password signup, completed later via `/portal/perfil`.
- No changes to the `/auth/callback` route, middleware, or `/portal/bootstrap` — confirmed provider-agnostic, no code changes needed there.
- Google Cloud Console / Supabase Dashboard provider configuration is a manual, external prerequisite — not part of this change's code or migration.

## Decisions

**1. `signInWithOAuth` returns only `{ errorMessage }`, not `AuthResult`.**
Unlike `signIn`/`signUp`, a successful `signInWithOAuth` call triggers an immediate browser redirect to Google — there is no `user`/`session` to return synchronously. Reusing the `AuthResult` shape (`{ user, session, errorMessage }`) would force callers to handle two meaningless-always-null fields. A narrower `{ errorMessage: string | null }` return type only surfaces the case that matters to the caller: a client-side failure *before* the redirect fires (e.g., provider misconfigured, network error).

**2. `next` is threaded through as a plain parameter, not derived from `window.location` inside the button component.**
`signInWithOAuth(next?: string)` builds `redirectTo` the same way `signUpWithPassword(credentials, next)` already does. `LoginForm` already computes `nextPath` from `useSearchParams()`; `SignupForm` already receives `nextPath` as a prop. Both simply pass their existing value through — no new param-parsing logic.

**3. Trigger change uses `coalesce` across old and new metadata keys, applied via `create or replace function`.**
Rather than writing provider-specific branching logic (e.g., checking `raw_app_meta_data->>'provider'`), the trigger just tries every known key name in priority order. This keeps the function provider-agnostic (works for any future OAuth provider that happens to use `full_name`/`avatar_url`, which is the common convention) and avoids duplicating the insert/upsert logic. `create or replace function` is used instead of a new function name so the existing `on_auth_user_created` trigger binding does not need to be touched.

**4. Google "G" icon is an inline SVG, not a new icon library dependency.**
The project already uses Material Symbols via a `material-symbols-outlined` span (see `LoginForm.tsx` mail/lock icons) plus `next/image` for raster assets — neither covers Google's official multi-color "G" mark. An inline SVG (small, static, no network fetch) avoids adding a package for one icon and keeps the button self-contained.

## Risks / Trade-offs

- **[Risk]** A user who already has a password-based account signs in with Google using the same email → Supabase's default `email` identity-linking behavior applies (exact behavior depends on the "Allow manual linking" / confirmation settings in Supabase Dashboard, which are outside this change). → **Mitigation**: out of scope for this change to alter; the trigger's `on conflict (id) do update ... coalesce(...)` already avoids clobbering existing profile data if such a linked login provisions through the same trigger path. Document this as a manual verification step (AC #4 in the user story) rather than new code.
- **[Risk]** Widening `handle_new_auth_user()` is a `security definer` function change — any mistake in the `coalesce` expression could silently null out data for all *future* signups (password included), not just Google ones. → **Mitigation**: keep the existing key checks first in each `coalesce` chain (password flow's explicit keys always win if present), add the new keys only as fallback, and verify via the migration test plan (AC #3/#4) before merging.
- **[Trade-off]** No custom account-linking UX means a user who forgets they signed up with a password and then uses Google (or vice versa) sees Supabase's default behavior, which may be a generic error rather than a friendly message. Considered acceptable for a v1 — can be revisited as a follow-up story if it proves confusing in practice.

## Migration Plan

1. Add the new migration file locally: `supabase/migrations/<timestamp>_google_oauth_profile_metadata_mapping.sql`.
2. Apply it to the **local** Supabase instance only (`npx supabase db reset` or the project's local migration workflow) — do not push to the remote/hosted project from this change; remote deployment follows the project's normal release process.
3. Ship code changes (`auth.ts`, `useAuth.ts`, `LoginForm.tsx`, `SignupForm.tsx`) independently of the migration timing — they are additive and don't break if the migration hasn't been applied yet in a given environment (the button would simply fail with a Supabase "provider not enabled" error until the Dashboard config + migration are both in place).
4. No rollback complexity: the migration only widens a `coalesce` chain — reverting to the previous `create or replace function` body (or a follow-up migration) fully undoes it with no data loss, since it never removes previously-stored values.

## Open Questions

- Should `apellido` also attempt Google's metadata (Google doesn't cleanly separate first/last name in `full_name`)? Decided **no** for v1 (see Non-Goals) — splitting `full_name` heuristically risks incorrect data; leaving it null and letting the user fill it in `/portal/perfil` is consistent with today's password-signup experience.
