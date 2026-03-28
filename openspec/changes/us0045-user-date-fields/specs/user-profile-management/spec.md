## MODIFIED Requirements

### Requirement: User can view their profile
The system SHALL display the authenticated user's personal information and sports profile on a dedicated page at `/portal/perfil`, accessible from the avatar dropdown menu in the portal header.

#### Scenario: Profile page loads with existing data
- **WHEN** an authenticated user navigates to `/portal/perfil`
- **THEN** the system SHALL fetch and display their `usuarios` row (nombre, apellido, email, telefono, fecha_nacimiento, tipo_identificacion, numero_identificacion, fecha_exp_identificacion, rh) and their `perfil_deportivo` row (peso_kg, altura_cm) if it exists

#### Scenario: Profile page loads when no sports profile exists
- **WHEN** an authenticated user navigates to `/portal/perfil` and no `perfil_deportivo` row exists for that user
- **THEN** the system SHALL display the personal information form with sports profile fields empty (not an error state)

#### Scenario: Profile page shows loading state
- **WHEN** the profile data fetch is in progress
- **THEN** the system SHALL display a loading indicator and SHALL NOT render the form with empty/stale data

#### Scenario: Profile page shows error state
- **WHEN** the profile data fetch fails
- **THEN** the system SHALL display an error message and a retry action

---

### Requirement: User can edit their personal information
The system SHALL provide an editable form for the authenticated user to modify their personal profile fields: nombre, apellido, telefono, fecha_nacimiento, tipo_identificacion, numero_identificacion, fecha_exp_identificacion, and rh.

#### Scenario: Fields are editable on page load
- **WHEN** the profile page finishes loading
- **THEN** all editable fields SHALL be immediately interactive (no separate "edit mode" toggle required)

#### Scenario: Email field is read-only
- **WHEN** the profile form is rendered
- **THEN** the email field SHALL be visually distinct as read-only and SHALL NOT accept user input

#### Scenario: Tipo de Identificación renders as a select
- **WHEN** the user interacts with the tipo_identificacion field
- **THEN** the system SHALL present a dropdown with options: CC, CE, TI, NIT, Pasaporte, Otro

#### Scenario: RH field renders as a select
- **WHEN** the user interacts with the rh field
- **THEN** the system SHALL present a dropdown with options: O+, O−, A+, A−, B+, B−, AB+, AB−

#### Scenario: Fecha Expedición ID field is a date input
- **WHEN** the profile form renders the fecha_exp_identificacion field
- **THEN** the system SHALL render a date input (type="date") labelled "Fecha Expedición ID" placed immediately after the N° Identificación field

#### Scenario: Fecha Expedición ID saves correctly
- **WHEN** the user sets fecha_exp_identificacion to a valid date and clicks "Guardar Cambios"
- **THEN** the system SHALL persist the value to `public.usuarios` and the field SHALL reflect the saved value after reload

#### Scenario: Fecha Expedición ID can be cleared
- **WHEN** the user clears the fecha_exp_identificacion date input and saves
- **THEN** the system SHALL persist NULL for that field without validation error
