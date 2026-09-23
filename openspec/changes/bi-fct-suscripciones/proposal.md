## Why

The BI layer (`bi` schema, US-0115) has fact views for payments, trainings, bookings and attendance, but not for subscriptions. `get_tenant_bi_dashboard` therefore reads `public.suscripciones` directly in two places: the "subscriptions sold" KPIs added by `analitica-resumen-kpis-graficas`, and the team KPIs that depend on a subscription being active. Each place repeats its own joins and Bogotá date conversion, and the team KPIs re-check `fecha_inicio`/`fecha_fin` even though the rest of the app only looks at `estado` (kept current by the expiry cron). Upcoming subscription KPIs (renewals, churn, revenue per subscription, expiring subscriptions…) would add more copies. A single `bi.fct_suscripciones` view gives all of them one definition.

## What Changes

Input: change request "Crear una fct de suscripciones y que los KPIs se calculen de esa; será utilizada en próximos KPIs."

- **New view `bi.fct_suscripciones`**: one row per subscription with tenant, athlete, plan, plan type, state, dates (raw and Bogotá analytics dates), class counters, an `es_vendida` flag (not cancelled), an `es_activa` flag (`estado = 'activa'`) and a per-subscription payment summary (payment counts and validated/pending/rejected amounts, first validated payment date). Private like the other `bi.*` views: no grants to `anon`/`authenticated`.
- **`get_tenant_bi_dashboard` refactor** (`create or replace`, same signature, auth and JSON contract): the `subscriptions` section (`soldCount`, `monthlySold`, `soldByPlan`) and the team section's active-subscription CTE (`activeAthletesByPlanType`, `activeAthletesWithoutSubscriptionCount`, `membersWithoutSubscription`) read from `bi.fct_suscripciones` instead of `public.suscripciones`.
- **"Active" aligned with the app**: the team KPIs now treat a subscription as active when `estado = 'activa'`, like every portal service does, instead of re-checking `fecha_inicio`/`fecha_fin`. The daily `vencer-suscripciones-diarias` cron already moves expired subscriptions to `vencida`, so results only differ in the gap before the cron runs (until 01:00 Bogotá) or if the cron fails.
- Otherwise no behaviour change: same JSON shape, identical values on current data. No frontend, type, service or hook change.

## Capabilities

### New Capabilities
- `bi-subscription-facts`: the `bi.fct_suscripciones` fact view (columns, grain, date and state rules, privacy) and the rule that dashboard subscription KPIs are derived from it.

### Modified Capabilities
_None._ The subscription KPIs' requirements live in `analitica-resumen-dashboard` (change `analitica-resumen-kpis-graficas`, not archived yet) and the team KPIs in `tenant-business-intelligence` (change `tenant-bi-phase-one`, not archived yet). Neither spec defines "active subscription" in terms of dates (the date re-check was only an implementation detail of the phase-one SQL), so aligning it with `estado = 'activa'` needs no delta; the rule is now stated in `bi-subscription-facts`.

## Non-goals

- New KPIs or UI changes (the view only enables them).
- Changing the definition of "sold" (created in range, not cancelled).
- Changing the expiry cron.
- Refactoring other RPC sections, or moving `bi.fct_pagos` onto the new view.
- Materialising the view or adding refresh jobs.
- Pushing the migration to the remote Supabase project (local only).

## Impact

Files created:
- `supabase/migrations/20260923130000_bi_fct_suscripciones.sql` — `create or replace view bi.fct_suscripciones`, `revoke`, `create or replace function public.get_tenant_bi_dashboard` (body from `20260923120000_analitica_resumen_kpis.sql` with the two CTEs repointed), `revoke`/`grant`, supporting index on `pagos (suscripcion_id, estado)` if missing.

Files modified:
- `projectspec/03-project-structure.md` — list the `bi` fact views, including `bi.fct_suscripciones`, next to the analytics service entry.

Unchanged: `src/**` (page, components, hook, service, types), other migrations, RLS.

Depends on: `analitica-resumen-kpis-graficas` (its migration `20260923120000` must exist, since this one replaces that function body).

## Implementation Plan

1. Branch from `feat/analitica-resumen-kpis-graficas` after that work is committed.
2. Page → component → hook → service → types: confirm no change needed (the JSON contract is identical).
3. DB: create `bi.fct_suscripciones`; repoint the `subscriptions_sold` and `valid_subscriptions` CTEs; re-grant.
4. Snapshot the RPC JSON for seeded tenants/ranges before applying, apply locally, compare after (must be identical); confirm `anon`/`authenticated` cannot select from the view.
5. Update docs; run type-check and lint; write commit message and PR description.
