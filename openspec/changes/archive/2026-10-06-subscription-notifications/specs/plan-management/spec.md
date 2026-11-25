## MODIFIED Requirements

### Requirement: Subscription request submission
On "Confirmar", the system SHALL create one `suscripciones` record and one linked `pagos` record through a single call to the `comprar_suscripcion` RPC, using the selected `plan_tipo`. Both records MUST have `estado = 'pendiente'`. The subscription SHALL store `plan_tipo_id`. The payment's `monto` SHALL be set by the server from `plan_tipos.precio`; the system SHALL NOT fall back to plan-level `precio` or `clases_incluidas` fields. If a proof file was selected, the system SHALL upload it to `orgs/{tenantId}/users/{userId}/receipts/{pagoId}.{ext}` **before** calling the RPC, with a payment id generated in the browser, and pass the resulting path so the payment is created with `comprobante_path` set. If no file was selected, or the upload failed, `comprobante_path` SHALL be `null`.

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
