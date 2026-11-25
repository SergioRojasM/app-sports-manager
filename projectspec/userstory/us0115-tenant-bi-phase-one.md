# US-0115 — Deliver Phase One Tenant Business Intelligence Dashboards

## ID
US-0115

## Name
Implement the Phase One Revenue, Operations, and Team BI Dashboards for Tenant Administrators

## As a
Tenant administrator

## I Want
A tenant-scoped analytics area that shows reconciled revenue, training operations, and team health metrics for a selectable date range

## So That
I can make commercial and operational decisions without manually combining payments, bookings, attendance, subscriptions, and membership data from separate management screens

---

## Description

### Current State

- The portal has separate administrator areas for subscriptions, bookings, training, and team management, but it has no tenant analytics page, analytics navigation item, reusable BI types, or BI data service.
- Transactional data already exists in `pagos`, `suscripciones`, `reservas`, `asistencias`, `entrenamientos`, `disciplinas`, `escenarios`, `miembros_tenant`, `roles`, `usuarios`, `planes`, `plan_tipos`, and `entrenamientos_publicos`.
- Payments have three workflow states in the current application: `pendiente`, `validado`, and `rechazado`. `gestionSuscripcionesService.updatePagoEstado` sets `fecha_validacion` only when `estado = 'validado'`; therefore **only validated payments are recognized revenue** in this phase.
- Bookings have `pendiente`, `confirmada`, `cancelada`, and `completada` states. A non-cancelled booking consumes capacity; attendance remains an independent validation stored in `asistencias.asistio` and must not be inferred from the booking state.
- `miembros_tenant.estado` is a current-state field. It supports the current team-health dashboard but cannot produce historical month-end membership trends without the Phase Two snapshot work.
- The data model contains PII such as email, phone, identification, date of birth, sports profile data, and form responses. Phase One dashboards must not expose these fields.

### Proposed Changes

#### Scope and access

- Add a new administrator-only route: `/portal/orgs/[tenant_id]/analitica`.
- Add an `Analítica` item with the `analytics` Material Symbol to the `administrador` tenant menu in `src/types/portal.types.ts`, after `Reservas`.
- The existing `(administrador)/layout.tsx` role guard remains the routing gate. The database layer must independently enforce the same administrator-only tenant scope; client-side route visibility is not authorization.
- Coaches, athletes, unauthenticated users, and administrators of another tenant must not retrieve any BI data through the RPC functions. The UI route remains unavailable to non-administrators through the existing layout behavior.

#### BI semantic layer

- Create a non-exposed `bi` schema and three read-only views. The browser must never query the views directly.
- Create `public.get_tenant_bi_dashboard(p_tenant_id uuid, p_date_from date, p_date_to date)` as the sole public BI read entry point. It is a `SECURITY DEFINER` function with `set search_path = public, bi`, grants `EXECUTE` to `authenticated`, and explicitly verifies that the current user is an administrator of `p_tenant_id` before reading any fact view.
- Reuse `public.get_admin_tenants_for_authenticated_user()` for the authorization predicate. It must select its `id` field, because this helper returns tenant rows rather than a `tenant_id` scalar relation.
- On failed authorization the function must raise `insufficient_privilege` (`42501`) and must not return an empty-but-successful payload, so the UI can distinguish access denial from no data.
- Validate `p_date_from <= p_date_to`; invalid ranges must raise `22007` with a clear message. The UI must prevent invalid submission as defense in depth, but the database check is authoritative.
- Date boundaries are inclusive and use `America/Bogota` as the Phase One operational time zone. Because `tenants` has no configured time-zone field yet, the database RPC and UI presets MUST consistently bucket timestamps and derive calendar dates in `America/Bogota`; the browser's local time zone MUST NOT alter Phase One totals. A later phase may send the browser IANA time zone to the reporting contract for user-local presentation and period boundaries.

#### Fact views

Create these views in the `bi` schema. Each output must include `tenant_id`; all identifiers remain UUIDs and all monetary amounts remain `numeric`.

