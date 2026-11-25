# Capability: disciplines-management

## Purpose
Defines how tenant administrators maintain the sports disciplines of their organization, which group plans, trainings and level ladders.

## Requirements

### Requirement: Tenant administrator can access disciplines management route
The system SHALL provide a tenant-scoped disciplines management screen at `/portal/orgs/[tenant_id]/gestion-disciplinas` for authenticated users with `administrador` role in the requested tenant. The route page entrypoint SHALL only compose feature components and MUST NOT perform direct data-access calls.

#### Scenario: Administrator opens tenant disciplines route
- **WHEN** an authenticated administrator navigates to `/portal/orgs/[tenant_id]/gestion-disciplinas`
- **THEN** the system SHALL render the disciplines management feature for that tenant context

#### Scenario: Route entrypoint remains presentation-only
- **WHEN** the disciplines route page is rendered
- **THEN** the page entrypoint SHALL delegate orchestration to hook/service layers and SHALL NOT call Supabase directly

### Requirement: Disciplines list displays tenant-scoped table with operational states
The system SHALL show the page heading "Tus disciplinas.", a search field labelled "Buscar disciplina" and a "Nueva disciplina" primary action, and SHALL list tenant disciplines in a side list headed "N DISCIPLINAS" with an "Activas" / "Todas" filter. Each list item SHALL show the discipline icon, name and the meta "N niveles · N atletas". The list SHALL include loading, empty, no-match and error states and SHALL support search over discipline name and description.

#### Scenario: Disciplines found for tenant
- **WHEN** tenant disciplines are returned from the data source
- **THEN** the system SHALL render the list with one item per discipline matching the filter and search, ordered by name

#### Scenario: No disciplines available
- **WHEN** no disciplines exist for the tenant
- **THEN** the system SHALL render an explicit empty state for disciplines management with a create action

#### Scenario: Disciplines are loading
- **WHEN** disciplines data fetch is in progress
- **THEN** the system SHALL render a loading state instead of empty/error fallback content

#### Scenario: Activas filter is the default
- **WHEN** the administrator opens the page
- **THEN** the "Activas" filter SHALL be selected and inactive disciplines SHALL be hidden until "Todas" is selected

#### Scenario: Item meta counts
- **WHEN** a discipline has 3 active levels and 38 athletes with an assigned level
- **THEN** its list item SHALL read "3 niveles · 38 atletas"

#### Scenario: Counts unavailable
- **WHEN** the athlete counts fail to load
- **THEN** the list SHALL render and the athlete part of the meta SHALL be omitted

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

### Requirement: Discipline selection drives a detail panel
Selecting a list item SHALL show that discipline in a detail panel next to the list (stacked below it under `lg`) and SHALL store the selection in the `disciplina` query parameter. Without a valid parameter, the first listed discipline SHALL be selected.

#### Scenario: Select a discipline
- **WHEN** the administrator selects "Acuatlón"
- **THEN** the detail panel SHALL show "Acuatlón", the item SHALL be marked with `aria-current="true"`, and the URL SHALL contain `?disciplina=<id>`

#### Scenario: Reload keeps the selection
- **WHEN** the page is opened with `?disciplina=<id>` of an existing discipline
- **THEN** that discipline SHALL be selected even if it is not the first one

#### Scenario: Unknown or filtered-out selection
- **WHEN** the `disciplina` parameter does not match a listed discipline
- **THEN** the first listed discipline SHALL be selected and the parameter SHALL be replaced

#### Scenario: Mobile selection
- **WHEN** the viewport is narrower than `lg` and the administrator selects an item
- **THEN** the page SHALL scroll to the detail panel and move focus to its heading

### Requirement: Discipline detail panel
The detail panel SHALL show the discipline icon, name, an "Activa" / "Inactiva" tag, the description (or "Sin descripción"), an "Editar" action, a delete action named "Eliminar {nombre}", and the stats "Atletas con nivel" and "Niveles activos".

#### Scenario: Detail content
- **WHEN** "Acuatlón" is selected, is active, has 3 active levels and 38 athletes with a level
- **THEN** the panel SHALL show "Acuatlón", the "Activa" tag, "38" under "Atletas con nivel" and "3" under "Niveles activos"

#### Scenario: Edit from the detail
- **WHEN** the administrator activates "Editar"
- **THEN** the discipline drawer SHALL open in edit mode prefilled with the selected discipline

#### Scenario: Delete from the detail
- **WHEN** the administrator confirms "Eliminar Acuatlón" in the confirmation dialog and the discipline has no dependent records
- **THEN** the discipline SHALL be deleted and the next listed discipline SHALL be selected

#### Scenario: Delete blocked by dependencies
- **WHEN** the deletion fails because plans, trainings or levels reference the discipline
- **THEN** the discipline SHALL remain and an alert SHALL explain the dependency
