## ADDED Requirements

### Requirement: Tenant administrator can view tenant scenarios in management route
The system SHALL provide a tenant-scoped scenarios management screen at `/portal/orgs/[tenant_id]/gestion-escenarios` for authenticated users with administrator membership in the requested tenant. The route page entrypoint SHALL only compose feature components and MUST NOT perform direct data-access calls.

#### Scenario: Administrator opens tenant scenarios route
- **WHEN** an authenticated administrator navigates to `/portal/orgs/[tenant_id]/gestion-escenarios`
- **THEN** the system SHALL render the scenarios management feature for that tenant context

#### Scenario: Route entrypoint remains presentation-only
- **WHEN** the scenarios route page is rendered
- **THEN** the page entrypoint SHALL delegate orchestration to hook/service layers and SHALL NOT call Supabase directly

### Requirement: Scenarios list shows tenant-scoped cards with availability state
The system SHALL load and display tenant scenarios as cards including, at minimum, availability state, scenario name, location, summary attributes, and actions for details/view and edit. The list SHALL include loading and empty states.

#### Scenario: Scenarios found for tenant
- **WHEN** tenant scenarios are returned from the data source
- **THEN** the system SHALL render a card grid with required scenario fields and actions

#### Scenario: No scenarios available
- **WHEN** no scenarios exist for the tenant
- **THEN** the system SHALL render an explicit empty state for scenarios management

#### Scenario: Scenarios are loading
- **WHEN** scenario data fetch is in progress
- **THEN** the system SHALL render a loading state instead of empty/error fallback content

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
