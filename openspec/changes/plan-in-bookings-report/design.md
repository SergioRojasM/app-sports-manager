## Context

All three bookings-report surfaces read the same Postgres view, `public.reservas_reporte_view` (last redefined in `20260813180000_omitir_confirmacion_plan.sql`):

1. **Per-training CSV** — `ReservasPanel.handleExportCsv` → `reservasService.getReservasReport(tenantId, entrenamientoId)`, 22 columns.
2. **Tenant "Gestión de Reservas"** — `useGestionReservas` → `reservasService.getReservasManagement(filters)`, 7 table columns / 11 CSV columns.
3. **Athlete "Mis Reservas"** — `useMisReservas` → `reservasService.getMisReservas(filters)`, 7 table columns / 9 CSV columns.

The view exposes tenant, athlete, training, discipline, scenario, level, attendance and validator — no subscription or plan column at all.

**The booking → plan link is not a direct FK on `reservas`.** It is resolved through two distinct paths, and both are needed for full coverage:

- **The consumption ledger** — `reserva_servicios (reserva_id, suscripcion_id, servicio_id)`, written by `book_and_deduct_service_units` (`20260831120000_defer_plan_purchase_until_reserva.sql:353`). A booking has one row per required service, normally all pointing at the same `suscripcion`. This is the authoritative "which plan paid for this booking" record.
- **`reservas.suscripcion_id`** — populated **only** in the deferred plan-purchase path (US-0106/US-0110), where the booking is inserted as `pendiente` alongside a not-yet-approved subscription and no units have been deducted yet. In the ordinary confirmed flow this column stays NULL: `reservas.service.ts:900` passes `p_suscripcion_id: null` unconditionally.

From either path the human-readable name is reached via `suscripciones.plan_id → planes.nombre` (`planes.nombre varchar(100)`, unique per tenant). The denormalized field is already called `plan_nombre` elsewhere (`mis-suscripciones.service.ts:61`, `gestion-suscripciones.service.ts:82`, `inicio.service.ts:169`).

**The plan's validity dates live on the subscription, not on the plan.** `planes` carries no dates — `vigencia_meses` was dropped in `20260331000100_remove_planes_precio_vigencia_clases.sql`, and `plan_tipos.vigencia_dias` is only the *catalog* duration, not the window applying to a given athlete. The real window is `suscripciones.fecha_inicio` / `suscripciones.fecha_fin` (both `date`, both nullable; `getServicioEntitlements` at `reservas.service.ts:588-590` already treats NULL as "covers").

Two pre-existing obstacles block a naive implementation and are in scope:

- **RLS gap for coaches.** `reservas_reporte_view` is `security_invoker = true` (deliberately — see the header of `20260729190100_reservas_reporte_view_add_tenant_nombre.sql`), so joined tables are evaluated with the *caller's* privileges. Both join targets are readable today only by the owning athlete or a tenant **administrador**: `suscripciones` (`suscripciones_select_own` + `suscripciones_select_admin`) and `reserva_servicios` (`reserva_servicios_select`, `20260612000100_restricciones_por_servicio.sql:73`), both via `get_admin_tenants_for_authenticated_user()`, which matches `lower(r.nombre) = 'administrador'` only. But `entrenador` also has access to Gestión de Reservas (`portal.types.ts:90`) and to the per-training CSV (`ReservasPanel.tsx:94`).
- **Unlimited entitlements lose the link at write time.** `findServiceSubscriptionsToCharge` (`reservas.service.ts:634`) deliberately sends `suscripcionId: null` when a plan covers a service with unlimited units, so `reserva_servicios` records *which service* was used but not which subscription.

## Goals / Non-Goals

**Goals:**
- Surface, on all three report surfaces, the plan a booking's units were deducted from plus that subscription's validity window.
- Cover both link paths (ledger and `reservas.suscripcion_id`) so confirmed and deferred-purchase `pendiente` bookings both report a plan.
- Guarantee the three values always describe the **same** subscription.
- Make the data actually visible to `entrenador`, not just `administrador`, without widening tenant scope.
- Fix the write path so bookings covered by unlimited plans record their subscription going forward.

**Non-Goals:**
- The per-training `.xlsx` form-responses export (`handleExportFormularioRespuestas`) — different dataset, no plan linkage.
- Preserving the link on cancelled bookings (`cancel_and_restore_service_units` deletes the ledger rows).
- Backfilling historical unlimited-plan bookings.
- Reporting every plan for a multi-subscription booking.
- Any write-policy change, any change to `pagos`, plan pricing, or the deduction arithmetic itself.

