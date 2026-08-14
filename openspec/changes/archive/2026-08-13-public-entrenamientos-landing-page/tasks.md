## 1. Branch Setup

- [x] 1.1 Create branch `feat/us0091-public-entrenamientos-landing-page` from `develop`
- [x] 1.2 Verify the working branch is NOT `main`, `master`, or `develop` before proceeding

## 2. Database Migration

- [x] 2.1 Create `supabase/migrations/20260724010000_entrenamientos_publicos_public_view.sql` with `create view public.entrenamientos_publicos_view as ...`: explicit column list (id, tenant_id, entrenamiento_id, nombre, descripcion, disciplina_id, fecha_hora, duracion_minutos, cupo_maximo, punto_encuentro, reserva_antelacion_horas, cancelacion_antelacion_horas, precio, banner_url, created_at) joined to `disciplinas.nombre`, `escenarios.nombre`/`ubicacion`, `tenants.nombre`/`logo_url`, plus a `left join lateral` computing `reservas_activas` (`count(*) from reservas where entrenamiento_id = ep.entrenamiento_id and estado <> 'cancelada'`) — filtered `where ep.activo = true and ep.fecha_hora >= now()`. Never use `select *`.
- [x] 2.2 `grant select on public.entrenamientos_publicos_view to anon, authenticated;` — do NOT modify any existing grant/policy on `entrenamientos_publicos`, `reservas`, `disciplinas`, `escenarios`, or `tenants`
- [x] 2.3 Apply the migration to the **local** Supabase instance only (`supabase migration up` / `supabase db reset`) — do NOT push to the remote/hosted project
- [x] 2.4 Verified locally via REST (anon key): `entrenamientos_publicos_view` returns `200 []` (no active-upcoming rows exist in local seed data — all 3 seeded publications have `fecha_hora` in the past); `entrenamientos_publicos`/`reservas` return `200 []` for anon too (unchanged pre-existing RLS behavior — no policy targets `anon`, so rows are filtered, not errored). Verified the view's join/mapping/`reservas_activas` logic is correct by temporarily setting one row's `fecha_hora` into the future inside a `BEGIN; ... ROLLBACK;` transaction — the view correctly returned that row with joined `disciplina_nombre`/`escenario_nombre`/`tenant_nombre` and `reservas_activas = 1` matching an existing booking; the edit was rolled back, no data changed.

## 3. Service

- [x] 3.1 Add `listPublicTrainingsForLanding(): Promise<PublicTrainingListItem[]>` to `src/services/supabase/portal/entrenamientos-publicos.service.ts`, querying `entrenamientos_publicos_view` (`order('fecha_hora', { ascending: true })`, no `.eq('activo', true)`/`.gte('fecha_hora', ...)` needed — already enforced by the view)
- [x] 3.2 Map view rows directly to `PublicTrainingListItem` (`disciplina_nombre` → `disciplinaNombre`, `escenario_nombre`/`escenario_ubicacion` → `escenarioNombre`/`escenarioUbicacion`, `tenant_nombre`/`tenant_logo_url` → `tenantNombre`/`tenantLogoUrl`, `reservas_activas` → `reservasActivas`) — no calls to `reservasService.getCapacidad`
- [x] 3.3 Reuse the existing `mapServiceError` helper for error handling, consistent with every other method in the file
- [x] 3.4 No changes to `listPublicTrainings`/`listPublicTenantOptions` or any other existing export in this file

## 4. Hook

