## ADDED Requirements

### Requirement: Tenant administrator can access disciplines management route
The system SHALL provide a tenant-scoped disciplines management screen at `/portal/orgs/[tenant_id]/gestion-disciplinas` for authenticated users with `administrador` role in the requested tenant. The route page entrypoint SHALL only compose feature components and MUST NOT perform direct data-access calls.

#### Scenario: Administrator opens tenant disciplines route
- **WHEN** an authenticated administrator navigates to `/portal/orgs/[tenant_id]/gestion-disciplinas`
- **THEN** the system SHALL render the disciplines management feature for that tenant context

#### Scenario: Route entrypoint remains presentation-only
- **WHEN** the disciplines route page is rendered
- **THEN** the page entrypoint SHALL delegate orchestration to hook/service layers and SHALL NOT call Supabase directly

### Requirement: Disciplines list displays tenant-scoped table with operational states
The system SHALL load and display tenant disciplines in table format with columns `Discipline`, `Category`, `Status`, and `Actions`, plus header/subtitle and primary `Add Discipline` CTA. The list SHALL include loading, empty, and error states and SHALL support search/filter over discipline name and description.

#### Scenario: Disciplines found for tenant
- **WHEN** tenant disciplines are returned from the data source
- **THEN** the system SHALL render the disciplines table with required columns and row actions

#### Scenario: No disciplines available
- **WHEN** no disciplines exist for the tenant
- **THEN** the system SHALL render an explicit empty state for disciplines management

#### Scenario: Disciplines are loading
- **WHEN** disciplines data fetch is in progress
- **THEN** the system SHALL render a loading state instead of empty/error fallback content

### Requirement: Create and edit discipline flows use a shared right-side modal
The system SHALL support both create and edit discipline workflows through a single right-side modal component that changes mode by state (`create` or `edit`). The modal SHALL support close via backdrop, close button, and `Esc` when not submitting, and SHALL expose submit/cancel controls with disabled/loading behavior.

#### Scenario: Create flow opened from disciplines screen
- **WHEN** the administrator triggers create action
- **THEN** the system SHALL open the right-side modal in create mode with empty/default form values

#### Scenario: Edit flow opened from discipline row action
- **WHEN** the administrator selects edit on an existing discipline
- **THEN** the system SHALL open the same modal in edit mode with prefilled discipline values

#### Scenario: Modal submit during pending request
- **WHEN** the administrator submits create/edit and the request is pending
- **THEN** the system SHALL disable submit interactions and show a loading state until completion

### Requirement: Discipline persistence SHALL align with Supabase model and constraints
The system SHALL persist discipline data against `public.disciplinas` with strict tenant scoping and constraint-aware behavior defined by migrations. Writes SHALL preserve `tenant_id` boundary, enforce unique discipline names per tenant, and preserve referential integrity when deleting disciplines referenced by trainings.

#### Scenario: Duplicate discipline name in same tenant
- **WHEN** an administrator submits create/update with a `nombre` that already exists for the active `tenant_id`
- **THEN** the system SHALL reject persistence and SHALL display a user-facing duplicate-name validation error

#### Scenario: Delete blocked by entrenamiento dependency
- **WHEN** an administrator attempts to delete a discipline referenced by `public.entrenamientos.disciplina_id`
- **THEN** the system SHALL reject deletion and SHALL display a dependency-safe error message without losing table state

#### Scenario: Successful tenant-scoped mutation
- **WHEN** create/update/delete is requested for a discipline in the active tenant scope with valid payload
- **THEN** the system SHALL persist the change in `public.disciplinas` and SHALL refresh the rendered list for that tenant

### Requirement: Discipline mutations SHALL be protected by admin-only tenant policies
The system SHALL enforce mutation authorization for disciplines using database-level policies equivalent to existing admin-only policy patterns used in portal management features. Insert, update, and delete operations MUST be restricted to tenants returned by `public.get_admin_tenants_for_authenticated_user()`.

#### Scenario: Administrator mutates discipline in managed tenant
- **WHEN** an authenticated administrator submits create/update/delete for a tenant they administrate
- **THEN** the database policy SHALL permit the mutation

#### Scenario: Non-admin or out-of-scope tenant mutation attempt
- **WHEN** an authenticated user without admin membership for the target tenant submits create/update/delete
- **THEN** the database policy SHALL deny the mutation and no data SHALL be persisted

## ADDED Requirements

### Requirement: DisciplinesTable row SHALL expose an expand toggle to reveal the levels panel
Each row in `DisciplinesTable` SHALL render a chevron icon button that toggles the visibility of `NivelesDisciplinaPanel` inline below the row. The toggle SHALL be visible only to users with `administrador` role (matching the existing gate on the Disciplines page). Expanding a row triggers a lazy fetch of `nivel_disciplina` rows for that discipline and tenant. Once fetched, the data is cached in component state for the life of the modal/page session.

#### Scenario: Administrator expands a discipline row to view levels
- **WHEN** an authenticated administrator clicks the expand toggle on a discipline row
- **THEN** the system SHALL render `NivelesDisciplinaPanel` inline below that row with the levels for that discipline

#### Scenario: Only one panel can be expanded at a time (or multiple — either is acceptable)
- **WHEN** the administrator expands a second discipline row
- **THEN** `NivelesDisciplinaPanel` SHALL be rendered for the newly expanded row; the previous row's panel state is independent

#### Scenario: Expand toggle is not affected by existing DisciplinesTable actions
- **WHEN** the expand toggle is added to the table
- **THEN** all existing row actions (edit, toggle active, delete) SHALL continue to function without regression

#### Scenario: Levels fetch is triggered on first expand only
- **WHEN** an administrator collapses and re-expands a discipline row
- **THEN** the system SHALL use the cached levels data and SHALL NOT issue a second Supabase query
