## ADDED Requirements

### Requirement: Athlete personal reservations page accessible at mis-reservas route
The system SHALL render a "Mis Reservas" page at `/portal/orgs/[tenant_id]/mis-reservas` for authenticated users with the `usuario` role. The page route SHALL be located at `src/app/portal/orgs/[tenant_id]/(atleta)/mis-reservas/page.tsx` and SHALL be protected by the existing `(atleta)/layout.tsx` role guard which redirects non-`usuario` users.

#### Scenario: Athlete accesses the page
- **WHEN** an authenticated user with role `usuario` navigates to `/portal/orgs/[tenant_id]/mis-reservas`
- **THEN** the system renders the `MisReservasPage` component showing the athlete's reservation history

#### Scenario: Non-athlete user is redirected
- **WHEN** an authenticated user with role `administrador` or `entrenador` navigates to `/portal/orgs/[tenant_id]/mis-reservas`
- **THEN** the `(atleta)/layout.tsx` role guard redirects them to `/portal/orgs/[tenant_id]`

#### Scenario: Navigation menu entry is visible
- **WHEN** an athlete views the portal navigation menu for a tenant
- **THEN** a "Mis Reservas" entry with icon `event_available` is visible in the menu, linking to `/portal/orgs/[tenant_id]/mis-reservas`

---

### Requirement: Default view shows last 100 own reservations
On initial load (no filters applied), the system SHALL query `reservas_reporte_view` filtered by `tenant_id` and `atleta_id = auth.uid()`, limited to 100 rows, ordered by `entrenamiento_fecha DESC NULLS LAST`. An informational banner SHALL display: "Mostrando tus ultimas 100 reservas. Para obtener mas resultados, utiliza los filtros."

#### Scenario: Initial load with reservations
- **WHEN** an athlete opens the page and has reservation records in the tenant
- **THEN** the system displays up to 100 reservations ordered by training date descending, with the informational banner

#### Scenario: Initial load with no reservations
- **WHEN** an athlete opens the page and has no reservation records in the tenant
- **THEN** the system displays an empty state message: "No tienes reservas registradas en esta organizacion."

#### Scenario: Only own reservations are visible
- **WHEN** the athlete's reservation data is loaded
- **THEN** every row in the result set has `atleta_id` matching the authenticated user's ID — no other athlete's data is returned

---

### Requirement: Server-side filter panel with date range, attendance, and discipline
The system SHALL render a filter panel with three filters. Applying filters SHALL re-execute the database query (not in-memory filtering). When any filter is active, the 100-row limit SHALL be removed (bounded by the max 60-day date range constraint). The banner SHALL update to show: "Mostrando {N} reservas encontradas."

#### Scenario: Date range preset chips
- **WHEN** the athlete selects a date range preset (`Ultimos 7 dias`, `Ultimo mes`, `Mes a la fecha`)
- **THEN** the corresponding `fechaDesde` and `fechaHasta` values are set in the filter state

#### Scenario: Custom date range within 60 days
- **WHEN** the athlete selects "Rango personalizado" and enters a valid date range of 60 days or fewer
- **THEN** the custom range is accepted and the filter state is updated

#### Scenario: Custom date range exceeding 60 days is rejected
- **WHEN** the athlete enters a custom date range exceeding 60 days
- **THEN** the system displays an inline validation message and does not execute the query

#### Scenario: Attendance filter chips
- **WHEN** the athlete selects an attendance filter (`Asistio`, `No asistio`, `Sin registrar`)
- **THEN** the `asistencia` filter is set to the corresponding value (`asistio`, `no_asistio`, `sin_registrar`)

#### Scenario: Attendance filter "Todos" clears the filter
- **WHEN** the athlete selects "Todos" in the attendance filter
- **THEN** the `asistencia` filter is cleared (no attendance filtering applied)

