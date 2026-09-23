## ADDED Requirements

### Requirement: Subscription fact view
The system SHALL provide the view `bi.fct_suscripciones` with exactly one row per row of `public.suscripciones` (grain: subscription). It SHALL expose these columns:

| Column | Source / rule |
|---|---|
| `suscripcion_id`, `tenant_id`, `atleta_id` | `suscripciones.id`, `.tenant_id`, `.atleta_id` |
| `plan_id`, `plan_nombre` | `suscripciones.plan_id`, `planes.nombre` (left join; null when missing) |
| `plan_tipo_id`, `plan_tipo_nombre` | `suscripciones.plan_tipo_id`, `plan_tipos.nombre` (left join) |
| `suscripcion_estado` | `suscripciones.estado` |
| `fecha_creacion` | `suscripciones.created_at` (timestamptz) |
| `fecha_venta_analitica` | `(created_at at time zone 'America/Bogota')::date` |
| `fecha_inicio`, `fecha_fin` | as stored (date) |
| `clases_plan`, `clases_restantes` | as stored |
| `es_vendida` | `estado <> 'cancelada'` |
| `es_activa` | `estado = 'activa'` — the same rule the rest of the app uses; expiry is kept up to date by the daily `vencer-suscripciones-diarias` cron, so dates are not re-checked |
| `pagos_count`, `pagos_validados_count` | count of the subscription's payments, total and `estado = 'validado'` |
| `monto_validado`, `monto_pendiente`, `monto_rechazado` | sum of `pagos.monto` per payment state, 0 when none |
| `fecha_primer_pago_validado_analitica` | earliest Bogotá date of `coalesce(fecha_validacion, fecha_pago, created_at)` among validated payments; null when none |

#### Scenario: One row per subscription
- **WHEN** `select count(*) from bi.fct_suscripciones` and `select count(*) from public.suscripciones` run
- **THEN** both counts SHALL be equal, and `suscripcion_id` SHALL be unique in the view

#### Scenario: Subscription without payments
- **WHEN** a subscription has no rows in `public.pagos`
- **THEN** its row SHALL have `pagos_count = 0`, all `monto_*` = 0 and `fecha_primer_pago_validado_analitica` null

#### Scenario: Several payments
- **WHEN** a subscription has one validated payment of 100.000 and one pending of 50.000
- **THEN** its row SHALL have `pagos_count = 2`, `pagos_validados_count = 1`, `monto_validado = 100000`, `monto_pendiente = 50000`

#### Scenario: Bogotá sale date
- **WHEN** a subscription was created at `2026-04-01 03:00 UTC`
- **THEN** its `fecha_venta_analitica` SHALL be `2026-03-31`

#### Scenario: Active flag follows the state
- **WHEN** a subscription has `estado = 'activa'`
- **THEN** `es_activa` SHALL be true, regardless of `fecha_inicio`/`fecha_fin`; for `vencida`, `pendiente` or `cancelada` it SHALL be false

#### Scenario: Expired by the cron
- **WHEN** the daily cron changes a subscription from `activa` to `vencida`
- **THEN** its `es_activa` SHALL be false from then on

### Requirement: Subscription facts stay private
`bi.fct_suscripciones` SHALL follow the same access rule as the other `bi.*` views: no privileges for `public`, `anon` or `authenticated`. Client access to subscription aggregates SHALL go only through `public.get_tenant_bi_dashboard` (security definer, tenant-admin check).

#### Scenario: Authenticated user cannot read the view
- **WHEN** a session with role `authenticated` runs `select * from bi.fct_suscripciones`
- **THEN** the query SHALL fail with a permission error

### Requirement: Dashboard subscription KPIs derive from the fact view
`public.get_tenant_bi_dashboard` MUST NOT read `public.suscripciones` directly. Its subscription-based figures SHALL come from `bi.fct_suscripciones`:
- `subscriptions.soldCount`, `subscriptions.monthlySold`, `subscriptions.soldByPlan`: rows with `es_vendida` and `fecha_venta_analitica` in range, plan label `coalesce(plan_nombre, 'Sin plan')`.
- Active subscriptions used by `team.activeAthletesByPlanType`, `team.activeAthletesWithoutSubscriptionCount` and `team.membersWithoutSubscription`: rows with `es_activa` (the RPC no longer re-checks `fecha_inicio`/`fecha_fin`).
The function's signature, `security definer`, admin check (`42501`), range check (`22007`) and JSON shape MUST stay identical. Values MUST stay identical whenever no `activa` subscription has `fecha_fin` before today or `fecha_inicio` after today (the state the expiry cron maintains).

#### Scenario: No direct table reads
- **WHEN** the function body in the new migration is inspected
- **THEN** it SHALL contain no reference to `public.suscripciones`

#### Scenario: Identical output
- **WHEN** no `activa` subscription has dates outside today, and the RPC is called for the same tenant and range before and after the migration (seeded tenants, ranges `2026-01-01..today`, current month, and a range with no data)
- **THEN** the returned JSON SHALL be equal

#### Scenario: Active athlete with an out-of-date subscription row
- **WHEN** an `activa` subscription has `fecha_fin` yesterday and the cron has not run yet
- **THEN** the team KPIs SHALL count it as active, matching what the rest of the app shows

#### Scenario: Non-admin still rejected
- **WHEN** a user who is not an admin of the tenant calls the RPC
- **THEN** it SHALL raise `42501`
