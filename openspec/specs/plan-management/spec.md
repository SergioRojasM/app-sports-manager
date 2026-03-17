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

## ADDED Requirements

### Requirement: Non-admin roles can view active tenant plans
The system SHALL expose the `gestion-planes` route to `usuario` and `entrenador` roles via a unified `(shared)` route. The route SHALL render the read-only plan catalogue (`PlanesViewPage`) for these roles and MUST filter plans to `activo = true` only. The administrator route at `(administrador)/gestion-planes` SHALL be removed; the admin MUST be served the full CRUD view (`PlanesPage`) from the same shared route based on server-resolved role.

#### Scenario: Usuario navigates to gestion-planes
- **WHEN** a user with role `usuario` navigates to `/portal/orgs/[tenant_id]/gestion-planes`
- **THEN** the page SHALL render a read-only plan list showing only plans where `activo = true` for that tenant

#### Scenario: Entrenador navigates to gestion-planes
- **WHEN** a user with role `entrenador` navigates to `/portal/orgs/[tenant_id]/gestion-planes`
- **THEN** the page SHALL render a read-only plan list showing only active plans with no action buttons

#### Scenario: Administrador navigates to gestion-planes via shared route
- **WHEN** a user with role `administrador` navigates to `/portal/orgs/[tenant_id]/gestion-planes`
- **THEN** the page SHALL render the full CRUD plan view (`PlanesPage`) unchanged

#### Scenario: Inactive plans are hidden from non-admin roles
- **WHEN** a tenant has plans with `activo = false`
- **THEN** those plans SHALL NOT appear in the plan catalogue for `usuario` or `entrenador` roles

---

### Requirement: Usuario sees Adquirir action per plan
`PlanesViewPage` SHALL render an "Adquirir" button for each plan row exclusively when the requesting user has role `usuario`. The button MUST NOT be rendered for `entrenador` role.

#### Scenario: Usuario sees Adquirir button on each plan row
- **WHEN** a `usuario` views the plan catalogue
- **THEN** each plan row SHALL display an "Adquirir" button

#### Scenario: Entrenador does not see Adquirir button
- **WHEN** an `entrenador` views the plan catalogue
- **THEN** no "Adquirir" button SHALL be rendered for any plan row

---

### Requirement: Subscription request modal
Clicking "Adquirir" SHALL open `SuscripcionModal` displaying a summary of the selected plan (name, price, validity, included classes), an optional `comentarios` textarea, a `comprobante de pago` file input (UI only — display filename only; no upload), and "Confirmar" and "Cancelar" buttons.

#### Scenario: Modal opens with plan summary
- **WHEN** a `usuario` clicks "Adquirir" on a plan row
- **THEN** `SuscripcionModal` SHALL open displaying the plan's name, price, validity period, and number of included classes

#### Scenario: Modal closes on Cancelar
- **WHEN** the user clicks "Cancelar" inside `SuscripcionModal`
- **THEN** the modal SHALL close without creating any database records

#### Scenario: File input shows filename without uploading
- **WHEN** the user selects a file in the `comprobante de pago` input
- **THEN** the filename SHALL be displayed in the UI and no file upload SHALL occur

---

### Requirement: Duplicate pendiente subscription guard
Before confirming a subscription, the system SHALL check whether the authenticated user already has a `suscripciones` record with `estado = 'pendiente'` for the same `plan_id`. If such a record exists, the modal SHALL display an inline error message _"Ya tienes una solicitud pendiente para este plan"_ and the "Confirmar" button SHALL be disabled.

#### Scenario: User attempts to subscribe to a plan with an existing pending request
- **WHEN** a `usuario` opens `SuscripcionModal` for a plan they already have a `pendiente` subscription for
- **THEN** the modal SHALL display the error _"Ya tienes una solicitud pendiente para este plan"_ and the "Confirmar" button SHALL be disabled

#### Scenario: User subscribes to a different plan with no pending request
- **WHEN** a `usuario` opens `SuscripcionModal` for a plan with no existing `pendiente` subscription
- **THEN** the "Confirmar" button SHALL be enabled and no duplicate-guard error SHALL be shown

---

### Requirement: Subscription request submission
On "Confirmar", the system SHALL insert one `suscripciones` record and one linked `pagos` record. Both records MUST have `estado = 'pendiente'`. The `suscripciones` insert MUST snapshot `planes.clases_incluidas` into `clases_plan`. The `pagos` insert MUST capture `planes.precio` in `monto` and set `comprobante_url = null`.

#### Scenario: Successful subscription request
- **WHEN** a `usuario` confirms a subscription request
- **THEN** a `suscripciones` row SHALL be inserted with `estado = 'pendiente'`, `atleta_id = auth.uid()`, `plan_id = selectedPlan.id`, and `clases_plan = selectedPlan.clases_incluidas`
- **THEN** a `pagos` row SHALL be inserted with `estado = 'pendiente'`, `suscripcion_id` referencing the new subscription, `monto = selectedPlan.precio`, and `comprobante_url = null`
- **THEN** the modal SHALL close and a success message SHALL be shown: _"Solicitud enviada. El administrador revisará tu suscripción."_

#### Scenario: Subscription insert fails
- **WHEN** the `createSuscripcion` call returns an error
- **THEN** the modal SHALL remain open and display an inline error message without creating any records

#### Scenario: Payment insert fails after subscription insert succeeds
- **WHEN** `createSuscripcion` succeeds but `createPago` returns an error
- **THEN** an inline error message SHALL be shown inside the modal
- **THEN** the orphan `suscripciones` row with `estado = 'pendiente'` SHALL remain in the database

---

### Requirement: Database schema — suscripciones extensions
The `public.suscripciones` table SHALL be extended with: a nullable integer column `clases_plan` (constraint: `>= 0`); a nullable text column `comentarios`; and the `estado` check constraint SHALL include `'pendiente'` in addition to the existing values `('activa', 'vencida', 'cancelada')`.

#### Scenario: clases_plan snapshot is stored at subscription time
- **WHEN** a subscription is inserted
- **THEN** `clases_plan` SHALL contain the value of `planes.clases_incluidas` at that moment, independent of future plan edits

#### Scenario: estado accepts pendiente value
- **WHEN** a `suscripciones` row is inserted with `estado = 'pendiente'`
- **THEN** the database SHALL accept the insert without constraint violation

---

### Requirement: Subscription flow SHALL require a payment method before confirming
The system SHALL enforce that users select a payment method from the tenant's active methods before confirming a plan subscription. The `SuscripcionModal` SHALL delegate payment method display and selection to the `subscription-payment-method` capability. The `useSuscripcion` hook SHALL accept `metodo_pago_id` in its submit data type and pass it to `pagosService.createPago()`.

#### Scenario: Submit data type includes metodo_pago_id
- **WHEN** the user confirms a plan subscription
- **THEN** `useSuscripcion.submit` SHALL receive `{ comentarios: string; metodo_pago_id: string }` and SHALL include `metodo_pago_id` in the pago creation payload

#### Scenario: Subscription cannot be submitted without payment method
- **WHEN** `SuscripcionModal` is rendered with an empty active methods list or no selection made
- **THEN** the Confirm action SHALL be disabled and `useSuscripcion.submit` SHALL NOT be called
