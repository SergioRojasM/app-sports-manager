## ADDED Requirements

### Requirement: Admin subscription management page
The system SHALL provide a tenant-scoped subscription management screen at `/portal/orgs/[tenant_id]/gestion-suscripciones` accessible only to authenticated users with `administrador` role in the requested tenant. The route page entrypoint SHALL only compose feature components and MUST NOT perform direct data-access calls.

#### Scenario: Administrator accesses the module
- **WHEN** an authenticated user with `administrador` role navigates to `/portal/orgs/[tenant_id]/gestion-suscripciones`
- **THEN** the system SHALL render the subscription management page for the given tenant

#### Scenario: Non-administrator is denied access
- **WHEN** an authenticated user with `usuario` or `entrenador` role attempts to access `/portal/orgs/[tenant_id]/gestion-suscripciones` directly
- **THEN** the system SHALL redirect the user away from the page without rendering any subscription data

---

### Requirement: Subscription list with joined athlete, plan, and payment data
The system SHALL fetch all subscriptions belonging to the active tenant in a single joined query that includes the athlete's name and email (from `usuarios`), the plan name and `vigencia_meses` (from `planes`), and the latest payment record (from `pagos`) for each subscription. The result SHALL be displayed in a tabular layout.

#### Scenario: Subscriptions are loaded on page mount
- **WHEN** an administrator lands on the subscription management page
- **THEN** the system SHALL display all tenant subscriptions with the following columns: athlete name, athlete email, plan name, subscription status badge, start date, end date, classes remaining, payment status badge, payment method, payment amount, and request date

#### Scenario: Page shows loading state while fetching
- **WHEN** the initial data fetch is in progress
- **THEN** the system SHALL display a loading indicator and MUST NOT render stale or partial rows

#### Scenario: Empty state when no subscriptions exist
- **WHEN** the tenant has no subscription records
- **THEN** the system SHALL display an empty state message and SHALL NOT show the table

#### Scenario: Error state on fetch failure
- **WHEN** the data fetch fails (e.g., network error or RLS denial)
- **THEN** the system SHALL display an error message with a retry action

---

### Requirement: Subscription statistics cards
The system SHALL display three summary cards derived from the in-memory subscription list without issuing additional database queries.

#### Scenario: Active subscriptions count
- **WHEN** subscription data is loaded
- **THEN** the system SHALL display a card showing the count of subscriptions where `estado = 'activa'`

#### Scenario: Pending subscriptions count
- **WHEN** subscription data is loaded
- **THEN** the system SHALL display a card showing the count of subscriptions where `estado = 'pendiente'`

#### Scenario: Subscriptions with pending payment count
- **WHEN** subscription data is loaded
- **THEN** the system SHALL display a card showing the count of subscriptions whose linked payment has `estado = 'pendiente'`

---

### Requirement: Search and quick-filter controls
The system SHALL provide a free-text search input and quick-filter chips that filter the displayed rows client-side without additional database queries.

#### Scenario: Free-text search filters by athlete name, plan name, or subscription ID
- **WHEN** an administrator types in the search input
- **THEN** the system SHALL filter rows to those where the athlete's full name, plan name, or subscription ID (partial UUID match) contains the search term (case-insensitive)

#### Scenario: Subscription status chip filters rows
- **WHEN** an administrator selects a subscription status chip (All / Pending / Active / Expired / Cancelled)
- **THEN** the system SHALL display only rows matching the selected `suscripciones.estado` value

#### Scenario: Payment status chip filters rows
- **WHEN** an administrator selects a payment status chip (All / Pending / Validated / Rejected)
- **THEN** the system SHALL display only rows matching the linked `pagos.estado` value

#### Scenario: Search and chips combine as AND filters
- **WHEN** both a search term and a status chip are active simultaneously
- **THEN** the system SHALL display only rows that satisfy both conditions

---

### Requirement: Validate payment action
Each subscription row SHALL expose a "Validate Payment" action that opens a modal pre-populated with the full subscription and payment detail. The modal SHALL allow the administrator to approve or reject the payment.

