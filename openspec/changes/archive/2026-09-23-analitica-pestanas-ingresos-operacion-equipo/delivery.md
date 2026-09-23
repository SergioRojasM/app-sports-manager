# Delivery — analitica-pestanas-ingresos-operacion-equipo

## Commit message

```
feat(analitica-pestanas-ingresos-operacion-equipo): redesign Ingresos, Operación and Equipo tabs on bi facts

- New private view bi.fct_miembros (one row per membership: name, role,
  es_atleta, state). get_tenant_bi_dashboard now reads only bi.* facts.
- Ingresos: total / monthly average / MTD / pending KPIs, monthly revenue
  bars, subscriptions sold stacked by validated payment, revenue tables
  with Suscripciones, Pagos, Total, Validado, Pendiente.
- Operación: monthly-average details, per-training occupancy/attendance
  KPIs, trainings+bookings and monthly % line charts, discipline and
  Público/Privado tables with per-training averages, top/bottom 10
  athletes, capacity alerts kept.
- Equipo: athletes only; active athletes grouped by plan; athletes
  without subscription with last booking and last subscription dates.
- AnaliticaDataTable replaces the header-less table helpers.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Pull request

**Title:** feat(analitica): redesign Ingresos, Operación and Equipo tabs; RPC reads only bi facts

### Summary
- **Ingresos**
  - KPIs: Ingresos totales (validados + pendientes), Ingreso promedio por mes, Acumulado MTD, Pendiente de validar.
  - Charts: monthly revenue bars, and subscriptions sold per month stacked as "con / sin pago validado".
  - Tables: by plan, by payment method and by athlete, with the columns Suscripciones, Pagos, Total, Validado and Pendiente.
- **Operación**
  - KPIs: trainings and bookings, each with its monthly average, plus average occupancy and average attendance per training.
  - Charts: trainings and bookings per month, and monthly occupancy % and attendance %.
  - Tables: by discipline, and "Reservas por tipo de entrenamiento" (Público / Privado).
  - Rankings: top 10 athletes with the most bookings and top 10 with the fewest (0 included).
  - Capacity alerts kept at the bottom.
- **Equipo**
  - Only athletes are counted.
  - Active athletes are grouped by plan.
  - The athletes-without-subscription table shows their last booking and last subscription.

### Data layer (migration `20260924120000_analitica_pestanas_detalle.sql`, **local only**)
- `bi.fct_miembros`, private. `get_tenant_bi_dashboard` no longer reads any `public.*` table; the only exception is the admin-check helper.
- Semantic changes, in fields only the detail tabs use:
  - `revenueBy*` and `topAthletesByRevenue` include pending payments.
  - Public-status labels are "Público" / "Privado".
  - `topAthletesByBookings` returns up to 10 rows.
  - `membersByStatus` counts athletes only: the local tenant shows 73 active (was 80).
  - `latestBookingDate` is the date of the last non-cancelled session booked.

### Verification
- Every Resumen field is identical before and after, for the year to date, the current month, all of 2025 and a range with no data.
- `Σ revenueByPlan.totalRevenue = Σ revenueByPaymentMethod.totalRevenue = totalRevenue` (27.180.000 YTD); per month, with + without = sold.
- `fct_miembros` has 210 rows, the same as `miembros_tenant`, with unique ids.
- `authenticated` is denied on `bi`; a non-admin still gets `42501`.
- [x] `npx tsc --noEmit`, eslint on the changed files
- [ ] Visual check of the three tabs at 1440 px and 375 px

🤖 Generated with [Claude Code](https://claude.com/claude-code)
