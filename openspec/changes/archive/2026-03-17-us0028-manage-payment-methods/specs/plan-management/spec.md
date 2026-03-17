## ADDED Requirements

### Requirement: Subscription flow SHALL require a payment method before confirming
The system SHALL enforce that users select a payment method from the tenant's active methods before confirming a plan subscription. The `SuscripcionModal` SHALL delegate payment method display and selection to the `subscription-payment-method` capability. The `useSuscripcion` hook SHALL accept `metodo_pago_id` in its submit data type and pass it to `pagosService.createPago()`.

#### Scenario: Submit data type includes metodo_pago_id
- **WHEN** the user confirms a plan subscription
- **THEN** `useSuscripcion.submit` SHALL receive `{ comentarios: string; metodo_pago_id: string }` and SHALL include `metodo_pago_id` in the pago creation payload

#### Scenario: Subscription cannot be submitted without payment method
- **WHEN** `SuscripcionModal` is rendered with an empty active methods list or no selection made
- **THEN** the Confirm action SHALL be disabled and `useSuscripcion.submit` SHALL NOT be called
