## Why

The public trainings marketplace built in US-0089 (`entrenamientos_publicos`, `PublicTrainingCard`, `PublicTrainingsGrid`, etc.) only exists behind `/portal/entrenamientos-publicos`, which `middleware.ts` treats as a protected path — an anonymous visitor is redirected straight to `/auth/login` before ever seeing a single training. That means the marketing site currently has zero product surface: a prospect must sign up on faith before discovering whether there's anything to book. US-0091 gives visitors a public, unauthenticated page to browse the same published trainings, and — since anonymous booking can't happen (there's no `atleta_id`) — a clear "Regístrate para reservar" call to action instead of the real booking flow, turning discovery into a sign-up funnel.

## What Changes

- Add a Postgres view (`entrenamientos_publicos_view`) that exposes only public-safe columns of `entrenamientos_publicos` (+ joined `disciplinas`/`escenarios`/`tenants` columns) plus a precomputed `reservas_activas` count, filtered to `activo = true` and upcoming (`fecha_hora >= now()`), with `select` granted to `anon` — **no RLS policy on any base table is modified or loosened**.
- Add `listPublicTrainingsForLanding()` to `entrenamientos-publicos.service.ts`, querying that view (no per-row `reservasService.getCapacidad()` calls, which would fail under anon RLS).
- Add a new public, top-level route `/entrenamientos-publicos` (sibling to `/auth`, NOT under `/portal` — confirmed outside `middleware.ts`'s `protectedPaths`), reusing the existing `PublicTrainingCard`/`PublicTrainingsGrid` components as-is (they are pure presentational, already styled per `grit-arena.pen` node `ql3Ij` from US-0089 — no new visual design needed for the cards/grid).
- Add a new `usePublicEntrenamientosLanding` hook that loads the list and derives the tenant set client-side (no second query, unlike the authenticated marketplace's `listPublicTenantOptions()`).
- Add a `RegistrateParaReservarModal`: clicking "Reservar" on this public page opens a sign-up prompt ("Crear cuenta gratis" → `/auth/signup`, "Ya tengo cuenta" → `/auth/login?next=/portal/entrenamientos-publicos`) instead of the real booking flow.
- Add a link to `/entrenamientos-publicos` in the landing `Header.tsx` so the page is discoverable from `/`.
- No changes to the authenticated marketplace at `/portal/entrenamientos-publicos` — it keeps its own service calls, its own hook, and its real `PublicTrainingReservaModal` booking flow untouched.

## Capabilities

### New Capabilities
- `public-entrenamientos-landing`: the public-safe `entrenamientos_publicos_view`, the `listPublicTrainingsForLanding()` read path, the unauthenticated `/entrenamientos-publicos` page (list + empty/error states), and the "Regístrate para reservar" CTA modal that replaces the booking flow for anonymous visitors.

### Modified Capabilities
(none — this change only adds a new read-only capability; it does not alter the requirements of `public-training-marketplace` (US-0089), which keeps governing the authenticated `/portal/entrenamientos-publicos` behavior unchanged)

## Non-goals

- No changes to the real booking/reservation pipeline (`ReservaFormModal`, `book_and_deduct_service_units`, etc.) — anonymous visitors never reach it.
- No filters (date chips, search, organization dropdown) on the public page for this iteration — v1 is a plain chronological list; the authenticated marketplace's filter drawer is not ported here.
- No changes to `entrenamientos_publicos` table RLS/grants, or to `reservas`/`disciplinas`/`escenarios`/`tenants` RLS — the new view is the only new public-read surface.
- No `next`-param propagation through `/auth/signup` — signup keeps its existing fixed post-signup redirect; only the login CTA uses `?next=`.
- No SEO/metadata overhaul beyond a basic page title/description.

## Impact

- **Database**: one new migration adding `public.entrenamientos_publicos_view` (a view, not a table) + `grant select ... to anon, authenticated`. No existing table, policy, or trigger is altered.
- **Types**: none — reuses the existing `PublicTrainingListItem` from `src/types/portal/entrenamientos-publicos.types.ts`.
- **Services**: one new function in the existing `src/services/supabase/portal/entrenamientos-publicos.service.ts` (`listPublicTrainingsForLanding`). No changes to `reservas.service.ts`.
- **Hooks**: one new hook, `src/hooks/landing/entrenamientos-publicos/usePublicEntrenamientosLanding.ts`.
- **Components**: new feature slice `src/components/landing/entrenamientos-publicos/` (`PublicEntrenamientosLandingPage.tsx`, `RegistrateParaReservarModal.tsx`, `index.ts`), reusing `PublicTrainingCard`/`PublicTrainingsGrid` from `src/components/portal/entrenamientos-publicos/`; a small addition to `src/components/landing/Header.tsx`.
- **Routing**: new `src/app/entrenamientos-publicos/page.tsx`, a public top-level route.
- **Dependencies**: none new.
