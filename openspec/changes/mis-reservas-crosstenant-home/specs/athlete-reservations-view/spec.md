## ADDED Requirements

### Requirement: Cross-tenant reservation history page
The system SHALL provide a page at `/portal/(atleta)/mis-reservas` that displays every reservation belonging to the authenticated user (`atleta_id = auth.uid()`), across every organization they hold membership in and every public training they booked directly, without requiring the user to select an organization first. The page SHALL be reachable without any tenant membership or per-tenant role check — access is self-scoped by ownership of the reservation rows themselves.

#### Scenario: Multi-org athlete sees reservations from every organization
- **WHEN** an authenticated user who is a member of two or more organizations, with reservations in each, navigates to `/portal/mis-reservas`
- **THEN** the page SHALL display reservations from all of those organizations in a single list

#### Scenario: Non-member public-training booker sees their booking
- **WHEN** an authenticated user who holds no membership in any tenant has booked a public training through the cross-tenant marketplace
- **THEN** that reservation SHALL appear on `/portal/mis-reservas`

#### Scenario: User with zero reservations sees an empty state
- **WHEN** an authenticated user with no reservations anywhere navigates to `/portal/mis-reservas`
- **THEN** the page SHALL display an empty-state message that is not scoped to a single organization

#### Scenario: Unauthenticated user is redirected to login
- **WHEN** an unauthenticated visitor navigates to `/portal/mis-reservas`
- **THEN** the system SHALL redirect to `/auth/login`

---

### Requirement: Legacy tenant-scoped route redirects to the cross-tenant page
The tenant-scoped route `/portal/orgs/{tenant_id}/mis-reservas` SHALL redirect unconditionally to `/portal/mis-reservas`, preserving old bookmarks/links.

#### Scenario: Old tenant-scoped URL redirects
- **WHEN** a user navigates to `/portal/orgs/{tenant_id}/mis-reservas` for any `tenant_id`
- **THEN** the system SHALL redirect to `/portal/mis-reservas`

---

### Requirement: Discipline filter options are derived from the athlete's own loaded reservations
The discipline filter dropdown SHALL be populated from the distinct, non-null `disciplina` values present in the currently loaded reservation rows. The system SHALL NOT query a tenant-scoped disciplines catalog to populate this filter.

#### Scenario: Discipline options reflect only the athlete's own data
- **WHEN** the athlete's loaded reservations span disciplines "Natación" and "Atletismo" across two different organizations, one of which the athlete is not a member of
- **THEN** the discipline filter SHALL offer both "Natación" and "Atletismo" as options, without a separate per-tenant lookup

#### Scenario: No reservations loaded yields an empty discipline filter
- **WHEN** the athlete has zero loaded reservations
- **THEN** the discipline filter SHALL offer no discipline options beyond "Todas las disciplinas"

---

### Requirement: Organization filter is shown only when reservations span more than one organization
The system SHALL render an "Organización" filter dropdown, populated from the distinct `{tenant_id, tenant_nombre}` pairs present in the loaded reservations, only when those loaded reservations belong to more than one organization. Selecting an organization SHALL narrow the results to that organization only.

#### Scenario: Single-organization athlete does not see the organization filter
- **WHEN** all of an athlete's loaded reservations belong to a single organization
- **THEN** the "Organización" filter SHALL NOT be rendered

#### Scenario: Multi-organization athlete sees and can use the organization filter
- **WHEN** an athlete's loaded reservations span two or more organizations
- **THEN** the "Organización" filter SHALL be rendered with one option per organization
- **AND** selecting one organization SHALL narrow the displayed results to reservations from that organization only

---

### Requirement: Each reservation row displays its organization
Every row in the reservation table SHALL display the organization name (`tenant_nombre`) alongside the existing columns (discipline, training name, training date, reservation status, attendance status, reservation date).

#### Scenario: Organization column is present
- **WHEN** the reservation table renders any row
- **THEN** that row SHALL include the organization name in an "Organización" column

---

### Requirement: CSV export includes the organization column
The CSV export produced from `/portal/mis-reservas` SHALL include an "Organización" column in addition to the existing exported columns (Disciplina, Entrenamiento, Fecha entrenamiento, Estado reserva, Asistencia, Fecha reserva, Escenario, Nivel).

#### Scenario: Exported CSV contains the organization column
- **WHEN** the athlete triggers "Exportar CSV" on the cross-tenant reservation list
- **THEN** the downloaded file SHALL include an "Organización" column populated with each row's organization name

---

### Requirement: Date, attendance, and pagination behavior is preserved from the tenant-scoped view
Date-range presets (últimos 7 días, último mes, mes a la fecha, rango personalizado with the existing 60-day maximum validation), attendance filtering (asistió / no asistió / sin registrar), pagination (25/50/100 rows per page), and the "last 100 reservations without active filters" banner behavior SHALL be unchanged from the tenant-scoped implementation this page replaces.

#### Scenario: Unfiltered load caps at 100 rows
- **WHEN** the athlete opens `/portal/mis-reservas` with no filters applied and has more than 100 reservations across all organizations
- **THEN** the system SHALL load at most 100 reservations and display the existing "showing your last 100 reservations" banner

#### Scenario: Custom date range longer than 60 days is rejected
- **WHEN** the athlete selects "rango personalizado" with a date span greater than 60 days
- **THEN** the system SHALL display a validation error and SHALL NOT apply the filter
