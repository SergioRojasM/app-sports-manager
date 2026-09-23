## Context

`get_tenant_bi_dashboard` (latest body: `20260923130000_bi_fct_suscripciones.sql`) returns `revenue`, `operations`, `team` and `subscriptions`. Resumen was redesigned in `analitica-resumen-kpis-graficas`; the Ingresos, Operación and Equipo tabs still render the phase-one layout with ad-hoc helpers (`MiniBars`, `RevenueTable`, `OperationsTable`, `Ranking`) that have no column headers.

Non-`bi` reads left in the function:

| Section | Reads | Used for |
|---|---|---|
| revenue | `public.usuarios` | athlete names (top by revenue) |
| operations | `public.usuarios` | athlete names (top by bookings) |
| team | `public.miembros_tenant`, `public.roles` | status counts, active athletes |
| team | `public.plan_tipos` | plan-type names |
| team | `public.usuarios`, `public.miembros_tenant`, `public.reservas` | members without subscription |

Local data (seeded tenant): 3 admins, 4 trainers, 73 athletes — all `activo`; no user has two memberships in the same tenant.

Flow (page → component → hook → service → types → DB):

```
AnaliticaPage
 ├─ Ingresos   → KPI×4, MonthlyRevenueBarChart, SubscriptionsSoldStackedBarChart, AnaliticaDataTable×3
 ├─ Operacion  → KPI×4, MonthlyOperationsLineChart, MonthlyPercentLineChart×2, AnaliticaDataTable×4, Alerts
 └─ Equipo     → KPI×5, AnaliticaDataTable×2, coverage card
useAnalitica / analiticaService (unchanged)
analitica.types.ts (extended)
get_tenant_bi_dashboard ── bi.fct_pagos · fct_entrenamientos · fct_reservas · fct_asistencia · fct_suscripciones · fct_miembros (new)
```

## Goals / Non-Goals

**Goals:**
- The RPC reads only `bi` facts (plus the admin-check helper).
- All new figures are computed in SQL; the client only formats and lays out.
- Resumen values stay identical.

**Non-Goals:**
- Changing Resumen, the date filter, hook or service; exports and pagination; remote deploy.

## Decisions

### D1. `bi.fct_miembros` as a fact of memberships
One row per `miembros_tenant` row, with the athlete name pre-resolved from `usuarios` and the role name/flag from `roles`. It serves both the team figures (status, active athletes) and names in every ranking. *Alternative:* a `bi.dim_usuarios` for names plus a separate membership fact — rejected: the user asked for facts, and one view covers both uses, since names are only needed for tenant members. Trade-off: an athlete who paid or booked but no longer has a membership row appears as "Sin nombre" (today they show their name). Accepted; membership rows are not deleted in normal flows (states change instead).

### D2. Payments in range as one CTE
A `payments_in_range` CTE over `bi.fct_pagos` (validated by `fecha_pago_analitica`, pending by `fecha_creacion_analitica`) feeds `revenueByPlan`, `revenueByPaymentMethod` and `topAthletesByRevenue`. Each aggregate is `count(distinct suscripcion_id)`, `count(*)`, `sum(monto)` filtered per state. This guarantees that every table's Total adds up to `totalRevenue`. `recognizedRevenue` in these arrays changes meaning only in which rows appear (pending-only rows now appear with 0); the validated amounts per row are unchanged.

### D3. Month count and MTD
`v_month_count := (extract(year from age(date_trunc('month', p_date_to), date_trunc('month', p_date_from))) * 12 + extract(month from ...))::int + 1`, i.e. the number of `generate_series` buckets. MTD sums payments in range per D2's rule, but over `date_trunc('month', p_date_to)::date .. p_date_to` — deliberately not clipped to `p_date_from` ("acumulado del mes").

