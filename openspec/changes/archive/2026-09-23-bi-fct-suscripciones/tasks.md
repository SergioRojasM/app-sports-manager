## 1. Branch setup

- [x] 1.1 Create a new branch `feat/bi-fct-suscripciones` from `feat/analitica-resumen-kpis-graficas` (after that work is committed)
- [x] 1.2 Validate the working branch is not `main`, `master` or `develop` (`git branch --show-current`)

## 2. Page, components, hook, service, types

- [x] 2.1 Confirm no change is needed in `analitica/page.tsx`, `src/components/portal/analitica/**`, `useAnalitica.ts`, `analitica.service.ts` or `analitica.types.ts` (JSON contract unchanged)

## 3. Baseline snapshot (before migration)

- [x] 3.1 Confirm no `activa` subscription has `fecha_fin < today` or `fecha_inicio > today` (if any, record them: team values will differ by design)
- [x] 3.2 As a seeded tenant admin, store `get_tenant_bi_dashboard` output for: the tenant with data over `2026-01-01..today`, its current month, a range with no data, and the empty tenant, in a scratch table (e.g. `scratch_bi_snapshot(label, output jsonb)`) or scratch file

## 4. Database (local only)

- [x] 4.1 Create `supabase/migrations/20260923130000_bi_fct_suscripciones.sql` with `create or replace view bi.fct_suscripciones` and every column in the spec (grain: one row per subscription; payment summary as a grouped left join on `public.pagos`; `es_vendida`; `es_activa` = `estado = 'activa'`)
- [x] 4.2 `revoke all on bi.fct_suscripciones from public, anon, authenticated`
- [x] 4.3 In the same migration, `create or replace function public.get_tenant_bi_dashboard` copied from `20260923120000_analitica_resumen_kpis.sql`, repointing `subscriptions_sold` (`es_vendida`, `fecha_venta_analitica`, `coalesce(plan_nombre, 'Sin plan')`) and `valid_subscriptions` (`es_activa`, no date re-check) to the view; re-apply `revoke`/`grant`
- [x] 4.4 Add `create index if not exists idx_pagos_suscripcion_estado on public.pagos (suscripcion_id, estado)`
- [x] 4.5 Apply locally only (`npx supabase migration up --local`) — never push to remote

## 5. Verification

- [x] 5.1 View checks: row count equals `public.suscripciones`, `suscripcion_id` unique, subscriptions without payments show zeros/null, `es_activa` count equals `count(*) where estado = 'activa'`
- [x] 5.2 Compare the post-migration RPC output with every baseline snapshot: all must be equal (`=` on jsonb); drop the scratch snapshot data afterwards
- [x] 5.3 `grep -n "public.suscripciones" ` on the new function body returns nothing; diff it against `20260923120000` and confirm only the two CTEs changed
- [x] 5.4 As role `authenticated`, `select` on `bi.fct_suscripciones` fails; non-admin RPC call still raises `42501`

## 6. Documentation

- [x] 6.1 Update `projectspec/03-project-structure.md`: document the `bi` fact views (`fct_pagos`, `fct_entrenamientos`, `fct_reservas`, `fct_asistencia`, `fct_suscripciones`) near the analytics service entry, noting `fct_suscripciones` is the source for subscription KPIs

## 7. Quality gates and delivery

- [x] 7.1 Run `npx tsc --noEmit`, lint on changed files and tests if any apply — do not run a build
- [x] 7.2 Write the commit message (`feat(bi-fct-suscripciones): ...`) and pull request description (why, view columns, identical-output evidence, "migration local only") in `openspec/changes/bi-fct-suscripciones/delivery.md`
