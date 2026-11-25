# Spec Delta

## Purpose

Lets a tenant administrator maintain the catalogue of services that plans bundle, see which plans use each service, and switch services on or off from `gestion-servicios`.

## ADDED Requirements

### Requirement: Services management page
The system SHALL render the administrator services page at `/portal/orgs/[tenant_id]/gestion-servicios` with a single page heading "Tus servicios.", a search field labelled "Buscar servicio" and a "Nuevo servicio" primary action. The route SHALL stay restricted to administrators of the tenant.

#### Scenario: Administrator opens the page
- **WHEN** an administrator navigates to `gestion-servicios`
- **THEN** the page SHALL show exactly one `h1` "Tus servicios.", the search field and the "Nuevo servicio" action

#### Scenario: Other roles are redirected
- **WHEN** a trainer or athlete requests `gestion-servicios`
- **THEN** the administrator layout guard SHALL redirect them and the page SHALL NOT render

### Requirement: Services status filter with counts
The page SHALL offer a status filter with the options "Todos", "Activos" and "Inactivos", each showing the number of services it contains, and a hint "Los servicios se agrupan dentro de tus planes". The filter SHALL combine with the search.

#### Scenario: Counts reflect the catalogue
- **WHEN** the tenant has 4 active and 2 inactive services
- **THEN** the filter SHALL show "Todos 6", "Activos 4" and "Inactivos 2"

#### Scenario: Filter and search combine
- **WHEN** the administrator selects "Activos" and types "nat"
- **THEN** only active services whose name or description contains "nat" (case- and accent-insensitive) SHALL be listed

#### Scenario: Counts do not change with the filter
- **WHEN** the administrator switches from "Todos" to "Inactivos"
- **THEN** the counts shown on the three options SHALL stay the same

### Requirement: Services table
The page SHALL list services in a table with the columns SERVICIO (name and description), PLANES, ACTIVO and actions. PLANES SHALL show the number of distinct plans whose subtypes include the service, as "N plan" or "N planes".

#### Scenario: Plan usage is shown
- **WHEN** a service is assigned to subtypes of 2 different plans
- **THEN** its PLANES cell SHALL read "2 planes"

#### Scenario: Unused service
- **WHEN** a service is not assigned to any plan subtype
- **THEN** its PLANES cell SHALL read "0 planes"

#### Scenario: Plan usage fails to load
- **WHEN** the plan usage query fails but the services load
- **THEN** the table SHALL render and every PLANES cell SHALL show "—"

### Requirement: Inline active switch
Each row SHALL expose an accessible switch named "Activar {nombre}" whose state reflects `activo`. Toggling it SHALL persist the new value immediately, and SHALL restore the previous state and show an error message when the update fails.

#### Scenario: Deactivate a service
- **WHEN** the administrator turns off the switch of an active service
- **THEN** the service SHALL be saved with `activo = false` and the switch SHALL report `aria-checked="false"`

#### Scenario: Update fails
- **WHEN** the update request fails
- **THEN** the switch SHALL return to its previous state and an alert SHALL explain that the change was not saved

#### Scenario: Switch is busy
- **WHEN** an update for a row is pending
- **THEN** that row's switch SHALL be disabled until the request completes

### Requirement: Create and edit service
The "Nuevo servicio" action and the row "Editar" action SHALL open the same side drawer in create or edit mode with the fields name, description and active. Saving a valid form SHALL persist the service under the active tenant and refresh the list; a duplicate name SHALL be reported inline.

#### Scenario: Create a service
- **WHEN** the administrator submits a new service with a unique name
- **THEN** the service SHALL be created for the tenant, the drawer SHALL close and a success alert SHALL be shown

#### Scenario: Duplicate name
- **WHEN** the submitted name already exists in the tenant
- **THEN** the drawer SHALL stay open and show the duplicate-name error on the name field

### Requirement: Delete service with confirmation
Each row SHALL offer a delete action named "Eliminar {nombre}", which SHALL ask for confirmation in a dialog. A service referenced by any plan subtype SHALL NOT be deleted and the page SHALL explain why.

#### Scenario: Delete an unused service
- **WHEN** the administrator confirms the deletion of a service with no plan subtype references
- **THEN** the service SHALL be removed from the tenant and from the table

#### Scenario: Cancel deletion
- **WHEN** the administrator cancels the confirmation dialog
- **THEN** nothing SHALL be deleted and focus SHALL return to the row's delete action

#### Scenario: Service in use
- **WHEN** the administrator confirms the deletion of a service used by a plan subtype
- **THEN** the service SHALL remain and an alert SHALL state that it is used by one or more plans

### Requirement: Services page states
The page SHALL distinguish loading, empty, no-match and error states. A load error SHALL offer "Reintentar" and SHALL NOT read as an empty catalogue.

#### Scenario: Empty catalogue
- **WHEN** the tenant has no services
- **THEN** the page SHALL show an empty state inviting to create the first service

#### Scenario: No match
- **WHEN** services exist but none matches the search and filter
- **THEN** the page SHALL show a no-results state instead of the empty-catalogue state

#### Scenario: Load error
- **WHEN** loading the services fails
- **THEN** the page SHALL show an error state with a "Reintentar" action that reloads the list
