## Why

The three bookings-report surfaces (per-training CSV, Gestión de Reservas, Mis Reservas) all read `public.reservas_reporte_view`, which exposes no subscription or plan column at all. Administrators, coaches and athletes therefore cannot tell which plan paid for a booking — or whether the booking fell inside that plan's validity window — without cross-referencing the subscriptions module row by row, which makes reconciling bookings against sold plans a manual, error-prone task.

## What Changes

- **View**: recreate `reservas_reporte_view` with three new columns — `plan_nombre`, `plan_fecha_inicio`, `plan_fecha_fin` — each resolved as `coalesce(<ledger lookup>, <reservas.suscripcion_id lookup>)`, so both the deducted (confirmed) and the deferred plan-purchase (`pendiente`, US-0106/US-0110) cases are covered. The ledger lookup is a `LEFT JOIN LATERAL ... limit 1` so all three values always describe the **same** subscription. Dates stay real `date` columns, not pre-formatted text. `security_invoker = true` and the `grant select ... to authenticated` are preserved.
- **RLS**: widen the `SELECT` policies on `suscripciones` and `reserva_servicios` from administrator-only to tenant staff (`entrenador` + `administrador`) via the existing `public.get_trainer_or_admin_tenants_for_authenticated_user()` helper. Without this, a coach — who already has access to Gestión de Reservas and the per-training CSV — would silently see a blank Plan column, indistinguishable from "no plan used". Athlete self-access is unchanged.
- **Write path**: record the real `suscripcionId` in `reserva_servicios` even when the entitlement is unlimited. Today `findServiceSubscriptionsToCharge` nulls it out, so the link is absent from the database, not merely from the report. This is safe: the RPC independently re-reads `unidades_restantes is null` and skips the deduction on that basis, so the link is recorded without consuming units. No migration needed — TypeScript only.
- **UI**: one **Plan** column after *Entrenamiento* in both management tables, rendering the plan name on the first line and the validity range as a muted sub-line (the two-line pattern already used by the *Atleta* cell). `—` when there is no plan; `Sin fecha` for a NULL side of the range. Dates must use a date-only-safe formatter — `new Date('2026-03-01')` parses as UTC midnight and renders the previous day in es-CO.
- **CSV**: add `Plan` / `Plan desde` / `Plan hasta` (management exports) and `plan_nombre` / `plan_fecha_inicio` / `plan_fecha_fin` (per-training export, 22 → 25 columns) as separate columns, never a merged range string.

### Non-goals

- The per-training `.xlsx` form-responses export (`handleExportFormularioRespuestas`) — it reads `formulario_respuestas`, a different dataset with no plan linkage.
- Preserving the plan link on **cancelled** bookings. `cancel_and_restore_service_units` deletes the booking's `reserva_servicios` rows after restoring units, so a cancelled booking reports `NULL`. Changing that would require redesigning unit restitution.
- Backfilling historical bookings made against unlimited entitlements — `suscripcion_id` was never written, and the value is not reconstructible.
- Reporting **every** plan for a booking that legitimately drew services from two different subscriptions. The view reports one, chosen deterministically, because the three columns must stay coherent. A per-service breakdown would be a separate follow-up.
- Any change to write policies, to `pagos`, or to plan/price data.

## Capabilities

### New Capabilities
- `booking-plan-attribution`: exposing, on every bookings-report surface, the plan a booking's service units were deducted from together with that subscription's validity window — the view columns, their resolution rules, the RLS visibility that makes them readable by tenant staff and by the owning athlete, and their rendering in the two management tables.

### Modified Capabilities
- `bookings-csv-export`: the required per-training CSV column list grows from 22 to 25 columns, adding `plan_nombre`, `plan_fecha_inicio` and `plan_fecha_fin` after `notas_reserva`; the view's documented column set gains the same three columns.
- `subscription-class-deduction`: the `reserva_servicios` consumption ledger SHALL record the covering `suscripcion_id` even when the entitlement is unlimited (no units deducted), where today it records `NULL`.