1. `bi.fct_pagos`
   - Grain: one `public.pagos` row.
   - Join `pagos` to `suscripciones`, `planes`, `plan_tipos`, `tenant_metodos_pago`, and the athlete only when the athlete identifier is required for a ranking.
   - Required fields: `pago_id`, `tenant_id`, `fecha_pago_analitica`, `monto`, `pago_estado`, `suscripcion_id`, `atleta_id`, `plan_id`, `plan_nombre`, `plan_tipo_id`, `plan_tipo_nombre`, `metodo_pago_id`, `metodo_pago_nombre`.
   - `fecha_pago_analitica` is `coalesce(fecha_validacion, fecha_pago, created_at)::date`. Revenue metrics must additionally filter to `pago_estado = 'validado'`; this date remains available for pending-payment aging.

2. `bi.fct_reservas`
   - Grain: one `public.reservas` row; it must not join `reserva_servicios`, preventing multi-service bookings from duplicating reservation counts.
   - Join `reservas` to `entrenamientos`, `disciplinas`, `escenarios`, trainer `usuarios`, and `entrenamientos_publicos`.
   - Required fields: `reserva_id`, `tenant_id`, `atleta_id`, `entrenamiento_id`, `fecha_reserva`, `fecha_cancelacion`, `reserva_estado`, `fecha_sesion`, `entrenamiento_estado`, `cupo_maximo`, `duracion_minutos`, `disciplina_id`, `disciplina_nombre`, `escenario_id`, `escenario_nombre`, `entrenador_id`, `entrenador_nombre`, and `es_publico`.
   - `es_publico` is true when a linked `entrenamientos_publicos` row exists. It is a marketplace-publication classification; it must not be rendered as “private” when false.

3. `bi.fct_asistencia`
   - Grain: one `public.asistencias` row joined to `bi.fct_reservas` by `reserva_id`.
   - Required fields: `asistencia_id`, `reserva_id`, `tenant_id`, `atleta_id`, `fecha_sesion`, `asistencia_fecha`, `asistio`, `disciplina_id`, `disciplina_nombre`, `entrenador_id`, `entrenador_nombre`, `escenario_id`, and `escenario_nombre`.
   - Attendance coverage must be computable separately from no-show: a reservation without an attendance row is not a recorded absence.

The views are implementation details of the protected RPC. Do not grant `USAGE` on `bi`, `SELECT` on the views, or direct table access to `authenticated` beyond existing policies.

#### Dashboard RPC response and metric definitions

The RPC returns one `jsonb` object with exactly three top-level keys: `revenue`, `operations`, and `team`. Numeric values are returned as JSON numbers; dates are returned as ISO `YYYY-MM-DD` strings; arrays are ordered deterministically.

**Revenue (`revenue`)**

- `recognizedRevenue`: `sum(monto)` for validated payments where `fecha_pago_analitica` is in the selected date range; zero when no qualifying rows exist.
- `previousPeriodRevenue`: same calculation for the immediately preceding range of equal inclusive length.
- `revenueChangePercent`: `(recognizedRevenue - previousPeriodRevenue) / previousPeriodRevenue * 100`; return `null` when previous-period revenue is zero.
- `yearToDateRevenue`: validated revenue from January 1 through `p_date_to`, irrespective of `p_date_from`.
- `pendingPaymentCount` and `pendingPaymentAmount`: payments with `pago_estado = 'pendiente'`, grouped by `created_at::date` in the selected range. They are pipeline, never recognized revenue.
- `revenueByPlan`: plan name, optional plan type name, validated payment count, and recognized revenue, ordered by revenue descending then name ascending.
- `revenueByPaymentMethod`: payment method name (fallback `Sin método`), validated payment count, and recognized revenue, ordered identically.
- `monthlyRevenue`: one row per calendar month that intersects the selected range, including zero-revenue months. It contains month start date, label-ready month key, recognized revenue, and cumulative recognized revenue from January 1 through that month.
- `topAthletesByRevenue`: at most five athletes, each with `atleta_id`, display name built from `usuarios.nombre`/`apellido` with fallback `Sin nombre`, validated payment count, and recognized revenue. It must not include email, phone, identification, or other PII.

**Operations (`operations`)**

