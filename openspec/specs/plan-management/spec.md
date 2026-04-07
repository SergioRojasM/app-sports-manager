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
The system SHALL load and display tenant membership plans in table format with columns `Name`, `Description`, `Disciplines`, `Status`, and `Actions`, plus header and primary `New Plan` CTA. The `Price` column SHALL be removed from the table. The `Validity` column SHALL display a summary derived from the plan's active `plan_tipos`: if all active tipos share the same `vigencia_dias`, display that value (e.g., "30 días"); if they differ, display the range (e.g., "30–90 días"); if no active tipos exist, display "—". The list SHALL include loading, empty, and error states and SHALL support search/filter over plan name. The `Actions` column SHALL include "Editar", "Duplicar", and "Eliminar" buttons for each row in editable (non-read-only) view.

#### Scenario: Plans found for tenant
- **WHEN** tenant plans are returned from the data source
- **THEN** the system SHALL render the plans table with columns `Name`, `Description`, `Validity` (derived from plan_tipos), `Disciplines`, `Status`, and `Actions` with row-level edit, duplicate, and delete actions

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

### Requirement: Create and edit plan flows use a shared right-side modal
The system SHALL support create, edit, and duplicate plan workflows through a single right-side modal component that switches mode by state (`'create'`, `'edit'`, or `'duplicate'`). The modal SHALL close via backdrop click, close button, or `Esc` key when not submitting, and SHALL expose submit and cancel controls with disabled and loading behavior during pending requests. The modal title SHALL read "Crear plan" for `'create'` mode, "Editar plan" for `'edit'` mode, and "Duplicar plan" for `'duplicate'` mode. The submit button SHALL read "Crear plan" for `'create'` and `'duplicate'` modes, and "Guardar cambios" for `'edit'` mode.

#### Scenario: Create flow opened from plans screen
- **WHEN** the administrator clicks the `New Plan` button
- **THEN** the system SHALL open the right-side modal in create mode with empty or default form values

#### Scenario: Edit flow opened from plan row action
- **WHEN** the administrator selects the edit action on an existing plan
- **THEN** the system SHALL open the same modal in edit mode with all plan fields and discipline associations pre-filled

#### Scenario: Duplicate flow opened from plan row duplicate action
- **WHEN** the administrator selects the duplicate action on an existing plan
- **THEN** the system SHALL open the same modal in duplicate mode, pre-filled with source plan data, showing "Duplicar plan" as the title and "Crear plan" as the submit label

#### Scenario: Modal submit during pending request
- **WHEN** the administrator submits create, edit, or duplicate and the request is pending
- **THEN** the system SHALL disable submit interactions and show a loading state until the operation completes

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

### Requirement: Plan form SHALL include a multi-discipline selector from tenant active disciplines
The system SHALL load the tenant's active disciplines and present them as a multi-select list (checkboxes) inside the plan form modal. Discipline selection is optional; a plan MAY be saved with zero discipline associations.

#### Scenario: Disciplines loaded into form modal
- **WHEN** the plan form modal opens
- **THEN** the system SHALL display a checklist of all active disciplines for the current tenant

#### Scenario: Edit modal pre-selects existing discipline associations
- **WHEN** the plan form modal opens in edit mode
- **THEN** the checkboxes for disciplines already associated with the plan SHALL be pre-checked

#### Scenario: Disciplines list is empty
- **WHEN** the tenant has no active disciplines
- **THEN** the system SHALL display an informational message indicating no disciplines are available and the submit action SHALL remain enabled

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

### Requirement: `planes` table SHALL have precio, vigencia_meses, and clases_incluidas columns dropped
A database migration SHALL ALTER the existing `public.planes` table to drop the columns `precio`, `vigencia_meses`, and `clases_incluidas`, along with associated check constraints `planes_precio_ck` and `planes_clases_ck`.

#### Scenario: Migration drops the three columns
- **WHEN** the migration is applied to a database with an existing `planes` table
- **THEN** the `planes` table SHALL no longer contain columns `precio`, `vigencia_meses`, or `clases_incluidas`

