# Spec Delta

## MODIFIED Requirements

### Requirement: tenant_reglas_suspension table exists with correct structure
The system SHALL have a `public.tenant_reglas_suspension` table with columns: `id uuid PK`, `tenant_id uuid FK→tenants`, `nombre varchar(100) NOT NULL`, `num_inasistencias integer NOT NULL DEFAULT 1`, `por_suscripcion boolean NOT NULL DEFAULT false`, `por_dias_atras integer NOT NULL DEFAULT 0`, `duracion integer NOT NULL DEFAULT 0`, `activo boolean NOT NULL DEFAULT true`, `created_at timestamptz`, `updated_at timestamptz`.

#### Scenario: Table is created after migration
- **WHEN** migration `20260407000100_tenant_reglas_suspension.sql` is applied
- **THEN** `public.tenant_reglas_suspension` SHALL exist with all specified columns, constraints, and the `idx_tenant_reglas_suspension_tenant_id` index

#### Scenario: updated_at is auto-updated on row change
- **WHEN** any row in `tenant_reglas_suspension` is updated
- **THEN** the `updated_at` column SHALL be set to the current UTC timestamp via the `set_updated_at` trigger

#### Scenario: Duplicate nombre for same tenant is rejected
- **WHEN** an INSERT uses a `(tenant_id, nombre)` pair that already exists
- **THEN** the database SHALL reject the operation with a unique constraint violation

#### Scenario: num_inasistencias below 1 is rejected
- **WHEN** an INSERT or UPDATE sets `num_inasistencias = 0`
- **THEN** the database SHALL reject the operation with a check constraint violation

#### Scenario: Deleting a rule cascades SET NULL on member assignments
- **WHEN** a `tenant_reglas_suspension` row is deleted and 3 members had that rule assigned
- **THEN** all 3 `miembros_tenant` rows SHALL have `tenant_regla_suspension_id` set to `NULL`

### Requirement: Service provides full CRUD operations for suspension rules
`src/services/supabase/portal/reglas-suspension.service.ts` SHALL export `getReglasSuspension(tenantId)`, `createReglaSuspension(payload)`, `updateReglaSuspension(id, payload)` and `deleteReglaSuspension(id)` for the tenant's suspension rules.

#### Scenario: getReglasSuspension returns rules ordered by created_at
- **WHEN** `getReglasSuspension(tenantId)` is called for a tenant with 2 rules
- **THEN** it SHALL return an array of 2 `ReglaSuspension` objects ordered by `created_at ASC`

#### Scenario: createReglaSuspension returns the created row
- **WHEN** `createReglaSuspension` is called with valid payload
- **THEN** it SHALL return the newly inserted `ReglaSuspension` with a generated `id`

#### Scenario: updateReglaSuspension returns the updated row
- **WHEN** `updateReglaSuspension(id, { nombre: 'Nuevo' })` is called
- **THEN** it SHALL return the updated `ReglaSuspension` with `nombre = 'Nuevo'`

#### Scenario: deleteReglaSuspension resolves without data
- **WHEN** `deleteReglaSuspension(id)` is called for an existing rule
- **THEN** it SHALL resolve without returning data and the row SHALL no longer exist

### Requirement: useReglasSuspension hook manages CRUD state and enforces 3-rule limit
`src/hooks/portal/tenant/useReglasSuspension.ts` SHALL expose the tenant's loaded `rules: ReglaSuspension[]` together with `isLoading`, `isSubmitting`, `modalMode: 'create' | 'edit'`, `isModalOpen` and `selectedRule: ReglaSuspension | null`.

#### Scenario: openCreateModal is no-op at 3 rules
- **WHEN** `openCreateModal()` is called and `rules.length === 3`
- **THEN** `isModalOpen` SHALL remain `false`

#### Scenario: openEditModal opens modal with selected rule
- **WHEN** `openEditModal(rule)` is called
- **THEN** `isModalOpen` SHALL be `true`, `modalMode` SHALL be `'edit'`, and `selectedRule` SHALL equal the passed rule

#### Scenario: handleCreate adds new rule to list
- **WHEN** `handleCreate(payload)` resolves successfully
- **THEN** `rules` SHALL include the new rule and a success toast SHALL be shown

#### Scenario: handleDelete removes rule from list
- **WHEN** `handleDelete(id)` resolves successfully
- **THEN** `rules` SHALL not contain the deleted rule and a success toast SHALL be shown

#### Scenario: service error triggers error toast
- **WHEN** `handleCreate` or `handleUpdate` or `handleDelete` resolves with a service error
- **THEN** an error toast SHALL be shown and `rules` SHALL remain unchanged

### Requirement: ReglaSuspensionFormModal handles create and edit with full validation
`src/components/portal/tenant/ReglaSuspensionFormModal.tsx` SHALL be a right-side slide-in modal with the fields `nombre`, `num_inasistencias`, `por_suscripcion` (toggle), `por_dias_atras`, `duracion` and `activo` (toggle), pre-setting `activo = true` in create mode and pre-filling every field from `selectedRule` in edit mode. `duracion = 0` SHOULD show the hint "Permanente (sin límite de días)" and `por_dias_atras = 0` SHOULD show "No aplica" near their inputs.

