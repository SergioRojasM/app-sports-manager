## MODIFIED Requirements

### Requirement: Plans list displays tenant-scoped table with operational states
The system SHALL load and display tenant membership plans in table format with columns `Name`, `Description`, `Disciplines`, `Status`, and `Actions`, plus header and primary `New Plan` CTA. The `Price` column SHALL be removed from the table. The `Validity` column SHALL display a summary derived from the plan's active `plan_tipos`: if all active tipos share the same `vigencia_dias`, display that value (e.g., "30 días"); if they differ, display the range (e.g., "30–90 días"); if no active tipos exist, display "—". The list SHALL include loading, empty, and error states and SHALL support search/filter over plan name.

#### Scenario: Plans found for tenant
- **WHEN** tenant plans are returned from the data source
- **THEN** the system SHALL render the plans table with columns `Name`, `Description`, `Validity` (derived from plan_tipos), `Disciplines`, `Status`, and `Actions`

#### Scenario: No plans available
- **WHEN** no plans exist for the tenant
- **THEN** the system SHALL render an explicit empty state in the plans table

#### Scenario: Plans data is loading
- **WHEN** the plans data fetch is in progress
- **THEN** the system SHALL render a loading state instead of empty or error content

#### Scenario: Disciplines column renders as badge chips
- **WHEN** a plan has one or more associated disciplines
- **THEN** the system SHALL render the discipline names as badge chips in the Disciplines column

#### Scenario: Disciplines column is empty
- **WHEN** a plan has no associated disciplines
- **THEN** the system SHALL render a muted "Sin disciplinas" placeholder text in the Disciplines column

#### Scenario: Validity column shows uniform vigencia
- **WHEN** all active plan_tipos for a plan have the same `vigencia_dias` value
- **THEN** the Validity column SHALL display that single value (e.g., "30 días")

#### Scenario: Validity column shows vigencia range
- **WHEN** active plan_tipos for a plan have different `vigencia_dias` values
- **THEN** the Validity column SHALL display the range (e.g., "30–90 días")

#### Scenario: Validity column shows dash when no active tipos
- **WHEN** a plan has no active plan_tipos
- **THEN** the Validity column SHALL display "—"

### Requirement: Plan form SHALL validate required fields and input constraints
The system SHALL enforce client-side validation on plan form submissions before sending any request. The form SHALL display field-level errors adjacent to offending inputs without clearing other field values. The plan form SHALL NOT include `precio`, `vigencia_meses`, or `clases_incluidas` fields at the plan level — these exist exclusively on plan_tipos. The form SHALL require at least one plan_tipo to be present before submission.

#### Scenario: Missing required name field
- **WHEN** the administrator submits the plan form with an empty `nombre` field
- **THEN** the system SHALL display a required-field validation error on `nombre` and SHALL NOT submit the request

#### Scenario: Name exceeds maximum length
- **WHEN** the administrator submits the plan form with a `nombre` longer than 100 characters
- **THEN** the system SHALL display a length validation error on `nombre` and SHALL NOT submit the request

#### Scenario: No plan_tipos present on submit
- **WHEN** the administrator submits the plan form with zero plan_tipos
- **THEN** the system SHALL display a validation error "El plan debe tener al menos un subtipo." and SHALL NOT submit the request

### Requirement: Plan persistence SHALL align with Supabase model and constraints
The system SHALL persist plan data against `public.planes` with strict tenant scoping and constraint-aware behavior. The `planes` table SHALL NOT contain `precio`, `vigencia_meses`, or `clases_incluidas` columns — these are exclusively on `plan_tipos`. Writes SHALL preserve `tenant_id` boundary, enforce unique plan names per tenant via the `planes_tenant_nombre_uk` constraint, and manage `planes_disciplina` associations atomically with each plan mutation.

#### Scenario: Duplicate plan name in same tenant
- **WHEN** an administrator submits create or update with a `nombre` that already exists for the active `tenant_id`
- **THEN** the system SHALL reject persistence and SHALL display a user-facing duplicate-name validation error

#### Scenario: Create plan with discipline associations
- **WHEN** an administrator submits a new plan with selected disciplines
- **THEN** the system SHALL insert a row in `public.planes` (without precio, vigencia_meses, or clases_incluidas) and one row per discipline in `public.planes_disciplina`, then SHALL refresh the plans list

#### Scenario: Update plan replaces discipline associations
- **WHEN** an administrator submits an edited plan with a modified set of disciplines
- **THEN** the system SHALL update the `public.planes` row (without precio, vigencia_meses, or clases_incluidas), delete all prior `public.planes_disciplina` rows for that plan, and insert the new set, then SHALL refresh the plans list

#### Scenario: Successful tenant-scoped mutation
- **WHEN** create, update, or delete is requested for a plan in the active tenant scope with a valid payload
- **THEN** the system SHALL persist the change and SHALL refresh the rendered plans list for that tenant

### Requirement: `planes` table SHALL have precio, vigencia_meses, and clases_incluidas columns dropped
A database migration SHALL ALTER the existing `public.planes` table to drop the columns `precio`, `vigencia_meses`, and `clases_incluidas`, along with associated check constraints `planes_precio_ck` and `planes_clases_ck`.

#### Scenario: Migration drops the three columns
- **WHEN** the migration is applied to a database with an existing `planes` table
- **THEN** the `planes` table SHALL no longer contain columns `precio`, `vigencia_meses`, or `clases_incluidas`

#### Scenario: Associated check constraints are removed
- **WHEN** the migration is applied
- **THEN** constraints `planes_precio_ck` and `planes_clases_ck` SHALL no longer exist on the `planes` table

## REMOVED Requirements

### Requirement: Invalid price value
**Reason**: The `precio` field no longer exists on the plan entity. Pricing is managed exclusively via plan_tipos.
**Migration**: Price validation occurs in plan_tipo form validation (`usePlanForm.ts` tipo-level validation).

### Requirement: Invalid validity value
**Reason**: The `vigencia_meses` field no longer exists on the plan entity. Validity is managed exclusively via plan_tipos (`vigencia_dias`).
**Migration**: Validity validation occurs in plan_tipo form validation (`usePlanForm.ts` tipo-level validation).

### Requirement: `planes` table SHALL be evolved by migration to replace `duracion_dias` with `vigencia_meses`
**Reason**: The `vigencia_meses` column introduced by this migration is now being dropped. The migration itself is historical and already applied, but the resulting column no longer exists.
**Migration**: Validity period is defined on `plan_tipos.vigencia_dias`. No plan-level validity column exists.