## Decisions

### D1 — `LEFT JOIN LATERAL ... limit 1` over `string_agg`

The three columns must be **coherent**: a name paired with that same subscription's dates. `string_agg(distinct p.nombre, ', ')` would produce `"Plan A, Plan B"` with no single date range to pair with it. A LATERAL that picks one subscription row deterministically keeps name and dates from the same row.

Ordering is `order by rs.created_at, su.id` — the timestamps are typically identical (same transaction), so `su.id` is the real tie-breaker. It exists for determinism, not preference.

*Alternative considered*: a correlated scalar subquery per column. Rejected — three independent subqueries could each resolve a different subscription, which is exactly the incoherence D1 exists to prevent.

### D2 — `coalesce(ledger, direct)` rather than one path only

The ledger is authoritative for confirmed bookings but is empty for a `pendiente` booking riding on an unapproved plan purchase (US-0106/US-0110), where only `reservas.suscripcion_id` is set. Conversely the ordinary confirmed flow leaves `reservas.suscripcion_id` NULL. Neither path alone gives full coverage, so each of the three columns is `coalesce(<lateral>, <direct join>)`, with the ledger first.

### D3 — Keep the dates as `date` columns, not pre-formatted text

Formatting in SQL would make the columns unsortable and uncomparable, and would push locale decisions into the database. The view returns `date`; formatting happens in the component.

**Consequence (the single most likely defect in this change):** the values arrive as bare `YYYY-MM-DD`. The tables' existing `formatDate` (`ReservasManagementTable.tsx:16`) does `new Date(iso)`, which parses a bare date as **UTC midnight** and renders the *previous* day in es-CO (UTC−5). Use the date-only-safe pattern already established in `SuscripcionesTable.tsx:30-38` (split into y/m/d, build a local `Date`); `EntrenamientoDetalleModal.tsx:57` solves the same problem with `timeZone: 'UTC'`. Either is acceptable; a bare `new Date(iso)` is not.

### D4 — Widen RLS with the existing trainer-or-admin helper, never `using (true)`

Reuse `public.get_trainer_or_admin_tenants_for_authenticated_user()` (`20260302000200_reservas_rls_policies.sql:15`) — the helper that already encodes exactly this role set and is what `reservas_select_authenticated` uses for the booking rows themselves. This aligns plan-link visibility with who can already read the bookings.

Note the helper returns `table(tenant_id uuid)` — **not** `setof tenants` like the admin helper — so the subquery selects `tenant_id`, not `id`.

- `suscripciones`: policies are OR-ed, so `suscripciones_select_trainer` is **added** alongside `suscripciones_select_own` / `suscripciones_select_admin` without dropping them.
- `reserva_servicios`: `reserva_servicios_select` is **replaced**, swapping the admin-only helper for the trainer-or-admin one. The `r.atleta_id = auth.uid()` athlete branch is unchanged.
- `planes` needs no change — `planes_select_authenticated` is already readable by any authenticated user.

*Alternative considered*: making the view `security_definer`. Rejected outright — it would reintroduce the cross-tenant RLS bypass documented in `20260729190100`.

### D5 — Fix the unlimited-entitlement write path in TypeScript, no migration

`findServiceSubscriptionsToCharge:634` always emits `suscripcionId: available.suscripcionId` instead of nulling it for unlimited entitlements. This is safe because `book_and_deduct_service_units` independently re-reads `unidades_restantes is null` from `suscripcion_servicios` into `v_unlimited` and skips the `update` on that basis — passing a subscription id records the link **without** deducting units. The RPC needs no change.

### D6 — One two-line table column, three separate CSV columns

The tables get a single **Plan** column after *Entrenamiento*: name on the first line, validity range as a muted sub-line, reusing the two-line cell pattern of the *Atleta* cell (`ReservasManagementTable.tsx:110-117`). This keeps the tables at 8 columns instead of 10. `—` when there is no plan; `Sin fecha` for a NULL side of an otherwise-present range (the plan name still renders). The `colSpan={7}` on the empty-results row becomes `8` in both tables.

CSVs get **three separate columns** (`Plan`, `Plan desde`, `Plan hasta`), not a merged range string, so the file stays usable in a spreadsheet.

Export-mechanics constraint:
- `ReservasPanel` calls `toCsvString(mapped, [...csvHeaders])`, which orders output by the headers array — the new keys must be added in the **same positions** in both the header array and the `mapped` object (after `notas_reserva`).
- `useGestionReservas` / `useMisReservas` call `toCsvString(exportRows)` with no headers argument, so columns are inferred from `Object.keys(rows[0])` — key position in the object literal determines column position. These two export the raw `YYYY-MM-DD` values, consistent with how they already emit raw ISO timestamps.

