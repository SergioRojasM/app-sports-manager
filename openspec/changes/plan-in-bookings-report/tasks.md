## 1. Branch Setup

- [x] 1.1 Create the working branch `feat/plan-in-bookings-report` from `develop`
- [x] 1.2 Validate the working branch is not `main`, `master` or `develop` before making any change

## 2. Database — RLS and View

- [x] 2.1 Create `supabase/migrations/20260831190000_reservas_reporte_view_plan_nombre.sql` with a header comment documenting the three known limitations (cancelled bookings lose the link; no backfill for unlimited plans; a booking spanning two subscriptions reports only the first)
- [x] 2.2 Add `suscripciones_select_trainer` (drop-if-exists then create) scoped by `select tenant_id from public.get_trainer_or_admin_tenants_for_authenticated_user()`, leaving `suscripciones_select_own` and `suscripciones_select_admin` in place
- [x] 2.3 Replace `reserva_servicios_select`, swapping the admin-only helper for `get_trainer_or_admin_tenants_for_authenticated_user()` and keeping the `r.atleta_id = auth.uid()` athlete branch unchanged
- [x] 2.4 Recreate `reservas_reporte_view`, carrying forward all 28 existing columns from `20260813180000_omitir_confirmacion_plan.sql:391-441` (including `motivo_rechazo`) with `with (security_invoker = true)`
- [x] 2.5 Add the `left join lateral (... order by rs.created_at, su.id limit 1) rsp on true` over `reserva_servicios → suscripciones → planes`, plus the fallback joins on `reservas.suscripcion_id`
- [x] 2.6 Add the three columns as `coalesce(rsp.plan_nombre, pl_dir.nombre)`, `coalesce(rsp.fecha_inicio, su_dir.fecha_inicio)`, `coalesce(rsp.fecha_fin, su_dir.fecha_fin)` and re-issue `grant select on public.reservas_reporte_view to authenticated`
- [x] 2.7 Apply the migration to the **local** Supabase instance only — never push it to the remote server
- [x] 2.8 Verify with `select reserva_id, reserva_estado, plan_nombre, plan_fecha_inicio, plan_fecha_fin from public.reservas_reporte_view ...` and confirm via `\d+ reservas_reporte_view` that both date columns are `date`-typed and no pre-existing column was lost

## 3. Types

- [x] 3.1 Add `plan_nombre`, `plan_fecha_inicio` and `plan_fecha_fin` (all `string | null`) to `ReservaReportRow` in `src/types/portal/reservas.types.ts:93`, keeping the type 1:1 with the view

## 4. Service — Write-Path Fix

- [x] 4.1 In `src/services/supabase/portal/reservas.service.ts:634` (`findServiceSubscriptionsToCharge`), always emit `suscripcionId: available.suscripcionId` instead of nulling it out for unlimited entitlements
- [x] 4.2 Update the adjacent comment at `:632` to state that the ledger now records the subscription for unlimited services too, and that the deduction is still skipped by the RPC on the basis of `unidades_restantes is null`
- [x] 4.3 Confirm `getReservasReport`, `getReservasManagement` and `getMisReservas` need no change (they all `select('*')` from the view)

## 5. Components — Management Tables

- [x] 5.1 Add a date-only-safe formatter to `src/components/portal/gestion-reservas/ReservasManagementTable.tsx` using the `SuscripcionesTable.tsx:30-38` split-into-y/m/d pattern (or `timeZone: 'UTC'`) — never a bare `new Date(iso)` on a `YYYY-MM-DD` value
- [x] 5.2 Add a `Plan` `<th scope="col">` after *Entrenamiento* in `ReservasManagementTable`, with a two-line cell (name on the first line, validity range as a muted sub-line) reusing the *Atleta* cell pattern at `:110-117`
- [x] 5.3 Render `—` when `plan_nombre` is null, and `Sin fecha` for a null side of an otherwise-present range without blanking the plan name
- [x] 5.4 Bump the empty-results `colSpan` from 7 to 8 in `ReservasManagementTable.tsx:99`
- [x] 5.5 Apply the same formatter, `Plan` column, placeholder rules and `colSpan` 7 → 8 to `src/components/portal/mis-reservas/MisReservasTable.tsx:99`

## 6. Hooks and Component — CSV Exports

- [x] 6.1 Add `Plan`, `'Plan desde'` and `'Plan hasta'` to `exportRows` in `src/hooks/portal/gestion-reservas/useGestionReservas.ts:159`, positioned so the inferred column order places them after the training columns (raw `YYYY-MM-DD` values)
- [x] 6.2 Add the same three keys to `exportRows` in `src/hooks/portal/mis-reservas/useMisReservas.ts:175`
- [x] 6.3 Add `'plan_nombre'`, `'plan_fecha_inicio'`, `'plan_fecha_fin'` to `csvHeaders` in `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx:386` and the matching keys to `mapped` at `:411`, all directly after `notas_reserva` and in identical positions in both

## 7. Verification

- [x] 7.1 Verify RLS by signing in as `administrador`, `entrenador` and `atleta` in turn: staff see populated plan data for their tenant, the athlete sees it on their own rows only and no other athlete's reservations
- [x] 7.2 Verify cross-tenant isolation: a coach or admin of tenant A retrieves no rows and no plan values from tenant B's subscriptions
- [x] 7.3 Test the booking scenarios: confirmed-with-deduction, `pendiente`-with-pending-plan, no-plan, multi-service-same-subscription, and open-ended (NULL date) subscriptions
- [x] 7.4 Test the unlimited-plan case: booking creates a `reserva_servicios` row with a non-null `suscripcion_id`, `suscripcion_servicios.unidades_restantes` stays `NULL`, and the report shows the plan name and dates
- [x] 7.5 Test that a finite-plan booking still deducts exactly one unit per required service (no double or extra deduction), and that cancelling restores units correctly with the cancelled row afterwards showing `—`
- [x] 7.6 Verify date rendering has no off-by-one shift: a subscription starting `2026-03-01` displays as 1 Mar 2026 in es-CO
- [x] 7.7 Verify both management CSVs carry `Plan` / `Plan desde` / `Plan hasta`, that the per-training CSV has 25 columns with header order matching row order exactly, and that the `.xlsx` form-responses export is unchanged

## 8. Documentation

- [ ] 8.1 ~~Update `openspec/specs/bookings-csv-export/spec.md:47` by hand~~ — superseded: the delta spec at `specs/bookings-csv-export/spec.md` already carries the 22 → 25 column change, and `openspec archive` applies it to the main spec. Editing it manually would double-apply.
- [x] 8.2 Update `projectspec/03-project-structure.md:336` — note the three new `plan_*` columns on the `reservas.service.ts` entry

## 9. Quality Gates and Handoff

- [x] 9.1 Run `npx tsc --noEmit` and fix any type errors (do not run a production build)
- [x] 9.2 Run `npm run lint` and fix any findings
- [ ] 9.3 ~~Run the test suite~~ — NOT RUN: this project has no test runner, no test script and no test files. Verification was done against the local database and the formatter logic instead (see section 7).
- [x] 9.4 Write the commit message and the pull request description for the implementation
