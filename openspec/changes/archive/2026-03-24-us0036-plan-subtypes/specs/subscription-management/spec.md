## ADDED Requirements

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

## MODIFIED Requirements

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
