## ADDED Requirements

### Requirement: fecha_exp_identificacion column exists on usuarios
The database table `public.usuarios` SHALL contain a nullable `date` column named `fecha_exp_identificacion` representing the date the user's ID document was issued (fecha de expedición). The column SHALL have no check constraint and SHALL default to NULL.

#### Scenario: Column accepts a valid date
- **WHEN** an UPDATE sets `fecha_exp_identificacion = '2019-06-15'` for a user row
- **THEN** the value is persisted as a `date` type without error

#### Scenario: Column allows NULL
- **WHEN** an UPDATE sets `fecha_exp_identificacion = NULL` for a user row
- **THEN** the value is persisted as NULL without error

---

### Requirement: v_miembros_equipo view exposes both user date fields
The `v_miembros_equipo` PostgreSQL view SHALL include the columns `fecha_nacimiento` and `fecha_exp_identificacion` sourced from `public.usuarios`. Both columns SHALL be nullable. Authenticated users with access to the view SHALL be able to read both fields.

#### Scenario: View returns fecha_nacimiento when set
- **WHEN** a user row has a non-null `fecha_nacimiento`
- **THEN** `v_miembros_equipo` returns that value in the `fecha_nacimiento` column for the corresponding member row

#### Scenario: View returns fecha_exp_identificacion when set
- **WHEN** a user row has a non-null `fecha_exp_identificacion`
- **THEN** `v_miembros_equipo` returns that value in the `fecha_exp_identificacion` column for the corresponding member row

#### Scenario: View returns NULL for unset date fields
- **WHEN** a user row has NULL for `fecha_nacimiento` or `fecha_exp_identificacion`
- **THEN** `v_miembros_equipo` returns NULL in the respective column

---

### Requirement: reservas_reporte_view exposes athlete date fields
The `reservas_reporte_view` PostgreSQL view SHALL include the columns `fecha_nacimiento` and `fecha_exp_identificacion` sourced from the athlete `usuarios` join. Both columns SHALL be nullable.

#### Scenario: View columns present for reporting
- **WHEN** `getReservasReport` is called for a training with bookings
- **THEN** each `ReservaReportRow` item includes `fecha_nacimiento` and `fecha_exp_identificacion` (may be null)

#### Scenario: Null date fields are empty string in CSV
- **WHEN** a booking row has null `fecha_nacimiento` or `fecha_exp_identificacion`
- **THEN** those fields appear as empty strings in the CSV row