#### Scenario: Modal opens with full payment detail
- **WHEN** an administrator clicks "Validate Payment" for a row
- **THEN** the system SHALL open a modal displaying all subscription fields (athlete info, plan info, subscription status, dates, classes) and all payment fields (amount, method, receipt URL as a clickable link, current status, registered date)

#### Scenario: Administrator approves a payment
- **WHEN** the administrator confirms approval in the validate payment modal
- **THEN** the system SHALL update `pagos.estado = 'validado'`, set `pagos.validado_por` to the current authenticated user's ID, set `pagos.fecha_validacion` to the current timestamp, and refresh the table row to reflect the new state

#### Scenario: Administrator rejects a payment
- **WHEN** the administrator confirms rejection in the validate payment modal
- **THEN** the system SHALL update `pagos.estado = 'rechazado'` and refresh the table row to reflect the new state

#### Scenario: Modal closes without action on dismiss
- **WHEN** the administrator closes the modal without submitting
- **THEN** the system SHALL not modify any database records

---

### Requirement: Validate subscription action
Each subscription row SHALL expose a "Validate Subscription" action that opens a modal pre-populated with computed approval defaults that the administrator MAY override before confirming.

#### Scenario: Modal opens with pre-computed default values
- **WHEN** an administrator clicks "Validate Subscription" for a row
- **THEN** the system SHALL open a modal pre-populating `fecha_inicio` with today's date (if currently null), `fecha_fin` calculated as `fecha_inicio + vigencia_meses months`, and `clases_restantes` from `clases_plan` (if currently null); all three fields SHALL be editable by the administrator before submission

#### Scenario: Administrator approves a subscription
- **WHEN** the administrator confirms approval with the (optionally adjusted) values
- **THEN** the system SHALL update `suscripciones.estado = 'activa'`, persist the confirmed `fecha_inicio`, `fecha_fin`, and `clases_restantes` values, and refresh the table row to reflect the new state

#### Scenario: Administrator cancels a subscription
- **WHEN** the administrator confirms cancellation in the validate subscription modal
- **THEN** the system SHALL update `suscripciones.estado = 'cancelada'` and refresh the table row to reflect the new state

#### Scenario: Modal closes without action on dismiss
- **WHEN** the administrator closes the modal without submitting
- **THEN** the system SHALL not modify any database records

---

### Requirement: Admin RLS policies for suscripciones and pagos
The database SHALL enforce RLS policies that allow authenticated users with `administrador` role in a tenant to SELECT, UPDATE, and DELETE `suscripciones` rows scoped to that tenant, and to SELECT and UPDATE `pagos` rows scoped to that tenant. Existing athlete-scoped policies SHALL remain unaffected. A dedicated `suscripciones_delete_admin` policy SHALL be created granting tenant-scoped DELETE permission to the `authenticated` role, and the `authenticated` role SHALL be granted the `DELETE` privilege on `public.suscripciones`.

#### Scenario: Admin can read all tenant subscriptions
- **WHEN** an administrator issues a SELECT on `public.suscripciones` filtered by their admin tenant IDs
- **THEN** Supabase RLS SHALL allow the query to return all matching rows regardless of `atleta_id`

#### Scenario: Admin can update subscription estado
- **WHEN** an administrator issues an UPDATE on `public.suscripciones` for a row in their admin tenant
- **THEN** Supabase RLS SHALL permit the update

#### Scenario: Admin can delete a scoped subscription
- **WHEN** an administrator issues a DELETE on `public.suscripciones` for a row whose `tenant_id` belongs to a tenant they administer
- **THEN** Supabase RLS SHALL permit the deletion via the `suscripciones_delete_admin` policy

#### Scenario: Admin cannot delete a subscription from a foreign tenant
- **WHEN** an administrator issues a DELETE on `public.suscripciones` for a row whose `tenant_id` does NOT belong to a tenant they administer
- **THEN** Supabase RLS SHALL deny the deletion and return zero affected rows

#### Scenario: Admin can read and update payment records
- **WHEN** an administrator issues a SELECT or UPDATE on `public.pagos` for records in their admin tenant
- **THEN** Supabase RLS SHALL permit the operation

