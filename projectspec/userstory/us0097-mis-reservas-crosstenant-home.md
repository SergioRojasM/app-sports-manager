# US-0097 — Move "Mis Reservas" to the Cross-Tenant Portal Home

## ID
US-0097

## Name
Cross-Tenant "Mis Reservas" View at the Portal Home Level

## As a
Athlete (usuario role) authenticated in the portal

## I Want
To see all of my active and historical training reservations — across every organization I belong to, and every public training I've booked directly through the cross-tenant marketplace — from a single view at the portal home level

## So That
I don't have to visit each organization individually to check my booking history, and I can see reservations for public trainings that today are invisible to me because they don't belong to any single tenant context I'm browsing

---

## Description

### Current State

- "Mis Reservas" (US-0074) lives at `src/app/portal/orgs/[tenant_id]/(atleta)/mis-reservas/page.tsx`, scoped to one `tenant_id` at a time. The page, its hook (`useMisReservas`), and its service call (`reservasService.getMisReservas`) all require a `tenantId` and query `reservas_reporte_view` filtered with `.eq('tenant_id', tenantId)`.
- Public trainings booked through the cross-tenant marketplace (`/portal/entrenamientos-publicos`, US-0089/US-0094) create a `reservas` row same as any tenant-scoped booking, but the athlete has **no membership** in the hosting tenant. Since the current UI only offers "Mis Reservas" nested under `/portal/orgs/[tenant_id]/...`, and reaching that route requires tenant membership/role gating (`AtletaLayout` redirects non-members), the athlete has no page from which to see these public-training bookings today.
- The RLS `SELECT` policy on `reservas` (`reservas_select_authenticated`, last modified in `20260727010000_entrenamientos_publicos_sync_visibilidad.sql`) already has a branch for public trainings, but it is **not scoped to the caller's own booking** — see "Database Changes" below. This is an existing over-exposure that must be closed before a cross-tenant "my reservations" view can safely rely on it.
- `reservas_reporte_view` does not currently expose the tenant's name, so a cross-tenant list has no way to label which organization each row belongs to (the pattern already solved for subscriptions in `mis-suscripciones.service.ts`, which joins `tenants!suscripciones_tenant_id_fkey(nombre)`).
- The precedent for this exact move already exists: US-0093 relocated "Mis Suscripciones" from `/portal/orgs/[tenant_id]/(atleta)/mis-suscripciones-y-pagos` to `/portal/(atleta)/mis-suscripciones`, replacing the tenant-scoped fetch with one scoped only by `atleta_id = auth.uid()`, leaving the old route as a redirect, and exposing the new route in `resolvePortalMenu`'s tenant-less branch. This story follows the same pattern for reservations.

### Proposed Changes

**Data model / access**
- No new tables or columns for reservations themselves — `reservas` and `reservas_reporte_view` already carry everything needed (`atleta_id`, `tenant_id`, `entrenamiento_id`, discipline, scenario, attendance).
- Fix the RLS leak in `reservas_select_authenticated` (see Database Changes) so the public-training branch only returns the caller's own bookings.
- Extend `reservas_reporte_view` with `tenant_nombre` (join `tenants`) so the UI can label the organization per row without an extra query.

**Service / data access**
- `reservasService.getMisReservas` drops the mandatory `tenantId` requirement: the query filters by `atleta_id` only, with `tenantId` becoming an **optional** narrowing filter (kept for the new "Organización" dropdown). RLS (not the query) is what makes cross-tenant reads safe and correctly scoped.

