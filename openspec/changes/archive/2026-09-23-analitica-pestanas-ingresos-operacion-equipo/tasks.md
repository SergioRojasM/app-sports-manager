## 1. Branch setup

- [x] 1.1 Create a new branch `feat/analitica-pestanas-ingresos-operacion-equipo` from `develop`
- [x] 1.2 Validate the working branch is not `main`, `master` or `develop` (`git branch --show-current`)

## 2. Page

- [x] 2.1 Rewrite `Ingresos` in `AnaliticaPage.tsx`: KPI row (Ingresos totales, Ingreso promedio por mes, Acumulado MTD with month detail, Pendiente de validar), full-width `MonthlyRevenueBarChart`, full-width `SubscriptionsSoldStackedBarChart`, and the three revenue tables (Suscripciones, Pagos, Total, Validado, Pendiente)
- [x] 2.2 Rewrite `Operacion`: KPI row with the monthly-average details and the per-training averages; row 2 `MonthlyOperationsLineChart`; row 3 two `MonthlyPercentLineChart`s; row 4 discipline and "Reservas por tipo de entrenamiento" tables; row 5 top/bottom 10 athlete tables; row 6 the `Alerts` panel
- [x] 2.3 Rewrite `Equipo`: athlete status cards with Spanish labels; "Atletas activos por plan" table; coverage card unchanged; "Atletas activos sin suscripción" table (Atleta, Estado, Última reserva, Última suscripción)
- [x] 2.4 Remove `MiniBars`, `RevenueTable`, `OperationsTable` and `Ranking` once unused

## 3. Components

- [x] 3.1 Create `AnaliticaDataTable.tsx` (header row, right-aligned numeric columns, `overflow-x-auto`, empty message) and export it from `index.ts`
- [x] 3.2 Extract the totals layer from `MonthlyRevenueBarChart` into `charts/shared.tsx` as a reusable factory; the chart keeps its output
- [x] 3.3 `charts/SubscriptionsSoldStackedBarChart.tsx`: stacked "Con pago validado" / "Sin pago validado", integer totals above the bars, legend, tooltip with both counts and the total
- [x] 3.4 `charts/MonthlyOperationsLineChart.tsx`: two series (Entrenamientos, Reservas), shared left axis, slice tooltip, legend, integer ticks
- [x] 3.5 `charts/MonthlyPercentLineChart.tsx`: generic % line, Y 0–100, null months as gaps, tooltip "N%" / "Sin datos"
- [x] 3.6 Add to `format.ts`: `shortDate` ("10 may 2026"), `monthYear` ("septiembre 2026") and `MEMBER_STATUS_LABELS`; export the new charts from `charts/index.ts`

## 4. Hook and service

- [x] 4.1 Confirm `useAnalitica.ts` and `analitica.service.ts` need no change

## 5. Types

- [x] 5.1 `AnaliticaRevenue`: `averageMonthlyRevenue`, `monthToDateRevenue`; the revenue breakdown rows gain `subscriptionCount`, `totalRevenue` and `pendingRevenue` (the athlete rows also `subscriptionCount`)
- [x] 5.2 `AnaliticaOperations`: `averageMonthlyTrainings`, `averageMonthlyBookings`; the monthly rows gain `averageOccupancyPercent` and `averageAttendancePercent`; the discipline/public rows gain `trainingCount`, `averageOccupancyPercent` and `averageAttendancePercent`; add `bottomAthletesByBookings`
- [x] 5.3 `AnaliticaTeam`: `activeAthletesByPlan`, `membersWithoutSubscription[].latestSubscriptionDate`; `AnaliticaSubscriptions.monthlySold[]` gains `withValidatedPaymentCount` and `withoutValidatedPaymentCount`

## 6. Database (local only)

- [x] 6.1 Snapshot the Resumen fields listed in the spec (tenant admin; YTD, current month, 2025, empty range) to scratch files
- [x] 6.2 Create `supabase/migrations/20260924120000_analitica_pestanas_detalle.sql` with `bi.fct_miembros` (columns per spec) and a `revoke`
- [x] 6.3 Same migration: `create or replace function get_tenant_bi_dashboard` from the `20260923130000` body — revenue (payments-in-range CTE, month count, averages, MTD, extended breakdowns, athlete names from `fct_miembros`)
- [x] 6.4 Operations: extend `session_stats` (discipline, public status, month); monthly averages; discipline/public breakdowns with `trainingCount` and the averages; "Público"/"Privado" labels; top 10; `bottomAthletesByBookings`; names from `fct_miembros`
- [x] 6.5 Team: athletes-only `membersByStatus`; `active_athletes` from `fct_miembros`; `activeAthletesByPlan`; `activeAthletesByPlanType` from `fct_suscripciones`; `membersWithoutSubscription` with `latestBookingDate` from `fct_reservas` and `latestSubscriptionDate` from `fct_suscripciones`
- [x] 6.6 Subscriptions: split `monthlySold` by `pagos_validados_count > 0`; re-apply `revoke`/`grant`
- [x] 6.7 Apply locally only (`npx supabase migration up --local`)

## 7. Verification

- [x] 7.1 Resumen fields equal to the snapshots for every range; clean up the scratch files
- [x] 7.2 Invariants: `Σ revenueByPlan.totalRevenue = Σ revenueByPaymentMethod.totalRevenue = totalRevenue`; `with + without = subscriptionCount` per month; `Σ membersByStatus` = athlete memberships; 10 rows in the top and bottom rankings when enough athletes exist
- [x] 7.3 There's no `public.` table read in the function body except `get_admin_tenants_for_authenticated_user`; `authenticated` is denied on `bi.fct_miembros`; a non-admin still gets `42501`
- [ ] 7.4 Manual check of the three tabs at 1440 px and 375 px (headers, stacked bars, line gaps, "Público"/"Privado", no page horizontal scroll)

## 8. Documentation

- [x] 8.1 Update `projectspec/03-project-structure.md`: add `fct_miembros` to the `bi` views note, the new charts, `AnaliticaDataTable`, and the updated `AnaliticaPage` description

## 9. Quality gates and delivery

- [x] 9.1 Run `npx tsc --noEmit`, lint on changed files, and tests if any apply — no build
- [x] 9.2 Write the commit message and PR description in `openspec/changes/analitica-pestanas-ingresos-operacion-equipo/delivery.md`
