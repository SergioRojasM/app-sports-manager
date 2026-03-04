## ADDED Requirements

### Requirement: Tenant administrator can access plans management route
The system SHALL provide a tenant-scoped plans management screen at `/portal/orgs/[tenant_id]/gestion-planes` for authenticated users with `administrador` role in the requested tenant. The route page entrypoint SHALL only compose feature components and MUST NOT perform direct data-access calls.

#### Scenario: Administrator opens tenant plans route
- **WHEN** an authenticated administrator navigates to `/portal/orgs/[tenant_id]/gestion-planes`
- **THEN** the system SHALL render the plans management feature for that tenant context

#### Scenario: Route entrypoint remains presentation-only
- **WHEN** the plans route page is rendered
- **THEN** the page entrypoint SHALL delegate orchestration to hook and service layers and SHALL NOT call Supabase directly

### Requirement: Plans list displays tenant-scoped table with operational states
The system SHALL load and display tenant membership plans in table format with columns `Name`, `Description`, `Price`, `Validity`, `Disciplines`, `Status`, and `Actions`, plus header and primary `New Plan` CTA. The list SHALL include loading, empty, and error states and SHALL support search/filter over plan name.

#### Scenario: Plans found for tenant
- **WHEN** tenant plans are returned from the data source
- **THEN** the system SHALL render the plans table with all required columns and row-level edit and delete actions

#### Scenario: No plans available
- **WHEN** no plans exist for the tenant
- **THEN** the system SHALL render an explicit empty state in the plans table

#### Scenario: Plans data is loading
- **WHEN** the plans data fetch is in progress
- **THEN** the system SHALL render a loading state instead of empty or error content

#### Scenario: Disciplines column renders as badge chips
- **WHEN** a plan has one or more associated disciplines
- **THEN** the system SHALL render the discipline names as badge chips in the Disciplines column

### Requirement: Create and edit plan flows use a shared right-side modal
The system SHALL support both create and edit plan workflows through a single right-side modal component that switches mode by state (`create` or `edit`). The modal SHALL close via backdrop click, close button, or `Esc` key when not submitting, and SHALL expose submit and cancel controls with disabled and loading behavior during pending requests.

#### Scenario: Create flow opened from plans screen
- **WHEN** the administrator clicks the `New Plan` button
- **THEN** the system SHALL open the right-side modal in create mode with empty or default form values

#### Scenario: Edit flow opened from plan row action
- **WHEN** the administrator selects the edit action on an existing plan
- **THEN** the system SHALL open the same modal in edit mode with all plan fields and discipline associations pre-filled

#### Scenario: Modal submit during pending request
- **WHEN** the administrator submits create or edit and the request is pending
- **THEN** the system SHALL disable submit interactions and show a loading state until the operation completes

### Requirement: Plan form SHALL validate required fields and input constraints
The system SHALL enforce client-side validation on plan form submissions before sending any request. The form SHALL display field-level errors adjacent to offending inputs without clearing other field values.

#### Scenario: Missing required name field
- **WHEN** the administrator submits the plan form with an empty `nombre` field
- **THEN** the system SHALL display a required-field validation error on `nombre` and SHALL NOT submit the request

#### Scenario: Name exceeds maximum length
- **WHEN** the administrator submits the plan form with a `nombre` longer than 100 characters
- **THEN** the system SHALL display a length validation error on `nombre` and SHALL NOT submit the request

#### Scenario: Invalid price value
- **WHEN** the administrator submits the plan form with a `precio` value below zero
- **THEN** the system SHALL display a validation error on `precio` and SHALL NOT submit the request

#### Scenario: Invalid validity value
- **WHEN** the administrator submits the plan form with a `vigencia_meses` value less than 1
- **THEN** the system SHALL display a validation error on `vigencia_meses` and SHALL NOT submit the request

#### Scenario: No disciplines selected
- **WHEN** the administrator submits the plan form with no disciplines checked
- **THEN** the system SHALL display a validation error on the disciplines field and SHALL NOT submit the request

### Requirement: Plan form SHALL include a multi-discipline selector from tenant active disciplines
The system SHALL load the tenant's active disciplines and present them as a multi-select list (checkboxes) inside the plan form modal. At least one discipline MUST be associated with each plan.

#### Scenario: Disciplines loaded into form modal
- **WHEN** the plan form modal opens
- **THEN** the system SHALL display a checklist of all active disciplines for the current tenant

#### Scenario: Edit modal pre-selects existing discipline associations
- **WHEN** the plan form modal opens in edit mode
- **THEN** the checkboxes for disciplines already associated with the plan SHALL be pre-checked

