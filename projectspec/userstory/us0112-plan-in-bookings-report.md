# US-0112 — Show the Deducted Plan and Its Validity Window in the Bookings Report

## ID
US-0112

## Name
Surface the Plan a Booking Was Deducted From, and Its Validity Dates, Across the Bookings Report

## As a
Tenant administrator or coach reviewing the bookings report (and an athlete reviewing their own booking history)

## I Want
Each reservation row to show the name of the plan its service units were deducted from, together with that plan's start and end dates, in the on-screen table and in every CSV export

## So That
I can reconcile bookings against the plans that were sold — telling apart a booking paid with a subscription from one that consumed nothing, and seeing at a glance whether the booking fell inside the plan's validity window — without cross-referencing the subscriptions module row by row

---

## Description

### Current State

- All three bookings-report surfaces read the **same** Postgres view, `public.reservas_reporte_view` (last redefined in `20260813180000_omitir_confirmacion_plan.sql`):
  1. **Per-training CSV** — `ReservasPanel.handleExportCsv` → `reservasService.getReservasReport(tenantId, entrenamientoId)`, 22 columns.
  2. **Tenant "Gestión de Reservas"** — `useGestionReservas` → `reservasService.getReservasManagement(filters)`, 7 table columns / 11 CSV columns.
  3. **Athlete "Mis Reservas"** — `useMisReservas` → `reservasService.getMisReservas(filters)`, 7 table columns / 9 CSV columns.
- The view exposes tenant, athlete, training, discipline, scenario, level, attendance and validator — **no subscription or plan column at all**. There is no way, from any of the three reports, to know which plan paid for a booking.
- The booking→plan link is **not** a direct FK on `reservas`. It is resolved through two distinct paths, and both are needed for full coverage:
  1. **The consumption ledger** — `reserva_servicios (reserva_id, suscripcion_id, servicio_id)`, written by `book_and_deduct_service_units` (`20260831120000_defer_plan_purchase_until_reserva.sql:353`). A booking has one row per required service, normally all pointing at the same `suscripcion`. This is the authoritative "which plan paid for this booking" record.
  2. **`reservas.suscripcion_id`** — populated **only** in the deferred plan-purchase path (US-0106/US-0110), where the booking is inserted as `pendiente` alongside a not-yet-approved subscription and no units have been deducted yet. In the ordinary confirmed flow this column stays **NULL**: `reservas.service.ts:900` passes `p_suscripcion_id: null` unconditionally, and the value is only set internally when `p_plan_purchase` rides along.
- From either path the human-readable name is reached via `suscripciones.plan_id → planes.nombre` (`planes.nombre varchar(100)`, unique per tenant). This denormalized field is already called `plan_nombre` elsewhere in the codebase (`mis-suscripciones.service.ts:61`, `gestion-suscripciones.service.ts:82`, `inicio.service.ts:169`), so the name is consistent with existing convention.
- **The plan's validity dates are on the subscription, not on the plan.** `planes` carries no dates at all — `vigencia_meses` was dropped from it in `20260331000100_remove_planes_precio_vigencia_clases.sql` ("these fields are now exclusively on plan_tipos"), and `plan_tipos.vigencia_dias` is only the *catalog* duration, not the window that actually applies to a given athlete. The real window is `suscripciones.fecha_inicio` / `suscripciones.fecha_fin` (both `date`, both nullable — NULL means open-ended on that side, and `getServicioEntitlements` at `reservas.service.ts:588-590` already treats NULL as "covers"). Those two columns are what this story surfaces.

Two pre-existing obstacles block a naive implementation and are in scope for this story:

- **RLS gap for coaches.** `reservas_reporte_view` is `security_invoker = true` (deliberately — see the header of `20260729190100_reservas_reporte_view_add_tenant_nombre.sql`), so any joined table is evaluated with the *caller's* privileges. Both join targets are currently readable only by the owning athlete or a tenant **administrator**:
  - `suscripciones` — `suscripciones_select_own` (`atleta_id = auth.uid()`) + `suscripciones_select_admin` (via `get_admin_tenants_for_authenticated_user()`, which matches `lower(r.nombre) = 'administrador'` **only**).
  - `reserva_servicios` — `reserva_servicios_select` (`20260612000100_restricciones_por_servicio.sql:73`), same admin-only helper.

  But **`entrenador` also has access to Gestión de Reservas** (`portal.types.ts:90`) and to the per-training CSV (`ReservasPanel.tsx:94`, `isAdmin = role === 'administrador' || role === 'entrenador'`). Without an RLS change a coach would get a silently blank Plan column — indistinguishable from "this booking used no plan", which is a worse outcome than not shipping the column.

