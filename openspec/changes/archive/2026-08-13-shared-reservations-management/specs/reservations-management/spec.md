## ADDED Requirements

### Requirement: Shared reservations page accessible to admin and coach
The system SHALL provide a page at `/portal/orgs/[tenant_id]/(shared)/gestion-reservas` that displays reservation data across all trainings for the tenant. The page SHALL be accessible to users with `administrador` or `entrenador` roles. The portal navigation menu SHALL include a "Gestión de Reservas" entry for these roles.

#### Scenario: Admin navigates to reservations management
- **WHEN** an authenticated user with role `administrador` navigates to `/portal/orgs/{tenant_id}/gestion-reservas`
- **THEN** the system displays the reservations management page with the last 100 reservations

#### Scenario: Coach navigates to reservations management
- **WHEN** an authenticated user with role `entrenador` navigates to `/portal/orgs/{tenant_id}/gestion-reservas`
- **THEN** the system displays the reservations management page with the last 100 reservations

#### Scenario: Athlete does not see menu entry
- **WHEN** an authenticated user with role `usuario` views the portal navigation
- **THEN** the "Gestión de Reservas" menu item SHALL NOT appear

### Requirement: Default view shows last 100 reservations ordered by training date
On initial page load, the system SHALL query the last 100 reservations for the tenant ordered by training date (`entrenamiento_fecha`) descending (most recent first). The system SHALL display an informational banner: "Mostrando las últimas 100 reservas. Para obtener más resultados, utiliza los filtros."

#### Scenario: Initial page load with reservations
- **WHEN** the page loads for a tenant that has reservations
- **THEN** the system displays up to 100 reservations ordered by training date descending
- **AND** an informational banner reads "Mostrando las últimas 100 reservas. Para obtener más resultados, utiliza los filtros."

#### Scenario: Initial page load with no reservations
- **WHEN** the page loads for a tenant that has zero reservations
- **THEN** the system displays an empty state message "No se encontraron reservas para esta organización."
- **AND** the informational banner is not shown

### Requirement: Server-side date range filter with presets
The filter panel SHALL include a date range filter with preset options and a custom range. Applying the filter SHALL re-execute the database query. Preset options: `Últimos 7 días`, `Último mes`, `Mes a la fecha`, `Rango personalizado`. Custom date range SHALL reject spans greater than 60 days.

#### Scenario: Filter by últimos 7 días
- **WHEN** the user selects "Últimos 7 días" and clicks "Aplicar filtros"
- **THEN** the system queries reservations where `entrenamiento_fecha` is within the last 7 calendar days
- **AND** the 100-row limit is removed
- **AND** the banner shows "Mostrando {N} reservas encontradas."

#### Scenario: Filter by último mes
- **WHEN** the user selects "Último mes" and clicks "Aplicar filtros"
- **THEN** the system queries reservations where `entrenamiento_fecha` is within the last 30 calendar days

#### Scenario: Filter by mes a la fecha
- **WHEN** the user selects "Mes a la fecha" and clicks "Aplicar filtros"
- **THEN** the system queries reservations where `entrenamiento_fecha` is from the 1st of the current month through today

#### Scenario: Custom date range within 60 days
- **WHEN** the user selects "Rango personalizado", enters a start and end date spanning 45 days, and clicks "Aplicar filtros"
- **THEN** the system queries reservations within the specified date range

#### Scenario: Custom date range exceeds 60 days
- **WHEN** the user selects "Rango personalizado" and enters a date range spanning more than 60 days
- **THEN** the system displays a validation error: "El rango de fechas no puede superar los 60 días."
- **AND** the query is NOT executed

### Requirement: Server-side athlete search filter
The filter panel SHALL include a text search input that filters reservations by athlete. The search SHALL match against `nombre`, `apellido`, `email`, or `numero_identificacion` using case-insensitive partial matching. Applying the filter SHALL re-execute the database query.

#### Scenario: Search by athlete name
- **WHEN** the user types "Juan" in the athlete search field and clicks "Aplicar filtros"
- **THEN** the system returns reservations where the athlete's `nombre` or `apellido` contains "Juan" (case-insensitive)

#### Scenario: Search by athlete email
- **WHEN** the user types "juan@example.com" in the athlete search field and clicks "Aplicar filtros"
- **THEN** the system returns reservations where the athlete's `email` contains the search term

#### Scenario: Search by identification number
- **WHEN** the user types "1234567" in the athlete search field and clicks "Aplicar filtros"
- **THEN** the system returns reservations where the athlete's `numero_identificacion` contains "1234567"

