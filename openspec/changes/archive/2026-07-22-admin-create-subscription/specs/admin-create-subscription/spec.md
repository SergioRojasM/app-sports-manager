## ADDED Requirements

### Requirement: Admin can create a subscription on behalf of any active athlete
The system SHALL allow an authenticated user with `administrador` role to create a new subscription for any active athlete-role member of their tenant, from the subscription management panel. The feature SHALL be accessible via a "Nueva suscripción" button rendered in the `GestionSuscripcionesPage` header.

#### Scenario: Nueva suscripción button is visible to admins
- **WHEN** an authenticated user with `administrador` role navigates to `/portal/orgs/[tenant_id]/gestion-suscripciones`
- **THEN** the system SHALL render a "Nueva suscripción" primary action button in the page header

#### Scenario: Button is not visible to athlete or entrenador roles
- **WHEN** an authenticated user with `atleta` or `entrenador` role accesses the subscriptions view
- **THEN** the system SHALL NOT render the "Nueva suscripción" button

---

### Requirement: 3-step CrearSuscripcionModal with athlete picker, plan selection, and subscription config
The system SHALL present a 3-step modal (`CrearSuscripcionModal`) when the admin clicks "Nueva suscripción". Each step MUST be completed and validated before advancing. The admin SHALL be able to navigate back to previous steps without losing already-entered values.

#### Scenario: Step 1 — Athlete picker shows only active atleta-role members
- **WHEN** the modal opens on step 1
- **THEN** the system SHALL load all members of the tenant with `activo = true` and role `atleta`, and display them via a searchable combobox

#### Scenario: Step 1 — Athlete combobox filters by name and identification number
- **WHEN** the admin types at least 1 character in the athlete search input
- **THEN** the system SHALL filter the dropdown list client-side to show only athletes whose full name or `numero_identificacion` contains the search term (case-insensitive)

#### Scenario: Step 1 — Selecting an athlete advances to step 2
- **WHEN** the admin selects an athlete from the dropdown or clicks "Siguiente" after selecting one
- **THEN** the system SHALL advance to step 2

#### Scenario: Step 1 — Cannot advance without athlete selection
- **WHEN** the admin clicks "Siguiente" on step 1 without selecting an athlete
- **THEN** the system SHALL display an inline validation error and SHALL NOT advance to step 2

#### Scenario: Step 2 — Plan dropdown shows only active tenant plans
- **WHEN** the admin reaches step 2
- **THEN** the system SHALL populate a plan dropdown with all `activo = true` plans for the tenant

#### Scenario: Step 2 — Plan with active subtypes shows a radio group
- **WHEN** the admin selects a plan that has at least one active `plan_tipo`
- **THEN** the system SHALL render a radio button group for subtype selection below the plan dropdown

#### Scenario: Step 2 — Plan without active subtypes allows direct advancement
- **WHEN** the admin selects a plan that has no active `plan_tipos`
- **THEN** the system SHALL not render a subtype radio group and SHALL allow advancing to step 3 with `plan_tipo_id = null`

#### Scenario: Step 2 — Cannot advance without plan selection
- **WHEN** the admin clicks "Siguiente" on step 2 without selecting a plan
- **THEN** the system SHALL display an inline validation error and SHALL NOT advance to step 3

#### Scenario: Step 2 — Cannot advance without subtype when plan has active subtypes
- **WHEN** the admin clicks "Siguiente" on step 2 with a plan that has active subtypes but no subtype is selected
- **THEN** the system SHALL display an inline validation error and SHALL NOT advance to step 3

#### Scenario: Step 3 — Subscription estado defaults to 'activa'
- **WHEN** the admin reaches step 3
- **THEN** the `estado` radio group SHALL be pre-selected to `activa`

#### Scenario: Step 3 — fecha_inicio and fecha_fin are required when estado is 'activa'
- **WHEN** the admin attempts to submit on step 3 with `estado = 'activa'` and either `fecha_inicio` or `fecha_fin` is empty
- **THEN** the system SHALL display inline validation errors for the missing date fields and SHALL NOT submit

#### Scenario: Step 3 — fecha_fin is auto-filled from subtype vigencia_dias
- **WHEN** a plan subtype with a defined `vigencia_dias` is selected and `fecha_inicio` is set
- **THEN** the system SHALL automatically set `fecha_fin` to `fecha_inicio + vigencia_dias` days; the field SHALL remain editable

