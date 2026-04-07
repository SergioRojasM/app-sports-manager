## MODIFIED Requirements

### Requirement: CSV data is retrieved via the reservas_reporte_view DB view
The system SHALL query the `reservas_reporte_view` PostgreSQL view, filtered by `tenant_id` and `entrenamiento_id`, to retrieve all data needed for the CSV export. The view SHALL expose a flat column set covering booking, athlete profile (including `fecha_nacimiento` and `fecha_exp_identificacion`), training metadata, attendance, and level data. The query SHALL include all booking states (`pendiente`, `confirmada`, `cancelada`, `completada`).

#### Scenario: View returns rows for a training with bookings
- **WHEN** `getReservasReport(tenantId, entrenamientoId)` is called for a training that has bookings
- **THEN** the function returns an array of `ReservaReportRow` objects with one item per booking, ordered by `created_at` ascending

#### Scenario: View returns empty array for a training with no bookings
- **WHEN** `getReservasReport(tenantId, entrenamientoId)` is called for a training with no bookings
- **THEN** the function returns an empty array

#### Scenario: View is scoped to the caller's tenant
- **WHEN** `getReservasReport` is called with a `tenantId` that does not match the authenticated user's tenant
- **THEN** the query returns no rows (enforced by `tenant_id` equality filter and underlying table RLS)

#### Scenario: Each report row includes athlete date fields
- **WHEN** `getReservasReport` returns data for a booking whose athlete has non-null date fields
- **THEN** each `ReservaReportRow` SHALL include `fecha_nacimiento` and `fecha_exp_identificacion` for that athlete

---

### Requirement: Generated CSV contains all required columns in the correct order
The system SHALL produce a CSV file where the first row is the header row containing exactly the following column names in order: `entrenamiento_nombre`, `entrenamiento_fecha`, `disciplina`, `escenario`, `nivel_disciplina`, `reserva_id`, `reserva_estado`, `fecha_reserva`, `fecha_cancelacion`, `notas_reserva`, `atleta_nombre`, `atleta_apellido`, `atleta_email`, `atleta_telefono`, `fecha_nacimiento`, `tipo_identificacion`, `numero_identificacion`, `fecha_exp_identificacion`, `asistio`, `fecha_asistencia`, `observaciones_asistencia`, `validado_por_email`. Each subsequent row SHALL correspond to one booking.

#### Scenario: CSV header row matches defined columns
- **WHEN** the CSV export is triggered for any training
- **THEN** the first line of the downloaded file contains exactly the 22 column headers listed above, comma-separated

#### Scenario: Date fields are formatted as YYYY-MM-DD HH:mm for datetime values
- **WHEN** a booking row has a non-null `entrenamiento_fecha` or `fecha_reserva` value
- **THEN** those fields are formatted as `YYYY-MM-DD HH:mm` in the CSV row

#### Scenario: fecha_nacimiento and fecha_exp_identificacion are formatted as YYYY-MM-DD
- **WHEN** a booking row has a non-null `fecha_nacimiento` or `fecha_exp_identificacion`
- **THEN** those fields appear as a `YYYY-MM-DD` date string in the CSV row

#### Scenario: Nullable fields are empty strings when null
- **WHEN** a booking row has null values for optional fields (e.g., `notas_reserva`, `nivel_disciplina`, `fecha_nacimiento`, `fecha_exp_identificacion`)
- **THEN** those fields appear as empty (no value between the surrounding commas)
