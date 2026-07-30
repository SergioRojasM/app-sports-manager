## ADDED Requirements

### Requirement: evaluar_suspensiones_cron function SHALL suspend active members exceeding absence thresholds
The system SHALL provide a `SECURITY DEFINER` PL/pgSQL function `public.evaluar_suspensiones_cron()` that evaluates all active members with an assigned suspension rule. The function SHALL iterate over members where `estado = 'activo'`, `tenant_regla_suspension_id IS NOT NULL`, the linked rule has `activo = true`, and `tenant_id` is not the public tenant (`2a089688-3cfc-4216-9372-33f50079fbd1`). For each member, it SHALL count unprocessed absences (`asistio = false AND validacion_suspension = false`) joined via `reservas.atleta_id = miembro.usuario_id`, filtered by the rule's temporal conditions using `fecha_asistencia`. When `por_dias_atras > 0`, only absences with `fecha_asistencia >= NOW() - INTERVAL '<por_dias_atras> days'` SHALL be counted. When `por_suscripcion = true`, only absences where `fecha_asistencia` falls within an active subscription's `fecha_inicio..fecha_fin` for the same tenant and athlete SHALL be counted. When both conditions apply, they SHALL be combined with AND. If the count ≥ `num_inasistencias`, the function SHALL: (1) update `miembros_tenant.estado` to `'suspendido'`, (2) insert an audit record in `miembros_tenant_novedades` with `tipo = 'inasistencias_acumuladas'`, `estado_resultante = 'suspendido'`, `registrado_por = NULL`, and a descriptive message, and (3) mark the counted absences with `validacion_suspension = true`.

#### Scenario: Member with 3 absences in 30-day window is suspended
- **WHEN** the function runs and a member has `estado = 'activo'`, an assigned rule with `num_inasistencias = 3`, `por_dias_atras = 30`, `activo = true`, and 3 unprocessed absences with `fecha_asistencia` within the last 30 days
- **THEN** `miembros_tenant.estado` SHALL be `'suspendido'`, a novedad with `tipo = 'inasistencias_acumuladas'` SHALL exist, and the 3 absences SHALL have `validacion_suspension = true`

#### Scenario: Member with absences below threshold is not suspended
- **WHEN** the function runs and a member has an assigned rule with `num_inasistencias = 3` but only 2 unprocessed absences within the window
- **THEN** `miembros_tenant.estado` SHALL remain `'activo'` and no novedad SHALL be inserted

#### Scenario: Already-suspended members are skipped
- **WHEN** the function runs and a member has `estado = 'suspendido'`
- **THEN** that member SHALL NOT be evaluated and no additional novedad SHALL be inserted

#### Scenario: Members with inactive rules are skipped
- **WHEN** the function runs and a member's assigned rule has `activo = false`
- **THEN** that member SHALL NOT be evaluated

#### Scenario: Members without assigned rules are skipped
- **WHEN** the function runs and a member has `tenant_regla_suspension_id IS NULL`
- **THEN** that member SHALL NOT be evaluated

#### Scenario: Public tenant members are skipped
- **WHEN** the function runs and a member belongs to tenant `2a089688-3cfc-4216-9372-33f50079fbd1`
- **THEN** that member SHALL NOT be evaluated

#### Scenario: Dual-condition rule applies AND logic
- **WHEN** a rule has `por_suscripcion = true` AND `por_dias_atras = 20`, and a member has 3 absences in the last 20 days but only 1 of them falls within an active subscription period
- **THEN** only 1 absence SHALL be counted and the member SHALL NOT be suspended (below threshold)

#### Scenario: Subscription-only rule counts within subscription period
- **WHEN** a rule has `por_suscripcion = true` and `por_dias_atras = 0`, and a member has 3 absences within their active subscription period and 2 outside it
- **THEN** only 3 absences SHALL be counted

#### Scenario: Days-only rule counts within rolling window
- **WHEN** a rule has `por_suscripcion = false` and `por_dias_atras = 30`, and a member has 2 absences within the last 30 days and 3 older than 30 days
- **THEN** only 2 absences SHALL be counted