**Frontend**
- New page at `src/app/portal/(atleta)/mis-reservas/page.tsx` — cross-tenant, no `tenant_id` param, mirrors `src/app/portal/(atleta)/mis-suscripciones/page.tsx`.
- `MisReservasPage`, `useMisReservas`, `MisReservasFiltersPanel`, and `MisReservasTable` become tenant-agnostic:
  - `useMisReservas` no longer takes `tenantId`, only `atletaId`.
  - The discipline filter's options are derived from the loaded rows' distinct `disciplina` values instead of calling `disciplinesService.listDisciplinesByTenant(tenantId)` — that service call is membership-gated per tenant and would silently omit disciplines from tenants the athlete doesn't belong to (e.g., a public training's host org), producing an incomplete filter and, if called with no tenant context, has no tenant to call it with in the first place.
  - A new "Organización" dropdown filter (same UX as `MisSuscripcionesFilters`'s tenant select) appears only when the loaded rows span more than one `tenant_id`; options are derived from the loaded rows (`tenant_id` + `tenant_nombre`), not a separate query.
  - `MisReservasTable` gains an "Organización" column (`tenant_nombre`).
- The old tenant-scoped route `src/app/portal/orgs/[tenant_id]/(atleta)/mis-reservas/page.tsx` becomes a redirect to `/portal/mis-reservas`, mirroring `mis-suscripciones-y-pagos/page.tsx`.
- `resolvePortalMenu` (`src/types/portal.types.ts`): remove `{ label: 'Mis Reservas', path: 'mis-reservas', ... }` from `ROLE_TENANT_ITEMS.usuario` (tenant-scoped nav) and add a `MIS_RESERVAS_MENU_ITEM` to the tenant-less branch (`!tenantId`), positioned after `MIS_SUSCRIPCIONES_MENU_ITEM`, so it shows in the portal home nav for every authenticated user — same no-role-gate rationale as `(atleta)/layout.tsx` already documents for Mis Suscripciones: reservations are always self-scoped by `atleta_id = auth.uid()` regardless of what per-tenant role the caller holds elsewhere, and a public-training booker may hold no tenant membership at all.
- `src/app/portal/(atleta)/layout.tsx` (the existing pass-through, no-role-gate layout) already covers the new route — no changes needed there.

---

## Database Changes

### 1. Fix `reservas_select_authenticated` — scope the public-training branch to the caller's own booking

**Current policy** (from `20260727010000_entrenamientos_publicos_sync_visibilidad.sql`):

```sql
create policy reservas_select_authenticated on public.reservas
  for select to authenticated
  using (
    exists (
      select 1 from public.miembros_tenant mt
      where mt.tenant_id = reservas.tenant_id
        and mt.usuario_id = auth.uid()
    )
    or exists (
      select 1 from public.entrenamientos e
      where e.id = reservas.entrenamiento_id
        and e.visibilidad = 'publico'
    )
  );
```

**Problem**: the second branch has no `atleta_id = auth.uid()` check. Today, *any* authenticated user can read *every* reservation (any athlete's) for *any* published public training, regardless of who booked it. This long predates this story but must be fixed before this story ships a UI that surfaces reservation data more visibly, and it is a prerequisite for "mis reservas" being scoped correctly by RLS instead of trusting the query.

**Migration**: `supabase/migrations/20260729190000_reservas_select_policy_scope_public_to_owner.sql`

```sql
begin;

drop policy if exists reservas_select_authenticated on public.reservas;
create policy reservas_select_authenticated on public.reservas
  for select to authenticated
  using (
    exists (
      select 1 from public.miembros_tenant mt
      where mt.tenant_id = reservas.tenant_id
        and mt.usuario_id = auth.uid()
    )
    or (
      atleta_id = auth.uid()
      and exists (
        select 1 from public.entrenamientos e
        where e.id = reservas.entrenamiento_id
          and e.visibilidad = 'publico'
      )
    )
  );

commit;
```

This is additive-safe: tenant staff still see every booking in their own tenant via the first branch (including public trainings they host); athletes keep seeing their own bookings everywhere; non-members lose the ability to see *other* athletes' bookings on public trainings, which is the fix.

### 2. Confirm cross-tenant SELECT already works for own tenant memberships — no change needed

The first branch of `reservas_select_authenticated` is evaluated **per row** against that row's own `tenant_id`, not against a single tenant passed in by the query. A query with no `tenant_id` filter (`select * from reservas_reporte_view where atleta_id = auth.uid()`) already returns, correctly, every reservation the caller made in every tenant where they hold a `miembros_tenant` row — this already is cross-tenant without any RLS change. Confirmed by inspection; no migration needed for this part.

### 3. Extend `reservas_reporte_view` with `tenant_nombre`

**Migration**: `supabase/migrations/20260729190100_reservas_reporte_view_add_tenant_nombre.sql`

```sql
DROP VIEW IF EXISTS public.reservas_reporte_view;

CREATE VIEW public.reservas_reporte_view
WITH (security_invoker = true)
AS
SELECT
  r.id                          AS reserva_id,
  r.tenant_id,
  t.nombre                      AS tenant_nombre,
  r.entrenamiento_id,
  r.atleta_id,
  r.estado                      AS reserva_estado,
  r.fecha_reserva,
  r.fecha_cancelacion,
  r.notas                       AS notas_reserva,
  r.created_at,
  -- Athlete
  a.nombre                      AS atleta_nombre,
  a.apellido                    AS atleta_apellido,
  a.email                       AS atleta_email,
  a.telefono                    AS atleta_telefono,
  a.tipo_identificacion,
  a.numero_identificacion,
  a.fecha_nacimiento,
  a.fecha_exp_identificacion,
  -- Training
  e.nombre                      AS entrenamiento_nombre,
  e.fecha_hora                  AS entrenamiento_fecha,
  -- Discipline & Scenario
  d.nombre                      AS disciplina,
  s.nombre                      AS escenario,
  -- Category level
  nd.nombre                     AS nivel_disciplina,
  -- Attendance
  asi.asistio,
  asi.fecha_asistencia,
  asi.observaciones              AS observaciones_asistencia,
  -- Validator
  v.email                       AS validado_por_email
FROM public.reservas r
  INNER JOIN public.usuarios          a   ON a.id  = r.atleta_id
  INNER JOIN public.entrenamientos    e   ON e.id  = r.entrenamiento_id
  LEFT  JOIN public.tenants           t   ON t.id  = r.tenant_id
  LEFT  JOIN public.disciplinas       d   ON d.id  = e.disciplina_id
  LEFT  JOIN public.escenarios        s   ON s.id  = e.escenario_id
  LEFT  JOIN public.entrenamiento_categorias ec ON ec.id = r.entrenamiento_categoria_id
  LEFT  JOIN public.nivel_disciplina  nd  ON nd.id = ec.nivel_id
  LEFT  JOIN public.asistencias       asi ON asi.reserva_id = r.id
  LEFT  JOIN public.usuarios          v   ON v.id  = asi.validado_por;

GRANT SELECT ON public.reservas_reporte_view TO authenticated;
```

**Also discovered and fixed here**: `reservas_reporte_view` is owned by `postgres`, which has `BYPASSRLS`. Postgres views check row-level security using the *view owner's* privileges by default, not the querying role's, unless `security_invoker` is set (PG15+). Every prior version of this view therefore silently bypassed `reservas` RLS entirely — any authenticated user with `SELECT` on the view (granted since its creation) could read every reservation across every tenant, regardless of the `.eq(...)` filters `getReservasManagement`/`getMisReservas` apply in the service layer. Those filters were the *only* access control actually in effect — not defense-in-depth on top of RLS, as prior migration comments ("RLS on underlying tables still applies") assumed. Adding `WITH (security_invoker = true)` to the `CREATE VIEW` statement above closes this: the view now evaluates policies as the calling role, so the fixed `reservas_select_authenticated` policy (migration 1) is what actually governs visibility. Verified locally: an unfiltered query against the view as a non-staff athlete went from returning every seeded row to returning exactly their own; a tenant admin querying with a `tenant_id` filter still correctly saw every row in their tenant.

### 4. `gestion-reservas` (staff-facing management view) is unaffected

`getReservasManagement` and the admin/coach `gestion-reservas` page already require an explicit `tenantId` and are governed by the *first* branch of `reservas_select_authenticated` (tenant membership) — untouched by this story's RLS fix. No regression there.

---

## API / Server Actions

No new server actions or API routes. Existing service functions are modified:

- **File**: `src/services/supabase/portal/reservas.service.ts`
  - **Function**: `getMisReservas(filters: MisReservasFilters): Promise<ReservaReportRow[]>`
  - **Change**: remove the mandatory `.eq('tenant_id', filters.tenantId)`; apply it only `if (filters.tenantId)`. Keep `.eq('atleta_id', filters.atletaId)` unconditionally.
  - **Auth / RLS**: relies entirely on the fixed `reservas_select_authenticated` policy — the service performs no tenant-membership check itself, same as today.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260729190000_reservas_select_policy_scope_public_to_owner.sql` | Fix RLS leak: scope public-training SELECT branch to `atleta_id = auth.uid()` |
| Migration | `supabase/migrations/20260729190100_reservas_reporte_view_add_tenant_nombre.sql` | Recreate `reservas_reporte_view` adding `tenant_nombre` |
| Types | `src/types/portal/reservas.types.ts` | `ReservaReportRow.tenant_nombre: string \| null`; `MisReservasFilters.tenantId` becomes optional |
| Service | `src/services/supabase/portal/reservas.service.ts` | `getMisReservas`: drop mandatory tenant filter, apply only when provided |
| Hook | `src/hooks/portal/mis-reservas/useMisReservas.ts` | Signature `useMisReservas(atletaId: string)` (drop `tenantId` param); derive `disciplines: string[]` and `tenantOptions: { id: string; nombre: string }[]` from loaded rows instead of `disciplinesService`; add `tenantId` filter state wired into `applyFilters`/`clearFilters` |
| Component | `src/components/portal/mis-reservas/MisReservasFiltersPanel.tsx` | Replace `Discipline[]` prop with derived `disciplines: string[]`; add "Organización" `<select>` shown only when `tenantOptions.length > 1` (mirrors `MisSuscripcionesFilters.tsx`) |
| Component | `src/components/portal/mis-reservas/MisReservasTable.tsx` | Add "Organización" column rendering `tenant_nombre` |
| Component | `src/components/portal/mis-reservas/MisReservasPage.tsx` | Drop `tenantId` prop; update copy ("esta organización" → "tus organizaciones"); pass new filter props through |
| Page (new) | `src/app/portal/(atleta)/mis-reservas/page.tsx` | Cross-tenant entrypoint: auth check, calls `MisReservasPage` with `atletaId` only (mirrors `(atleta)/mis-suscripciones/page.tsx`) |
| Page (legacy) | `src/app/portal/orgs/[tenant_id]/(atleta)/mis-reservas/page.tsx` | Replace with a redirect to `/portal/mis-reservas` (mirrors `mis-suscripciones-y-pagos/page.tsx`) |
| Menu | `src/types/portal.types.ts` | Remove `Mis Reservas` from `ROLE_TENANT_ITEMS.usuario`; add `MIS_RESERVAS_MENU_ITEM` to the `!tenantId` branch of `resolvePortalMenu`, after `MIS_SUSCRIPCIONES_MENU_ITEM` |
| Docs | `projectspec/03-project-structure.md` | Update the `mis-reservas` entries to reflect the new cross-tenant location (developer housekeeping, not user-facing) |

---

## Acceptance Criteria

1. Navigating to `/portal/mis-reservas` while authenticated shows every reservation across every organization the user is (or was) a member of, plus any reservation made through cross-tenant public-training bookings — without needing to select an organization first.
2. A user who is a member of two or more organizations, and has reservations in more than one, sees an "Organización" filter dropdown; selecting one organization narrows the list to that tenant's reservations only. The dropdown is hidden when all loaded reservations belong to a single organization.
3. A user with reservations in only one organization does not see the "Organización" filter (parity with `MisSuscripcionesFilters`'s tenant select behavior).
4. The discipline filter's options reflect only disciplines actually present among the user's own loaded reservations (no membership-gated service call, no disciplines from unrelated tenants).
5. Each row displays the organization name (`tenant_nombre`), the discipline, training name/date, reservation status, attendance status, and reservation date — same columns as today plus "Organización".
6. A user who booked a public training as a non-member (no `miembros_tenant` row in the hosting tenant) sees that reservation in the list.
7. Date-range, attendance, and CSV export behavior are preserved exactly as in the tenant-scoped version (same presets, same 60-day custom-range validation, same "last 100 without filters" banner copy, same CSV columns plus a new `Organización` column).
8. Visiting the old URL `/portal/orgs/{tenant_id}/mis-reservas` redirects to `/portal/mis-reservas`.
9. The "Mis Reservas" nav entry no longer appears inside a specific organization's tenant-scoped menu; it appears once in the portal home / cross-tenant nav, visible to every authenticated user (no role gate), consistent with "Mis Suscripciones".
10. Querying `reservas_reporte_view` directly via the REST API as authenticated user A for a public training booked by authenticated user B returns zero rows for B's booking — i.e., both the RLS policy fix (Database Changes item 1) and the `security_invoker = true` view fix (Database Changes item 3) are verified to close the previous cross-user leak, including at the view level.
11. Tenant staff (`entrenador`/`administrador`) continue to see every reservation in their own tenant (including public-training bookings hosted by that tenant) via `gestion-reservas`, unaffected by the RLS change.
12. Empty state: a user with zero reservations anywhere sees an appropriate empty-state message (not the old "No tienes reservas registradas en esta organización" copy, which is tenant-specific).

---

## Implementation Steps

- [ ] Write and apply migration `20260729190000_reservas_select_policy_scope_public_to_owner.sql`; verify via SQL that a second test user can no longer read another athlete's public-training reservation
- [ ] Write and apply migration `20260729190100_reservas_reporte_view_add_tenant_nombre.sql`; verify `tenant_nombre` appears in the view for existing rows
- [ ] Update `ReservaReportRow` and `MisReservasFilters` types
- [ ] Update `reservasService.getMisReservas` to make `tenantId` optional
- [ ] Update `useMisReservas` hook: drop `tenantId` param, derive `disciplines`/`tenantOptions` from loaded rows, add org filter state
- [ ] Update `MisReservasFiltersPanel`, `MisReservasTable`, `MisReservasPage` for the cross-tenant shape
- [ ] Create `src/app/portal/(atleta)/mis-reservas/page.tsx`
- [ ] Replace `src/app/portal/orgs/[tenant_id]/(atleta)/mis-reservas/page.tsx` with a redirect
- [ ] Update `resolvePortalMenu` in `src/types/portal.types.ts` (remove tenant-scoped entry, add cross-tenant entry)
- [ ] Update `projectspec/03-project-structure.md`
- [ ] Manual test: multi-org athlete, single-org athlete, public-training-only (non-member) booker, zero-reservations athlete, CSV export, old-URL redirect
- [ ] Manual test: confirm `gestion-reservas` (staff view) still shows all tenant bookings after the RLS change

---

## Non-Functional Requirements

- **Security**: The RLS fix in Database Changes item 1 is the critical security requirement of this story — it closes a pre-existing leak where any authenticated user could read any other athlete's reservation on a public training. This must be verified before this story is considered done, independent of the UI move.
- **Performance**: No new indexes required — existing `idx_reservas_tenant_entrenamiento` and the `atleta_id` column (already indexed via `20260625000200`'s addition to the view, underlying table access pattern unchanged) cover the query shape. The "last 100 without active filters" cap from US-0074 is preserved to bound unfiltered cross-tenant result size.
- **Accessibility**: Reuse existing filter/table components' patterns (labeled selects, `aria-pressed` chips) — no new interaction patterns introduced.
- **Error handling**: Preserve the existing inline error banner + "Reintentar" retry button pattern from `MisReservasPage`.
