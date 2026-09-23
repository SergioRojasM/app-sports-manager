## Why

The "Resumen" tab of `/portal/orgs/{tenant_id}/analitica` currently shows six generic KPIs plus a validated-revenue bar chart, a marketplace-publication donut, a member-status donut and a capacity-alert list. Club administrators asked for a summary that answers their day-to-day questions at a glance: how much money came in (validated and still pending), how full and how well attended their trainings are, how many subscriptions they are selling and in which plans, and how bookings split across disciplines. Most of those figures are not returned by `get_tenant_bi_dashboard` today (per-training averages, attendance, monthly pending revenue, subscriptions sold), so the tab cannot show them without a data change.

## What Changes

Input: the change request passed to `/opsx-ff-mod` (layout by rows, below), plus two clarified definitions:
- **"Ingresos totales" = validated + pending payments** (rejected excluded). Validated payments are dated by validation date; pending payments by creation date (same rules US-0115 already uses).
- **"Suscripción vendida" = subscription created in the period** (`suscripciones.created_at`, Bogotá date), any payment state, excluding `estado = 'cancelada'`.

New "Resumen" layout (all charts with `@nivo`):

| Row | Slot 1 | Slot 2 | Slot 3 | Slot 4 |
|---|---|---|---|---|
| 1 (KPI cards) | Ingresos totales del periodo | Ingresos pendientes por validar + detail "N pagos pendientes por validar" | Entrenamientos programados | Promedio de reservas / entrenamiento |
| 2 (KPI cards) | % Ocupación promedio / entrenamiento | % Asistencia promedio / entrenamiento | Atletas activos (unchanged) | Atletas activos sin suscripción (unchanged) |
| 3 (charts) | Bar: total monthly revenue, total value labelled on each bar | Donut: revenue validated vs pending | | |
| 4 (charts) | Line: subscriptions sold per month | Horizontal bar: subscriptions sold per plan | | |
| 5 (charts) | Line: average bookings per training per month | Donut: % of valid bookings per discipline | | |

- **RPC** `get_tenant_bi_dashboard` (new migration, `create or replace`, same signature and auth checks) gains additive fields:
  - `revenue.totalRevenue`; `revenue.monthlyRevenue[].pendingRevenue` and `.totalRevenue`.
  - `operations.averageBookingsPerTraining`, `operations.averageOccupancyPercent`, `operations.averageAttendancePercent`, `operations.monthlyBookingAverage[]`.
  - New `subscriptions` section: `soldCount`, `monthlySold[]`, `soldByPlan[]`.
- **Types** (`analitica.types.ts`) extended to match; service and hook unchanged (they pass the JSON through).
- **`AnaliticaPage`**: `Resumen` rewritten to the 5-row layout; the Resumen-only charts `BookingStatusChart` and `MemberStatusChart` are removed. KPI cards stay clickable and navigate to their related tab. `Ingresos`, `Operación` and `Equipo` tabs are not changed.
- **New chart components** (`@nivo/bar`, `@nivo/line`, `@nivo/pie` — all already installed, no new dependency) using the shared `analiticaChartTheme` / `ANALITICA_CHART_COLORS`.

## Capabilities

### New Capabilities
- `analitica-resumen-dashboard`: content, metric definitions and layout of the "Resumen" tab (8 KPI cards, 6 nivo charts) and the RPC fields that feed them.

### Modified Capabilities
- `analitica-visual`: the "Charts use the grit palette" requirement now covers `ResponsiveLine` and replaces the member-status pie scenario (that chart is removed); the "Analytics behavior is unchanged" requirement is narrowed so the Resumen content/RPC additions of this change are allowed.

## Non-goals

- Changing the `Ingresos`, `Operación` or `Equipo` tabs, the date-range filter, presets, tabs component or Bogotá date handling.
- Changing the meaning of existing RPC fields (`recognizedRevenue`, `occupancyPercent`, etc.); all RPC changes are additive.
- New chart libraries or dependencies; exports, drill-downs, comparisons with previous period on the new KPIs.
- A new `.pen` design: the row layout from the change request is the design input; visual treatment reuses the existing `zfVKC` KPI card / panel pattern.

## Impact

Files created:
- `supabase/migrations/20260923120000_analitica_resumen_kpis.sql` — `create or replace function public.get_tenant_bi_dashboard(...)` with the additive fields.
- `src/components/portal/analitica/charts/` — `MonthlyRevenueBarChart.tsx`, `RevenueValidationPieChart.tsx`, `SubscriptionsSoldLineChart.tsx`, `SubscriptionsByPlanBarChart.tsx`, `BookingAverageLineChart.tsx`, `BookingsByDisciplinePieChart.tsx`, `index.ts`.

Files modified:
- `src/types/portal/analitica.types.ts` — new fields and `AnaliticaSubscriptions` type.
- `src/components/portal/analitica/AnaliticaPage.tsx` — new `Resumen`, removal of unused Resumen charts.
- `src/components/portal/analitica/chart-theme.ts` — line-chart theme entries (crosshair, points) if needed.
- `projectspec/03-project-structure.md` — document the `charts/` folder and the new migration.

Unchanged: `analitica.service.ts`, `useAnalitica.ts`, route `analitica/page.tsx`, RLS and `bi.*` views.

## Implementation Plan

1. Migration: extend `get_tenant_bi_dashboard` (types → SQL contract first); run locally and verify JSON shape.
2. Types: extend `AnaliticaRevenue`, `AnaliticaOperations`, add `AnaliticaSubscriptions` to `AnaliticaDashboard`.
3. Service / hook: confirm no change needed (pass-through).
4. Components: build the six chart components in `charts/`.
5. Page: rewrite `Resumen` with the 5-row grid and 8 KPI cards; delete unused charts.
6. Docs + checks: update `03-project-structure.md`; run `npx tsc --noEmit` and `npm run lint`; manual check with data and with an empty tenant.