#### Scenario: Athlete policies are unaffected
- **WHEN** an athlete issues a SELECT on `public.suscripciones`
- **THEN** RLS SHALL only return rows where `atleta_id = auth.uid()`, unchanged from pre-US-0020 behavior

---

## ADDED Requirements

### Requirement: Admin can edit all fields of an existing subscription
The system SHALL allow an authenticated user with `administrador` role to edit any field of an existing tenant subscription through a right-side modal form (`EditarSuscripcionModal`). The editable fields are `plan_id`, `estado`, `fecha_inicio`, `fecha_fin`, `clases_restantes`, `clases_plan`, and `comentarios`. On successful save the modal SHALL close and the subscription table SHALL refresh to reflect the updated values.

#### Scenario: Editar button is present for every row regardless of status
- **WHEN** an administrator views the subscription table
- **THEN** each row SHALL display an "Editar" action button regardless of the subscription's `estado`

#### Scenario: Modal opens pre-populated with current subscription values
- **WHEN** an administrator clicks "Editar" for a subscription row
- **THEN** the system SHALL open `EditarSuscripcionModal` with all editable fields pre-populated with the subscription's current values

#### Scenario: Plan selector loads active plans for the tenant
- **WHEN** `EditarSuscripcionModal` opens
- **THEN** the `plan_id` select field SHALL be populated with the list of active plans for the current tenant

#### Scenario: Date validation prevents invalid ranges
- **WHEN** the administrator submits the edit form with `fecha_fin` earlier than or equal to `fecha_inicio` (both non-null)
- **THEN** the system SHALL display an inline validation error and SHALL NOT submit the request

#### Scenario: Successful edit closes modal and refreshes table
- **WHEN** the administrator submits valid values in `EditarSuscripcionModal`
- **THEN** the system SHALL call `editarSuscripcion`, close the modal on success, and trigger a table refresh to show the updated subscription data

#### Scenario: Service error is displayed inline
- **WHEN** the `editarSuscripcion` service call fails
- **THEN** the system SHALL display the error message inline in the modal and SHALL NOT close it

#### Scenario: Submit button is disabled while submission is in progress
- **WHEN** the administrator submits `EditarSuscripcionModal` and the request is pending
- **THEN** all action buttons in the modal SHALL be disabled to prevent double-submit

---

### Requirement: Admin can permanently delete a subscription
The system SHALL allow an authenticated user with `administrador` role to permanently delete an existing tenant subscription through a confirmation dialog (`EliminarSuscripcionModal`). Deletion SHALL cascade to the subscription's associated `pagos` records via the existing `pagos.suscripcion_id → suscripciones.id ON DELETE CASCADE` foreign key constraint. On successful deletion the dialog SHALL close and the subscription table SHALL refresh.

#### Scenario: Eliminar button is present for every row regardless of status
- **WHEN** an administrator views the subscription table
- **THEN** each row SHALL display an "Eliminar" action button regardless of the subscription's `estado`

#### Scenario: Confirmation dialog shows athlete and plan names
- **WHEN** an administrator clicks "Eliminar" for a subscription row
- **THEN** the system SHALL open `EliminarSuscripcionModal` showing the athlete's full name and the plan name to confirm the target record

#### Scenario: Confirming deletion removes subscription and cascades to payments
- **WHEN** the administrator confirms deletion in `EliminarSuscripcionModal`
- **THEN** the system SHALL call `eliminarSuscripcion`, which issues a DELETE on `public.suscripciones` for that record; RLS and the FK CASCADE SHALL ensure only tenant-scoped records are deleted and all linked `pagos` rows are removed automatically

#### Scenario: Table refreshes after successful deletion
- **WHEN** the `eliminarSuscripcion` service call completes successfully
- **THEN** the dialog SHALL close and the subscription table SHALL refresh to no longer show the deleted row

#### Scenario: Service error is displayed inline in the confirmation dialog
- **WHEN** the `eliminarSuscripcion` service call fails
- **THEN** the system SHALL display the error message inline in `EliminarSuscripcionModal` and SHALL NOT close it

