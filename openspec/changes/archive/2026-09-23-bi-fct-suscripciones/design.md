## Context

The `bi` schema (phase one, `20260921130000_tenant_bi_phase_one.sql`) holds private fact views that `public.get_tenant_bi_dashboard` aggregates:

```
public.pagos ──────────► bi.fct_pagos
public.entrenamientos ─► bi.fct_entrenamientos ─► bi.fct_reservas ─► bi.fct_asistencia
public.suscripciones ──► (none)  ◄── read directly in 2 CTEs of the RPC
```

After `analitica-resumen-kpis-graficas` (`20260923120000`), the RPC reads `public.suscripciones` in:
1. `subscriptions_sold` → `soldCount`, `monthlySold`, `soldByPlan` (created in range, not cancelled, Bogotá date).
2. `valid_subscriptions` (team section) → `activeAthletesByPlanType`, `activeAthletesWithoutSubscriptionCount`, `membersWithoutSubscription` (`activa` and today within the dates).

The portal services (`inicio`, `reservas`, `gestion-suscripciones`, `planes`) treat a subscription as active with `estado = 'activa'` only. Expiry is handled by the `vencer-suscripciones-diarias` pg_cron job (06:00 UTC = 01:00 Bogotá), which sets `vencida` when `fecha_fin < CURRENT_DATE` (public tenant excluded). Locally: 56 `activa`, and all 56 are also within their dates.

Local data: 188 subscriptions (56 activa, 128 vencida, 3 pendiente, 1 cancelada) on one seeded tenant. The UI and the JSON contract do not change, so page → component → hook → service → types are all untouched; only the DB layer moves.

Target:

```
public.suscripciones ─┬─► bi.fct_suscripciones ──► get_tenant_bi_dashboard
public.planes ────────┤        (1 row / subscription)     ├─ subscriptions.* (es_vendida, fecha_venta_analitica)
public.plan_tipos ────┤                                    └─ team.* (es_activa)
public.pagos (agg) ───┘
```

## Goals / Non-Goals

**Goals:**
- One definition of subscription grain, sale date, "sold" and "active", reused by current and future KPIs, and the same "active" the rest of the app uses.
- A per-subscription payment summary in the view, so later KPIs (e.g. paid vs unpaid subscriptions, revenue per plan type) don't re-join `pagos`.
- Same RPC JSON shape; identical values on current data.

**Non-Goals:**
- New KPIs, UI or type changes; materialisation; refactoring the other RPC sections.

## Decisions

### D1. Plain view, same privacy model as the other facts
`create or replace view bi.fct_suscripciones` + `revoke all ... from public, anon, authenticated`. The RPC is `security definer` and owned by the migration role, so it can read it. *Alternative:* materialised view — rejected: volumes are small (hundreds of rows per tenant) and it would need refresh logic.

### D2. Payment summary via a grouped left join on `public.pagos`
```sql
left join (
  select suscripcion_id,
         count(*) as pagos_count,
         count(*) filter (where estado = 'validado') as pagos_validados_count,
         coalesce(sum(monto) filter (where estado = 'validado'), 0) as monto_validado,
         ...
         min((coalesce(fecha_validacion, fecha_pago, created_at) at time zone 'America/Bogota')::date)
           filter (where estado = 'validado') as fecha_primer_pago_validado_analitica
  from public.pagos group by suscripcion_id
) pg on pg.suscripcion_id = s.id
```
and `coalesce(..., 0)` on the outer select. Same date rule as `bi.fct_pagos.fecha_pago_analitica`. *Alternative:* build on `bi.fct_pagos` — rejected: `fct_pagos` inner-joins subscriptions/plans, so it adds joins without adding columns; reading `public.pagos` keeps the view independent. *Alternative:* `left join lateral` — equivalent; the grouped subquery lets Postgres push the tenant filter through the join on `suscripcion_id` via the new index.

### D3. `es_activa` = `estado = 'activa'` (state is the source of truth)
The expiry cron keeps `estado` current, and every portal service already relies on it. The view therefore exposes `es_activa` as `s.estado = 'activa'`, without re-checking dates, so the dashboard counts the same active athletes the rest of the app shows. The column does not depend on `now()`, so it's stable within and across queries. *Alternative:* keep the phase-one date predicate as `vigente_hoy` — rejected: redundant with the cron, it can disagree with the rest of the app during the pre-cron window, and it makes the view volatile. Raw `fecha_inicio`/`fecha_fin` stay in the view for any KPI that needs "active at date X".

### D4. Keep the RPC's labels and orderings
The view exposes raw `plan_nombre` (nullable); the RPC keeps `coalesce(plan_nombre, 'Sin plan')` and its current `order by`, so the JSON stays identical. `valid_subscriptions` becomes `select distinct atleta_id, plan_tipo_id from bi.fct_suscripciones where tenant_id = p_tenant_id and es_activa`.

### D5. Migration replaces the full function body
New migration `20260923130000_bi_fct_suscripciones.sql` copies the function from `20260923120000_analitica_resumen_kpis.sql` and changes only the two CTEs, then re-applies `revoke`/`grant`. Index `idx_pagos_suscripcion_estado on public.pagos (suscripcion_id, estado)` is created if missing.

### D6. Equivalence check with JSON snapshots
Before applying: store `get_tenant_bi_dashboard` output as a seeded admin for several ranges in a scratch table/file; after applying: compare with `=` on `jsonb`. First confirm no `activa` subscription has `fecha_fin < today` or `fecha_inicio > today` (otherwise the team values legitimately differ, see D3).

## Risks / Trade-offs

- [The function body is copied again, so it can drift from `20260923120000`] → Diff the two function bodies in review; only the two CTEs may differ.
- [This change depends on an unmerged change] → Branch from `feat/analitica-resumen-kpis-graficas` after it's committed; merge it first.
- [The payment aggregate scans `pagos` per query] → Tenant-filtered through the subscription join plus the new index; volumes are small. Check `explain analyze` locally.
- [If the expiry cron stops running, `es_activa` keeps expired subscriptions as active] → Same exposure the rest of the app already has; the cron is the single place to fix. Monitor `cron.job_run_details` for `vencer-suscripciones-diarias`.
- [Between 00:00 and 01:00 Bogotá, subscriptions that ended yesterday still count as active] → Accepted; matches the portal.

## Migration Plan

1. Take the JSON snapshots (D6) on the local DB.
2. `npx supabase migration up --local` — **never push to remote**.
3. Compare snapshots, check `authenticated` cannot select the view, check `42501` for non-admins.
4. Rollback: re-apply the function from `20260923120000_analitica_resumen_kpis.sql` and `drop view bi.fct_suscripciones`.

## Open Questions

- None blocking.