#### Scenario: Associated check constraints are removed
- **WHEN** the migration is applied
- **THEN** constraints `planes_precio_ck` and `planes_clases_ck` SHALL no longer exist on the `planes` table

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
Clicking "Adquirir" SHALL open `SuscripcionModal` displaying a summary of the selected plan (name and benefits) and SHALL require the user to select a plan_tipo before proceeding. The modal SHALL display plan_tipo details (price, validity in days, class quota or "Ilimitadas") for the selected tipo. The modal SHALL NOT reference or fall back to plan-level `precio`, `vigencia_meses`, or `clases_incluidas` fields. The modal SHALL include an optional `comentarios` textarea, a `comprobante de pago` file input (accepts JPEG, PNG, WebP, PDF; max 5 MiB; optional), and "Confirmar" and "Cancelar" buttons.

#### Scenario: Modal opens with plan summary and tipo selection
- **WHEN** a `usuario` clicks "Adquirir" on a plan row
- **THEN** `SuscripcionModal` SHALL open displaying the plan's name and a list of active plan_tipos to select from

#### Scenario: Tipo must be selected before confirm
- **WHEN** the user has not selected any plan_tipo
- **THEN** the "Confirmar" button SHALL be disabled

#### Scenario: Selected tipo details are displayed
- **WHEN** the user selects a plan_tipo
- **THEN** the modal SHALL display the tipo's `precio`, `vigencia_dias` (formatted), and `clases_incluidas` (as count or "Ilimitadas" if null)

#### Scenario: Modal closes on Cancelar
- **WHEN** the user clicks "Cancelar" inside `SuscripcionModal`
- **THEN** the modal SHALL close without creating any database records

#### Scenario: Valid proof file selected — filename shown
- **WHEN** the user selects a valid comprobante file (JPEG, PNG, WebP, or PDF, ≤ 5 MiB)
- **THEN** the filename SHALL be displayed and the `File` object SHALL be stored in modal state

#### Scenario: Invalid MIME type rejected
- **WHEN** the user selects a file with an unsupported MIME type
- **THEN** an inline error SHALL be shown and the file SHALL NOT be stored in modal state

#### Scenario: File exceeding 5 MiB rejected
- **WHEN** the user selects a file larger than 5 MiB
- **THEN** an inline error SHALL be shown and the file SHALL NOT be stored in modal state

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
On "Confirmar", the system SHALL insert one `suscripciones` record and one linked `pagos` record using the selected `plan_tipo`'s fields. Both records MUST have `estado = 'pendiente'`. The `suscripciones` insert SHALL use `selectedTipo.clases_incluidas` for `clases_plan` and store `plan_tipo_id`. The `pagos` insert SHALL use `selectedTipo.precio` for `monto`. The system SHALL NOT fall back to plan-level `precio` or `clases_incluidas` fields. If a proof file was selected, the system SHALL upload it to `orgs/{tenantId}/users/{userId}/receipts/{pago.id}.{ext}` and patch `pagos.comprobante_path` with the resulting storage path. If no file was selected, `comprobante_path` SHALL be `null`.

#### Scenario: Subscription created with tipo precio
- **WHEN** a user confirms a subscription request with a selected plan_tipo
- **THEN** the `pagos.monto` SHALL be set to `selectedTipo.precio`

#### Scenario: Subscription created with tipo clases_incluidas
- **WHEN** a user confirms a subscription request with a selected plan_tipo
- **THEN** the `suscripciones.clases_plan` SHALL be set to `selectedTipo.clases_incluidas` (may be null for unlimited)

#### Scenario: No fallback to plan-level fields
- **WHEN** a subscription is submitted
- **THEN** the system SHALL NOT attempt to read `plan.precio` or `plan.clases_incluidas` as they no longer exist

#### Scenario: Successful subscription request with proof file
- **WHEN** a `usuario` confirms a subscription request with a valid proof file
- **THEN** a `suscripciones` row SHALL be inserted with `estado = 'pendiente'`, `atleta_id = auth.uid()`, `plan_id = selectedPlan.id`, and `clases_plan = selectedTipo.clases_incluidas`
- **THEN** a `pagos` row SHALL be inserted with `estado = 'pendiente'`, `suscripcion_id` referencing the new subscription, and `monto = selectedTipo.precio`
- **THEN** the proof file SHALL be uploaded and `pagos.comprobante_path` SHALL be patched to the storage path
- **THEN** the modal SHALL close and a success message SHALL be shown: _"Solicitud enviada. El administrador revisará tu suscripción."_