### Requirement: Server-side attendance filter
The filter panel SHALL include attendance status chip filters: `Todos`, `Asistió`, `No asistió`, `Sin registrar`. Default is `Todos`. Applying the filter SHALL re-execute the database query.

#### Scenario: Filter by asistió
- **WHEN** the user selects "Asistió" chip and clicks "Aplicar filtros"
- **THEN** the system returns only reservations where `asistio = true`

#### Scenario: Filter by no asistió
- **WHEN** the user selects "No asistió" chip and clicks "Aplicar filtros"
- **THEN** the system returns only reservations where `asistio = false`

#### Scenario: Filter by sin registrar
- **WHEN** the user selects "Sin registrar" chip and clicks "Aplicar filtros"
- **THEN** the system returns only reservations where `asistio IS NULL`

#### Scenario: Default todos filter
- **WHEN** the "Todos" chip is selected (default)
- **THEN** no attendance filter is applied to the query

### Requirement: Server-side discipline filter
The filter panel SHALL include a dropdown select listing all active disciplines for the tenant. Applying the filter SHALL re-execute the database query, matching reservations whose training belongs to the selected discipline.

#### Scenario: Filter by specific discipline
- **WHEN** the user selects "Natación" from the discipline dropdown and clicks "Aplicar filtros"
- **THEN** the system returns only reservations whose training's `disciplina` matches "Natación"

#### Scenario: No discipline filter selected
- **WHEN** no discipline is selected in the dropdown (default)
- **THEN** reservations from all disciplines are included

### Requirement: Reservations table with athlete detail and badges
The results table SHALL display each reservation with the following columns: Atleta (two-line: name + email/cedula), Disciplina, Entrenamiento, Fecha entrenamiento, Estado reserva (badge), Asistencia (badge), Fecha reserva. The table SHALL support client-side pagination with page sizes 25, 50, and 100.

#### Scenario: Table row displays athlete info on two lines
- **WHEN** a reservation row is rendered for an athlete named "Juan Pérez" with email "juan@test.com" and cedula "12345678"
- **THEN** the Atleta column displays line 1: "Juan Pérez" and line 2: "juan@test.com · 12345678"

#### Scenario: Reservation status badge colors
- **WHEN** a reservation has estado "confirmada"
- **THEN** the badge displays with a green/positive style
- **WHEN** a reservation has estado "pendiente"
- **THEN** the badge displays with a yellow/warning style
- **WHEN** a reservation has estado "cancelada"
- **THEN** the badge displays with a red/negative style

#### Scenario: Attendance badge display
- **WHEN** `asistio` is `true`
- **THEN** the attendance badge shows "Asistió" in green
- **WHEN** `asistio` is `false`
- **THEN** the attendance badge shows "No asistió" in red
- **WHEN** `asistio` is `null`
- **THEN** the attendance badge shows "Sin registrar" in gray

#### Scenario: Client-side pagination
- **WHEN** the result set contains 150 reservations and page size is 25
- **THEN** the table shows 6 pages of results with navigation controls
- **AND** the user can change page size to 50 or 100

### Requirement: CSV export of filtered results
The system SHALL provide an "Exportar CSV" button that exports the currently displayed (filtered) result set to a CSV file. The file SHALL be named `reservas-{date}.csv` where `{date}` is the current date in YYYY-MM-DD format.

#### Scenario: Export current results to CSV
- **WHEN** the user clicks "Exportar CSV" with 75 reservations displayed
- **THEN** the browser downloads a CSV file containing all 75 rows with headers matching the table columns

#### Scenario: Export with no results
- **WHEN** no reservations are displayed (empty result set) and the user clicks "Exportar CSV"
- **THEN** the button is disabled or the system shows an informational message

### Requirement: No direct Supabase calls from components or hooks
All database access SHALL go through service functions in `reservas.service.ts` and `disciplines.service.ts`. Components and hooks SHALL NOT import or call `createClient()` from Supabase directly.

#### Scenario: Architecture compliance
- **WHEN** reviewing the source code of all components and hooks in the `gestion-reservas` feature slice
- **THEN** no file imports `createClient` from `@/services/supabase/client` or `@/services/supabase/server`
- **AND** all data fetching is delegated to service functions

### Requirement: Loading and error states
The page SHALL display a loading indicator while the query is executing and an error message if the query fails.

#### Scenario: Loading state during query
- **WHEN** the service call is in progress
- **THEN** the page displays a loading indicator (skeleton or spinner)

#### Scenario: Error state on query failure
- **WHEN** the service call fails
- **THEN** the page displays an error message with the ability to retry
