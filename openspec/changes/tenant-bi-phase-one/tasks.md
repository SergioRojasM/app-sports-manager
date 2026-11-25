## 1. Branch and Local Database Foundation

- [x] 1.1 Create a feature branch named `feat/tenant-bi-phase-one` from the approved base branch.
- [x] 1.2 Verify the active working branch is not `main`, `master`, or `develop` before making implementation changes.
- [x] 1.3 Inspect existing local indexes and current payment-state constraints to avoid duplicate indexes and confirm that `validado` is the recognized-revenue state.
- [x] 1.4 Create `20260921130000_tenant_bi_phase_one.sql` with the private `bi` schema, revoked browser access, and the one-row-grain `bi.fct_pagos`, `bi.fct_reservas`, and `bi.fct_asistencia` views.
- [x] 1.5 Add `public.get_tenant_bi_dashboard(uuid, date, date)` with `America/Bogota` date bucketing, date-range validation, administrator authorization, deterministic JSON arrays, and the revenue, operations, and team contracts from the BI spec.
- [ ] 1.6 Add only missing supporting indexes, apply the migration to the local Supabase database, and verify direct authenticated access to `bi` facts is denied.

## 2. Analytics Page and Components

- [x] 2.1 Create `src/app/portal/orgs/[tenant_id]/(administrador)/analitica/page.tsx` to resolve the tenant ID and render the analytics feature root behind the existing administrator layout.
- [x] 2.2 Create `AnaliticaPage` and `AnaliticaDateRangeFilter` with `America/Bogota` defaults, preset selection, validated custom start/end dates, and an explicit refresh action.
- [x] 2.3 Create `AnaliticaTabs` with `Resumen`, `Ingresos`, `Operación`, and `Equipo`; implement the WAI-ARIA tabs pattern and Arrow Left/Right/Home/End interaction.
- [x] 2.4 Create `AnaliticaKpiCard` and render the six cross-domain Summary KPIs, each changing only the selected tab while preserving the applied date range.
- [x] 2.5 Create `IngresosDashboard` with revenue KPIs, monthly textual/bar summary, plan/type and payment-method breakdowns, and the approved top-athlete ranking.
- [x] 2.6 Create `OperacionDashboard` with booking/capacity KPIs, discipline and marketplace-publication breakdowns, athlete ranking, and capped upcoming-capacity alerts.
- [x] 2.7 Create `EquipoDashboard` with member-state cards, active-athlete-by-plan-type results, and the capped members-without-subscription drill-down.
- [x] 2.8 Apply the existing portal visual language and the `zfVKC` Operations Dashboard hierarchy: header/filter, compact KPI row, dense panels, semantic tables, and responsive loading, empty, permission, and error states.

## 3. Client Data Flow and Navigation

- [x] 3.1 Create `src/types/portal/analitica.types.ts` with the complete RPC response, date filter, preset, UI row, and typed service-error contracts.
- [x] 3.2 Create `src/services/supabase/portal/analitica.service.ts` to call only `get_tenant_bi_dashboard` through the browser Supabase client and map `42501`, `22007`, and unknown errors.
- [x] 3.3 Export the analytics service from `src/services/supabase/portal/index.ts` when required by the existing portal service-barrel convention.
- [x] 3.4 Create `useAnalitica` to load one complete response per applied valid range, preserve the last successful response while refreshing, and avoid requests caused only by tab changes.
- [x] 3.5 Add the `Analítica` administrator-only menu item after `Reservas` in `src/types/portal.types.ts`, with the `analytics` icon and the `analitica` path.
- [x] 3.6 Add the analytics component barrel exports and wire the page to the hook, typed service, loading, empty, validation, and access-denied states.

## 4. Verification and Documentation

- [ ] 4.1 Reconcile fixture SQL totals with RPC values for validated/pending/rejected payments, non-cancelled/cancelled bookings, capacity-null sessions, marketplace-publication status, and active subscription coverage.
- [ ] 4.2 Verify role and tenant isolation locally as target-tenant administrator, other-tenant administrator, coach, athlete, and unauthenticated caller; confirm unauthorized RPC calls return `42501`.
- [ ] 4.3 Verify accessible tab behavior, labeled date controls, keyboard operation, null-denominator display, no-data state, stale-data refresh behavior, and absence of PII from every returned payload and displayed table.
- [x] 4.4 Update `projectspec/03-project-structure.md` with the analytics route, feature slice, hook, service, and protected BI boundary.
- [ ] 4.5 Update `projectspec/bi_proposal/propuesta_tableros_control_bi.md` to record Phase One completion only after every acceptance criterion is satisfied.
- [ ] 4.6 Run `npx tsc --noEmit`, `npm run lint`, and the relevant test suite; do not run a production build as part of this task.
- [ ] 4.7 Prepare a conventional commit message and pull-request description summarizing BI security, metric definitions, dashboard tabs, verification results, and deferred non-goals.