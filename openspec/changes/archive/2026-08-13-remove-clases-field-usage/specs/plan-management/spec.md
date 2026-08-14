## MODIFIED Requirements

### Requirement: Plan form SHALL validate required fields and input constraints
The system SHALL enforce client-side validation on plan form submissions before sending any request. The form SHALL display field-level errors adjacent to offending inputs without clearing other field values. The plan form SHALL NOT include `precio`, `vigencia_meses`, or `clases_incluidas` fields at the plan level — these exist exclusively on plan_tipos. The plan_tipos inline form inside the plan modal SHALL NOT include a `clases_incluidas` field. The form SHALL require at least one plan_tipo to be present before submission.

#### Scenario: Missing required name field
- **WHEN** the administrator submits the plan form with an empty `nombre` field
- **THEN** the system SHALL display a required-field validation error on `nombre` and SHALL NOT submit the request

#### Scenario: Name exceeds maximum length
- **WHEN** the administrator submits the plan form with a `nombre` longer than 100 characters
- **THEN** the system SHALL display a length validation error on `nombre` and SHALL NOT submit the request

#### Scenario: No plan_tipos present on submit
- **WHEN** the administrator submits the plan form with zero plan_tipos
- **THEN** the system SHALL display a validation error "El plan debe tener al menos un subtipo." and SHALL NOT submit the request

#### Scenario: Plan tipo form does not show clases_incluidas input
- **WHEN** the administrator opens the plan form and adds or edits a plan_tipo
- **THEN** the plan_tipo inline form SHALL NOT render a "Clases incluidas" input field

### Requirement: Plan persistence SHALL align with Supabase model and constraints
The system SHALL persist plan data against `public.planes` with strict tenant scoping and constraint-aware behavior. The `planes` table SHALL NOT contain `precio`, `vigencia_meses`, or `clases_incluidas` columns — these are exclusively on `plan_tipos`. Writes to `plan_tipos` SHALL NOT include `clases_incluidas` in insert or update payloads. Writes SHALL preserve `tenant_id` boundary, enforce unique plan names per tenant via the `planes_tenant_nombre_uk` constraint, and manage `planes_disciplina` associations atomically with each plan mutation.

#### Scenario: Duplicate plan name in same tenant
- **WHEN** an administrator submits create or update with a `nombre` that already exists for the active `tenant_id`
- **THEN** the system SHALL reject persistence and SHALL display a user-facing duplicate-name validation error

#### Scenario: Create plan does not write clases_incluidas to plan_tipos
- **WHEN** an administrator submits a new plan with one or more plan_tipos
- **THEN** the insert payload for each plan_tipo in `public.plan_tipos` SHALL NOT include a `clases_incluidas` field

#### Scenario: Update plan_tipo does not write clases_incluidas
- **WHEN** an administrator submits an edited plan_tipo
- **THEN** the update payload for `public.plan_tipos` SHALL NOT include a `clases_incluidas` field

#### Scenario: Successful tenant-scoped mutation
- **WHEN** create, update, or delete is requested for a plan in the active tenant scope with a valid payload
- **THEN** the system SHALL persist the change and SHALL refresh the rendered plans list for that tenant

### Requirement: Subscription request modal
Clicking "Adquirir" SHALL open `SuscripcionModal` displaying a summary of the selected plan (name and benefits) and SHALL require the user to select a plan_tipo before proceeding. The modal SHALL display plan_tipo details (price, validity in days) for the selected tipo. The modal SHALL NOT display a class-count badge or "clases" label for plan_tipos. The modal SHALL NOT reference or fall back to plan-level `precio`, `vigencia_meses`, or `clases_incluidas` fields. The modal SHALL include an optional `comentarios` textarea, a `comprobante de pago` file input (accepts JPEG, PNG, WebP, PDF; max 5 MiB; optional), and "Confirmar" and "Cancelar" buttons.

#### Scenario: Modal opens with plan summary and tipo selection
- **WHEN** a `usuario` clicks "Adquirir" on a plan row
- **THEN** `SuscripcionModal` SHALL open displaying the plan's name and a list of active plan_tipos to select from

#### Scenario: Tipo card does not show class count
- **WHEN** a plan_tipo card is rendered inside `SuscripcionModal`
- **THEN** the card SHALL NOT display a class count badge or any reference to `clases_incluidas`

#### Scenario: Review step does not show class summary
- **WHEN** the user reaches the review step in `SuscripcionModal` with a tipo selected
- **THEN** the review summary SHALL NOT include a "clases" line or class-count reference
