# Capability: scenario-management

## Purpose
Defines how tenant administrators list, create, edit and delete the training scenarios (venues) of their organization and their weekly schedules.

## Requirements

### Requirement: Tenant administrator can view tenant scenarios in management route
The system SHALL provide a tenant-scoped scenarios management screen at `/portal/orgs/[tenant_id]/gestion-escenarios` for authenticated users with administrator membership in the requested tenant. The route page entrypoint SHALL only compose feature components and MUST NOT perform direct data-access calls.

#### Scenario: Administrator opens tenant scenarios route
- **WHEN** an authenticated administrator navigates to `/portal/orgs/[tenant_id]/gestion-escenarios`
- **THEN** the system SHALL render the scenarios management feature for that tenant context

#### Scenario: Route entrypoint remains presentation-only
- **WHEN** the scenarios route page is rendered
- **THEN** the page entrypoint SHALL delegate orchestration to hook/service layers and SHALL NOT call Supabase directly

### Requirement: Scenarios list shows tenant-scoped cards with availability state
The system SHALL load and display tenant scenarios as photo cards including, at minimum, the photo (or a placeholder), a `tipo` tag, a status tag ("Activo" or "Inactivo"), scenario name, location, description, capacity, the number of available schedules ("N horarios" or "Sin horarios"), and actions for map (when available), edit and delete. The grid SHALL end with an "Agregar escenario" tile. The list SHALL include loading, empty, no-match and error states.

#### Scenario: Scenarios found for tenant
- **WHEN** tenant scenarios are returned from the data source
- **THEN** the system SHALL render a card grid with required scenario fields and actions, followed by the "Agregar escenario" tile

#### Scenario: No scenarios available
- **WHEN** no scenarios exist for the tenant
- **THEN** the system SHALL render an explicit empty state for scenarios management with a create action

#### Scenario: Scenarios are loading
- **WHEN** scenario data fetch is in progress
- **THEN** the system SHALL render a loading state instead of empty/error fallback content

#### Scenario: Load error
- **WHEN** loading the scenarios fails
- **THEN** the system SHALL render an error state with a "Reintentar" action, distinct from the empty state

#### Scenario: Scenario without photo
- **WHEN** a scenario has no `image_url` or the image fails to load
- **THEN** its card SHALL show the photo placeholder and keep the same layout

#### Scenario: Add tile opens the create drawer
- **WHEN** the administrator activates the "Agregar escenario" tile
- **THEN** the create drawer SHALL open exactly as with the header "Crear escenario" action

### Requirement: Create and edit flows use a shared lateral modal
The system SHALL support both create and edit scenario workflows through a single right-side modal component that changes mode by state (`create` or `edit`). The modal SHALL provide close/cancel actions, submit loading state, and field-level validation feedback.

#### Scenario: Create flow opened from scenarios screen
- **WHEN** the administrator triggers create action
- **THEN** the system SHALL open the lateral modal in create mode with empty/default form values

#### Scenario: Edit flow opened from scenario card
- **WHEN** the administrator selects edit on an existing scenario
- **THEN** the system SHALL open the same lateral modal in edit mode with prefilled scenario values

#### Scenario: Modal submit during pending request
- **WHEN** the administrator submits create/edit and the request is pending
- **THEN** the system SHALL disable submit interactions and show a loading state until completion

### Requirement: Scenario mutations enforce validation and tenant data boundary
The system SHALL validate and normalize scenario payloads before persistence and SHALL restrict feature data access to `public.escenarios` and `public.horarios_escenarios` only. The system MUST enforce tenant scoping for all list/create/update operations.

#### Scenario: Validation rejects invalid payload
- **WHEN** form input violates required or format constraints (`nombre`, `tipo`, positive `capacidad` when present, valid schedule constraints, valid `image_url` when present)
- **THEN** the system SHALL prevent persistence and SHALL display validation messages

#### Scenario: Successful create or edit mutation
- **WHEN** a valid scenario payload is submitted
- **THEN** the system SHALL persist data under the active `tenant_id` and refresh the scenarios list