#### Scenario: Successful subscription request without proof file
- **WHEN** a `usuario` confirms a subscription request without selecting a file
- **THEN** a `suscripciones` and a `pagos` row SHALL be inserted with `comprobante_path = null`
- **THEN** the modal SHALL close and a success message SHALL be shown

#### Scenario: Subscription insert fails
- **WHEN** the `createSuscripcion` call returns an error
- **THEN** the modal SHALL remain open and display an inline error message without creating any records

#### Scenario: Payment insert fails after subscription insert succeeds
- **WHEN** `createSuscripcion` succeeds but `createPago` returns an error
- **THEN** an inline error message SHALL be shown inside the modal
- **THEN** the orphan `suscripciones` row with `estado = 'pendiente'` SHALL remain in the database

---

### Requirement: Payment proof file validation is enforced in the modal
`SuscripcionModal` SHALL enforce MIME type validation for the comprobante file input. Accepted types are `image/jpeg`, `image/png`, `image/webp`, and `application/pdf`. Files exceeding 5 MiB SHALL be rejected. Invalid selections SHALL display an inline error and SHALL NOT set the file in state.

#### Scenario: Valid file selected
- **WHEN** the athlete selects a JPEG, PNG, WebP, or PDF file of 5 MiB or less
- **THEN** the filename SHALL be displayed and no error SHALL be shown

#### Scenario: File with unsupported MIME type selected
- **WHEN** the athlete selects a file with a MIME type not in the allowed list
- **THEN** an inline error SHALL be shown: _"Solo se permiten imágenes (JPEG, PNG, WebP) o PDF."_
- **THEN** the file SHALL NOT be stored in state

#### Scenario: File exceeding 5 MiB selected
- **WHEN** the athlete selects a file larger than 5 MiB
- **THEN** an inline error SHALL be shown: _"El archivo no puede superar 5 MB."_
- **THEN** the file SHALL NOT be stored in state

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

## ADDED Requirements

### Requirement: Plan form modal includes an inline subtype management section
The plan form modal (`PlanFormModal`) SHALL include a visually separated "Tipos de plan / Subtipos" section below the main plan fields. The section SHALL render a list of inline subtype rows; each row SHALL display: Name (required), Price, Validity in days, Classes Included, Active toggle, and a Remove button. An "+ Agregar subtipo" button SHALL append a new empty row to the list.

#### Scenario: New plan form shows empty subtype section with add button
- **WHEN** the plan form modal opens in create mode
- **THEN** the subtypes section SHALL be empty and the "+ Agregar subtipo" button SHALL be visible

#### Scenario: Edit plan form pre-populates existing subtypes
- **WHEN** the plan form modal opens in edit mode for a plan with existing subtypes
- **THEN** each existing subtype SHALL appear as a pre-filled row in the subtypes section

#### Scenario: Administrator adds a new subtype row
- **WHEN** the administrator clicks "+ Agregar subtipo"
- **THEN** a new empty subtype row SHALL be appended to the list with default `activo = true`

#### Scenario: Administrator removes a subtype row
- **WHEN** the administrator clicks the Remove button on a subtype row
- **THEN** the row SHALL be removed from the form list immediately without any database call

#### Scenario: Removed subtype with active subscriptions is soft-deactivated on save
- **WHEN** the administrator removes a subtype row that corresponds to an existing subtype with active or pending subscriptions and saves the plan
- **THEN** the system SHALL call `deletePlanTipo` which SHALL soft-deactivate the subtype and return `{ deleted: false, deactivated: true }`
- **THEN** the UI SHALL display the inline notice: _"Este subtipo tiene suscripciones activas y no puede eliminarse. Se marcará como inactivo."_

---

### Requirement: Plan save requires at least one active subtype
The system SHALL enforce client-side validation that at least one subtype row with `activo = true` exists before the plan form can be submitted.

