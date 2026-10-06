## MODIFIED Requirements

### Requirement: Selected payment method SHALL be persisted when creating the pago record
The system SHALL pass the `metodo_pago_id` of the selected method to the `comprar_suscripcion` RPC, which SHALL store it in the `pagos.metodo_pago_id` FK column of the new payment. The RPC SHALL reject a method that is not an active `tenant_metodos_pago` row of the purchase's tenant with `METODO_PAGO_INVALIDO`.

#### Scenario: pago record captures metodo_pago_id on successful subscription
- **WHEN** the user confirms a subscription with a selected payment method
- **THEN** the system SHALL create the `pagos` row with `metodo_pago_id` set to the selected method's `id`

#### Scenario: pagos row is created with metodo_pago_id on successful flow
- **WHEN** the purchase succeeds
- **THEN** the system SHALL show the existing success message and close the modal, and the `pagos` row SHALL have `metodo_pago_id` populated

#### Scenario: Method deactivated while the modal is open
- **WHEN** the selected method was deactivated or deleted before the user confirms
- **THEN** the purchase SHALL fail without creating any record and the modal SHALL show "El método de pago seleccionado ya no está disponible. Elige otro."