#### Scenario: Disciplines list is empty
- **WHEN** the tenant has no active disciplines
- **THEN** the system SHALL display an informational message indicating no disciplines are available and the submit action SHALL be disabled

### Requirement: Plan persistence SHALL align with Supabase model and constraints
The system SHALL persist plan data against `public.planes` with strict tenant scoping and constraint-aware behavior. Writes SHALL preserve `tenant_id` boundary, enforce unique plan names per tenant via the `planes_tenant_nombre_uk` constraint, and manage `planes_disciplina` associations atomically with each plan mutation.

#### Scenario: Duplicate plan name in same tenant
- **WHEN** an administrator submits create or update with a `nombre` that already exists for the active `tenant_id`
- **THEN** the system SHALL reject persistence and SHALL display a user-facing duplicate-name validation error

#### Scenario: Create plan with discipline associations
- **WHEN** an administrator submits a new plan with selected disciplines
- **THEN** the system SHALL insert a row in `public.planes` and one row per discipline in `public.planes_disciplina`, then SHALL refresh the plans list

#### Scenario: Update plan replaces discipline associations
- **WHEN** an administrator submits an edited plan with a modified set of disciplines
- **THEN** the system SHALL update the `public.planes` row, delete all prior `public.planes_disciplina` rows for that plan, and insert the new set, then SHALL refresh the plans list

#### Scenario: Successful tenant-scoped mutation
- **WHEN** create, update, or delete is requested for a plan in the active tenant scope with a valid payload
- **THEN** the system SHALL persist the change and SHALL refresh the rendered plans list for that tenant

### Requirement: Delete plan SHALL require confirmation and remove associated records
The system SHALL require the administrator to confirm deletion before committing. Deletion SHALL hard-delete the plan row; `public.planes_disciplina` rows SHALL be removed via cascade.

#### Scenario: Administrator confirms plan deletion
- **WHEN** the administrator confirms the delete action for a plan
- **THEN** the system SHALL delete the plan row from `public.planes` (cascading to `planes_disciplina`) and SHALL remove the plan from the rendered list

#### Scenario: Administrator cancels plan deletion
- **WHEN** the administrator dismisses the delete confirmation
- **THEN** the system SHALL take no action and the plan SHALL remain in the list

### Requirement: Plan mutations SHALL be protected by admin-only tenant RLS policies
The system SHALL enforce mutation authorization for plans and plan-discipline associations using database-level RLS policies. Insert, update, and delete operations on `public.planes` and `public.planes_disciplina` MUST be restricted to tenants returned by `public.get_admin_tenants_for_authenticated_user()`.

#### Scenario: Administrator mutates plan in managed tenant
- **WHEN** an authenticated administrator submits create, update, or delete for a plan belonging to a tenant they administrate
- **THEN** the database RLS policy SHALL permit the mutation

#### Scenario: Non-admin or out-of-scope tenant mutation attempt
- **WHEN** an authenticated user without admin membership for the target tenant submits create, update, or delete on a plan
- **THEN** the database RLS policy SHALL deny the mutation and no data SHALL be persisted

### Requirement: Plans feature SHALL be accessible from the administrator navigation menu
The system SHALL include a `Gestión de Planes` entry in the administrator role navigation, linking to `/portal/orgs/[tenant_id]/gestion-planes`.

#### Scenario: Administrator role menu includes plans entry
- **WHEN** an authenticated user with `administrador` role views the portal navigation
- **THEN** the system SHALL display a `Gestión de Planes` navigation item that links to the plans management route for their tenant

### Requirement: `planes` table SHALL be evolved by migration to replace `duracion_dias` with `vigencia_meses`
The system's database migration SHALL ALTER the existing `public.planes` table to add `vigencia_meses`, backfill values from `duracion_dias`, drop `duracion_dias`, add `updated_at`, and add a unique constraint on `(tenant_id, nombre)`. The migration SHALL also create the `public.planes_disciplina` join table with appropriate foreign keys, indexes, and RLS policies.

#### Scenario: Migration backfills vigencia_meses before dropping duracion_dias
- **WHEN** the migration is applied to a database with existing `planes` rows
- **THEN** each row SHALL have `vigencia_meses` set to `ceil(duracion_dias / 30)` (minimum 1) before the `duracion_dias` column is dropped

#### Scenario: planes_disciplina table created with cascade delete
- **WHEN** the migration is applied
- **THEN** `public.planes_disciplina` SHALL exist with a foreign key to `planes(id)` using `ON DELETE CASCADE`

#### Scenario: Unique constraint prevents duplicate plan names per tenant
- **WHEN** an insert or update would create a duplicate `(tenant_id, nombre)` pair in `public.planes`
- **THEN** the database SHALL reject the operation with a unique constraint violation