#### Scenario: Confirm button is disabled while deletion is in progress
- **WHEN** the administrator confirms deletion and the request is pending
- **THEN** all action buttons in `EliminarSuscripcionModal` SHALL be disabled to prevent double-submit

#### Scenario: Cancelling dialog makes no database change
- **WHEN** the administrator closes `EliminarSuscripcionModal` without confirming
- **THEN** the system SHALL not issue any DELETE call and the subscription record SHALL remain unchanged

---

### Requirement: clases_restantes is system-managed and read-only in admin UI
The `clases_restantes` column on any admin subscription table or edit form SHALL be rendered as read-only. Administrators MUST NOT be able to override this value via the subscription management UI; it is exclusively managed by the `book_and_deduct_class` and `cancel_and_restore_class` RPCs. The displayed value MUST always reflect the latest value from the database (no optimistic local decrement/increment).

#### Scenario: Subscription list shows current class balance
- **WHEN** an admin views the subscription list for a tenant
- **THEN** each row with a class-based plan displays the current `clases_restantes` value as returned by the `suscripciones` query; no stale cached value is shown

#### Scenario: Admin cannot edit clases_restantes via UI
- **WHEN** an admin opens the edit form for a subscription
- **THEN** the `clases_restantes` field (if visible) is displayed as a read-only label or disabled input; no form submission includes a `clases_restantes` write

#### Scenario: Subscription with NULL clases_restantes labelled as unlimited
- **WHEN** an admin views a subscription associated with an unlimited plan (`clases_restantes IS NULL`)
- **THEN** the class balance column displays "Ilimitado" (or equivalent) instead of a numeric value or blank

---

### Requirement: Athlete-facing class balance visibility
The athlete home or subscription view SHALL display `clases_restantes` for each active subscription with a class-based plan so the athlete can self-serve their remaining class balance before attempting to book.

#### Scenario: Athlete sees remaining class count on active subscription card
- **WHEN** an athlete with an active class-based subscription views their subscription section (e.g., `InicioSuscripciones` component)
- **THEN** each subscription card or row shows "X clases restantes" where X is the current `clases_restantes` value

#### Scenario: Zero balance displayed with warning style
- **WHEN** `clases_restantes = 0` for an active subscription
- **THEN** the balance is displayed with a visual warning (e.g., red text or warning icon) to alert the athlete that no classes remain

#### Scenario: Unlimited plan hides class counter
- **WHEN** an athlete's active subscription has `clases_restantes IS NULL`
- **THEN** no class counter is shown; the subscription card does not display "Ilimitado" as a balance label to avoid confusion with numeric values

---

### Requirement: Subscription modal presents a subtype selection step before payment
The `SuscripcionModal` SHALL implement a two-step flow. **Step 1** shows the active subtypes of the selected plan as selectable cards. **Step 2** shows the existing payment method and comment fields. The modal SHALL start on Step 1 whenever it opens. The "Continuar" CTA on Step 1 SHALL be disabled until a subtype is selected.

#### Scenario: Modal opens on Step 1 — subtype selection
- **WHEN** a `usuario` clicks "Adquirir" on a plan row
- **THEN** `SuscripcionModal` SHALL open displaying Step 1 with a list of selectable subtype cards for that plan's active subtypes

#### Scenario: Each subtype card shows its details
- **WHEN** Step 1 is rendered
- **THEN** each selectable card SHALL display the subtype's `nombre`, `precio`, `vigencia_dias`, and `clases_incluidas`

#### Scenario: Continuar is disabled until a subtype is selected
- **WHEN** Step 1 is rendered and no subtype card is selected
- **THEN** the "Continuar" button SHALL be disabled

#### Scenario: Selecting a subtype enables Continuar
- **WHEN** the user taps a subtype card
- **THEN** that card SHALL be marked as selected and the "Continuar" button SHALL be enabled

#### Scenario: Advancing to Step 2 updates the modal title
- **WHEN** the user clicks "Continuar" on Step 1
- **THEN** the modal SHALL advance to Step 2 and the title SHALL read _"Suscribirse a [Plan Name] — [Subtype Name]"_