- `scheduledTrainingCount`: sessions with `fecha_sesion` in range and `entrenamiento_estado <> 'cancelado'`.
- `offeredCapacity`: sum of non-null `cupo_maximo` for those sessions. Sessions with a null cupo are excluded from this denominator and reported in `trainingsWithoutCapacity`.
- `validBookingCount`: reservations for a session in range where `reserva_estado <> 'cancelada'`.
- `cancelledBookingCount`: reservations cancelled in the selected range based on `fecha_cancelacion`, not session date.
- `occupancyPercent`: `validBookingCount / offeredCapacity * 100`; return `null` when offered capacity is zero. This is a capacity-weighted tenant aggregate, not an arithmetic average of session percentages.
- `trainingsWithoutCapacity`: count of non-cancelled sessions in range where `cupo_maximo is null`.
- `bookingByDiscipline`: discipline name, valid bookings, cancelled bookings, offered capacity, and occupancy percentage; order by valid bookings descending then discipline name.
- `bookingByPublicStatus`: two rows, `Marketplace public` and `Not published to marketplace`, with valid bookings and occupancy where capacity exists. Rows must exist even when their count is zero.
- `topAthletesByBookings`: at most five athletes with `atleta_id`, display name, valid booking count, cancellation count, and attendance count when registered.
- `upcomingCapacityAlerts`: at most ten non-cancelled sessions from today through 30 days ahead, with name, date/time, discipline, scenario, cupo, valid booking count, remaining capacity, and occupancy percentage. Include only sessions with a defined cupo and occupancy at least 80%; sort by date/time ascending.

**Team (`team`)**

- `membersByStatus`: count members by each supported current state: `activo`, `mora`, `suspendido`, `inactivo`, and `pendiente_activacion`. Missing states return zero.
- `activeAthleteCount`: distinct members whose role name is `usuario` and membership state is `activo`.
- `activeAthletesByPlanType`: distinct active athlete members with at least one currently valid active subscription, grouped by plan type. A subscription is currently valid when `estado = 'activa'`, `fecha_inicio` is null or `fecha_inicio <= current_date`, and `fecha_fin` is null or `fecha_fin >= current_date`. When a subscription has no plan type, group it as `Sin tipo de plan`.
- `activeAthletesWithoutSubscriptionCount`: distinct active athlete members with no currently valid active subscription in the tenant.
- `membersWithoutSubscription`: at most 25 rows for the operational drill-down, containing `atleta_id`, display name, membership status, and latest booking date. Do not return contact details. Sort by latest booking date ascending with nulls first, then display name.

The response must use `coalesce` for all counts and monetary totals. An empty tenant returns a successful response with zero values and empty arrays, never null collections.

#### UI and interaction

- Add `AnaliticaTenantPage` as a server page that resolves `tenant_id` and renders a client feature root `AnaliticaPage`.
- `AnaliticaPage` owns a single date-range filter. Default it to the first day of the current `America/Bogota` month through the current `America/Bogota` date. Offer preset controls for `This month`, `Last 30 days`, `Year to date`, and a custom start/end date pair.
- Use a segmented control for presets and native date inputs for custom boundaries. The custom inputs must have labels, enforce end date not earlier than start date, and apply only after an explicit `Actualizar` button.
- Render an accessible tab list directly below the date-range filter, with four tabs in this fixed order: `Resumen`, `Ingresos`, `Operación`, and `Equipo`. `Resumen` is selected on initial load.
- `Resumen` renders the primary KPI cards from the three domains: recognized revenue, pending payment amount, occupancy, valid booking count, active athlete count, and active athletes without a subscription. Each card links to its source tab without changing the selected date range.
- `Ingresos`, `Operación`, and `Equipo` each render only their corresponding full dashboard section. Changing tabs is client-only state: it does not alter the URL, reset filters, or trigger another RPC request.
- Load the complete response once through `useAnalitica(tenantId)` and share it among every tab. When the date range changes, retain the last successful result until the replacement request completes and identify loading accessibly. Data refreshes once per applied range, regardless of the selected tab.
- Revenue section: KPI cards for recognized revenue, year-to-date revenue, pending-payment amount/count, and period-over-period change; monthly trend chart/table; revenue by plan/type; revenue by payment method; top-athletes table.
- Operations section: KPI cards for scheduled sessions, valid bookings, occupancy, cancelled bookings, and trainings without capacity; discipline breakdown; marketplace-publication breakdown; top-athletes table; upcoming-capacity alert table.
- Team section: member-state count cards; active-athlete count; active athletes by plan type; members without active subscription count and an accessible drill-down table capped to the rows returned by the RPC.
- Implement tabs with the WAI-ARIA tabs pattern: a `role="tablist"`, keyboard-focusable `role="tab"` controls with `aria-selected`, and `role="tabpanel"` sections linked using stable IDs. Arrow Left/Right moves focus and selects the adjacent tab; Home selects the first tab and End selects the last tab. The selected tab's panel is the only one rendered in the main content area.
- All visualizations need a semantic table or textual summary equivalent. A chart must never be the only way to read a value. Do not add a chart library for this story; use the existing Tailwind/UI patterns and simple CSS bars/SVG-free table summaries.
- All currency rendering must use `Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })`. The implementation does not introduce a currency configuration model.
- Display `N/A` for a null occupancy or period-change denominator and `Sin cupo definido` for capacity-dependent rows whose capacity is null.
- Treat query errors as errors, and empty data as a valid empty state. Do not replace a permission denial with a zero-data state.