### D7 — Layering

Per the project methodology (page → component → hook → service → types), no page changes and no new server actions or routes. `getReservasReport` / `getReservasManagement` / `getMisReservas` all `select('*')` from the view and inherit the three columns with no code change; `ReservaReportRow` stays 1:1 with the view.

```
reservas_reporte_view (+3 cols)
   ├─ lateral → reserva_servicios → suscripciones → planes      [confirmed]
   └─ direct  → reservas.suscripcion_id → suscripciones → planes [pendiente]
        │
        ▼  select('*')
   reservas.service.ts  getReservasReport / getReservasManagement / getMisReservas
        │
        ▼  ReservaReportRow (+3 fields)
   useGestionReservas / useMisReservas ──► CSV exportRows
        │
        ▼
   ReservasManagementTable / MisReservasTable  (Plan column)
   ReservasPanel                               (csvHeaders + mapped)
```

## Risks / Trade-offs

- **Off-by-one date rendering** → The most likely defect. `date` values must never go through a bare `new Date(iso)` in a locally-rendered component; use the `SuscripcionesTable` split-and-rebuild pattern or `timeZone: 'UTC'`. Acceptance criterion: a subscription starting `2026-03-01` displays as 1 Mar 2026 in es-CO, not 28/29 Feb.
- **Coaches gain read access to subscription rows** → The widened `suscripciones` policy also exposes subscription dates, state and `comentarios` to `entrenador` within their own tenants. Judged acceptable: coaches already read the bookings themselves. `pagos` (the table holding amounts) is not touched, and the scope stays strictly tenant-bound via the helper.
- **Cross-tenant leakage if the helper subquery is written wrong** → The trainer helper returns `tenant_id`, not `id`. Selecting the wrong column would fail loudly, but the policies must be verified by signing in as a coach/admin of tenant A and confirming tenant B's subscriptions return no rows.
- **Cancelled bookings report `—`** → `cancel_and_restore_service_units` deletes the ledger rows (`20260612000100_restricciones_por_servicio.sql:243`). Accepted limitation, documented in the migration header.
- **No backfill for unlimited plans** → D5 applies going forward only; historical rows stored `suscripcion_id = NULL` and are not reconstructible. Documented in the migration header.
- **Multi-subscription bookings report only the first** → `findServiceSubscriptionsToCharge` resolves each required service independently (fewest remaining units), so a training requiring "Clase" and "Sauna" can legitimately draw from two plans. Accepted for a reconciliation report; if it proves common, the follow-up is a separate per-service breakdown, not widening these three columns. Documented in the migration header.
- **Performance** → The LATERAL is keyed on `reserva_servicios.reserva_id` (covered by `idx_reserva_servicios_reserva_id`) and its `limit 1` is cheaper than the aggregate alternative; the fallback join uses `idx_reservas_suscripcion_id`. No new indexes. Reports remain capped at 100 rows when unfiltered.
- **View recreation drops columns silently** → The `drop view` + `create view` must carry all 28 existing columns forward from `20260813180000_omitir_confirmacion_plan.sql:391-441` (including `motivo_rechazo`). A missed column breaks all three surfaces at once.

## Migration Plan

Single migration: `supabase/migrations/20260831190000_reservas_reporte_view_plan_nombre.sql`, applied **locally only** — never pushed to the remote Supabase server.

1. `drop policy if exists suscripciones_select_trainer` → `create policy suscripciones_select_trainer` (added alongside the two existing SELECT policies).
2. `drop policy if exists reserva_servicios_select` → recreate with the trainer-or-admin helper, athlete branch unchanged.
3. `drop view if exists public.reservas_reporte_view` → recreate with `security_invoker = true`, all 28 existing columns, the LATERAL, the fallback joins and the three new columns; `grant select ... to authenticated`.
4. Header comment documents the three known limitations (cancelled bookings, no unlimited backfill, multi-subscription).

Rollback: re-apply the view definition from `20260813180000_omitir_confirmacion_plan.sql` and restore `reserva_servicios_select` from `20260612000100_restricciones_por_servicio.sql`, then drop `suscripciones_select_trainer`. The TypeScript write-path change (D5) is independently revertable and leaves no schema trace.

## Open Questions

None blocking. The multi-subscription display (one plan vs. a per-service breakdown) is deliberately deferred pending evidence that the case occurs in practice.
