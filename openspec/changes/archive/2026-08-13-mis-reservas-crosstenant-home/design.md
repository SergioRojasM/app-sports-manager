## Context

"Mis Reservas" (US-0074) is a tenant-scoped page: route, hook, and service all key off `tenantId`. It reads `reservas_reporte_view`, a flat reporting view over `public.reservas` joined to athlete/training/discipline/scenario/attendance data. Row visibility is enforced by RLS on the underlying `reservas` table (the view itself carries no `WHERE` scoping), via policy `reservas_select_authenticated`.

That policy currently has two OR-ed branches:
1. Caller is a member (`miembros_tenant`) of the row's `tenant_id` — evaluated per row, so a caller with memberships in several tenants already gets cross-tenant results for free once the query drops its `tenant_id` filter.
2. The row's training has `visibilidad = 'publico'` — with **no** `atleta_id = auth.uid()` check, so today any authenticated user can read *any* athlete's reservation on *any* published public training.

US-0093 already solved the identical structural problem for subscriptions ("Mis Suscripciones"): a portal-home page under `src/app/portal/(atleta)/`, a service function scoped by `atleta_id` only, and a `resolvePortalMenu` entry in the tenant-less branch. That implementation is the direct template for this change; the reservations case additionally requires closing the RLS gap in branch 2, since a naive port would leave the leak in place and it becomes more directly exploitable once "my reservations" is a first-class cross-tenant surface.

## Goals / Non-Goals

**Goals:**
- Athletes see every reservation they own — across tenant memberships and non-member public-training bookings — from one page, no tenant selection required.
- Close the pre-existing RLS gap so a non-member's visibility into a public training's bookings is limited to their own row.
- Preserve every existing UX behavior of the tenant-scoped page (filters, pagination, CSV export, banners) except where tenant-scoping itself must change.
- Keep the change additive/non-destructive to the staff-facing `gestion-reservas` view and its RLS branch.

**Non-Goals:**
- No changes to booking creation, cancellation, or attendance recording.
- No new visual design — reuse existing component patterns (`MisReservasTable`, `MisSuscripcionesFilters`'s org-select) as-is.
- No change to how `gestion-reservas` (tenant-scoped staff view) queries or displays data.
- No introduction of a generic "cross-tenant query builder" abstraction — this is one query, following the same shape already used by `fetchMisSuscripciones`.

## Decisions

**1. Fix the RLS policy rather than filter more narrowly in the service layer.**
The leak is at the database layer (RLS), so client-side filtering (e.g., only ever querying with `.eq('atleta_id', ...)`) does not close it — a different client could still query `reservas_reporte_view` directly and read other athletes' public-training bookings. The fix must live in the policy itself: `and (atleta_id = auth.uid() and exists (... visibilidad = 'publico' ...))` on the second branch. Alternative considered: leave the policy as-is and rely on the service always filtering by `atleta_id` — rejected because it doesn't actually restrict access at the data layer, only obscures it in the one call site we control.

**2. Derive `disciplines` and `tenantOptions` filter choices from loaded rows, not new queries.**
`disciplinesService.listDisciplinesByTenant(tenantId)` requires a `tenantId` and is itself RLS-gated to tenant members — unusable once the page is tenant-less, and it would have incorrectly omitted disciplines belonging to a public training's non-member host org even if adapted to loop over multiple tenants. Deriving both filters from the already-fetched `ReservaReportRow[]` (unique `disciplina` strings, unique `{tenant_id, tenant_nombre}` pairs) needs zero additional round trips and is exactly the pattern `useMisSuscripciones` already uses for its `tenantOptions`. Alternative considered: a new cross-tenant "list all disciplines the athlete has ever booked" service function — rejected as unnecessary indirection when the data is already in memory from the main query.

**3. Keep `tenantId` as an optional *server-side* filter in `getMisReservas`, not a client-side `.filter()`.**
The existing hook re-fetches from the server on every "Aplicar filtros" click (server-side filtering per US-0074, unlike `useMisSuscripciones` which loads once and filters in memory). Preserving that existing architecture — rather than switching this one story to client-side filtering — avoids a bigger behavioral change than requested and keeps the "last 100 without active filters" cap meaningful (an unfiltered load must still hit the server-side `.limit()`, which an in-memory-filter model would break since it would need to load everything upfront to filter by org client-side). `tenantId`, `fechaDesde/Hasta`, `asistencia`, `disciplinaNombre` are therefore all treated the same way — optional server-side filters.

**4. Extend `reservas_reporte_view` in place (DROP + CREATE) rather than adding a second view.**
This view already has three prior additive migrations (`+dates`, `+atleta_id`); adding `tenant_nombre` the same way keeps a single source of truth for both `gestion-reservas` and the new `mis-reservas` consumer. Both consumers already tolerate extra columns (both do `select('*')` and map only the fields they use), so this is non-breaking for `getReservasManagement`.

**6. Discovered during local verification — set `security_invoker = true` on the view; this was a bigger leak than the base-table policy alone.**
Manually verifying the RLS fix (querying `reservas_reporte_view` as a non-staff athlete, comparing against querying `reservas` directly) showed the view returned *every* row in the table — not just the athlete's own — even after the `reservas_select_authenticated` policy fix landed. Cause: `reservas_reporte_view` is owned by `postgres`, which has `BYPASSRLS`; Postgres views check row-level security using the **view owner's** privileges by default, not the querying role's, unless `security_invoker` is set (available PG15+; this project runs PG17). So every prior version of this view — including before this change — silently bypassed `reservas` RLS entirely for any authenticated user with `SELECT` on the view (granted since the view's creation), regardless of the `.eq('tenant_id', ...)`/`.eq('atleta_id', ...)` filters `getReservasManagement`/`getMisReservas` apply — those filters were the *only* access control in effect, not defense-in-depth on top of RLS as the existing migration comments ("RLS on underlying tables still applies") assumed. `CREATE VIEW public.reservas_reporte_view WITH (security_invoker = true) AS ...` closes this: the view now evaluates policies as the calling role, so the fixed `reservas_select_authenticated` policy is what actually governs visibility. Verified locally: an unfiltered `select * from reservas_reporte_view` as a non-staff athlete went from returning all 175 seeded rows to returning exactly their own row; a tenant admin querying with `tenant_id` filter still correctly saw all 175 rows in their tenant.

