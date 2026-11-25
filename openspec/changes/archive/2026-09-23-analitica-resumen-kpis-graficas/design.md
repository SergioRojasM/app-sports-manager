## Context

`/portal/orgs/{tenant_id}/analitica` (US-0115, restyled by `analitica-v2-design`) loads one JSON document from `public.get_tenant_bi_dashboard` through `analiticaService.fetchDashboard` → `useAnalitica` → `AnaliticaPage`. All four tabs render from that single response. The RPC reads the private `bi.fct_pagos`, `bi.fct_entrenamientos`, `bi.fct_reservas`, `bi.fct_asistencia` views and buckets dates in `America/Bogota`.

The new Resumen needs figures the RPC does not return today:

| Need | Available today? |
|---|---|
| Total revenue (validated + pending) | Derivable (`recognizedRevenue + pendingPaymentAmount`), but not per month |
| Monthly pending revenue | No |
| Avg bookings / training (period, per month) | Period derivable only approximately (`validBookingCount` includes bookings on cancelled sessions); monthly no |
| Avg occupancy per training | No (`occupancyPercent` is pooled, not averaged) |
| Avg attendance per training | No |
| Subscriptions sold per month / plan | No (`bi` has no subscription fact) |
| Bookings per discipline | Yes (`operations.bookingByDiscipline`) |

`@nivo/bar`, `@nivo/line` and `@nivo/pie` 0.99 are already in `package.json` and `node_modules` — no install needed. `@nivo/line` is not used yet in the module.

Flow (page → component → hook → service → types → DB):

```
analitica/page.tsx (unchanged)
  └─ AnaliticaPage ── Resumen (rewritten)
        ├─ AnaliticaKpiCard ×8
        └─ charts/*  (6 new nivo components, theme from chart-theme.ts)
  └─ useAnalitica (unchanged) ─ analiticaService.fetchDashboard (unchanged)
        └─ rpc get_tenant_bi_dashboard  ◄── new migration: additive fields
types/portal/analitica.types.ts ◄── extended
```

## Goals / Non-Goals

**Goals:**
- Compute every new metric in SQL, inside the existing RPC, so the client only formats.
- Keep the RPC contract backward compatible (additive JSON keys only).
- One small, typed nivo component per chart, all sharing `analiticaChartTheme` / `ANALITICA_CHART_COLORS`.

**Non-Goals:**
- Touching the other tabs, the date filter, service or hook.
- New `bi.*` views or indexes beyond what the queries need; new dependencies.
- Pushing the migration to the remote Supabase project (local only).

## Decisions

### D1. Extend `get_tenant_bi_dashboard` instead of a new RPC
New migration `20260923120000_analitica_resumen_kpis.sql` does `create or replace function` with the full body of the phase-one function plus the new CTEs, then re-applies `revoke`/`grant`. *Alternative:* a second RPC `get_tenant_bi_resumen` — rejected: doubles the admin check and network round-trips, and the hook/service would need a second call and loading state. The payload growth is a handful of small arrays (≤ one item per month / plan).

### D2. Subscriptions read from `public.suscripciones` directly
Add a `subscriptions_sold` CTE in the function (join `planes` for the name) rather than a new `bi.fct_suscripciones` view. Filter: `tenant_id = p_tenant_id`, `estado <> 'cancelada'`, `(created_at at time zone 'America/Bogota')::date between p_date_from and p_date_to`. *Alternative:* a view — deferred; only one consumer so far. Index `(tenant_id, created_at)` on `suscripciones` added if not exists.

### D3. Metric definitions (from the clarified change request)
- **Total revenue** = validated (dated by `fecha_pago_analitica`) + pending (dated by `fecha_creacion_analitica`); rejected excluded. Same dating as the existing `recognizedRevenue` / `pendingPaymentAmount`, so `totalRevenue = recognizedRevenue + pendingPaymentAmount` exactly.
- **Averages per training** use a per-session CTE `session_stats` over `non_cancelled_sessions` left-joined to counts of valid bookings and attended bookings:
  - `averageBookingsPerTraining = sum(valid) / count(*)` (0 when no sessions).
  - `averageOccupancyPercent = avg(valid / cupo_maximo * 100)` over sessions with `cupo_maximo > 0` (null when none). Mean of ratios, as requested ("promedio / entrenamiento"), distinct from the pooled `occupancyPercent` which the Operación tab keeps.
  - `averageAttendancePercent = avg(attended / valid * 100)` over sessions with `fecha_sesion < now()` and `valid > 0` (null when none). Attended = `bi.fct_asistencia.asistio is true` on a non-cancelled booking. Past sessions whose attendance was never taken count as 0 % — accepted, it surfaces unrecorded attendance.