#### Scenario: Attempted cross-tenant mutation
- **WHEN** a mutation request targets a scenario outside the active tenant scope
- **THEN** the system SHALL reject the operation and SHALL NOT persist cross-tenant changes

### Requirement: Scenarios page header and search
The scenarios page SHALL show exactly one page heading "Tus escenarios.", a search field labelled "Buscar por nombre o ubicación" and a "Crear escenario" primary action. The search SHALL match name, type, location and description, case- and accent-insensitively.

#### Scenario: Header renders
- **WHEN** an administrator opens `gestion-escenarios`
- **THEN** the page SHALL show one `h1` "Tus escenarios.", the search field and the "Crear escenario" action

#### Scenario: Search by location
- **WHEN** the administrator types "bogota"
- **THEN** only scenarios whose name, type, location or description contains "Bogotá" or "bogota" SHALL be listed

### Requirement: Scenario type filter with counts
The page SHALL offer a type filter built from the distinct `tipo` values of the tenant's scenarios (grouped case- and accent-insensitively), with "Todos" first and the number of scenarios on each option. With more than 5 distinct types, the filter SHALL use a dropdown instead of segmented buttons.

#### Scenario: Types with counts
- **WHEN** the tenant has 2 "Piscina" scenarios, 1 "piscina " scenario and 1 "Pista"
- **THEN** the filter SHALL show "Todos 4", "Piscina 3" and "Pista 1"

#### Scenario: Filter by type
- **WHEN** the administrator selects "Pista"
- **THEN** only scenarios of type "Pista" SHALL be listed, combined with the current search

#### Scenario: Many types
- **WHEN** the tenant has 7 distinct types
- **THEN** the filter SHALL render as a labelled dropdown with "Todos" and the 7 types

### Requirement: Scenarios summary
Next to the filter, the page SHALL show "N cupos totales" (sum of `capacidad` of the listed scenarios, ignoring empty values) and "N horarios activos" (number of available schedules of the listed scenarios).

#### Scenario: Summary follows the filter
- **WHEN** the "Piscina" filter lists two scenarios with capacities 24 and 100 and 10 and 4 available schedules
- **THEN** the summary SHALL read "124 cupos totales" and "14 horarios activos"

### Requirement: Scenario map action
A scenario card SHALL show a "Ver en mapa" action only when the scenario has `coordenadas` or `direccion`. The action SHALL open, in a new tab, the `coordenadas` value itself when it is already a map URL, otherwise Google Maps for those coordinates (preferred) or that address.

#### Scenario: Coordinates available
- **WHEN** a scenario has `coordenadas` "4.75,-73.95"
- **THEN** "Ver en mapa" SHALL open a Google Maps search for "4.75,-73.95" in a new tab with `rel="noopener noreferrer"`

#### Scenario: Coordinates stored as a map link
- **WHEN** a scenario has `coordenadas` "https://waze.com/ul/hd2g6f8ft5"
- **THEN** "Ver en mapa" SHALL open that URL in a new tab

#### Scenario: No location data
- **WHEN** a scenario has neither `coordenadas` nor `direccion`
- **THEN** its card SHALL NOT render the map action

### Requirement: Delete scenario with confirmation
A scenario card SHALL offer "Eliminar escenario", which SHALL ask for confirmation in a dialog naming the scenario. Confirming SHALL delete the scenario of the active tenant and refresh the list. A scenario that cannot be deleted because other records reference it SHALL remain, and the page SHALL explain why.

#### Scenario: Delete a scenario
- **WHEN** the administrator confirms the deletion of an unreferenced scenario
- **THEN** the scenario SHALL be removed from the tenant and from the grid, and a success alert SHALL be shown

#### Scenario: Cancel deletion
- **WHEN** the administrator cancels the dialog
- **THEN** nothing SHALL be deleted and focus SHALL return to the delete action

#### Scenario: Scenario in use
- **WHEN** the deletion fails because trainings or events reference the scenario
- **THEN** the scenario SHALL remain and an alert SHALL explain that it is in use
