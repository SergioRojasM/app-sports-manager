## ADDED Requirements

### Requirement: tenant_reglas_suspension table exists with correct structure
The system SHALL have a `public.tenant_reglas_suspension` table with columns: `id uuid PK`, `tenant_id uuid FK→tenants`, `nombre varchar(100) NOT NULL`, `num_inasistencias integer NOT NULL DEFAULT 1`, `por_suscripcion boolean NOT NULL DEFAULT false`, `por_dias_atras integer NOT NULL DEFAULT 0`, `duracion integer NOT NULL DEFAULT 0`, `activo boolean NOT NULL DEFAULT true`, `created_at timestamptz`, `updated_at timestamptz`. The table SHALL have constraints: unique `(tenant_id, nombre)`, `num_inasistencias >= 1`, `por_dias_atras >= 0`, `duracion >= 0`, cascade delete on `tenant_id`. An index SHALL exist on `tenant_id`.

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

---

### Requirement: RLS restricts write access to tenant admins only
The `tenant_reglas_suspension` table SHALL have RLS enabled. SELECT SHALL be allowed for all authenticated users. INSERT, UPDATE, and DELETE SHALL be restricted to users who are admins of the owning tenant, verified via `get_admin_tenants_for_authenticated_user()`.

#### Scenario: Admin can insert a rule for their tenant
- **WHEN** an authenticated admin calls INSERT for a `tenant_id` they administer
- **THEN** the operation SHALL succeed

#### Scenario: Non-admin cannot insert a rule
- **WHEN** an authenticated non-admin user calls INSERT for any tenant_id
- **THEN** the operation SHALL be rejected by the RLS INSERT policy

#### Scenario: Non-admin cannot update a rule
- **WHEN** an authenticated non-admin user calls UPDATE on any row
- **THEN** the operation SHALL be rejected by the RLS UPDATE policy

#### Scenario: Non-admin cannot delete a rule
- **WHEN** an authenticated non-admin user calls DELETE on any row
- **THEN** the operation SHALL be rejected by the RLS DELETE policy

#### Scenario: Any authenticated user can read rules
- **WHEN** an authenticated user queries `tenant_reglas_suspension`
- **THEN** rows are returned regardless of admin status

---

### Requirement: Service provides full CRUD operations for suspension rules
`src/services/supabase/portal/reglas-suspension.service.ts` SHALL export:
- `getReglasSuspension(tenantId: string): Promise<ReglaSuspension[]>` — returns all rules for the tenant ordered by `created_at ASC`
- `createReglaSuspension(payload: ReglaSuspensionCreatePayload): Promise<ReglaSuspension>` — inserts and returns the created row
- `updateReglaSuspension(id: string, payload: ReglaSuspensionUpdatePayload): Promise<ReglaSuspension>` — updates and returns the updated row
- `deleteReglaSuspension(id: string): Promise<void>` — deletes the row

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

---

### Requirement: Types define all shapes for suspension rules
`src/types/portal/reglas-suspension.types.ts` SHALL export:
- `ReglaSuspension` — mirrors the DB row shape
- `ReglaSuspensionCreatePayload` — all required fields excluding `id`, `created_at`, `updated_at`
- `ReglaSuspensionUpdatePayload` — Partial of mutable fields
- `ReglaSuspensionFormValues` — form field shape (all fields as strings or booleans, compatible with react-hook-form)

#### Scenario: ReglaSuspension includes all DB columns
- **WHEN** the TypeScript compiler checks `ReglaSuspension`
- **THEN** all columns (`id`, `tenant_id`, `nombre`, `num_inasistencias`, `por_suscripcion`, `por_dias_atras`, `duracion`, `activo`, `created_at`, `updated_at`) SHALL be present with correct types

#### Scenario: ReglaSuspensionCreatePayload excludes generated fields
- **WHEN** `ReglaSuspensionCreatePayload` is used
- **THEN** it SHALL NOT include `id`, `created_at`, or `updated_at`

---

### Requirement: useReglasSuspension hook manages CRUD state and enforces 3-rule limit
`src/hooks/portal/tenant/useReglasSuspension.ts` SHALL expose:
- `rules: ReglaSuspension[]` — loaded rules
- `isLoading: boolean`
- `isSubmitting: boolean`
- `modalMode: 'create' | 'edit'`
- `isModalOpen: boolean`
- `selectedRule: ReglaSuspension | null`
- `openCreateModal()` — opens modal in create mode; if `rules.length >= 3` SHALL be a no-op (button is already disabled)
- `openEditModal(rule)` — opens modal in edit mode with the selected rule
- `closeModal()`
- `handleCreate(payload)` — calls service, adds to list, shows success toast
- `handleUpdate(id, payload)` — calls service, updates list, shows success toast
- `handleDelete(id)` — calls service, removes from list, shows success toast
- On any service error: shows error toast

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

---

### Requirement: TenantReglasSuspensionCard renders the suspension rules list
`src/components/portal/tenant/TenantReglasSuspensionCard.tsx` SHALL:
- Use `useReglasSuspension(tenantId)` to load rules
- Show a loading skeleton while fetching
- Show "No hay reglas configuradas" empty-state when no rules exist and the user is admin
- Render compact rows for each rule showing: `nombre`, `num_inasistencias`, the condition dimension (subscription or days), and `duracion` display (0 → "Permanente")
- Show edit and delete action buttons per row (admin only)
- Show an "Add Rule" button: disabled with `aria-disabled="true"` and tooltip "Máximo 3 reglas por organización" when `rules.length >= 3`; otherwise enabled
- Not render add/edit/delete controls for non-admin users

#### Scenario: Empty state is shown when no rules exist
- **WHEN** a tenant has no suspension rules and admin opens the card
- **THEN** the card SHALL display "No hay reglas configuradas"

#### Scenario: Add button is disabled at 3 rules
- **WHEN** a tenant already has 3 suspension rules
- **THEN** the Add Rule button SHALL have `disabled` attribute and `aria-disabled="true"` and show tooltip "Máximo 3 reglas por organización"

#### Scenario: Non-admin does not see action buttons
- **WHEN** a non-admin user views the card
- **THEN** add, edit, and delete buttons SHALL NOT be rendered

#### Scenario: duracion 0 renders as Permanente
- **WHEN** a rule has `duracion = 0`
- **THEN** the row SHALL display "Permanente" for the duration column

#### Scenario: por_dias_atras 0 renders as No aplica
- **WHEN** a rule has `por_dias_atras = 0`
- **THEN** the row SHALL display "No aplica" for the days-window column

---

### Requirement: ReglaSuspensionFormModal handles create and edit with full validation
`src/components/portal/tenant/ReglaSuspensionFormModal.tsx` SHALL be a right-side slide-in modal with:
- Fields: `nombre` (text, required, max 100), `num_inasistencias` (integer, required, min 1), `por_suscripcion` (toggle), `por_dias_atras` (integer, min 0), `duracion` (integer, min 0), `activo` (toggle)
- Inline error if `por_suscripcion === false && por_dias_atras <= 0`
- In create mode: pre-set `activo = true`
- In edit mode: pre-fill all fields from `selectedRule`
- `duracion = 0` SHOULD show hint "Permanente (sin límite de días)" near the input
- `por_dias_atras = 0` SHOULD show hint "No aplica" near the input
- On submit: calls `handleCreate` or `handleUpdate` based on mode
- Duplicate `nombre` DB error (code `23505`) SHALL map to an inline field error under the `nombre` input

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
