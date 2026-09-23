# Delivery — analitica-resumen-kpis-graficas

## Commit message

```
feat(analitica-resumen-kpis-graficas): redesign Resumen tab with new KPIs and nivo charts

- Resumen now shows 2 rows of 4 KPI cards (total and pending revenue,
  scheduled trainings, bookings/occupancy/attendance per training, active
  athletes, athletes without subscription) and 3 rows of nivo charts:
  monthly revenue bars with totals, validated vs pending donut,
  subscriptions sold per month (line) and per plan (horizontal bars),
  average bookings per training per month (line) and bookings by
  discipline donut.
- get_tenant_bi_dashboard gains additive fields (totalRevenue, monthly
  pending/total revenue, per-training averages, monthlyBookingAverage and
  a new subscriptions section); existing fields are unchanged.
- Charts live in analitica/charts/, formatters in analitica/format.ts;
  colours only from chart-theme.ts.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Pull request

**Title:** feat(analitica): new Resumen KPIs and nivo charts

### Summary
Redesigns the **Resumen** tab of `/portal/orgs/{tenant_id}/analitica`:

| Row | Content |
|---|---|
| 1 | Ingresos totales · Ingresos pendientes por validar (+ N pagos pendientes) · Entrenamientos programados · Promedio de reservas / entrenamiento |
| 2 | Ocupación promedio / entrenamiento · Asistencia promedio / entrenamiento · Atletas activos · Atletas activos sin suscripción |
| 3 | Monthly revenue bars (total labelled on each bar) · Validated vs pending donut |
| 4 | Subscriptions sold per month (line) · Subscriptions sold per plan (horizontal bars, top 9 + "Otros planes") |
| 5 | Average bookings per training per month (line) · Bookings by discipline donut (top 5 + "Otras") |

The Ingresos, Operación and Equipo tabs are unchanged.

### Metric definitions
- **Ingresos totales** = validated (by validation date) + pending (by creation date); rejected payments excluded.
- **Suscripción vendida** = subscription created in the range (Bogotá date), any payment state, not `cancelada`.
- **Ocupación promedio** = mean of per-session occupancy (sessions with capacity), so it differs from the pooled % in Operación.
- **Asistencia promedio** = mean of per-session attendance over past sessions with bookings; unrecorded attendance counts as 0 %.
- Monthly series are clipped to the applied range, so they add up to the period KPIs.

### Database
- New migration `20260923120000_analitica_resumen_kpis.sql`: `create or replace` of `get_tenant_bi_dashboard` (same signature/auth), **additive JSON fields only**, plus index `suscripciones (tenant_id, created_at)`.
- Applied **locally only**. Verified on seed data: `totalRevenue = recognizedRevenue + pendingPaymentAmount = Σ monthly totalRevenue`; `soldCount = Σ monthlySold = Σ soldByPlan`; non-admin still gets `42501`.

### Checks
- [x] `npx tsc --noEmit`
- [x] `npm run lint` (analitica files)
- [x] No hex colours outside `chart-theme.ts`
- [ ] Visual check at 1440 px and 375 px (screenshots)
- [ ] Empty tenant / range shows the empty message in every chart

🤖 Generated with [Claude Code](https://claude.com/claude-code)
