## ADDED Requirements

### Requirement: Payment method snapshot includes the QR image
`EventoMetodoPagoSnapshot` SHALL have an optional `qr_url?: string | null`. When the administrator selects a payment method in step 3, the snapshot stored in the event's `metodos_pago` SHALL copy the method's current `qr_url` (or `null`). Each selectable method card that has `qr_url` SHALL show the "QR" indicator. Snapshots saved before this change SHALL remain valid without the key, and `guardar_evento_completo` SHALL NOT change.

#### Scenario: Selecting a method with a QR image
- **WHEN** the administrator selects a payment method with `qr_url` and saves the event
- **THEN** the event's `metodos_pago` element for that method SHALL contain the same `qr_url`

#### Scenario: Selecting a method without a QR image
- **WHEN** the administrator selects a payment method without `qr_url` and saves the event
- **THEN** the snapshot element SHALL have `qr_url` null and the save SHALL succeed

#### Scenario: Existing event is not backfilled
- **WHEN** a QR image is added to a payment method already selected in a saved event
- **THEN** the saved event's snapshot SHALL remain unchanged until the administrator saves the event again with that method selected

#### Scenario: QR indicator in the step
- **WHEN** step 3 lists an active payment method with `qr_url`
- **THEN** its card SHALL show the "QR" indicator