- **Unlimited entitlements lose the link at write time.** When a plan covers a service with unlimited units, `findServiceSubscriptionsToCharge` (`reservas.service.ts:634`) deliberately sends `suscripcionId: null`, so `reserva_servicios` records *which service* was used but **not which subscription**. The information is therefore absent from the database, not merely from the report — bookings covered by unlimited plans would show blank no matter how the view is written.

### Proposed Changes

**Data access / RLS**
- Widen the `SELECT` policies on `suscripciones` and `reserva_servicios` from administrator-only to **tenant staff** (`entrenador` + `administrador`), reusing the helper that already exists for exactly this role set: `public.get_trainer_or_admin_tenants_for_authenticated_user()` (`20260302000200_reservas_rls_policies.sql:15`). This aligns plan-link visibility with who can already read the booking rows themselves under `reservas_select_authenticated`. Athlete self-access (`suscripciones_select_own`, and the `r.atleta_id = auth.uid()` branch of `reserva_servicios_select`) is unchanged.
- `planes` needs no change — `planes_select_authenticated` is already readable by any authenticated user.

**View**
- Recreate `reservas_reporte_view` with three new columns — `plan_nombre`, `plan_fecha_inicio`, `plan_fecha_fin` — each resolved as `coalesce(<ledger lookup>, <direct suscripcion_id lookup>)` so both the deducted and the pending-plan cases are covered.
- Because the three values must describe **the same** subscription, the ledger lookup is a `LEFT JOIN LATERAL` that picks **one** subscription row deterministically rather than aggregating names with `string_agg`. A booking whose services resolve to two different subscriptions therefore reports the first of them, not a merged pair — see the limitation note below. `plan_fecha_inicio` / `plan_fecha_fin` are kept as real `date` columns (not pre-formatted text) so they stay sortable and comparable.
- `security_invoker = true` and the `grant select ... to authenticated` are preserved.

**Write-path fix**
- Record the real `suscripcionId` in `reserva_servicios` even when the entitlement is unlimited. This is safe: the RPC independently re-reads `unidades_restantes is null` from `suscripcion_servicios` into `v_unlimited` and skips the `update` on that basis, so passing a subscription id records the link **without** deducting units. No migration is needed — only the TypeScript that builds the deductions payload.

**Frontend**
- Add `plan_nombre`, `plan_fecha_inicio` and `plan_fecha_fin` (all `string | null`) to `ReservaReportRow` (the type is 1:1 with the view).
- Add a single **Plan** column to both management tables, positioned after *Entrenamiento*, rendering the plan name on the first line and the validity range as a muted sub-line — reusing the two-line cell pattern already used by the *Atleta* cell (`ReservasManagementTable.tsx:110-117`). This keeps the table at 8 columns instead of 10 while still showing the dates. When there is no plan the cell renders `—`; when there is a plan but a date is NULL, that side of the range reads `Sin fecha`.
- The dates are `date` values (`YYYY-MM-DD`), so they must **not** go through the tables' existing `formatDate` (`ReservasManagementTable.tsx:16`), which does `new Date(iso)` — that parses a bare date as UTC midnight and renders the *previous* day in es-CO (UTC−5). Use the date-only-safe pattern already established in `SuscripcionesTable.tsx:30-38` (split into y/m/d and build a local `Date`); `EntrenamientoDetalleModal.tsx:57` solves the same problem with `timeZone: 'UTC'`. Either is acceptable, but it must be one of them.
- Add three fields — `Plan`, `Plan desde`, `Plan hasta` — to all three CSV exports, as separate columns (not a merged range string) so the file stays usable in a spreadsheet.
- The per-training `.xlsx` export (`handleExportFormularioRespuestas`) is **out of scope**: it exports `formulario_respuestas`, a different dataset that does not read `reservas_reporte_view` and has no plan linkage.

---

## Database Changes

Single migration: `supabase/migrations/20260831190000_reservas_reporte_view_plan_nombre.sql`

### 1. Widen `suscripciones` SELECT to tenant staff

RLS policies are OR-ed, so this is added alongside the existing `suscripciones_select_own` / `suscripciones_select_admin` without dropping them. Note the helper returns `table(tenant_id uuid)` — **not** `setof tenants` like the admin helper — so the subquery selects `tenant_id`, not `id`.

```sql
drop policy if exists suscripciones_select_trainer on public.suscripciones;
create policy suscripciones_select_trainer on public.suscripciones
  for select to authenticated
  using (
    tenant_id in (
      select tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user()
    )
  );
```