#### Scenario: Discipline dropdown
- **WHEN** the athlete selects a discipline from the dropdown
- **THEN** the `disciplinaNombre` filter is set to the selected discipline's name

#### Scenario: Applying filters re-executes the query
- **WHEN** the athlete clicks "Aplicar filtros" with one or more filters active
- **THEN** the system calls `getMisReservas` with the current filter state, the 100-row limit is removed, and the banner updates to "Mostrando {N} reservas encontradas."

#### Scenario: No athlete search filter exists
- **WHEN** the filter panel is rendered
- **THEN** no athlete search input is present — the page is inherently scoped to the authenticated user

---

### Requirement: Results table without athlete column
The system SHALL render a data table with the following columns: Disciplina, Entrenamiento, Fecha entrenamiento, Estado reserva, Asistencia, Fecha reserva. The table SHALL NOT include an athlete column since all rows belong to the authenticated user. The table SHALL support client-side pagination with page sizes 25, 50, and 100.

#### Scenario: Table columns are correct
- **WHEN** reservation data is loaded and the table is rendered
- **THEN** the table displays columns: Disciplina (discipline name), Entrenamiento (training name), Fecha entrenamiento (formatted training date), Estado reserva (status badge), Asistencia (attendance badge), Fecha reserva (reservation creation date)

#### Scenario: Reservation status badge display
- **WHEN** a reservation row is rendered
- **THEN** the `ReservaEstadoBadge` component (imported from `gestion-reservas/`) renders the reservation status (`confirmada`, `pendiente`, `cancelada`, `completada`)

#### Scenario: Attendance badge display
- **WHEN** a reservation row is rendered with `asistio = true`
- **THEN** a green "Asistio" badge is displayed
- **WHEN** a reservation row is rendered with `asistio = false`
- **THEN** a red "No asistio" badge is displayed
- **WHEN** a reservation row is rendered with `asistio = null`
- **THEN** a gray "Sin registrar" badge is displayed

#### Scenario: Client-side pagination
- **WHEN** the result set exceeds the selected page size
- **THEN** pagination controls are rendered allowing navigation between pages with page size options of 25, 50, and 100

---

### Requirement: CSV export of filtered results
The system SHALL provide a button to export the currently displayed (filtered) rows to a CSV file using the existing `toCsvString` and `downloadTextFile` utilities from `@/lib/csv.ts`. The file name SHALL be `mis-reservas-{YYYY-MM-DD}.csv`.

#### Scenario: CSV export with data
- **WHEN** the athlete clicks "Exportar CSV" and there are rows displayed
- **THEN** a CSV file is downloaded containing all currently filtered rows with appropriate column headers

#### Scenario: CSV export with no data
- **WHEN** the athlete clicks "Exportar CSV" and the table is empty
- **THEN** the export button is disabled or no file is generated

---

### Requirement: Loading and error states
The system SHALL display a loading indicator while the query is executing and surface service errors as toast or inline error messages.

#### Scenario: Loading state
- **WHEN** a query is in progress (initial load or filter application)
- **THEN** a loading indicator is displayed in the table area

#### Scenario: Service error
- **WHEN** the service function throws an error
- **THEN** an error message is displayed to the user with the option to retry

---

### Requirement: Layered architecture compliance
The implementation SHALL follow the project architecture: `page → component → hook → service → supabase`. No direct Supabase calls from components, hooks, or page files are permitted. All data access SHALL go through `reservas.service.ts` and `disciplines.service.ts`.

#### Scenario: No Supabase imports in components or hooks
- **WHEN** the mis-reservas feature code is reviewed
- **THEN** no file in `src/components/portal/mis-reservas/` or `src/hooks/portal/mis-reservas/` imports from `@supabase/supabase-js` or calls `createClient()`

#### Scenario: Service layer handles all queries
- **WHEN** the `getMisReservas` function is called
- **THEN** it queries `reservas_reporte_view` via the Supabase client and returns typed `ReservaReportRow[]`
