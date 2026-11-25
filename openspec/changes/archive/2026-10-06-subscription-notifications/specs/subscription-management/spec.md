## MODIFIED Requirements

### Requirement: Subscription request submission
On "Confirmar", the system SHALL create one `suscripciones` record and one linked `pagos` record through a single call to the `comprar_suscripcion` RPC. Both records MUST have `estado = 'pendiente'`. The payment's `monto` MUST be set by the server from the selected `plan_tipo.precio` (0 for a plan without subtypes). The creation MUST be atomic: either both records exist or neither does.

#### Scenario: Successful subscription request
- **WHEN** a `usuario` confirms a subscription request after selecting a subtype
- **THEN** a `suscripciones` row SHALL exist with `estado = 'pendiente'`, `atleta_id = auth.uid()`, `plan_id = selectedPlan.id` and `plan_tipo_id = selectedTipo.id`
- **THEN** a `pagos` row SHALL exist with `estado = 'pendiente'`, `suscripcion_id` referencing the new subscription and `monto = selectedTipo.precio`
- **THEN** the modal SHALL close and a success message SHALL be shown: _"Solicitud enviada. El administrador revisará tu suscripción."_

#### Scenario: Purchase fails
- **WHEN** the `comprarSuscripcion` call returns an error
- **THEN** the modal SHALL remain open and display an inline error message, and no `suscripciones` or `pagos` record SHALL exist

#### Scenario: Plan no longer available
- **WHEN** the RPC rejects the purchase with `PLAN_NO_DISPONIBLE` or `SUBTIPO_NO_DISPONIBLE`
- **THEN** the modal SHALL show "Este plan ya no está disponible. Actualiza la lista e inténtalo nuevamente."

#### Scenario: Pending request already exists
- **WHEN** the RPC rejects the purchase with `SUSCRIPCION_PENDIENTE_EXISTENTE`
- **THEN** the modal SHALL show "Ya tienes una solicitud pendiente para este plan."

#### Scenario: No orphan subscription
- **WHEN** the payment cannot be created
- **THEN** no `suscripciones` row SHALL remain