#### Scenario: Form shows inline error when no condition selected
- **WHEN** the user submits the form with `por_suscripcion = false` and `por_dias_atras = 0`
- **THEN** the form SHALL NOT call the service and SHALL display an inline error "Debe seleccionar al menos una condición"

#### Scenario: Form validates nombre max length
- **WHEN** the user submits with `nombre` exceeding 100 characters
- **THEN** the form SHALL NOT call the service and SHALL display a validation error on the `nombre` field

#### Scenario: Form validates num_inasistencias minimum
- **WHEN** the user submits with `num_inasistencias = 0`
- **THEN** the form SHALL NOT call the service and SHALL display a validation error "Debe ser al menos 1"

#### Scenario: Duplicate nombre DB error maps to field error
- **WHEN** the service throws a unique-constraint error on `(tenant_id, nombre)`
- **THEN** the form SHALL display an inline error under `nombre`: "Ya existe una regla con este nombre"

#### Scenario: Edit mode pre-fills all fields
- **WHEN** the modal opens in edit mode with a selected rule
- **THEN** all form fields SHALL be pre-filled with the selected rule's values

## ADDED Requirements

### Requirement: tenant_reglas_suspension constraints and index
`public.tenant_reglas_suspension` SHALL have a unique constraint on `(tenant_id, nombre)`, checks `num_inasistencias >= 1`, `por_dias_atras >= 0` and `duracion >= 0`, cascade delete on `tenant_id`, and an index on `tenant_id`.

#### Scenario: Negative duration is rejected
- **WHEN** an INSERT sets `duracion = -1`
- **THEN** the database SHALL reject it with a check constraint violation

#### Scenario: Tenant deletion removes its rules
- **WHEN** a tenant is deleted
- **THEN** its `tenant_reglas_suspension` rows SHALL be deleted via CASCADE

### Requirement: Member reference to a suspension rule
The `miembros_tenant` table SHALL reference `tenant_reglas_suspension` through `tenant_regla_suspension_id uuid NULL` with `ON DELETE SET NULL`.

#### Scenario: Member without a rule
- **WHEN** a member has no suspension rule assigned
- **THEN** its `tenant_regla_suspension_id` SHALL be `NULL`

### Requirement: Suspension rules are read in creation order
`getReglasSuspension(tenantId)` SHALL return every rule of the tenant ordered by `created_at ASC`.

#### Scenario: Only the tenant's rules
- **WHEN** `getReglasSuspension` is called for one tenant while another tenant also has rules
- **THEN** only the requested tenant's rules SHALL be returned

### Requirement: Suspension rule mutations return the persisted row
`createReglaSuspension` SHALL insert and return the created row, `updateReglaSuspension` SHALL update and return the updated row, and `deleteReglaSuspension` SHALL delete the row and resolve without data.

#### Scenario: Created row carries server fields
- **WHEN** `createReglaSuspension` resolves
- **THEN** the returned rule SHALL include its generated `id` and `created_at`

### Requirement: Suspension rule modal controls and the 3-rule limit
`useReglasSuspension` SHALL expose `openCreateModal()` — a no-op when `rules.length >= 3`, since the button is already disabled — `openEditModal(rule)`, which opens the modal in edit mode with that rule, and `closeModal()`.

#### Scenario: Close the modal
- **WHEN** `closeModal()` is called while the modal is open
- **THEN** `isModalOpen` SHALL be `false`

### Requirement: Suspension rule mutations update the list and notify
`handleCreate(payload)`, `handleUpdate(id, payload)` and `handleDelete(id)` SHALL call the service, update the loaded list (add, replace, remove) and show a success toast; on any service error they SHALL show an error toast.

#### Scenario: handleUpdate replaces the rule
- **WHEN** `handleUpdate(id, { nombre: 'Nuevo' })` resolves successfully
- **THEN** `rules` SHALL contain the rule with `nombre = 'Nuevo'` and a success toast SHALL be shown

### Requirement: Suspension rule form validation
The suspension rule form SHALL require `nombre` (text, at most 100 characters) and `num_inasistencias` (integer, at least 1), accept `por_dias_atras` and `duracion` as integers of at least 0, and show an inline error when `por_suscripcion === false && por_dias_atras <= 0`.

#### Scenario: Negative days window rejected
- **WHEN** the user submits with `por_dias_atras = -1`
- **THEN** the form SHALL NOT call the service and SHALL show a validation error on that field

### Requirement: Suspension rule form submission
On submit, the suspension rule form SHALL call `handleCreate` or `handleUpdate` according to its mode, and SHALL map a duplicate `nombre` database error (code `23505`) to an inline error under the `nombre` input.

#### Scenario: Create mode calls handleCreate
- **WHEN** a valid form is submitted in create mode
- **THEN** `handleCreate` SHALL be called with the form values and the tenant id