---

## Database Changes

Create one migration: `supabase/migrations/20260921130000_tenant_bi_phase_one.sql`.

### 1. Create the private BI schema and fact views

```sql
create schema if not exists bi;
revoke all on schema bi from public, anon, authenticated;

create or replace view bi.fct_pagos as
select
  p.id as pago_id,
  p.tenant_id,
  coalesce(p.fecha_validacion, p.fecha_pago, p.created_at)::date as fecha_pago_analitica,
  p.monto,
  p.estado as pago_estado,
  s.id as suscripcion_id,
  s.atleta_id,
  pl.id as plan_id,
  pl.nombre as plan_nombre,
  pt.id as plan_tipo_id,
  pt.nombre as plan_tipo_nombre,
  p.metodo_pago_id,
  tmp.nombre as metodo_pago_nombre
from public.pagos p
join public.suscripciones s on s.id = p.suscripcion_id
join public.planes pl on pl.id = s.plan_id
left join public.plan_tipos pt on pt.id = s.plan_tipo_id
left join public.tenant_metodos_pago tmp on tmp.id = p.metodo_pago_id;
```

Implement `bi.fct_reservas` and `bi.fct_asistencia` with the exact fields and grains in the Description. `fct_reservas` must use a `left join public.entrenamientos_publicos` and derive `es_publico` from existence; it must not join `reserva_servicios`.

### 2. Create the protected aggregate RPC

```sql
create or replace function public.get_tenant_bi_dashboard(
  p_tenant_id uuid,
  p_date_from date,
  p_date_to date
)
returns jsonb
language plpgsql
security definer
set search_path = public, bi
as $$
begin
  if p_date_from is null or p_date_to is null or p_date_from > p_date_to then
    raise exception 'p_date_from must be on or before p_date_to'
      using errcode = '22007';
  end if;

  if not exists (
    select 1
    from public.get_admin_tenants_for_authenticated_user() admin_tenant
    where admin_tenant.id = p_tenant_id
  ) then
    raise exception 'Administrator access to this tenant is required'
      using errcode = '42501';
  end if;

  -- Build the revenue, operations, and team JSON objects defined above.
  -- Every aggregate is constrained by p_tenant_id and its stated date rule.
end;
$$;

revoke all on function public.get_tenant_bi_dashboard(uuid, date, date) from public;
grant execute on function public.get_tenant_bi_dashboard(uuid, date, date) to authenticated;
```

The function must return only aggregate data and the explicitly approved athlete ranking/drill-down fields. It must not use `createServiceClient`, must not alter existing RLS policies, and must not grant access to `bi` objects.

### 3. Supporting indexes

Add only these indexes if their equivalent does not already exist:

```sql
create index if not exists idx_pagos_tenant_estado_fecha_validacion
  on public.pagos (tenant_id, estado, fecha_validacion);

create index if not exists idx_reservas_tenant_entrenamiento_estado
  on public.reservas (tenant_id, entrenamiento_id, estado);

create index if not exists idx_entrenamientos_tenant_fecha_estado
  on public.entrenamientos (tenant_id, fecha_hora, estado);

create index if not exists idx_miembros_tenant_tenant_rol_estado
  on public.miembros_tenant (tenant_id, rol_id, estado);

create index if not exists idx_suscripciones_tenant_atleta_estado_fechas
  on public.suscripciones (tenant_id, atleta_id, estado, fecha_inicio, fecha_fin);
```

No new physical table is created in Phase One, so no new table RLS policy is required. The private schema plus protected RPC is the access boundary. Add migration-header comments documenting that membership trends and cost/margin analytics are intentionally out of scope.

---

## API / Server Actions

No HTTP route or service-role API route is required. The browser calls one authenticated Supabase RPC through a portal service.

**File**: `src/services/supabase/portal/analitica.service.ts`

| Function | Input | Return value | Auth / RLS requirements |
| --- | --- | --- | --- |
| `getTenantBiDashboard` | `tenantId: string`, `dateFrom: string`, `dateTo: string` (`YYYY-MM-DD`) | `Promise<TenantBiDashboard>` | Calls `supabase.rpc('get_tenant_bi_dashboard', { p_tenant_id, p_date_from, p_date_to })` using `createClient()`. Maps `42501` to `TenantBiServiceError('forbidden', ...)`, invalid range to `TenantBiServiceError('validation', ...)`, and all other failures to `unknown`. It must not query `bi.*` directly. |

**File**: `src/hooks/portal/analitica/useAnalitica.ts`

| Hook | Input | Return value | Auth / behavior |
| --- | --- | --- | --- |
| `useAnalitica` | `tenantId: string` | Current date range, preset selection, `dashboard`, `loading`, `error`, `setPreset`, `setCustomRange`, `refresh` | Calls `getTenantBiDashboard` only for a valid inclusive range. Keeps last successful dashboard during refresh, clears it only when tenant changes, and preserves the service error kind for the UI. |

---

## Files to Create or Modify

| Area | File | Change |
| --- | --- | --- |
| Migration | `supabase/migrations/20260921130000_tenant_bi_phase_one.sql` | Create private `bi` schema, `fct_pagos`, `fct_reservas`, `fct_asistencia`, protected aggregate RPC, grants, and supporting indexes |
| Types | `src/types/portal/analitica.types.ts` | New dashboard response, filter, preset, chart-row, KPI, and `TenantBiServiceError` types |
| Service | `src/services/supabase/portal/analitica.service.ts` | New RLS-aware RPC adapter and PostgREST/RPC error mapper |
| Service barrel | `src/services/supabase/portal/index.ts` | Export analytics service if the existing barrel exports feature services |
| Hook | `src/hooks/portal/analitica/useAnalitica.ts` | New date-range state and BI loading hook; its result is shared by every dashboard tab |
| Component | `src/components/portal/analitica/AnaliticaPage.tsx` | Client feature root; date filter, accessible tab state, summary view, states, and selected dashboard section |
| Component | `src/components/portal/analitica/AnaliticaDateRangeFilter.tsx` | Preset segmented control, custom native date inputs, validation, and apply action |
| Component | `src/components/portal/analitica/AnaliticaTabs.tsx` | Accessible `Resumen` / `Ingresos` / `Operación` / `Equipo` tab list with keyboard navigation |
| Component | `src/components/portal/analitica/AnaliticaKpiCard.tsx` | Reusable accessible KPI card with optional comparison/context text |
| Component | `src/components/portal/analitica/IngresosDashboard.tsx` | Revenue KPIs, monthly table/bar summary, plan/method breakdowns, and top-athletes table |
| Component | `src/components/portal/analitica/OperacionDashboard.tsx` | Operations KPIs, discipline/publication breakdowns, rankings, and capacity alerts |
| Component | `src/components/portal/analitica/EquipoDashboard.tsx` | Team-state cards, plan-type distribution, and members-without-subscription drill-down |
| Component barrel | `src/components/portal/analitica/index.ts` | Export `AnaliticaPage` |
| Page | `src/app/portal/orgs/[tenant_id]/(administrador)/analitica/page.tsx` | New administrator route that resolves `tenant_id` and renders `AnaliticaPage` |
| Navigation | `src/types/portal.types.ts` | Add the administrator-only `Analítica` menu item |
| Documentation | `projectspec/03-project-structure.md` | Add the route, component slice, hook, service, and BI security-boundary notes |
| Documentation | `projectspec/bi_proposal/propuesta_tableros_control_bi.md` | Mark Phase One implementation as delivered only after all acceptance criteria are met; do not alter later-phase scope |

