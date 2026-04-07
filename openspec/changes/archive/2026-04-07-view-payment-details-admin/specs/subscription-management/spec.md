## ADDED Requirements

### Requirement: View payment details action in subscription table
Each subscription row in the admin table SHALL expose a "Ver Pago" action button whenever the row has an associated payment record (`pago !== null`), regardless of the payment's `estado`. Clicking the button SHALL open the `VerDetallePagoModal` in read-only mode without performing any data mutation.

#### Scenario: Ver Pago button is visible for rows with any payment status
- **WHEN** an administrator views the subscription table and a row has `pago !== null`
- **THEN** the row SHALL display a "Ver Pago" button regardless of whether `pago.estado` is `pendiente`, `validado`, or `rechazado`

#### Scenario: Ver Pago button is absent for rows without a payment
- **WHEN** an administrator views the subscription table and a row has `pago === null`
- **THEN** the row SHALL NOT display a "Ver Pago" button

#### Scenario: Clicking Ver Pago opens VerDetallePagoModal
- **WHEN** an administrator clicks the "Ver Pago" button on a subscription row
- **THEN** the system SHALL open `VerDetallePagoModal` pre-loaded with the row's `pago` and subscription context; no data write SHALL occur

#### Scenario: Existing Validar Pago button is unaffected
- **WHEN** a subscription row has `pago.estado === 'pendiente'`
- **THEN** both the "Validar Pago" button and the "Ver Pago" button SHALL be visible simultaneously; "Validar Pago" continues to open `ValidarPagoModal` with approve/reject actions