#### Scenario: Processed absences are not recounted
- **WHEN** the function runs and a member has 3 absences with `validacion_suspension = true` and 1 new absence with `validacion_suspension = false`
- **THEN** only the 1 new absence SHALL be counted

### Requirement: reactivar_suspensiones_expiradas function SHALL reactivate members with expired temporary suspensions
The system SHALL provide a `SECURITY DEFINER` PL/pgSQL function `public.reactivar_suspensiones_expiradas()` that reactivates suspended members whose temporary suspension period has elapsed. The function SHALL iterate over members where `estado = 'suspendido'`, `tenant_regla_suspension_id IS NOT NULL`, and the linked rule has `duracion > 0` and `activo = true`. For each member, it SHALL find the most recent novedad with `tipo = 'inasistencias_acumuladas'` and `estado_resultante = 'suspendido'`. If `novedad.created_at + duracion days <= NOW()`, the function SHALL: (1) update `miembros_tenant.estado` to `'activo'`, and (2) insert an audit record with `tipo = 'reactivacion'`, `estado_resultante = 'activo'`, `registrado_por = NULL`.

#### Scenario: Member suspended 6 days ago with 5-day duration is reactivated
- **WHEN** the function runs and a member has `estado = 'suspendido'`, an assigned rule with `duracion = 5`, and the most recent suspension novedad has `created_at` 6 days ago
- **THEN** `miembros_tenant.estado` SHALL be `'activo'` and a novedad with `tipo = 'reactivacion'` SHALL exist

#### Scenario: Member suspended 3 days ago with 5-day duration is not reactivated
- **WHEN** the function runs and a member has `estado = 'suspendido'`, an assigned rule with `duracion = 5`, and the most recent suspension novedad has `created_at` 3 days ago
- **THEN** `miembros_tenant.estado` SHALL remain `'suspendido'`

#### Scenario: Permanent suspension is never auto-reactivated
- **WHEN** the function runs and a member has `estado = 'suspendido'` with an assigned rule where `duracion = 0`
- **THEN** that member SHALL NOT be processed by the reactivation function

#### Scenario: Member with no suspension novedad is not reactivated
- **WHEN** the function runs and a suspended member has no novedad with `tipo = 'inasistencias_acumuladas'` (e.g., manual suspension)
- **THEN** that member SHALL NOT be reactivated

### Requirement: pg_cron job SHALL execute reactivation then evaluation daily at 01:00 AM Colombia
The system SHALL schedule a pg_cron job named `evaluar-suspensiones-diarias` with cron expression `0 6 * * *` (06:00 UTC = 01:00 AM Colombia UTC-5). The job SHALL execute `reactivar_suspensiones_expiradas()` first, then `evaluar_suspensiones_cron()`. This order ensures members reactivated in the first step can be immediately re-evaluated in the second step if new unprocessed absences exceed the threshold.

#### Scenario: Cron job is registered with correct schedule
- **WHEN** the migration is applied
- **THEN** a row in `cron.job` SHALL exist with `jobname = 'evaluar-suspensiones-diarias'` and `schedule = '0 6 * * *'`

#### Scenario: Reactivation runs before evaluation
- **WHEN** the cron job executes and a member's temporary suspension has expired AND the member has new unprocessed absences exceeding the threshold
- **THEN** the member SHALL first be reactivated (novedad `tipo = 'reactivacion'`) and then re-suspended (novedad `tipo = 'inasistencias_acumuladas'`) in the same run

#### Scenario: Cron execution is logged
- **WHEN** the cron job runs
- **THEN** `cron.job_run_details` SHALL contain a record for the execution with status and timing information

### Requirement: pg_cron extension SHALL be enabled
The system SHALL enable the `pg_cron` PostgreSQL extension via migration to support scheduled database jobs within Supabase.

#### Scenario: Extension is available after migration
- **WHEN** the pg_cron migration is applied
- **THEN** `SELECT * FROM pg_extension WHERE extname = 'pg_cron'` SHALL return one row
