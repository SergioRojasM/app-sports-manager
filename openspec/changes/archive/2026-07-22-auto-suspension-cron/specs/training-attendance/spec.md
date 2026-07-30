## MODIFIED Requirements

### Requirement: Admin and coach attendance record creation
The system SHALL allow users with the `administrador` or `entrenador` role to create an attendance record for any booking within their tenant. The record MUST store `asistio` (boolean), optional `observaciones`, `validado_por = auth.uid()`, and `fecha_asistencia = now()`. Only one attendance record per booking is allowed (`reserva_id` unique constraint); creation MUST use an upsert operation to handle conflicts gracefully. Each attendance record SHALL also include a `validacion_suspension` column (`boolean NOT NULL DEFAULT false`) that tracks whether the record has been processed by the automated suspension cron. This column is system-managed and SHALL NOT be exposed in UI forms.

#### Scenario: Admin creates attendance record marking athlete as attended
- **WHEN** an administrador opens the `AsistenciaFormModal` for a booking with no existing attendance record, selects "Asistió", and submits
- **THEN** a new `asistencias` row is inserted with `asistio = true`, `validado_por = auth.uid()`, `fecha_asistencia = now()`, `validacion_suspension = false`, and the panel's attendance badge updates to "Asistió"

#### Scenario: Coach creates attendance record marking athlete as not attended
- **WHEN** an entrenador opens the `AsistenciaFormModal` for a booking with no existing attendance record, selects "No asistió", optionally fills observations, and submits
- **THEN** a new `asistencias` row is inserted with `asistio = false`, `validacion_suspension = false`, and the panel's attendance badge updates to "No asistió"

#### Scenario: Upsert resolves conflict on re-submission
- **WHEN** an adminstrador submits the attendance form for a booking that already has an `asistencias` row
- **THEN** the existing row is updated (not duplicated), with the new values for `asistio`, `observaciones`, `validado_por`, and `fecha_asistencia`

#### Scenario: New absence record defaults to unprocessed for suspension
- **WHEN** an attendance record with `asistio = false` is created or upserted
- **THEN** `validacion_suspension` SHALL be `false`, making it eligible for counting by the suspension evaluation cron

## ADDED Requirements

### Requirement: asistencias table SHALL include validacion_suspension column
The `public.asistencias` table SHALL include a column `validacion_suspension` of type `BOOLEAN NOT NULL DEFAULT false`. This column tracks whether an absence record has already been counted toward an automated suspension. A partial index `idx_asistencias_no_validadas ON asistencias(tenant_id) WHERE asistio = false AND validacion_suspension = false` SHALL be created to optimize the suspension evaluation query.

#### Scenario: Column defaults to false for new records
- **WHEN** a new `asistencias` row is inserted without specifying `validacion_suspension`
- **THEN** the column SHALL default to `false`

#### Scenario: Partial index covers unprocessed absences only
- **WHEN** the suspension cron queries absences with `asistio = false AND validacion_suspension = false`
- **THEN** the query SHALL use the partial index `idx_asistencias_no_validadas` for efficient lookup