---

## Acceptance Criteria

1. An authenticated administrator of tenant A can navigate to `/portal/orgs/{tenantA}/analitica`, sees the date filter and the `Resumen`, `Ingresos`, `Operación`, and `Equipo` tabs, and lands on `Resumen` by default.
2. The `Resumen` tab shows recognized revenue, pending payment amount, occupancy, valid booking count, active athlete count, and active athletes without a subscription for the selected date range; each summary card switches to its corresponding source tab while retaining the active date range.
3. Selecting `Ingresos`, `Operación`, or `Equipo` renders only the matching full dashboard content; changing the selected tab neither changes the URL nor sends an additional RPC request for the unchanged date range.
4. The dashboard executes one complete `get_tenant_bi_dashboard` request per initially loaded or newly applied valid date range and shares that result across all four tabs.
5. The dashboard tabs implement the WAI-ARIA tabs interaction model: correct tab/panel roles and relationships, selected state, Arrow Left/Right navigation, and Home/End navigation.
6. The `Analítica` navigation item appears only in the administrator tenant menu; it does not appear for `usuario` or `entrenador` roles.
7. A non-administrator calling `get_tenant_bi_dashboard` for any tenant receives PostgreSQL error code `42501`; the UI shows an access-denied state and never a zero-data dashboard.
8. An administrator of tenant A cannot retrieve tenant B data through the RPC, including by manually changing the `tenant_id` in the client request.
9. The browser role has no direct `USAGE` on schema `bi` and no direct `SELECT` grant on any `bi.fct_*` view; dashboard data is retrievable only through the protected RPC.
10. The RPC rejects null dates and date ranges where `p_date_from > p_date_to` with error code `22007`; the UI prevents applying such a range and displays an inline validation message.
11. The default UI range is the first `America/Bogota` day of the current month through the current `America/Bogota` date; `This month`, `Last 30 days`, `Year to date`, and a valid custom range load the corresponding data.
12. Recognized revenue equals the sum of `pagos.monto` for only `estado = 'validado'` records in the selected range, using `coalesce(fecha_validacion, fecha_pago, created_at)::date`; pending and rejected payments do not contribute to it.
13. Pending payment count and amount include only `estado = 'pendiente'` payments created within the selected range and are visually labelled as pending rather than revenue.
14. Revenue by plan/type, payment method, monthly revenue, and top-athlete rankings reconcile to the same validated-payment source total; the top-athlete payload contains no email, phone, identification, birth-date, or sports-profile fields.
15. The monthly revenue result includes every calendar month intersecting the selected range, including months with zero revenue, and the year-to-date cumulative value starts on January 1 of `p_date_to`'s year.
16. Valid booking count excludes only `cancelada` bookings; it is not multiplied by service-ledger rows, categories, or attendance rows.
17. Offered capacity sums only non-cancelled sessions with non-null `cupo_maximo`; sessions with null capacity are excluded from the denominator and counted in `trainingsWithoutCapacity`.
18. Occupancy is calculated as aggregate valid bookings divided by aggregate offered capacity and is `null`/rendered as `N/A` when offered capacity is zero.
19. Cancellation count is based on `fecha_cancelacion` falling in the selected range, independent of the scheduled session date.
20. A training is classified as marketplace public only when it has a linked `entrenamientos_publicos` row. The UI uses the labels `Marketplace public` and `Not published to marketplace`, never an unsupported “private training” classification.
21. The operations capacity-alert table returns no more than ten non-cancelled future sessions within 30 days, with defined capacity and at least 80% occupancy, sorted by earliest session date.
22. Team state cards return a zero for each missing supported state and show `activo`, `mora`, `suspendido`, `inactivo`, and `pendiente_activacion` distinctly.
23. Active-athlete metrics include only `miembros_tenant.estado = 'activo'` members whose role is `usuario`; active athletes without subscription have no active subscription whose date window covers `current_date`.
24. The members-without-subscription drill-down returns at most 25 rows and never returns contact or sensitive profile fields.
25. A tenant with no qualifying records returns a successful payload with zero KPI values and empty arrays, and each dashboard section displays a clear empty state without runtime errors.
26. A refresh failure retains the previous successful dashboard during loading, then shows an actionable error state; an empty response is not shown as an error.
27. Currency values are formatted as COP, tables remain readable at narrow widths, all date inputs have associated labels, all tables use scoped headers, and keyboard users can select a range and refresh the dashboard.
28. `npm run lint` and `npx tsc --noEmit` pass after implementation.

