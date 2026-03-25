## MODIFIED Requirements

### Requirement: Subscription request modal
Clicking "Adquirir" SHALL open `SuscripcionModal` displaying a summary of the selected plan (name, price, validity, included classes), an optional `comentarios` textarea, a `comprobante de pago` file input (accepts JPEG, PNG, WebP, PDF; max 5 MiB; optional), and "Confirmar" and "Cancelar" buttons. Selecting a valid file SHALL display the filename; selecting an invalid file SHALL show an inline error. The selected `File` object SHALL be passed to the `onConfirm` callback as `file: File | null`.

#### Scenario: Modal opens with plan summary
- **WHEN** a `usuario` clicks "Adquirir" on a plan row
- **THEN** `SuscripcionModal` SHALL open displaying the plan's name, price, validity period, and number of included classes

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

### Requirement: Subscription request submission
On "Confirmar", the system SHALL insert one `suscripciones` record and one linked `pagos` record. Both records MUST have `estado = 'pendiente'`. The `suscripciones` insert MUST snapshot `planes.clases_incluidas` into `clases_plan`. The `pagos` insert MUST capture `planes.precio` in `monto`. If a proof file was selected, the system SHALL upload it to `orgs/{tenantId}/users/{userId}/receipts/{pago.id}.{ext}` and patch `pagos.comprobante_url` with the resulting signed URL. If no file was selected, `comprobante_url` SHALL be `null`.

#### Scenario: Successful subscription request with proof file
- **WHEN** a `usuario` confirms a subscription request with a valid proof file
- **THEN** a `suscripciones` row SHALL be inserted with `estado = 'pendiente'`, `atleta_id = auth.uid()`, `plan_id = selectedPlan.id`, and `clases_plan = selectedPlan.clases_incluidas`
- **THEN** a `pagos` row SHALL be inserted with `estado = 'pendiente'`, `suscripcion_id` referencing the new subscription, and `monto = selectedPlan.precio`
- **THEN** the proof file SHALL be uploaded and `pagos.comprobante_url` SHALL be patched to the signed URL
- **THEN** the modal SHALL close and a success message SHALL be shown: _"Solicitud enviada. El administrador revisará tu suscripción."_

#### Scenario: Successful subscription request without proof file
- **WHEN** a `usuario` confirms a subscription request without selecting a file
- **THEN** a `suscripciones` and a `pagos` row SHALL be inserted with `comprobante_url = null`
- **THEN** the modal SHALL close and a success message SHALL be shown

#### Scenario: Subscription insert fails
- **WHEN** the `createSuscripcion` call returns an error
- **THEN** the modal SHALL remain open and display an inline error message without creating any records

#### Scenario: Payment insert fails after subscription insert succeeds
- **WHEN** `createSuscripcion` succeeds but `createPago` returns an error
- **THEN** an inline error message SHALL be shown inside the modal
- **THEN** the orphan `suscripciones` row with `estado = 'pendiente'` SHALL remain in the database
