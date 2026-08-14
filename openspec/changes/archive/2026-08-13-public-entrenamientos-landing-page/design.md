## Context

`entrenamientos_publicos` (US-0089) has RLS enabled with `grant select ... to authenticated` only (`supabase/migrations/20260723010000_entrenamientos_publicos.sql:64-75`); there is no `anon` grant. The existing consumer, `entrenamientosPublicosService.listPublicTrainings()`, joins `disciplinas`/`escenarios`/`tenants` and then makes one extra `reservasService.getCapacidad()` round-trip per row (a query against `reservas`, also `authenticated`-only). That page is mounted at `/portal/entrenamientos-publicos`, which is inside `middleware.ts`'s `protectedPaths = ["/dashboard", "/portal"]`, so it 302s an anonymous visitor to `/auth/login` before any of this even runs.

We need a second, public read path that an anonymous browser session (Supabase anon key, no session cookie) can query directly, without widening what an anonymous user can see on the base tables.

## Goals / Non-Goals

**Goals:**
- Let an anonymous visitor list active, upcoming published trainings without any table-level RLS change.
- Keep the authenticated marketplace (`/portal/entrenamientos-publicos`) and its service/hook/components completely untouched.
- Reuse the existing presentational components (`PublicTrainingCard`, `PublicTrainingsGrid`) rather than fork them.
- Avoid N+1 queries for occupancy data (`reservas_activas`) on the new anonymous path.

**Non-Goals:**
- No filter drawer / date chips / search / org dropdown on the new page (v1 is a flat chronological list).
- No change to the real booking pipeline, RPCs, or `reservas`/`entrenamientos_publicos` RLS.
- No `next=` propagation into `/auth/signup` (out of scope; only `/auth/login?next=...` is used, reusing what already exists).

## Decisions

### 1. A Postgres **view**, not a widened RLS policy, is the new public-read surface

**Decision**: Create `public.entrenamientos_publicos_view`, owned by the migration role, with an explicit column list (no `select *`), filtered to `activo = true and fecha_hora >= now()`, and `grant select` to `anon, authenticated`.

**Why**: In Postgres, a view without `security_invoker` runs with the privileges of its **owner** for permission checks — since the view owner (a superuser-equivalent migration role) is not itself restricted by the RLS policies it defined on `entrenamientos_publicos`/`reservas`/`disciplinas`/`escenarios`/`tenants` (table owners bypass their own RLS unless `FORCE ROW LEVEL SECURITY` is set, which none of these tables use), the view transparently returns only the rows/columns the view's `SELECT` defines — regardless of the querying role (`anon` or `authenticated`). This means:
- The base table's `entrenamientos_publicos_select_authenticated` policy is never touched — `anon` still cannot query `entrenamientos_publicos` directly.
- The exposed column set is fixed in the view's SQL text, not in a `using()` clause someone could loosen later without noticing the column-level implication.

**Alternatives considered**:
- *Add an `anon` SELECT policy directly on `entrenamientos_publicos`*: simplest, but exposes the full row shape (including columns not meant to be public, e.g. `estado`, `entrenador_id`, `publicado_por`) to any future `select *` query, and doesn't solve the `reservas`/joined-table anon access problem at all.
- *Server-side fetch with the service-role key in a Route Handler*: keeps RLS fully closed, but introduces a second data-access pattern (service-role client) outside this project's established "browser client + RLS" convention used by every other service in `services/supabase/portal/`, for no added benefit here since the data is already meant to be public.

### 2. `reservas_activas` is computed **inside** the view via `left join lateral`, not via a per-row service call

**Decision**: The view includes `coalesce(r.reservas_activas, 0)` from a lateral subquery counting `reservas` rows with `estado <> 'cancelada'` per `entrenamiento_id`, matching the exact definition used by `reservasService.getCapacidad()` (`reservas.service.ts:150-176`).

**Why**: `listPublicTrainings()` (the authenticated path) calls `reservasService.getCapacidad()` once per listing via `Promise.all` — acceptable there because it's an authenticated request. Doing the same from an anonymous session would either fail outright (RLS) or require also opening `reservas` to `anon`, which is a much bigger surface than we want to expose (booking data, athlete-adjacent). Folding the count into the view keeps `reservas` RLS untouched and turns N+1 calls into a single query.

**Alternatives considered**: Denormalize a `reservas_activas` counter column onto `entrenamientos_publicos` updated by trigger — more moving parts (trigger maintenance, drift risk) for a value that's cheap to compute per-request at current marketplace scale.

### 3. New feature slice under `components/landing/` + `hooks/landing/`, reusing (not forking) `components/portal/entrenamientos-publicos/{PublicTrainingCard,PublicTrainingsGrid}`

**Decision**: `PublicTrainingCard`/`PublicTrainingsGrid` take plain data props and an `onReservar` callback — they have zero auth coupling already. The new page imports them directly rather than duplicating markup. Only the page shell, the "Regístrate para reservar" modal, and the data-loading hook are new, and live under a `landing`-scoped path since they're marketing-facing, not portal-facing.

**Why**: Avoids maintaining two visually-drifting copies of the same card. The coupling is one-directional and stable (landing → portal component), and the reused components carry no import of anything auth-related.

**Alternatives considered**: Move `PublicTrainingCard`/`PublicTrainingsGrid` to a shared, feature-agnostic location (e.g. `components/shared/`) — unnecessary churn for this change; the existing location works fine as an import target and nothing here requires renaming/relocating US-0089's files.

### 4. Route placement: `/entrenamientos-publicos` (top-level), not nested under `/portal` or a new route group

**Decision**: New page at `src/app/entrenamientos-publicos/page.tsx`.

**Why**: `middleware.ts`'s `protectedPaths = ["/dashboard", "/portal"]` is a simple prefix match; anything outside those two prefixes is public by default, and the root layout (`src/app/layout.tsx`) has no auth gate. No middleware change is needed at all.

## Risks / Trade-offs

- **[Risk]** A future column added to `entrenamientos_publicos` (e.g. something sensitive) won't automatically appear on the view — but the inverse risk (forgetting the view exists and assuming RLS alone protects the table) is worse; the view's explicit column list is the safer failure mode. → **Mitigation**: this design doc + a comment in the migration file calling out the "no `select *`" rule for future maintainers.
- **[Risk]** `left join lateral` per row in the view adds planning overhead vs. a plain join. → **Mitigation**: bounded by the number of currently active, upcoming published trainings across all tenants — the same order of magnitude the authenticated marketplace already renders client-side; revisit with pagination/materialization only if that count grows large.
- **[Trade-off]** No filters in v1 means the anonymous page is less capable than the authenticated marketplace. Accepted for now per the proposal's Non-goals — the goal is discovery + conversion, not full parity.

## Migration Plan

- New migration file only (`supabase migration new` / hand-authored timestamped file under `supabase/migrations/`), applied **locally only** via `supabase db reset` / `supabase migration up` in the local dev stack — do not push to the remote/hosted Supabase project as part of this change.
- Purely additive (`create view`, `grant select`) — no data backfill, no rollback complexity beyond `drop view public.entrenamientos_publicos_view;` if ever needed.
- No changes to existing migrations; no changes to any existing RLS policy.

## Open Questions

- None blocking — filters/search/pagination for the public page and `next=` support for `/auth/signup` are explicitly deferred (see proposal Non-goals) and can be follow-up changes if conversion data suggests they're needed.
