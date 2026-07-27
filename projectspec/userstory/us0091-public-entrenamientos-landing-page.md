# US-0091 — Public Trainings Discovery Page with Sign-Up CTA

## ID
US-0091

## Name
Public, unauthenticated "Entrenamientos disponibles" page linked from the landing, with a "Regístrate para reservar" call to action

## As a
Anonymous visitor browsing the marketing site (not logged in)

## I Want
To see the list of publicly published trainings (cross-tenant) from the landing site, on a dedicated page, without needing an account

## So That
I can discover available trainings before signing up, and I'm clearly guided to create an account when I try to reserve one, increasing sign-up conversion

---

## Description

### Current State
- The public trainings marketplace (`EntrenamientosPublicosPage` at [src/components/portal/entrenamientos-publicos/EntrenamientosPublicosPage.tsx](../../src/components/portal/entrenamientos-publicos/EntrenamientosPublicosPage.tsx)) is mounted at `/portal/entrenamientos-publicos` ([src/app/portal/entrenamientos-publicos/page.tsx](../../src/app/portal/entrenamientos-publicos/page.tsx)), which sits under `/portal`, a protected path (see `protectedPaths` in [middleware.ts](../../middleware.ts)) — `middleware.ts` redirects any unauthenticated visitor to `/auth/login`, and [src/app/portal/layout.tsx](../../src/app/portal/layout.tsx) redirects again if session cookies are missing.
- `entrenamientos_publicos` (the base table) has RLS granting `select` only `to authenticated` ([supabase/migrations/20260723010000_entrenamientos_publicos.sql:64-75](../../supabase/migrations/20260723010000_entrenamientos_publicos.sql)). An anonymous Supabase client cannot read it, or the `disciplinas`/`escenarios`/`tenants`/`reservas` rows joined into it.
- The landing page (`/`, [src/app/page.tsx](../../src/app/page.tsx)) is pure marketing content (Hero, ProblemSolution, Operation, Administration, Pricing, Footer) and has no link to any trainings content today.
- There is no "regístrate para reservar" messaging anywhere in the app — booking always assumes an authenticated `atleta_id`.

### Proposed Changes

