## ADDED Requirements

### Requirement: Tenant shared trainings route
The system SHALL provide the tenant shared route `/portal/orgs/[tenant_id]/gestion-entrenamientos` as the entry point for training management, and the route page SHALL only compose/render the trainings feature root component.

#### Scenario: Render-only route composition
- **WHEN** an authenticated tenant member navigates to `/portal/orgs/<tenant_id>/gestion-entrenamientos`
- **THEN** the route renders the trainings feature root without direct Supabase calls in the page layer

### Requirement: Training overview visualization
The system SHALL show trainings grouped by series with list/calendar visualization, and SHALL expose loading, empty, and error states with a `Crear entrenamiento` action.

#### Scenario: Trainings are displayed by series
- **WHEN** training groups and instances exist for the tenant in the selected month
- **THEN** the UI presents them grouped by training series and each instance displays its series relationship

#### Scenario: Default month and month navigation
- **WHEN** the trainings screen is opened for the first time
- **THEN** the selected range defaults to the current month and the user can navigate to previous or next months

### Requirement: Series creation wizard
The system SHALL provide a wizard to create `unico` and `recurrente` training series using base data (`disciplina`, `escenario`, `entrenador`, `duracion`, `cupo`) and type-specific scheduling inputs.

#### Scenario: Create unique training series
- **WHEN** an administrator completes wizard base data with type `unico` and valid schedule fields
- **THEN** the system creates one training group and one linked training instance

#### Scenario: Create recurrent training series
- **WHEN** an administrator completes wizard data with type `recurrente` and valid recurrence rules
- **THEN** the system creates a training group, stores recurrence rules, and links generated instances to the created series

### Requirement: Immediate recurrent instance generation
For recurrent series creation, the system MUST generate all eligible instances immediately for the configured range instead of lazy generation by visible window.

#### Scenario: Recurrent creation materializes full range
- **WHEN** a recurrent series is created with a valid date range and recurrence rules
- **THEN** all eligible instances in that configured range are generated during the same creation flow

### Requirement: Scope-aware edit operations
The system SHALL support edit actions with explicit scope values `single`, `future`, and `series` for recurring data behavior.

#### Scenario: Edit only one instance
- **WHEN** an administrator edits one instance with `scope=single`
- **THEN** only the selected instance is updated and it is marked as a series exception (`es_excepcion_serie=true`, `bloquear_sync_grupo=true`)

#### Scenario: Edit future instances from an effective point
- **WHEN** an administrator edits with `scope=future` from a selected instance/date
- **THEN** the system applies changes from that effective point forward according to recurring mutation rules

#### Scenario: Edit whole series
- **WHEN** an administrator edits with `scope=series`
- **THEN** the system updates the series and synchronizes eligible future instances while preserving blocked/existing exceptions

### Requirement: Scope-aware delete operations
The system SHALL support delete actions with explicit scope values `single`, `future`, and `series`, each with confirmation and deterministic error messaging.

#### Scenario: Delete one instance
- **WHEN** an administrator confirms delete with `scope=single`
- **THEN** only the selected instance is removed or cancelled according to service behavior

#### Scenario: Delete future instances
- **WHEN** an administrator confirms delete with `scope=future` and an effective point
- **THEN** the system applies deletion from that point forward without affecting earlier instances

#### Scenario: Delete whole series
- **WHEN** an administrator confirms delete with `scope=series`
- **THEN** the system removes the training series and linked data according to database constraints

### Requirement: Validation and deterministic errors
The system SHALL validate required fields and schedule constraints before submit and SHALL map backend failures to deterministic user-facing messages.

#### Scenario: Client-side validation blocks invalid schedule
- **WHEN** form data violates required constraints (e.g., missing required IDs, invalid time window, or invalid date range)
- **THEN** submission is blocked and actionable validation messages are shown

#### Scenario: Backend failure is mapped deterministically
- **WHEN** a create/update/delete mutation fails due to permission, integrity, or conflict conditions
- **THEN** the UI displays a deterministic error message and keeps the interface in a recoverable state

### Requirement: Layered architecture compliance
Training management implementation SHALL follow the project architecture flow `components -> hooks -> services -> supabase` with typed contracts in the feature slice.

#### Scenario: Data access remains outside presentation
- **WHEN** trainings feature code is reviewed
- **THEN** Supabase access is implemented in services and consumed via hooks, not from page/component layers
