## MODIFIED Requirements

### Requirement: Subscription modal presents a subtype selection step before payment
The `SuscripcionModal` SHALL implement a two-step flow. **Step 1** shows the active subtypes of the selected plan as selectable cards. **Step 2** shows the existing payment method and comment fields. The modal SHALL start on Step 1 only when the selected plan has **more than one** active subtype; when the plan has exactly one active subtype, the modal SHALL start directly on Step 2 with that subtype already selected, and Step 1 SHALL never be shown for that plan. The "Continuar" CTA on Step 1 SHALL be disabled until a subtype is selected.

#### Scenario: Modal opens on Step 1 — subtype selection, multiple subtypes
- **WHEN** a `usuario` clicks "Adquirir" on a plan that has two or more active subtypes
- **THEN** `SuscripcionModal` SHALL open displaying Step 1 with a list of selectable subtype cards for that plan's active subtypes

#### Scenario: Modal opens on Step 2 directly — single subtype
- **WHEN** a `usuario` clicks "Adquirir" on a plan that has exactly one active subtype
- **THEN** `SuscripcionModal` SHALL open displaying Step 2 (payment) directly, with that subtype already selected, and Step 1 SHALL not be rendered at any point during that session

#### Scenario: Each subtype card shows its details
- **WHEN** Step 1 is rendered
- **THEN** each selectable card SHALL display the subtype's `nombre`, `precio`, `vigencia_dias`, and granted `servicios`

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
- **THEN** the modal SHALL display the payment method selector, optional `comentarios` textarea, and `comprobante de pago` file input, unchanged from prior behavior

#### Scenario: Volver button hidden when there was no subtype choice to make
- **WHEN** Step 2 is rendered for a plan that had exactly one active subtype (so Step 1 was skipped)
- **THEN** the "Volver" button SHALL NOT be rendered in Step 2's footer

#### Scenario: Volver button shown when a subtype choice was made
- **WHEN** Step 2 is rendered after the user advanced from Step 1 on a plan with two or more active subtypes
- **THEN** the "Volver" button SHALL be rendered and SHALL return the modal to Step 1

---

### Requirement: useSuscripcion hook tracks selected subtype
The `useSuscripcion` hook SHALL maintain `selectedTipoId: string | null` state. It SHALL expose a `selectTipo(id: string)` action. When `openModal(plan)` is called, the hook SHALL compute the plan's active subtypes and, if there is exactly one, SHALL set `selectedTipoId` to that subtype's id immediately (instead of `null`); for zero or more than one active subtypes, `selectedTipoId` SHALL be reset to `null` as before. On submit, the hook SHALL validate that `selectedTipoId` is non-null and resolve the corresponding `PlanTipo` object from the selected plan's embedded `plan_tipos` array to supply `plan_tipo_id` (and the subtype's `precio` for the linked payment) to the service call.

#### Scenario: Opening the modal auto-selects a plan's sole active subtype
- **WHEN** `openModal(plan)` is called for a plan with exactly one active subtype
- **THEN** `selectedTipoId` SHALL be set to that subtype's id before the modal is shown as open

#### Scenario: Opening the modal does not auto-select when there are multiple subtypes
- **WHEN** `openModal(plan)` is called for a plan with two or more active subtypes
- **THEN** `selectedTipoId` SHALL be reset to `null`, unchanged from prior behavior

#### Scenario: Opening the modal does not auto-select when there are no subtypes
- **WHEN** `openModal(plan)` is called for a plan with zero active subtypes
- **THEN** `selectedTipoId` SHALL be reset to `null`, unchanged from prior behavior

#### Scenario: Submitting without a selected subtype is blocked
- **WHEN** `useSuscripcion.submit` is called without `selectedTipoId` set and the plan has one or more active subtypes
- **THEN** the hook SHALL not call the service and SHALL set an error state: _"Selecciona un subtipo de plan antes de continuar."_

#### Scenario: Closing the modal resets selectedTipoId
- **WHEN** the modal is closed (via cancel, backdrop, or success)
- **THEN** `selectedTipoId` SHALL be reset to `null`