#### Scenario: Step 3 — clases_restantes is auto-filled from subtype clases_incluidas
- **WHEN** a plan subtype with a defined `clases_incluidas` is selected
- **THEN** the system SHALL automatically set `clases_restantes` to that value; the field SHALL remain editable

#### Scenario: Step 3 — clases_restantes field is hidden when plan has no class limit
- **WHEN** the selected plan/subtype has `clases_incluidas = null`
- **THEN** the system SHALL NOT render the `clases_restantes` input field

#### Scenario: Step 3 — Optional payment registration toggle
- **WHEN** the admin toggles the "Registrar pago" checkbox on step 3
- **THEN** the system SHALL reveal `monto`, `metodo_pago_id`, and `estado_pago` fields; hiding the section SHALL clear those values

#### Scenario: Step 3 — Payment fields are required when payment section is open
- **WHEN** the payment section is expanded and the admin attempts to submit without entering `monto` or selecting `metodo_pago_id`
- **THEN** the system SHALL display inline validation errors for the missing fields and SHALL NOT submit

#### Scenario: Back navigation preserves entered values
- **WHEN** the admin navigates back from step 2 to step 1, or from step 3 to step 2
- **THEN** the previously entered values for the returned step SHALL still be populated

---

### Requirement: Admin creates subscription and optional payment via INSERT
The system SHALL insert a new row into `public.suscripciones` on behalf of the selected athlete. When the optional payment section is completed, the system SHALL also insert a row into `public.pagos` linked to the new subscription. Both operations SHALL use the browser Supabase client and be subject to the admin INSERT RLS policies.

#### Scenario: Subscription is created with correct atleta_id
- **WHEN** an admin submits the `CrearSuscripcionModal` with athlete A selected
- **THEN** the system SHALL insert a row into `suscripciones` with `atleta_id = A.usuario_id` (NOT the current admin's user ID)

#### Scenario: Active subscription sets validado_por to admin
- **WHEN** an admin submits with `estado = 'activa'`
- **THEN** the system SHALL set `suscripciones.validado_por` to the current authenticated admin's user ID

#### Scenario: Pago is created when payment section is completed
- **WHEN** an admin submits with the payment section open and valid `monto` and `metodo_pago_id`
- **THEN** the system SHALL insert a row into `pagos` with `suscripcion_id` referencing the newly created subscription, `tenant_id` matching the tenant, and the provided `monto`, `metodo_pago_id`, and `estado`

#### Scenario: Table refreshes after successful creation
- **WHEN** the subscription (and optional payment) are created successfully
- **THEN** the system SHALL close the modal and trigger a table refresh so the new subscription appears in the list

#### Scenario: Subscription creation failure is surfaced inline
- **WHEN** the INSERT into `suscripciones` fails (e.g., RLS denial or constraint violation)
- **THEN** the system SHALL display an inline error message inside the modal and SHALL NOT close it

#### Scenario: Payment creation failure is surfaced inline with subscription preserved
- **WHEN** the subscription INSERT succeeds but the payment INSERT fails
- **THEN** the system SHALL display an inline error message distinguishing the partial failure and SHALL close the modal (the subscription row will appear in the table without a payment)

---

### Requirement: Admin INSERT RLS policies for suscripciones and pagos
The database SHALL enforce RLS policies that allow authenticated users with `administrador` role in a tenant to INSERT new `suscripciones` and `pagos` rows scoped to that tenant. Existing athlete-scoped INSERT policies SHALL remain unaffected.

#### Scenario: Admin can insert a subscription for any tenant athlete
- **WHEN** an authenticated admin issues an INSERT on `public.suscripciones` with a `tenant_id` they administer
- **THEN** Supabase RLS SHALL permit the insert regardless of the `atleta_id` value

#### Scenario: Athlete cannot insert a subscription for another athlete
- **WHEN** an authenticated athlete issues an INSERT on `public.suscripciones` with an `atleta_id` different from their own `auth.uid()`
- **THEN** the existing `suscripciones_insert_own` policy SHALL deny the insert (only `atleta_id = auth.uid()` is allowed for athletes)

#### Scenario: Admin can insert a payment for any tenant subscription
- **WHEN** an authenticated admin issues an INSERT on `public.pagos` with a `tenant_id` they administer
- **THEN** Supabase RLS SHALL permit the insert

#### Scenario: Athlete cannot insert a payment for a subscription they do not own
- **WHEN** an authenticated athlete issues an INSERT on `public.pagos` for a `suscripcion_id` that does not belong to them
- **THEN** the existing `pagos_insert_own` policy SHALL deny the insert