1. **Postgres view** exposing only public-safe columns of `entrenamientos_publicos` (+ safe joined columns from `disciplinas`, `escenarios`, `tenants`) plus a live `reservas_activas` count, filtered to `activo = true` and upcoming (`fecha_hora >= now()`). Because a view executes with the privileges of its owner (the migration role, which is not subject to its own RLS as table owner), granting `select` on the view alone to `anon`/`authenticated` exposes exactly these safe rows/columns without touching the base table's RLS or opening `anon` access to `entrenamientos_publicos`, `reservas`, `disciplinas`, `escenarios`, or `tenants` directly.
2. **New service method** `listPublicTrainingsForLanding()` that queries the view — no `reservasService.getCapacidad()` per-row calls (that would hit `reservas` under authenticated-only RLS from an anon session), because `reservas_activas` is now pre-computed inside the view.
3. **New lightweight hook** that loads that list and derives the distinct tenant set from it (no second query needed, unlike `useEntrenamientosPublicosMarketplace`'s separate `listPublicTenantOptions()` call).
4. **New public page** at `/entrenamientos-publicos` (top-level, sibling to `/auth`, NOT under `/portal` — confirmed not matched by `protectedPaths` in `middleware.ts`) rendering the same `PublicTrainingCard/PublicTrainingsGrid` components already used by the authenticated marketplace (they are pure presentational, no auth coupling — reuse as-is, do not duplicate).
5. Clicking "Reservar" on any card opens a small **"Regístrate para reservar" dialog** (instead of the real booking flow, which requires an authenticated `atleta_id`) with two CTAs: "Crear cuenta gratis" → `/auth/signup`, and "Ya tengo cuenta" → `/auth/login?next=/portal/entrenamientos-publicos` (reuses the existing `?next=` convention already read by [src/app/auth/login/page.tsx](../../src/app/auth/login/page.tsx)).
6. **Landing discoverability**: add a link/button to `/entrenamientos-publicos` in `Header.tsx` so the feature is reachable from the landing, per the requirement to "leave public trainings available from the landing" — implemented as a link to the new page, not as an embedded landing section.

No changes to the existing authenticated marketplace (`/portal/entrenamientos-publicos`) — it keeps using `listPublicTrainings()`/`listPublicTenantOptions()` and the real booking flow unchanged.

---

## Database Changes

New migration: `supabase/migrations/20260724010000_entrenamientos_publicos_public_view.sql`

```sql
begin;

-- View exposes only public-safe columns for anonymous/landing consumption.
-- Runs with the privileges of its owner (migration role), so it bypasses RLS
-- on entrenamientos_publicos/reservas/disciplinas/escenarios/tenants — do NOT
-- add columns here that aren't safe to show to an unauthenticated visitor.
create view public.entrenamientos_publicos_view as
select
  ep.id,
  ep.tenant_id,
  ep.entrenamiento_id,
  ep.nombre,
  ep.descripcion,
  ep.disciplina_id,
  ep.fecha_hora,
  ep.duracion_minutos,
  ep.cupo_maximo,
  ep.punto_encuentro,
  ep.reserva_antelacion_horas,
  ep.cancelacion_antelacion_horas,
  ep.precio,
  ep.banner_url,
  ep.created_at,
  d.nombre as disciplina_nombre,
  e.nombre as escenario_nombre,
  e.ubicacion as escenario_ubicacion,
  t.nombre as tenant_nombre,
  t.logo_url as tenant_logo_url,
  coalesce(r.reservas_activas, 0) as reservas_activas
from public.entrenamientos_publicos ep
join public.disciplinas d on d.id = ep.disciplina_id
join public.escenarios e on e.id = ep.escenario_id
join public.tenants t on t.id = ep.tenant_id
left join lateral (
  select count(*) as reservas_activas
  from public.reservas r
  where r.entrenamiento_id = ep.entrenamiento_id
    and r.estado <> 'cancelada'
) r on true
where ep.activo = true
  and ep.fecha_hora >= now();

grant select on public.entrenamientos_publicos_view to anon, authenticated;

commit;
```

Notes:
- No change to `entrenamientos_publicos` grants/policies (still `to authenticated` only) — the view is the only new public-read surface.
- Mirrors the `estado <> 'cancelada'` active-booking definition used by `reservasService.getCapacidad` ([src/services/supabase/portal/reservas.service.ts:150-176](../../src/services/supabase/portal/reservas.service.ts)) so occupancy numbers match what authenticated users see.

---

## API / Server Actions

**File**: `src/services/supabase/portal/entrenamientos-publicos.service.ts`

- **New function**: `listPublicTrainingsForLanding(): Promise<PublicTrainingListItem[]>`
  - Queries `entrenamientos_publicos_view` (no `.eq('activo', true)` / `.gte('fecha_hora', ...)` needed — already baked into the view), `order('fecha_hora', { ascending: true })`.
  - Maps `disciplina_nombre` → `disciplinaNombre`, `escenario_nombre`/`escenario_ubicacion` → `escenarioNombre`/`escenarioUbicacion`, `tenant_nombre`/`tenant_logo_url` → `tenantNombre`/`tenantLogoUrl`, `reservas_activas` → `reservasActivas` directly (no `reservasService.getCapacidad` calls).
  - Returns the same `PublicTrainingListItem` type used by the authenticated marketplace — no new type needed.
  - **Auth**: none required; uses the standard browser `createClient()` (anon key), same as every other method in this file. Works whether or not the visitor is logged in.
  - Reuses `mapServiceError` for error mapping, consistent with the rest of the file.

No new API routes — this follows the existing client-side Supabase pattern used throughout the file.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260724010000_entrenamientos_publicos_public_view.sql` | New: `entrenamientos_publicos_view` + grant to `anon, authenticated` |
| Service | `src/services/supabase/portal/entrenamientos-publicos.service.ts` | Add `listPublicTrainingsForLanding()` |
| Hook | `src/hooks/landing/entrenamientos-publicos/usePublicEntrenamientosLanding.ts` | New: loads list via `listPublicTrainingsForLanding()`, derives tenant set via `useMemo`, exposes `{ items, loading, error, refetch }` |
| Component | `src/components/landing/entrenamientos-publicos/PublicEntrenamientosLandingPage.tsx` | New: page shell (title/subtitle, back-to-landing link), loading/error/empty states, renders `PublicTrainingsGrid` (reused from `components/portal/entrenamientos-publicos`), opens `RegistrateParaReservarModal` on "Reservar" click |
| Component | `src/components/landing/entrenamientos-publicos/RegistrateParaReservarModal.tsx` | New: dialog with training name + "Crear cuenta gratis" (`/auth/signup`) and "Ya tengo cuenta" (`/auth/login?next=/portal/entrenamientos-publicos`) buttons |
| Component | `src/components/landing/entrenamientos-publicos/index.ts` | New: barrel export |
| Component | `src/components/landing/Header.tsx` | Add a link/button to `/entrenamientos-publicos` (e.g. "Ver entrenamientos") next to "Iniciar sesión" |
| Page | `src/app/entrenamientos-publicos/page.tsx` | New: public top-level route rendering `PublicEntrenamientosLandingPage`; add `metadata` (title/description) |
| Types | `src/types/portal/entrenamientos-publicos.types.ts` | No change — `PublicTrainingListItem` is reused as-is |

---

## Acceptance Criteria

1. Visiting `/entrenamientos-publicos` while logged out returns the page directly (no redirect to `/auth/login`), and lists all currently active, upcoming public trainings across all tenants, ordered by `fecha_hora` ascending.
2. Each card shows the same information as the authenticated marketplace card (name, tenant, discipline, scenario, date/time, price, occupancy bar using `reservasActivas`/`cupoMaximo`, banner image) via the reused `PublicTrainingCard`.
3. A published training whose `activo` is `false`, or whose `fecha_hora` is in the past, does NOT appear on `/entrenamientos-publicos`.
4. Clicking "Reservar" on any card opens the `RegistrateParaReservarModal` — it never opens the real booking flow (`PublicTrainingReservaModal`/`ReservaFormModal`) for an anonymous visitor.
5. In that modal, "Crear cuenta gratis" navigates to `/auth/signup`; "Ya tengo cuenta" navigates to `/auth/login?next=/portal/entrenamientos-publicos`, and after a successful login the visitor lands on the authenticated marketplace.
6. The landing page (`/`) contains a visible link to `/entrenamientos-publicos` (in `Header.tsx`).
7. `/portal/entrenamientos-publicos` (the authenticated marketplace) is unchanged: still requires login, still uses `listPublicTrainings()`/`listPublicTenantOptions()`, and its "Reservar" still opens the real booking flow.
8. With zero active published trainings, `/entrenamientos-publicos` shows an empty state (reusing `PublicTrainingsGrid`'s existing empty state) instead of an error.
9. Querying `entrenamientos_publicos_view` (or the underlying `entrenamientos_publicos`/`reservas`/`disciplinas`/`escenarios`/`tenants` tables) with the anon key from outside the app only ever returns the columns explicitly listed in the view definition — no sensitive columns (e.g. `publicado_por`, `estado`, `entrenador_id`) are exposed.
10. `npm run lint` and `npm run build` (or the project's TypeScript check) pass with no new errors.

---

## Implementation Steps

- [ ] Create migration `20260724010000_entrenamientos_publicos_public_view.sql`, apply locally, verify the view returns expected rows for an existing published training
- [ ] Verify the view is queryable with the anon key (e.g. via `supabase` JS client with no session) and that direct anon queries against `entrenamientos_publicos`/`reservas` still fail
- [ ] Add `listPublicTrainingsForLanding()` to `entrenamientos-publicos.service.ts`
- [ ] Create `usePublicEntrenamientosLanding.ts` hook
- [ ] Build `PublicEntrenamientosLandingPage.tsx`, reusing `PublicTrainingCard`/`PublicTrainingsGrid` from `components/portal/entrenamientos-publicos`
- [ ] Build `RegistrateParaReservarModal.tsx`
- [ ] Wire `src/app/entrenamientos-publicos/page.tsx`
- [ ] Add the landing `Header.tsx` link
- [ ] Test manually logged out: view list, empty state, click Reservar → modal → both CTA links
- [ ] Test manually logged in: confirm `/portal/entrenamientos-publicos` still behaves exactly as before
- [ ] Confirm middleware does not redirect `/entrenamientos-publicos` (only `/dashboard` and `/portal` are in `protectedPaths`)

---

## Non-Functional Requirements

- **Security**: No RLS policy on any base table is modified or loosened. The only new public-read surface is the `entrenamientos_publicos_view`, whose column list is fixed at migration time — any future column addition to `entrenamientos_publicos` must NOT automatically appear on the view. Do not use `select *` in the view definition.
- **Performance**: The view's `reservas_activas` uses a `left join lateral` correlated subquery per row; acceptable at current marketplace scale (mirrors the existing per-row `getCapacidad` call pattern, but as a single query instead of N+1 round-trips, so this is a net improvement over the authenticated marketplace's current approach).
- **Accessibility**: `RegistrateParaReservarModal` must be keyboard-dismissible (Esc) and trap focus while open, consistent with other modals in the codebase (e.g. `ReservaFormModal`).
- **Error handling**: On load failure, `usePublicEntrenamientosLanding` sets an inline error message state (mirrors `useEntrenamientosPublicosMarketplace`'s `catch` behavior) — no unhandled promise rejections, no console-only errors surfaced to the visitor.
