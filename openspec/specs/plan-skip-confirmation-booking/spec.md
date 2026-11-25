# Capability: plan-skip-confirmation-booking

## Purpose
Allows trainers to publish public trainings with an optional toggle that permits athletes to book without having a required plan/subscription upfront, automatically creating a pending subscription if needed. This streamlines the booking flow for gate-behind-plan trainings while maintaining all other access controls and allowing admins to review pending bookings and subscriptions.
## Requirements
### Requirement: rechazada reservation state
`reservas.estado` SHALL accept a new value `rechazada`, in addition to the existing `pendiente`, `confirmada`, `cancelada`, `completada`. `reservas` SHALL gain a nullable `motivo_rechazo` column holding a reason visible to the athlete who made the booking.

#### Scenario: rechazada is a valid persisted state
- **WHEN** a `reservas` row is updated to `estado = 'rechazada'` with a non-null `motivo_rechazo`
- **THEN** the write succeeds and the row is retrievable with that state and reason

---

### Requirement: Auto-confirm linked pending reservations on subscription approval
When an administrator approves a pending subscription (`suscripciones.estado` pendiente → activa), the system SHALL find every `reservas` row with `suscripcion_id` equal to that subscription and `estado = 'pendiente'`, and, for each (ordered by creation time), attempt to confirm it the same way a normal booking is confirmed: resolve the training's matching service requirement, deduct the corresponding unit, and set `estado = 'confirmada'`. If the required unit is not available at confirmation time, the reservation SHALL be left in `pendiente` rather than failing the approval.

#### Scenario: Approval confirms the linked pending booking
- **WHEN** an administrator approves a subscription that has one linked `reservas` row in `pendiente`, and the newly active subscription grants enough units for that training's requirement
- **THEN** the reservation is updated to `estado = 'confirmada'` and the corresponding service unit is deducted

#### Scenario: Approval succeeds even if a linked reservation cannot be confirmed
- **WHEN** an administrator approves a subscription whose linked pending reservation's required units are not actually available at confirmation time
- **THEN** the subscription approval still succeeds, and the reservation is left in `estado = 'pendiente'` for manual handling

#### Scenario: Approval with no linked pending reservations is unaffected
- **WHEN** an administrator approves a subscription that has no `reservas` row referencing it
- **THEN** the approval completes exactly as before this change, with no reservation side effects

---

### Requirement: Reject cascade to linked pending reservations
When an administrator rejects a pending payment (`pagos.estado` → `rechazado`) or cancels a still-`pendiente` subscription, the system SHALL find every `reservas` row with `suscripcion_id` equal to that subscription and `estado = 'pendiente'`, and update each to `estado = 'rechazada'`, copying the admin-entered rejection reason into `reservas.motivo_rechazo`.

#### Scenario: Payment rejection cascades to the linked pending reservation
- **WHEN** an administrator rejects a payment with reason "Comprobante ilegible", and that payment's subscription has one linked `reservas` row in `pendiente`
- **THEN** that reservation is updated to `estado = 'rechazada'` with `motivo_rechazo = "Comprobante ilegible"`

#### Scenario: Cancelling a pending subscription cascades the same way
- **WHEN** an administrator cancels a subscription that is still `estado = 'pendiente'`, and it has a linked `reservas` row in `pendiente`
- **THEN** that reservation is updated to `estado = 'rechazada'` with a rejection reason recorded

#### Scenario: Rejection with no linked pending reservations is unaffected
- **WHEN** a payment is rejected or a pending subscription is cancelled and no `reservas` row references that subscription
- **THEN** the rejection/cancellation completes exactly as before this change

---

### Requirement: A rechazada reservation is never automatically reactivated
The system SHALL NOT transition a `rechazada` reservation back to `pendiente` or `confirmada` under any circumstance, including a later approval of the same or a new subscription. An athlete whose reservation was rejected MUST submit a new booking to reserve a spot again.

#### Scenario: Later approval of the same subscription does not revive a rechazada reservation
- **WHEN** a `reservas` row is `rechazada` (its subscription was rejected and later, after the athlete resubmits payment proof, the same subscription is approved)
- **THEN** the `rechazada` reservation remains `rechazada`; the athlete must create a new booking to reserve a spot

---

### Requirement: rechazada reservations excluded from capacity and duplicate checks
Every existing check that treats `reservas.estado = 'cancelada'` as not occupying a spot (capacity counts, per-category capacity counts, and the duplicate-active-booking check) SHALL treat `estado = 'rechazada'` the same way.

#### Scenario: Rejected reservation frees the spot
- **WHEN** a training's capacity is computed after one of its reservations has `estado = 'rechazada'`
- **THEN** that reservation SHALL NOT count toward the training's active reservation count

#### Scenario: Athlete with only a rechazada reservation can book again
- **WHEN** an athlete whose only existing reservation for a training is `rechazada` attempts to book that training again
- **THEN** the duplicate-booking check SHALL NOT block the new attempt