### D4. Per-training averages grouped three ways
The existing `session_stats` CTE (one row per non-cancelled session: valid, attended, capacity) gains `disciplina_nombre`, `es_publico` and `month_start`. The same two `avg(...) filter (...)` expressions then run grouped by month, by discipline and by public status, so every breakdown uses one rule. `trainingCount` = sessions in the group. Discipline rows keep their existing `validBookingCount`/`occupancyPercent` (Resumen's donut depends on them) and gain the new fields through a join on `discipline_name`.

### D5. Bottom athletes include zero bookings
`bottomAthletesByBookings` = active athletes (`fct_miembros`: `es_atleta`, `activo`) left-joined to their valid bookings in range, `order by valid_booking_count asc, athlete_name asc limit 10`. `topAthletesByBookings` keeps its current population (athletes with bookings in range), with limit 10 and names from `fct_miembros`.

### D6. Team section from facts
- `membersByStatus`: `fct_miembros where es_atleta`, the same 5 fixed keys.
- `active_athletes`: `fct_miembros where es_atleta and miembro_estado = 'activo'` (same set as today: role `usuario` + `activo`).
- `activeAthletesByPlan`: join to `fct_suscripciones where es_activa`, grouped by `coalesce(plan_nombre, 'Sin plan')`. `activeAthletesByPlanType` is kept (now from `fct_suscripciones.plan_tipo_nombre`) for compatibility, but the UI no longer uses it.
- `membersWithoutSubscription`: `latestBookingDate = max(fct_reservas.fecha_sesion_analitica) filter (where reserva_estado <> 'cancelada')`, `latestSubscriptionDate = max(fct_suscripciones.fecha_venta_analitica)`, both via correlated subqueries on the ≤25 rows.

### D7. Frontend building blocks
- `AnaliticaDataTable` (new): `columns: {key, label, align?}[]`, `rows: Record<string, ReactNode>[]`; header row, `border-white/[.07]` separators, `overflow-x-auto` wrapper, empty message. It replaces `RevenueTable`, `OperationsTable` and `Ranking`; `MiniBars` is dropped (replaced by the bar chart).
- `SubscriptionsSoldStackedBarChart`: `ResponsiveBar` with `groupMode="stacked"`, two keys, and the same custom totals layer as `MonthlyRevenueBarChart`. The layer is extracted to `charts/shared.tsx` as `barTotalsLayer(format)` so both charts reuse it.
- `MonthlyOperationsLineChart`: `ResponsiveLine` with two series, `enableSlices="x"` with a slice tooltip, and a legend.
- `MonthlyPercentLineChart`: a generic `{ data, valueKey, label }` line chart with `yScale max 100`; null points are passed as `y: null` so nivo breaks the line.
- Status labels map for the Equipo cards lives in `format.ts`.

## Risks / Trade-offs

- [Names for ex-members show "Sin nombre"] → See D1; the spec states the fallback.
- [The RPC body grows again] → Keep CTE names from the previous version; diff against `20260923130000` in review.
- [Semantic changes to existing fields (`revenueBy*`, `membersByStatus`, `latestBookingDate`, public-status labels)] → Only the detail tabs consume them (verified: Resumen uses none of them). They're listed in the proposal.
- [Monthly booking series (non-cancelled sessions) vs the "Reservas válidas" card (includes bookings on sessions later cancelled)] → Existing card definition kept per the request ("ok como está"); the difference is usually 0 and is documented here.
- [Wide revenue tables on mobile] → `overflow-x-auto` inside the panel.

## Migration Plan

1. Snapshot the Resumen fields (spec list) as a tenant admin for several ranges.
2. `npx supabase migration up --local` — never push to remote.
3. Verify: Resumen fields equal; revenue tables add up; `fct_miembros` row count; there's no non-`bi` read in the function; `authenticated` is denied on the view; the admin check still holds.
4. Rollback: re-apply the function from `20260923130000_bi_fct_suscripciones.sql` and `drop view bi.fct_miembros`, and revert the frontend in the same release.

## Open Questions

- None blocking (third table, revenue columns, bottom-athletes population and alerts panel were confirmed by the user).