## Impact

**Database**
- New migration `supabase/migrations/20260831190000_reservas_reporte_view_plan_nombre.sql`: `suscripciones_select_trainer` (added alongside existing policies), `reserva_servicios_select` (replaced, admin helper → trainer-or-admin helper), and the `reservas_reporte_view` recreation carried forward from `20260813180000_omitir_confirmacion_plan.sql`.
- No new indexes: the LATERAL is keyed on `reserva_servicios.reserva_id` (`idx_reserva_servicios_reserva_id`) and the fallback on `reservas.suscripcion_id` (`idx_reservas_suscripcion_id`).
- Security note: widening `suscripciones` reads exposes subscription dates, state and `comentarios` to coaches within their own tenants. `pagos` is untouched. No policy becomes `using (true)`.

**Application code** (following page → component → hook → service → types)

| Layer | File | Change |
|---|---|---|
| Migration | `supabase/migrations/20260831190000_reservas_reporte_view_plan_nombre.sql` | New — both policies, view recreation, limitations in the header |
| Component | `src/components/portal/gestion-reservas/ReservasManagementTable.tsx` | `Plan` `<th>` after *Entrenamiento*; two-line cell; date-only-safe formatter; `colSpan` 7 → 8 |
| Component | `src/components/portal/mis-reservas/MisReservasTable.tsx` | Same table change; `colSpan` 7 → 8 |
| Component | `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx` | Three keys added to `csvHeaders` and to `mapped`, in matching positions after `notas_reserva` |
| Hook | `src/hooks/portal/gestion-reservas/useGestionReservas.ts` | `Plan` / `Plan desde` / `Plan hasta` in `exportRows` |
| Hook | `src/hooks/portal/mis-reservas/useMisReservas.ts` | Same three keys in `exportRows` |
| Service | `src/services/supabase/portal/reservas.service.ts` | `findServiceSubscriptionsToCharge` emits `suscripcionId` for unlimited entitlements; comment updated. `getReservasReport` / `getReservasManagement` / `getMisReservas` unchanged (`select('*')`) |
| Types | `src/types/portal/reservas.types.ts` | `plan_nombre`, `plan_fecha_inicio`, `plan_fecha_fin` (`string \| null`) on `ReservaReportRow` |
| Spec | `openspec/specs/bookings-csv-export/spec.md` | Column list 22 → 25 |
| Docs | `projectspec/03-project-structure.md` | Note the three `plan_*` columns on the `reservas.service.ts` entry |

**Not affected**: no new server actions or routes; the three read functions inherit the columns automatically; reports stay capped at 100 rows when unfiltered.

## Implementation Plan

1. Write and apply `20260831190000_reservas_reporte_view_plan_nombre.sql` — the two widened policies, the view recreation carrying all 28 existing columns forward, and the known limitations documented in the header.
2. Verify the columns directly: `select reserva_id, reserva_estado, plan_nombre, plan_fecha_inicio, plan_fecha_fin from public.reservas_reporte_view ...`, and confirm the date typing via `\d+ reservas_reporte_view`.
3. Add the three fields to `ReservaReportRow`.
4. Apply the `findServiceSubscriptionsToCharge` fix and update its adjacent comment.
5. Add the two-line Plan column, the date-only-safe formatter and the `colSpan` bump to `ReservasManagementTable` and `MisReservasTable`.
6. Add the plan keys to all three CSV export mappings, keeping header order and row order aligned in `ReservasPanel`.
7. Verify RLS by signing in as `administrador`, `entrenador` and `atleta` in turn, including a cross-tenant check.
8. Test manually: confirmed-with-deduction, pendiente-with-pending-plan, no-plan, unlimited-plan, multi-service, open-ended (NULL date) and cancelled bookings.
9. Update `openspec/specs/bookings-csv-export/spec.md` and `projectspec/03-project-structure.md`.
10. Run `npm run lint` and `npx tsc --noEmit`.
