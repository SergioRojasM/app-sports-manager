## 1. Branch setup

- [x] 1.1 Create a new branch `feat/analitica-resumen-kpis-graficas` (from the branch that contains `analitica-v2-design`)
- [x] 1.2 Validate the working branch is not `main`, `master` or `develop` (`git branch --show-current`)

## 2. Page (Resumen layout)

- [x] 2.1 In `src/components/portal/analitica/AnaliticaPage.tsx`, rewrite `Resumen` as 5 rows: two KPI rows (`grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`) and three chart rows (`grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]`), `space-y-6` between rows
- [x] 2.2 Replace `summaryKpis` with the 8 KPI definitions (label, value, detail, tone, icon, target tab) per spec: Ingresos totales / Ingresos pendientes por validar (+ "N pagos pendientes por validar", singular for 1) / Entrenamientos programados / Promedio de reservas / entrenamiento / Ocupación promedio / entrenamiento ("Sin capacidad" when null) / Asistencia promedio / entrenamiento ("Sin datos" when null) / Atletas activos / Atletas activos sin suscripción
- [x] 2.3 Keep each KPI card wrapped in the navigable button with the `grit-cyan` focus ring, mapping to `ingresos` / `operacion` / `equipo`
- [x] 2.4 Wire the six chart components inside `Panel` with the spec titles/subtitles; remove `BookingStatusChart`, `MemberStatusChart` and the Alerts panel from Resumen (keep `Alerts` for Operación); delete the now-unused chart functions and imports

## 3. Components (nivo charts)

- [x] 3.1 Create `src/components/portal/analitica/format.ts` with `currency`, `integer`, `percent`, `compactCurrency` ("$ 1,2 M", "$ 850 mil"), `decimal1` (es-CO, 1 decimal) and `monthLabel(monthStart, multiYear)`; switch `AnaliticaPage` to import them
- [x] 3.2 `charts/MonthlyRevenueBarChart.tsx`: `ResponsiveBar` over `monthlyRevenue[].totalRevenue`, custom SVG layer drawing the compact total above each non-zero bar, tooltip with month, total, validated and pending
- [x] 3.3 `charts/RevenueValidationPieChart.tsx`: donut "Validados" (`COLORS[0]`) vs "Pendientes" (`COLORS[2]`), arc labels in %, tooltip with amount + %, bottom legend, zero slices omitted
- [x] 3.4 `charts/SubscriptionsSoldLineChart.tsx`: `ResponsiveLine` over `subscriptions.monthlySold`, points on, `useMesh`, min 0, integer Y ticks, tooltip "N suscripciones"
- [x] 3.5 `charts/SubscriptionsByPlanBarChart.tsx`: `ResponsiveBar layout="horizontal"` over `subscriptions.soldByPlan`, largest on top, count labels, names truncated at 18 chars with full name in tooltip
- [x] 3.6 `charts/BookingAverageLineChart.tsx`: `ResponsiveLine` over `operations.monthlyBookingAverage`, 1-decimal values, tooltip "avg · N reservas / M entrenamientos"
- [x] 3.7 `charts/BookingsByDisciplinePieChart.tsx`: donut over `operations.bookingByDiscipline` (valid bookings > 0), top 5 + "Otras" when > 6, % arc labels (skip < 10°), tooltip with count + %, bottom legend
- [x] 3.8 `charts/index.ts` barrel; every chart renders the empty message when its series is empty or all zero, uses `h-72`, `analiticaChartTheme` and `ANALITICA_CHART_COLORS` only (no hex literals)
- [x] 3.9 Extend `chart-theme.ts` with crosshair and label styles for line/bar charts using the existing tokens (no new colours)

## 4. Hook and service

- [x] 4.1 Confirm `useAnalitica.ts` and `analitica.service.ts` need no change (JSON pass-through); leave them untouched

## 5. Types

- [x] 5.1 In `src/types/portal/analitica.types.ts` add `revenue.totalRevenue`, `monthlyRevenue[].pendingRevenue` / `.totalRevenue`
- [x] 5.2 Add `operations.averageBookingsPerTraining`, `averageOccupancyPercent: number | null`, `averageAttendancePercent: number | null`, `monthlyBookingAverage[]` (`monthStart`, `monthKey`, `scheduledTrainingCount`, `validBookingCount`, `averageBookingsPerTraining`)
- [x] 5.3 Add `AnaliticaSubscriptions` (`soldCount`, `monthlySold[]`, `soldByPlan[]`) and `subscriptions` on `AnaliticaDashboard`

## 6. Database (local only)

- [x] 6.1 Create `supabase/migrations/20260923120000_analitica_resumen_kpis.sql`: `create or replace function public.get_tenant_bi_dashboard` copying the phase-one body verbatim and adding only new CTEs/keys; re-apply `revoke`/`grant`
- [x] 6.2 Revenue: `totalRevenue`; month buckets clipped to the range with `pendingRevenue` and `totalRevenue` (existing `recognizedRevenue`/`cumulativeRevenue` unchanged)
- [x] 6.3 Operations: `session_stats` CTE (per non-cancelled session: valid bookings, attended bookings, cupo) → `averageBookingsPerTraining`, `averageOccupancyPercent` (mean over cupo > 0), `averageAttendancePercent` (mean over past sessions with valid > 0), `monthlyBookingAverage[]`
- [x] 6.4 Subscriptions: `v_subscriptions` from `public.suscripciones` + `planes` (`estado <> 'cancelada'`, Bogotá `created_at` in range) → `soldCount`, `monthlySold[]`, `soldByPlan[]`; add `subscriptions` to the returned object; `create index if not exists` on `suscripciones (tenant_id, created_at)`
- [x] 6.5 Apply locally only (`supabase migration up` / `db reset`) — never push to remote; call the RPC as a seeded tenant admin and verify: new keys present, `sum(monthlyRevenue.totalRevenue) = totalRevenue = recognizedRevenue + pendingPaymentAmount`, `sum(monthlySold) = sum(soldByPlan) = soldCount`, non-admin still gets `42501`

## 7. Verification

- [ ] 7.1 Manual check at 1440 px and 375 px: row order, KPI values, bar labels, donut percentages, tooltips, KPI navigation to tabs, no horizontal scroll
- [ ] 7.2 Check a tenant/range with no data: every chart shows "No hay datos para el periodo seleccionado.", cards show 0 / "Sin capacidad" / "Sin datos"
- [x] 7.3 Confirm `Ingresos`, `Operación` and `Equipo` tabs show the same values as before
- [x] 7.4 `grep -rE "#[0-9A-Fa-f]{6}" src/components/portal/analitica --include=*.tsx` returns no matches (colours only in `chart-theme.ts`)

## 8. Documentation

- [x] 8.1 Update `projectspec/03-project-structure.md`: `analitica/charts/` folder and each chart, `format.ts`, new Resumen description, and the new migration entry

## 9. Quality gates and delivery

- [x] 9.1 Run `npx tsc --noEmit`, `npm run lint` and the test suite (if any tests apply); fix new errors — do not run a build
- [x] 9.2 Write the commit message (conventional: `feat(analitica-resumen-kpis-graficas): ...`) and the pull request description (summary, metric definitions, migration note "local only", screenshots checklist) in `openspec/changes/analitica-resumen-kpis-graficas/delivery.md`