### 2. Widen `reserva_servicios` SELECT to tenant staff

Replaces the existing policy from `20260612000100_restricciones_por_servicio.sql:73`, swapping the admin-only helper for the trainer-or-admin one. The athlete branch is unchanged.

```sql
drop policy if exists reserva_servicios_select on public.reserva_servicios;
create policy reserva_servicios_select
  on public.reserva_servicios
  for select to authenticated
  using (
    reserva_id in (
      select r.id
      from public.reservas r
      where r.atleta_id = auth.uid()
         or r.tenant_id in (
           select tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user()
         )
    )
  );
```

### 3. Recreate `reservas_reporte_view` with `plan_nombre`, `plan_fecha_inicio`, `plan_fecha_fin`

Carry the full definition forward from `20260813180000_omitir_confirmacion_plan.sql:391-441` (which includes `motivo_rechazo`) and add the three new columns plus their joins. Only the delta is shown here:

```sql
drop view if exists public.reservas_reporte_view;

create view public.reservas_reporte_view
with (security_invoker = true)
as
select
  ...                                     -- all 28 existing columns, unchanged
  -- Plan the booking was deducted from, and that subscription's validity
  -- window (US-0112). All three come from the SAME subscription.
  coalesce(rsp.plan_nombre,   pl_dir.nombre)      as plan_nombre,
  coalesce(rsp.fecha_inicio,  su_dir.fecha_inicio) as plan_fecha_inicio,
  coalesce(rsp.fecha_fin,     su_dir.fecha_fin)    as plan_fecha_fin
from public.reservas r
  ...                                     -- all existing joins, unchanged
  -- Primary source: the consumption ledger. Picks ONE subscription rather than
  -- aggregating, so name and dates always describe the same one. A booking may
  -- consume several services; they normally share a single suscripcion.
  -- Ordering is for determinism, not preference: rs.created_at is typically
  -- identical across the rows (same transaction), so su.id breaks the tie.
  left join lateral (
    select p.nombre as plan_nombre, su.fecha_inicio, su.fecha_fin
      from public.reserva_servicios rs
      join public.suscripciones     su on su.id = rs.suscripcion_id
      join public.planes            p  on p.id  = su.plan_id
     where rs.reserva_id = r.id
     order by rs.created_at, su.id
     limit 1
  ) rsp on true
  -- Fallback: 'pendiente' booking riding on a plan purchase that is not yet
  -- approved, so no reserva_servicios row exists yet (US-0106/US-0110).
  left join public.suscripciones su_dir on su_dir.id = r.suscripcion_id
  left join public.planes        pl_dir on pl_dir.id = su_dir.plan_id;

grant select on public.reservas_reporte_view to authenticated;
```

`plan_fecha_inicio` / `plan_fecha_fin` inherit the `date` type of their source columns and are nullable on both sides: NULL means the subscription is open-ended in that direction, which is a legitimate state (`suscripciones_fechas_ck` only requires `fecha_fin >= fecha_inicio` when both are set).

### Known limitations (document in the migration header)

- **Cancelled bookings lose the link.** `cancel_and_restore_service_units` deletes the booking's `reserva_servicios` rows after restoring units (`20260612000100_restricciones_por_servicio.sql:243`), so a cancelled booking reports `NULL` even though it did consume a plan. Preserving it would require redesigning unit restitution — out of scope.
- **No backfill for unlimited plans.** Bookings already created against an unlimited entitlement stored `suscripcion_id = NULL` in `reserva_servicios`; the write-path fix applies going forward only and the historical value is not reconstructible.
- **A booking spanning two subscriptions reports only the first.** `findServiceSubscriptionsToCharge` resolves each required service independently (picking the entitlement with fewest remaining units), so a training requiring, say, "Clase" and "Sauna" can legitimately draw them from two different plans. The view reports one, chosen deterministically, because the three columns must stay coherent — a merged `"Plan A, Plan B"` name could not be paired with a single start/end date. This is judged the right trade-off for a reconciliation report; if the multi-plan case turns out to be common in practice, the follow-up is a separate per-service breakdown, not widening these three columns.

---

## API / Server Actions

No new server actions or routes. One existing service function changes behavior, and three existing read functions inherit the new columns automatically because they all `select('*')` from the view.

**File**: `src/services/supabase/portal/reservas.service.ts`

