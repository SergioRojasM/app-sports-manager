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

### Requirement: RLS policies for suscripciones and pagos
Authenticated users SHALL be able to INSERT a `suscripciones` row only when `atleta_id = auth.uid()`. Authenticated users SHALL be able to SELECT only their own `suscripciones` rows (where `atleta_id = auth.uid()`). Authenticated users SHALL be able to INSERT a `pagos` row only when the linked `suscripcion_id` belongs to a subscription they own.

#### Scenario: User inserts own subscription
- **WHEN** an authenticated user inserts a `suscripciones` row with `atleta_id = auth.uid()`
- **THEN** the insert SHALL succeed

#### Scenario: User cannot insert subscription for another user
- **WHEN** an authenticated user attempts to insert a `suscripciones` row with `atleta_id` different from `auth.uid()`
- **THEN** the insert SHALL be rejected by RLS

#### Scenario: User selects only own subscriptions
- **WHEN** an authenticated user queries `public.suscripciones`
- **THEN** only rows where `atleta_id = auth.uid()` SHALL be returned

#### Scenario: User inserts payment linked to own subscription
- **WHEN** an authenticated user inserts a `pagos` row with `suscripcion_id` referencing a subscription owned by `auth.uid()`
- **THEN** the insert SHALL succeed

#### Scenario: User cannot insert payment for another user's subscription
- **WHEN** an authenticated user attempts to insert a `pagos` row with `suscripcion_id` referencing a subscription not owned by `auth.uid()`
- **THEN** the insert SHALL be rejected by RLS