---

## Implementation Steps

- [ ] Review current indexes before creating the migration and avoid duplicate equivalents
- [ ] Create `20260921130000_tenant_bi_phase_one.sql` with private BI views, RPC validation/authorization, grants, indexes, and migration-header scope notes
- [ ] Apply the migration locally and verify `authenticated` cannot select `bi.fct_*` directly
- [ ] Seed or identify test rows for validated, pending, rejected, cancelled, completed, capacity-null, public-marketplace, and cross-tenant cases
- [ ] Reconcile direct SQL aggregates against each field returned by `get_tenant_bi_dashboard`
- [ ] Create analytics types and the portal RPC service with typed error mapping
- [ ] Create `useAnalitica` with `America/Bogota` date presets, custom-range validation, refresh behavior, and stale-result retention
- [ ] Build `AnaliticaTabs` with the WAI-ARIA keyboard model and wire the default `Resumen` tab
- [ ] Build the analytics component slice, including the six-card summary view and the separate accessible revenue, operations, and team tabs
- [ ] Add the administrator route and menu entry
- [ ] Test database authorization as administrator of the target tenant, administrator of a different tenant, coach, athlete, and unauthenticated user
- [ ] Test empty, loading, error, zero-denominator, null-capacity, zero-previous-period, and cross-year date-range states
- [ ] Update project structure and BI proposal documentation
- [ ] Run `npm run lint` and `npx tsc --noEmit`

---

## Non-Functional Requirements

- **Security**: The RPC must be `SECURITY DEFINER` with a fixed search path and explicit administrator authorization before every read. Revoke public access before granting `authenticated` execution. Do not use a service-role browser client, do not expose `bi` schema objects through PostgREST, and do not return PII or raw payment proof paths. Existing transactional RLS policies remain unchanged.
- **Performance**: All facts are constrained by `tenant_id` and date predicates before aggregation. Use the specified supporting indexes only when missing. Keep rankings at five rows, alerts at ten rows, and member drill-downs at 25 rows. The Phase One RPC computes live aggregates; materialized views and scheduled refresh are explicitly deferred until profiling demonstrates the need.
- **Accessibility**: Date controls require visible labels; segmented presets expose selected state; dashboard tabs follow the WAI-ARIA tabs pattern with Arrow Left/Right and Home/End keyboard interaction; refresh uses an accessible loading announcement; every data table uses `scope="col"`; textual tables/summaries accompany visual bars; color is never the sole carrier of a KPI state.
- **Error handling**: Map `42501` to a permission-denied message, `22007` to a date-range validation message, and unexpected RPC failures to a retryable generic error. Do not log or render raw PostgreSQL messages containing implementation detail. Empty results are normal dashboard states.
- **Correctness**: All Phase One analytical dates and timestamp-to-date bucketing use `America/Bogota`; browser-local time MUST NOT alter totals. A future enhancement may pass the browser IANA time zone to the reporting contract for user-local presentation and period boundaries. The API response must use deterministic array ordering. Counts must use `count(distinct ...)` whenever a join can introduce multiple rows per athlete or booking. `fct_reservas` must remain one row per reservation.