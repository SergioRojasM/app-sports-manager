## ADDED Requirements

### Requirement: Subscription modal SHALL display active payment methods for the tenant
The system SHALL fetch and present the tenant's active (`activo = true`) payment methods inside `SuscripcionModal`, ordered by `orden ASC, nombre ASC`. The methods SHALL be loaded when the modal opens, concurrently with the existing duplicate-subscription check.

#### Scenario: Active methods are available when modal opens
- **WHEN** a user opens the subscription modal for a plan
- **THEN** the system SHALL display a dropdown populated with the tenant's active payment methods, each showing its `nombre`

#### Scenario: No active payment methods available
- **WHEN** a user opens the subscription modal and the tenant has no active payment methods
- **THEN** the system SHALL display an informational message: "Esta organización no ha configurado métodos de pago. Contacta al administrador." and the Confirm button SHALL be disabled

#### Scenario: Methods fetch fails on modal open
- **WHEN** the active payment methods fetch fails while opening the modal
- **THEN** the system SHALL treat the methods list as empty and SHALL display the no-methods message; the failure SHALL NOT prevent the modal from opening

### Requirement: Payment method selection SHALL be required before confirming subscription
The system SHALL require the user to select a payment method from the dropdown before the Confirm button becomes active. Submitting without a selection SHALL NOT be possible.

#### Scenario: Confirm button disabled without selection
- **WHEN** the subscription modal is open and no payment method has been selected
- **THEN** the Confirm button SHALL be disabled

#### Scenario: Confirm button enabled after selection
- **WHEN** the user selects a payment method from the dropdown
- **THEN** the Confirm button SHALL become active (provided no other blocking conditions exist, such as a duplicate subscription)

#### Scenario: Selected method details are displayed below the dropdown
- **WHEN** the user selects a payment method
- **THEN** the system SHALL display the selected method's `valor` (if non-null), `url` as a clickable link opening in a new tab (if non-null), and `comentarios` as helper text (if non-null)

### Requirement: Selected payment method SHALL be persisted when creating the pago record
The system SHALL include the `metodo_pago_id` of the selected method in the payload when creating the `pagos` record linked to the new subscription. The value SHALL be stored in the `pagos.metodo_pago_id` FK column.

#### Scenario: pago record captures metodo_pago_id on successful subscription
- **WHEN** the user confirms a subscription with a selected payment method
- **THEN** the system SHALL create the `pagos` row with `metodo_pago_id` set to the selected method's `id`

#### Scenario: pagos row is created with metodo_pago_id on successful flow
- **WHEN** the subscription and pago creation succeed
- **THEN** the system SHALL show the existing success message and close the modal, and the `pagos` row SHALL have `metodo_pago_id` populated

### Requirement: `pagos` table SHALL store a typed FK reference to `tenant_metodos_pago`
The system's database SHALL include a `metodo_pago_id uuid` column on `pagos`, implemented as a foreign key referencing `tenant_metodos_pago(id)` with `ON DELETE SET NULL`. The legacy `pagos_metodo_pago_ck` constraint SHALL be dropped. The legacy `metodo_pago varchar` column SHALL be kept but new code SHALL NOT write to it.

#### Scenario: Deleting a payment method does not remove historical pago records
- **WHEN** an administrator deletes a payment method that was previously selected for one or more pagos
- **THEN** the corresponding `pagos` rows SHALL retain all their other fields and `metodo_pago_id` SHALL be set to NULL via ON DELETE SET NULL

#### Scenario: New pagos rows do not populate the legacy metodo_pago column
- **WHEN** a new `pagos` row is inserted by the subscription flow
- **THEN** the `metodo_pago varchar` column SHALL be NULL or absent from the insert payload
