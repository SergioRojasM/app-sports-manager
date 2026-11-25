# Spec Delta

## MODIFIED Requirements

### Requirement: Create and edit plan flows use a shared right-side modal
The system SHALL support create, edit, and duplicate plan workflows through a single right-side modal component that switches mode by state (`'create'`, `'edit'`, or `'duplicate'`), closes via backdrop click, close button, or `Esc` key when not submitting, and exposes submit and cancel controls with disabled and loading behavior during pending requests.

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

### Requirement: Subscription request modal
Clicking "Adquirir" SHALL open `SuscripcionModal` displaying a summary of the selected plan (name and benefits) and SHALL require the user to select a plan_tipo before proceeding, with "Confirmar" and "Cancelar" buttons.

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

### Requirement: Subscription request submission
On "Confirmar", the system SHALL create one `suscripciones` record and one linked `pagos` record, both with `estado = 'pendiente'`, through a single call to the `comprar_suscripcion` RPC using the selected `plan_tipo`, and the subscription SHALL store `plan_tipo_id`.

#### Scenario: Subscription created with tipo precio
- **WHEN** a user confirms a subscription request with a selected plan_tipo
- **THEN** the `pagos.monto` SHALL equal that subtype's `precio`, taken on the server

#### Scenario: No fallback to plan-level fields
- **WHEN** a subscription is submitted
- **THEN** the system SHALL NOT attempt to read `plan.precio` or `plan.clases_incluidas` as they no longer exist

#### Scenario: Successful subscription request with proof file
- **WHEN** a `usuario` confirms a subscription request with a valid proof file
- **THEN** the proof file SHALL be uploaded first
- **THEN** a `suscripciones` row SHALL exist with `estado = 'pendiente'`, `atleta_id = auth.uid()` and `plan_id = selectedPlan.id`
- **THEN** a `pagos` row SHALL exist with `estado = 'pendiente'`, `suscripcion_id` referencing the new subscription, `monto = selectedTipo.precio` and `comprobante_path` equal to the uploaded path
- **THEN** the modal SHALL close and a success message SHALL be shown: _"Solicitud enviada. El administrador revisará tu suscripción."_

#### Scenario: Successful subscription request without proof file
- **WHEN** a `usuario` confirms a subscription request without selecting a file
- **THEN** a `suscripciones` and a `pagos` row SHALL exist with `comprobante_path = null`
- **THEN** the modal SHALL close and a success message SHALL be shown

#### Scenario: Purchase fails
- **WHEN** the `comprarSuscripcion` call returns an error
- **THEN** the modal SHALL remain open and display an inline error message, and no `suscripciones` or `pagos` record SHALL exist

## ADDED Requirements

### Requirement: Plan modal titles and submit labels
The plan modal title SHALL read "Crear plan" in `'create'` mode, "Editar plan" in `'edit'` mode and "Duplicar plan" in `'duplicate'` mode; the submit button SHALL read "Crear plan" in `'create'` and `'duplicate'` modes and "Guardar cambios" in `'edit'` mode.

#### Scenario: Edit labels
- **WHEN** the modal opens in edit mode
- **THEN** the title SHALL read "Editar plan" and the submit button "Guardar cambios"

#### Scenario: Create labels
- **WHEN** the modal opens in create mode
- **THEN** the title and the submit button SHALL both read "Crear plan"

### Requirement: Subscription modal subtype details
`SuscripcionModal` SHALL display the selected plan_tipo's details — price, validity in days, and class quota or "Ilimitadas" — and SHALL NOT reference or fall back to plan-level `precio`, `vigencia_meses`, or `clases_incluidas` fields.

#### Scenario: Unlimited quota
- **WHEN** the selected plan_tipo has no class quota
- **THEN** the modal SHALL show "Ilimitadas"

### Requirement: Subscription modal comments and proof file
`SuscripcionModal` SHALL include an optional `comentarios` textarea and an optional `comprobante de pago` file input that accepts JPEG, PNG, WebP and PDF files of at most 5 MiB.

#### Scenario: Confirm without optional inputs
- **WHEN** the user selects a plan_tipo and leaves the comments and the proof file empty
- **THEN** "Confirmar" SHALL be enabled

### Requirement: Subscription payment amount set by the server
The payment's `monto` SHALL be set by the server from `plan_tipos.precio`; the system SHALL NOT fall back to plan-level `precio` or `clases_incluidas` fields.

#### Scenario: Client cannot choose the amount
- **WHEN** a subscription is submitted for a plan_tipo priced 120000
- **THEN** the created payment SHALL have `monto = 120000` regardless of any value held by the client

### Requirement: Proof file uploaded before the purchase call
If a proof file was selected, the system SHALL upload it to `orgs/{tenantId}/users/{userId}/receipts/{pagoId}.{ext}` before calling the RPC, with a payment id generated in the browser, and pass the resulting path so the payment is created with `comprobante_path` set. If no file was selected, or the upload failed, `comprobante_path` SHALL be `null`.

#### Scenario: Upload fails
- **WHEN** the proof upload fails
- **THEN** the purchase SHALL still be requested with `comprobante_path = null`

#### Scenario: Path uses the browser-generated payment id
- **WHEN** a PDF proof is uploaded for a payment id generated in the browser
- **THEN** it SHALL be stored at `orgs/{tenantId}/users/{userId}/receipts/{pagoId}.pdf` and the payment SHALL be created with that id and path