- **Monthly buckets** come from `generate_series(date_trunc('month', p_date_from), date_trunc('month', p_date_to), '1 month')`, and every monthly figure is filtered to `greatest(month_start, p_date_from) .. least(month_end, p_date_to)`, so series sum to the period KPIs. The existing `monthlyRevenue[].recognizedRevenue` keeps its current (unclipped) meaning for backward compatibility; the new `pendingRevenue` and `totalRevenue` fields are clipped, and `totalRevenue` = clipped validated + clipped pending.

### D4. Client-side composition in `AnaliticaPage`, charts in `charts/`
Six components in `src/components/portal/analitica/charts/`, each taking a narrow typed slice of `AnaliticaDashboard` and rendering `<Empty />`-equivalent when the series is empty/all-zero. Formatting helpers (`currency`, `integer`, `percent`, new `compactCurrency`, `decimal1`, `monthLabel`) move to `src/components/portal/analitica/format.ts` so page and charts share them. *Alternative:* keep everything inline in `AnaliticaPage.tsx` (current style) — rejected: the file is already 141 dense lines and would roughly double. The unused `BookingStatusChart` and `MemberStatusChart` are deleted.

### D5. nivo specifics
- Monthly revenue bar labels: `ResponsiveBar` with `enableLabel`, `labelPosition="end"`, `labelOffset` ≈ -10 → label drawn above the bar is not native, so use a **custom layer** (`layers={['grid','axes','bars', TotalsLayer]}`) that renders an SVG `<text>` at `bar.x + bar.width/2, bar.y - 6`. Robust and theme-colored.
- Horizontal plan bars: `ResponsiveBar layout="horizontal"`, data reversed so the largest renders on top (nivo draws index 0 at the bottom), `margin.left` ≈ 120 for truncated names.
- Lines: `ResponsiveLine` with `curve="monotoneX"`, `enablePoints`, `useMesh`, `yScale={{ type: 'linear', min: 0, max: 'auto' }}`, integer tick format for subscriptions.
- Donuts: reuse the current pie config (`innerRadius 0.62`, bottom legend, `arcLabelsSkipAngle 10`) with `arcLabel` formatting percentage computed from the data total. Discipline donut groups beyond 5 into "Otras" client-side.
- All components are client components (`'use client'` via `AnaliticaPage`).

### D6. KPI card detail reuse
"Pagos pendientes por validar" uses the existing `detail` prop of `AnaliticaKpiCard` (11 px muted line). No card API change needed.

## Risks / Trade-offs

- [Mean-of-ratios occupancy differs from the pooled % in Operación] → Labels say "promedio / entrenamiento"; Operación keeps "Ocupación". Documented in the spec.
- [Attendance % penalises sessions where attendance was not recorded] → Accepted per definition; if it proves noisy, a follow-up can limit to sessions with ≥1 attendance row.
- [RPC cost grows (extra per-session aggregation and subscription scan)] → All scans are tenant + date bounded and use existing indexes; add `(tenant_id, created_at)` index on `suscripciones`. Verify with `explain analyze` locally on seed data.
- [Replacing the whole function body can drift from phase one] → Copy the phase-one body verbatim and only append CTEs/keys; diff the two files in review.
- [Custom bar layer typing in nivo 0.99] → Type the layer with `BarCustomLayerProps<Datum>`; fall back to `labelPosition="end"` inside the bar if typing blocks.

## Migration Plan

1. Create the migration file; apply locally with `supabase db reset` / `supabase migration up`. **Never push to the remote project.**
2. Call the RPC from the local SQL editor as an admin of a seeded tenant and check the new keys.
3. Rollback: re-run the phase-one `create or replace function` body (from `20260921130000_tenant_bi_phase_one.sql`); the client tolerates missing fields only after the frontend is also reverted, so revert both together.

## Open Questions

- None blocking. Revenue and "subscription sold" definitions were confirmed by the user (validated + pending; created in period, excluding cancelled).