| Function | Change |
|---|---|
| `findServiceSubscriptionsToCharge` (`:615`) | At `:634`, always emit `suscripcionId: available.suscripcionId` instead of nulling it out for unlimited entitlements. Update the adjacent comment (`:632`) — the ledger now records the subscription for unlimited services too; the deduction is still skipped, by the RPC, on the basis of `unidades_restantes is null`. |
| `getReservasReport` (`:1086`) | None — `select('*')` picks up all three new columns. |
| `getReservasManagement` (`:1110`) | None — same. |
| `getMisReservas` (`:1174`) | None — same. |

**Auth / RLS**: reads go through `reservas_reporte_view` (`security_invoker`), so visibility is governed by `reservas_select_authenticated` for the rows plus the two widened policies above for the `plan_nombre` value. Administrators and coaches see the plan for every booking in their tenants; athletes see it for their own bookings only.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20260831190000_reservas_reporte_view_plan_nombre.sql` | New: widen `suscripciones` + `reserva_servicios` SELECT policies to trainer-or-admin; recreate `reservas_reporte_view` with `plan_nombre` |
| Service | `src/services/supabase/portal/reservas.service.ts` | `findServiceSubscriptionsToCharge:634` — record `suscripcionId` for unlimited entitlements |
| Types | `src/types/portal/reservas.types.ts` | Add `plan_nombre`, `plan_fecha_inicio`, `plan_fecha_fin` (all `string \| null`) to `ReservaReportRow` (`:93`) |
| Component | `src/components/portal/gestion-reservas/ReservasManagementTable.tsx` | Add `Plan` `<th>` after *Entrenamiento*; two-line cell (name + validity range sub-line); add a date-only-safe formatter; `colSpan={7}` → `8` (`:99`) |
| Hook | `src/hooks/portal/gestion-reservas/useGestionReservas.ts` | Add `Plan`, `'Plan desde'`, `'Plan hasta'` to `exportRows` (`:159`) |
| Component | `src/components/portal/mis-reservas/MisReservasTable.tsx` | Same table change (two-line Plan cell + date-only formatter); `colSpan={7}` → `8` (`:99`) |
| Hook | `src/hooks/portal/mis-reservas/useMisReservas.ts` | Add `Plan`, `'Plan desde'`, `'Plan hasta'` to `exportRows` (`:175`) |
| Component | `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx` | Add `'plan_nombre'`, `'plan_fecha_inicio'`, `'plan_fecha_fin'` to `csvHeaders` (`:386`) and the matching keys to `mapped` (`:411`), all after `notas_reserva` |
| Spec | `openspec/specs/bookings-csv-export/spec.md` | Update the required column list (`:47`) from 22 to 25 columns including `plan_nombre`, `plan_fecha_inicio`, `plan_fecha_fin` |
| Docs | `projectspec/03-project-structure.md` | Note the three new `plan_*` columns on the `reservas.service.ts` entry (`:336`) |

> `ReservasPanel`'s export calls `toCsvString(mapped, [...csvHeaders])`, which orders output by the headers array — the new keys must be added in the **same positions** in both the header array and the mapped object.
>
> `useGestionReservas` / `useMisReservas` call `toCsvString(exportRows)` with no headers argument, so columns are inferred from `Object.keys(rows[0])` — the position of the `Plan` keys in the object literal determines the column positions. The CSVs export the raw `YYYY-MM-DD` values (consistent with how those two exports already emit raw ISO timestamps for the other date columns).

---

## Acceptance Criteria

1. `reservas_reporte_view` exposes `plan_nombre`, `plan_fecha_inicio` and `plan_fecha_fin`, retains all 28 pre-existing columns, and keeps `security_invoker = true`.
2. For a **confirmed** booking whose units were deducted from a subscription, the three columns return that subscription's `planes.nombre`, `fecha_inicio` and `fecha_fin`.
3. For a **pendiente** booking created through the deferred plan-purchase flow (US-0110), where no `reserva_servicios` row exists yet, all three come from the `reservas.suscripcion_id` fallback.
4. For a booking that consumed no plan, all three are `NULL` and the UI renders `—`.
5. A booking that consumed several services from the same subscription yields a single plan name and a single date range, not repeated values.
6. `plan_fecha_inicio` and `plan_fecha_fin` are `date`-typed in the view (verifiable via `\d+ reservas_reporte_view`), not pre-formatted text.
7. A subscription with a NULL `fecha_inicio` or `fecha_fin` renders that side of the range as `Sin fecha`, and does not blank out the plan name.
8. The three columns always describe the same subscription — no row shows one plan's name next to another plan's dates.
9. A user with role **administrador** sees populated plan data in Gestión de Reservas for their tenant.
10. A user with role **entrenador** sees populated plan data in Gestión de Reservas and in the per-training CSV — not blanks.
11. An **athlete** sees the plan data on their own rows in Mis Reservas, and continues to see no other athlete's reservations.
12. Widening the two policies does not expose subscriptions across tenants: a coach or admin of tenant A retrieves `NULL` plan values for (and no rows of) tenant B's subscriptions.
13. The Gestión de Reservas table shows a **Plan** column after *Entrenamiento* with the name on the first line and the validity range beneath it; the empty-results row still spans the full table width.
14. The Mis Reservas table shows the same **Plan** column, and the empty-results row still spans the full width.
15. Dates render as the stored calendar day with **no off-by-one shift** — a subscription starting `2026-03-01` displays as 1 Mar 2026 in es-CO, not 28/29 Feb.
16. Both management CSVs include `Plan`, `Plan desde` and `Plan hasta` columns.
17. The per-training CSV has 25 columns with `plan_nombre`, `plan_fecha_inicio` and `plan_fecha_fin` present, and the header order matches the row order exactly.
18. Booking a training whose required service is covered by an **unlimited** plan creates a `reserva_servicios` row with a non-null `suscripcion_id`, leaves `suscripcion_servicios.unidades_restantes` at `NULL` (nothing deducted), and shows the plan name and dates in the report.
19. Booking against a finite plan still deducts exactly one unit per required service — the write-path change causes no double or extra deduction.
20. Cancelling a booking still restores units correctly; the cancelled row afterwards shows `—` for Plan (accepted limitation).
21. The `.xlsx` form-responses export is unchanged.

---

## Implementation Steps

- [ ] Write `20260831190000_reservas_reporte_view_plan_nombre.sql` (both policies + view recreation + limitations documented in the header) and apply it locally
- [ ] Verify the new columns with a direct `select reserva_id, reserva_estado, plan_nombre, plan_fecha_inicio, plan_fecha_fin from public.reservas_reporte_view ...`
- [ ] Add `plan_nombre`, `plan_fecha_inicio`, `plan_fecha_fin` to `ReservaReportRow`
- [ ] Apply the `findServiceSubscriptionsToCharge` fix and update its comment
- [ ] Add the two-line Plan column, the date-only-safe formatter, and the `colSpan` bump to `ReservasManagementTable` and `MisReservasTable`
- [ ] Add the `Plan` / `Plan desde` / `Plan hasta` keys to the three CSV export mappings
- [ ] Verify RLS by signing in as administrador, entrenador and atleta in turn
- [ ] Test manually: confirmed-with-deduction, pendiente-with-pending-plan, no-plan, unlimited-plan, multi-service, open-ended (NULL date), and cancelled bookings
- [ ] Update `openspec/specs/bookings-csv-export/spec.md` and `projectspec/03-project-structure.md`
- [ ] Run `npm run lint` and `npx tsc --noEmit`

---

## Non-Functional Requirements

- **Security**: The two widened `SELECT` policies must scope strictly by tenant via `get_trainer_or_admin_tenants_for_authenticated_user()`; no policy may be replaced by an unconditional `using (true)`. The view must keep `security_invoker = true` — dropping it would reintroduce the cross-tenant RLS bypass documented in `20260729190100`. No write policies change. Widening `suscripciones` reads for coaches also exposes subscription dates, state and `comentarios` to them; `pagos` (the table holding amounts) is **not** touched.
- **Performance**: The `LATERAL` subquery is keyed on `reserva_servicios.reserva_id`, covered by the existing `idx_reserva_servicios_reserva_id`, and its `limit 1` keeps it cheaper than the aggregate alternative; the fallback join uses `reservas.suscripcion_id`, covered by `idx_reservas_suscripcion_id`. No new indexes required. The reports remain capped at 100 rows when unfiltered.
- **Accessibility**: The new `<th>` uses `scope="col"` like its siblings. The `—` placeholder is plain text consistent with the other nullable cells, so screen readers announce it identically. The validity sub-line is muted visually but remains real text in the DOM (same treatment as the *Atleta* cell's secondary line), not a `title` tooltip.
- **Correctness**: Date-only values must never be parsed with a bare `new Date(iso)` in a component that renders in local time — see the Proposed Changes note. This is the single most likely defect in the story.
- **Error handling**: Unchanged. A `NULL` plan, or a NULL on one side of the range, is a legitimate value rendered as `—` / `Sin fecha`, never an error state; existing hook-level error banners continue to cover query failures.