**5. New capability name: `athlete-reservations-view`.**
Chosen to mirror the existing `user-subscriptions-and-payments-view` capability naming (the direct precedent for this exact "move it to portal home" pattern), rather than reusing `bookings-csv-export` or `training-booking`, which cover different concerns (staff CSV export of a single training's bookings; booking/cancellation business rules).

## Risks / Trade-offs

- **[Risk] The RLS policy fix could regress a booking flow that (incorrectly) depended on the old broad read access.** → Mitigation: the fix only removes the ability to read *other* athletes' rows on public trainings; the booking creation/cancellation flows and the `gestion-reservas` staff path both go through different, unaffected policy branches (`reservas_insert_authenticated`, `reservas_update_authenticated`, and branch 1 of `reservas_select_authenticated`). Verify via the manual test plan in the proposal (tenant staff still sees all tenant bookings; a second test athlete can no longer read a first athlete's public-training booking).
- **[Risk] Deriving filter options from loaded rows means the discipline/organization dropdowns only ever show values present in the current result set (capped at 100 rows when unfiltered), not the athlete's full history.** → Mitigation: this is an intentional, low-severity trade-off consistent with the "last 100 without filters" cap already accepted in US-0074; a user who wants to discover an org/discipline not in that initial 100 can apply a date filter first. No worse than today's tenant-scoped behavior, which already caps at 100.
- **[Risk] Migration ordering: the view migration references `tenants`, and the policy migration references `entrenamientos`/`miembros_tenant` — both already exist, so no ordering risk between the two new migrations themselves, but they must both run before the frontend changes are deployed** (the frontend now queries `tenant_nombre`, which doesn't exist until the view migration lands). → Mitigation: apply both migrations first, verify locally, then ship the frontend changes.

## Migration Plan

1. Apply `20260729190000_reservas_select_policy_scope_public_to_owner.sql` to the **local** Supabase instance (`supabase db reset` / `supabase migration up` — never push directly to the remote/hosted project as part of this change).
2. Apply `20260729190100_reservas_reporte_view_add_tenant_nombre.sql` locally, after (1).
3. Verify locally with two seeded test athletes: athlete A cannot read athlete B's reservation on a public training via `reservas_reporte_view`; tenant staff still see every reservation in their own tenant.
4. Ship the frontend changes (types → service → hook → components → pages → nav) once both migrations are verified locally.
5. Rollback, if needed: re-apply the previous `reservas_select_authenticated` definition and the previous `reservas_reporte_view` definition (both are simple `CREATE OR REPLACE`/`DROP + CREATE` statements, trivially reversible by re-running the prior migration's SQL body) — no data migration involved, so rollback is schema-only.

## Open Questions

None — the User Story and existing US-0093 precedent resolve the ambiguity this design needed to address.