#### Scenario: Plan submitted with no active subtypes shows validation error
- **WHEN** the administrator submits the plan form and no subtype row has `activo = true`
- **THEN** the system SHALL display a validation error in the subtypes section and SHALL NOT submit any request

#### Scenario: Plan submitted with one active subtype passes subtype validation
- **WHEN** the administrator submits the plan form and at least one subtype row has `activo = true`
- **THEN** subtype validation SHALL pass and the form MAY proceed to persist the plan

#### Scenario: Each subtype row requires a nombre value
- **WHEN** the administrator submits the plan form and a subtype row has an empty `nombre`
- **THEN** the system SHALL display a required-field error on that row's `nombre` input and SHALL NOT submit the request

---

### Requirement: Plan save persists subtypes via diff-based upsert
The system SHALL persist subtype changes using a diff against the initial subtype state loaded when the edit modal opened. The diff SHALL identify: rows to create (no existing id), rows to update (id exists and values differ), rows to deactivate (id existed but was removed from the form). New subtype rows SHALL be inserted and their `tenant_id` SHALL be derived from the parent plan's `tenant_id`, never from client input.

#### Scenario: New subtype rows are inserted on plan save
- **WHEN** the administrator adds a subtype row that did not exist before and saves the plan
- **THEN** the service SHALL insert a new `plan_tipos` row with `tenant_id` copied from the parent plan

#### Scenario: Modified subtype rows are updated on plan save
- **WHEN** the administrator edits an existing subtype row and saves the plan
- **THEN** the service SHALL call `updatePlanTipo` for that row with the new values

#### Scenario: Removed subtype rows trigger deletion logic on plan save
- **WHEN** the administrator removes a subtype row that had an existing id and saves the plan
- **THEN** the service SHALL call `deletePlanTipo` for that id, which either hard-deletes or soft-deactivates based on subscription state

---

### Requirement: Plans list table shows active subtype count per plan
The plans table (`PlanesTable`) SHALL include a "Subtipos" column displaying the count of active subtypes (`activo = true`) for each plan. If a plan has no active subtypes, the column SHALL display "—". The count SHALL be derived from the embedded `plan_tipos` array already loaded with `getPlanes`; no additional query SHALL be issued.

#### Scenario: Plan with active subtypes shows count
- **WHEN** a plan has one or more `plan_tipos` rows with `activo = true`
- **THEN** the "Subtipos" column SHALL display the count of active subtypes (e.g., "3")

#### Scenario: Plan with no active subtypes shows dash
- **WHEN** a plan has no `plan_tipos` rows with `activo = true`
- **THEN** the "Subtipos" column SHALL display "—"

---

### Requirement: usePlanesView exposes getActiveTipos selector
The `usePlanesView` hook SHALL expose a `getActiveTipos(plan: Plan): PlanTipo[]` function that returns only the subtype entries where `activo === true` from the plan's embedded `plan_tipos` array, sorted by `nombre`.

#### Scenario: getActiveTipos filters inactive subtypes
- **WHEN** a plan has a mix of active and inactive subtypes
- **THEN** `getActiveTipos` SHALL return only entries where `activo === true`

#### Scenario: getActiveTipos returns empty array when no active subtypes
- **WHEN** a plan has no subtypes or all subtypes are inactive
- **THEN** `getActiveTipos` SHALL return an empty array

---

### Requirement: Plans without active subtypes hide the Adquirir button
The athlete plan view (`PlanesViewPage`) SHALL NOT render the "Adquirir" button for a plan that has no active subtypes. The button SHALL be disabled/hidden rather than shown in a broken state.

#### Scenario: Adquirir hidden when plan has no active subtypes
- **WHEN** a `usuario` views the plan catalogue and a plan has zero active subtypes
- **THEN** the "Adquirir" button SHALL NOT be rendered for that plan row

#### Scenario: Adquirir visible when plan has at least one active subtype
- **WHEN** a `usuario` views the plan catalogue and a plan has at least one active subtype
- **THEN** the "Adquirir" button SHALL be rendered for that plan row