#### Scenario: Step 2 renders the existing payment method and comment fields
- **WHEN** Step 2 is rendered
- **THEN** the modal SHALL display the payment method selector, optional `comentarios` textarea, and `comprobante de pago` file input, unchanged from the pre-US-0036 behavior

---

### Requirement: Subscription submission persists plan_tipo_id and subtype-derived clases_plan
When the user confirms on Step 2, the system SHALL create the subscription with `plan_tipo_id` set to the selected subtype's id. The `clases_plan` snapshot SHALL be sourced from the selected subtype's `clases_incluidas`, not from `planes.clases_incluidas`.

#### Scenario: Successful subscription stores plan_tipo_id
- **WHEN** a `usuario` confirms a subscription request after selecting a subtype
- **THEN** the inserted `suscripciones` row SHALL have `plan_tipo_id` equal to the selected subtype's id

#### Scenario: clases_plan snapshots subtype clases_incluidas
- **WHEN** a `usuario` confirms a subscription request after selecting a subtype
- **THEN** the inserted `suscripciones` row SHALL have `clases_plan` equal to the selected subtype's `clases_incluidas` at that moment

#### Scenario: Subscription insert fails — modal remains open with error
- **WHEN** the `createSuscripcion` call returns an error during step 2 submission
- **THEN** the modal SHALL remain open on Step 2 and display an inline error message; no records SHALL be created

---

### Requirement: useSuscripcion hook tracks selected subtype
The `useSuscripcion` hook SHALL maintain `selectedTipoId: string | null` state. It SHALL expose a `selectTipo(id: string)` action. On submit, the hook SHALL validate that `selectedTipoId` is non-null and resolve the corresponding `PlanTipo` object from the selected plan's embedded `plan_tipos` array to supply `clases_plan` and `plan_tipo_id` to the service call.

#### Scenario: Submitting without a selected subtype is blocked
- **WHEN** `useSuscripcion.submit` is called without `selectedTipoId` set
- **THEN** the hook SHALL not call the service and SHALL set an error state: _"Debes seleccionar un subtipo."_

#### Scenario: Closing the modal resets selectedTipoId
- **WHEN** the modal is closed (via cancel, backdrop, or success)
- **THEN** `selectedTipoId` SHALL be reset to `null`

---

### Requirement: Subscription request submission
On "Confirmar", the system SHALL insert one `suscripciones` record and one linked `pagos` record. Both records MUST have `estado = 'pendiente'`. The `suscripciones` insert MUST snapshot the selected `plan_tipo.clases_incluidas` into `clases_plan`. The `pagos` insert MUST capture `plan_tipo.precio` in `monto` (falling back to `planes.precio` if the subtype has no `precio`) and set `comprobante_url = null`.

#### Scenario: Successful subscription request
- **WHEN** a `usuario` confirms a subscription request after selecting a subtype
- **THEN** a `suscripciones` row SHALL be inserted with `estado = 'pendiente'`, `atleta_id = auth.uid()`, `plan_id = selectedPlan.id`, `plan_tipo_id = selectedTipo.id`, and `clases_plan = selectedTipo.clases_incluidas`
- **THEN** a `pagos` row SHALL be inserted with `estado = 'pendiente'`, `suscripcion_id` referencing the new subscription, `monto = selectedTipo.precio ?? selectedPlan.precio`, and `comprobante_url = null`
- **THEN** the modal SHALL close and a success message SHALL be shown: _"Solicitud enviada. El administrador revisará tu suscripción."_

#### Scenario: Subscription insert fails
- **WHEN** the `createSuscripcion` call returns an error
- **THEN** the modal SHALL remain open and display an inline error message without creating any records

#### Scenario: Payment insert fails after subscription insert succeeds
- **WHEN** `createSuscripcion` succeeds but `createPago` returns an error
- **THEN** an inline error message SHALL be shown inside the modal
- **THEN** the orphan `suscripciones` row with `estado = 'pendiente'` SHALL remain in the database