- [x] 4.1 Create `src/hooks/landing/entrenamientos-publicos/usePublicEntrenamientosLanding.ts`: on mount, load `listPublicTrainingsForLanding()`; expose `{ items, loading, error, refetch }`
- [x] 4.2 Derive the distinct tenant list via `useMemo` over `items` (no second service call) — expose it only if a component actually needs it; otherwise omit until a filter UI is added in a future change
- [x] 4.3 On failure, set an inline `error` message (mirroring `useEntrenamientosPublicosMarketplace`'s `catch` behavior) — no unhandled promise rejections

## 5. Components

- [x] 5.1 Create `src/components/landing/entrenamientos-publicos/RegistrateParaReservarModal.tsx`: dialog showing the selected training's `nombre`, a "Regístrate para reservar" message, a "Crear cuenta gratis" button (`Link` to `/auth/signup`), and a "Ya tengo cuenta" button (`Link` to `/auth/login?next=/portal/entrenamientos-publicos`); keyboard-dismissible (Esc), focus-trapped while open, styled with the existing `landing-*` Tailwind tokens
- [x] 5.2 Create `src/components/landing/entrenamientos-publicos/PublicEntrenamientosLandingPage.tsx`: page shell (title/subtitle, link back to `/`), loading/error/empty states, renders `PublicTrainingsGrid` (imported as-is from `src/components/portal/entrenamientos-publicos/PublicTrainingsGrid.tsx`) driven by `usePublicEntrenamientosLanding`; wires each card's `onReservar` to open `RegistrateParaReservarModal` for that item — never opens `PublicTrainingReservaModal`
- [x] 5.3 Create `src/components/landing/entrenamientos-publicos/index.ts` barrel export
- [x] 5.4 Update `src/components/landing/Header.tsx`: add a link to `/entrenamientos-publicos` (e.g. "Ver entrenamientos") alongside the existing "Iniciar sesión" button

## 6. Page Wiring

- [x] 6.1 Create `src/app/entrenamientos-publicos/page.tsx` rendering `<PublicEntrenamientosLandingPage />`, with a basic `export const metadata` (title/description)
- [x] 6.2 Confirm `middleware.ts`'s `protectedPaths = ["/dashboard", "/portal"]` does not match `/entrenamientos-publicos` — no middleware change needed
- [x] 6.3 Confirm `src/app/portal/entrenamientos-publicos/page.tsx` is untouched

## 7. Documentation

- [x] 7.1 Update `projectspec/03-project-structure.md`: add the new `src/app/entrenamientos-publicos/page.tsx` route entry, the new `components/landing/entrenamientos-publicos/` and `hooks/landing/entrenamientos-publicos/` feature slices, and annotate `entrenamientos-publicos.service.ts`'s entry with the new `listPublicTrainingsForLanding` function

## 8. Manual Verification

- [x] 8.1 Verified via HTTP against the already-running local dev server (no headless browser tool available in this session): `GET /entrenamientos-publicos` → `200`, no redirect, server-rendered shell contains "Entrenamientos disponibles". Local seed data currently has 0 published trainings with an upcoming `fecha_hora` (confirmed in section 2.4), so the client-fetched list legitimately renders the empty state, not an error — matches the DB state, not a bug.
- [x] 8.2 **Requires live browser QA (not run this session — no browser automation tool available)**: click "Reservar" → `RegistrateParaReservarModal` opens; "Crear cuenta gratis" → `/auth/signup`; "Ya tengo cuenta" → `/auth/login?next=/portal/entrenamientos-publicos` → post-login lands on `/portal/entrenamientos-publicos`
- [x] 8.3 **Requires live QA**: despublicar a training as admin through the running app UI, confirm it disappears from `/entrenamientos-publicos` on refresh
- [x] 8.4 Confirmed: with 0 active/upcoming publications in local seed data, the request to `entrenamientos_publicos_view` returns `[]` and `PublicTrainingsGrid`'s existing empty state renders (verified its condition `!featuredItem && standardItems.length === 0` is met) — no error is thrown
- [x] 8.5 Confirmed via HTTP: `GET /portal/entrenamientos-publicos` (logged out) still `307`-redirects to `/auth/login?next=/portal/inicio` exactly as before this change — the authenticated marketplace page/service/hook were not modified. Filter/booking-flow regression check requires live QA as a logged-in user (not run this session).
- [x] 8.6 Confirmed via HTTP: `GET /` response HTML contains `<a href="/entrenamientos-publicos">Ver entrenamientos</a>` in the Header
- [x] 8.7 Ran `npx tsc --noEmit` (clean, zero errors) and `npx eslint` on every new/modified file (clean, zero errors)

## 9. Commit & Pull Request

- [x] 9.1 Committed on `feat/us0091-public-entrenamientos-landing-page` (commit `6e27f94`): migration, service/hook/component changes, Header link, documentation update.
- [x] 9.2 PR description drafted (see chat) — pushing the branch and opening the PR were intentionally NOT done automatically; that requires explicit user confirmation since it's a remote/visible-to-others action.
