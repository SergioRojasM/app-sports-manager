## MODIFIED Requirements

### Requirement: Validate payment action
Each subscription row SHALL expose a "Validate Payment" action that opens a modal pre-populated with the full subscription and payment detail. The modal SHALL allow the administrator to approve or reject the payment. Rejecting a payment SHALL require the administrator to enter a non-empty reason before the rejection can be submitted.

#### Scenario: Modal opens with full payment detail
- **WHEN** an administrator clicks "Validate Payment" for a row
- **THEN** the system SHALL open a modal displaying all subscription fields (athlete info, plan info, subscription status, dates, classes) and all payment fields (amount, method, receipt URL as a clickable link, current status, registered date)

#### Scenario: Administrator approves a payment
- **WHEN** the administrator confirms approval in the validate payment modal
- **THEN** the system SHALL update `pagos.estado = 'validado'`, set `pagos.validado_por` to the current authenticated user's ID, set `pagos.fecha_validacion` to the current timestamp, and refresh the table row to reflect the new state

#### Scenario: Administrator rejects a payment with a required reason
- **WHEN** the administrator enters a rejection reason and confirms rejection in the validate payment modal
- **THEN** the system SHALL update `pagos.estado = 'rechazado'` and `pagos.motivo_rechazo` to the entered reason, and refresh the table row to reflect the new state

#### Scenario: Rejection is blocked without a reason
- **WHEN** the administrator attempts to confirm rejection without entering a reason
- **THEN** the system SHALL prevent submission and display an inline validation message; `pagos.estado` SHALL NOT be changed

#### Scenario: Modal closes without action on dismiss
- **WHEN** the administrator closes the modal without submitting
- **THEN** the system SHALL not modify any database records

---

## ADDED Requirements

### Requirement: Rejected payment reason is visible to the athlete
The athlete-facing payment view (`PagoCard`) SHALL display `pagos.motivo_rechazo` whenever `pagos.estado = 'rechazado'` and the field is non-null, so the athlete understands why the payment was rejected before resubmitting.

#### Scenario: Athlete sees the rejection reason on a rejected payment
- **WHEN** an athlete views a payment card whose `estado` is `rechazado` and has a `motivo_rechazo`
- **THEN** the card SHALL display that reason alongside the rejected status badge

---

### Requirement: Resubmitting a rejected payment proof re-enters the review queue
When an athlete resubmits a payment proof on a `pagos` row whose `estado` is `rechazado` (via the existing "Resubir comprobante" action), the system SHALL, in addition to replacing `comprobante_path`, reset `pagos.estado` to `pendiente`.

#### Scenario: Resubmission resets the payment to pendiente
- **WHEN** an athlete uploads a new comprobante on a `rechazado` payment
- **THEN** `pagos.comprobante_path` SHALL be updated to the new file's path and `pagos.estado` SHALL be set to `pendiente`, making the payment reappear in the admin's pending-review queue
