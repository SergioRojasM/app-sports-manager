## ADDED Requirements

### Requirement: Publish-time skip-confirmation toggle
The system SHALL allow a trainer/administrator publishing a training to the public marketplace to set `entrenamientos_publicos.omitir_confirmacion_plan` (boolean, default `false`) via a checkbox in the publish form. The value SHALL persist and reload correctly when reopening the publish form for an already-published training.

#### Scenario: Toggle defaults to off
- **WHEN** an administrator opens the publish form for a training that has never been published
- **THEN** "Omitir confirmación de plan" SHALL be unchecked

#### Scenario: Toggle persists across reopen
- **WHEN** an administrator checks "Omitir confirmación de plan", saves the publication, and reopens the publish form later
- **THEN** the checkbox SHALL be shown checked, reflecting the persisted `omitir_confirmacion_plan = true`

---

### Requirement: Booking continues as pending when only the plan/service requirement fails
When a booking attempt on a public training is rejected with code `SERVICIO_REQUERIDO` or `UNIDADES_AGOTADAS`, and the target training's publication has `omitir_confirmacion_plan = true`, the system SHALL let the athlete continue instead of blocking the booking: the athlete completes the existing plan-purchase flow (creating a `suscripciones` row and a `pagos` row, both `estado = 'pendiente'`), then completes the normal booking form. On submit, the system SHALL insert a `reservas` row with `estado = 'pendiente'` and `suscripcion_id` set to the newly created subscription's id, without deducting any service unit. Every other check that already applies to a booking — timing, `usuario_estado`, `validar_nivel_disciplina`, capacity, per-category capacity, duplicate-booking, and attached-form validation — SHALL still be enforced unchanged; only the plan/service requirement is bypassed.

#### Scenario: Athlete without the required plan can still reserve a spot
- **WHEN** an athlete books a public training whose publication has `omitir_confirmacion_plan = true`, and the only failing condition is a missing/exhausted required service
- **THEN** after purchasing a plan through the catalog and completing the booking form, a `reservas` row is inserted with `estado = 'pendiente'` and `suscripcion_id` pointing at the newly created `suscripciones` row

#### Scenario: Other restriction failures still block the booking even with the toggle on
- **WHEN** an athlete books a public training with `omitir_confirmacion_plan = true`, and the rejection code is `TIMING_RESERVA`, `USUARIO_INACTIVO`, `NIVEL_INSUFICIENTE`, `ENTRENAMIENTO_PASADO`, `FORMULARIO_CAMPOS_FALTANTES`, or `PERFIL_INCOMPLETO`
- **THEN** the booking remains fully blocked; no reservation or subscription is created

#### Scenario: Capacity and duplicate checks still apply
- **WHEN** an athlete attempts the skip-confirmation booking path on a training that is at full capacity, or for which the athlete already holds an active reservation
- **THEN** the booking is rejected the same way a normal booking would be, and no additional `reservas` row is inserted

#### Scenario: Toggle off preserves today's blocking behavior
- **WHEN** an athlete books a public training whose publication has `omitir_confirmacion_plan = false` (the default) and is rejected with `SERVICIO_REQUERIDO` or `UNIDADES_AGOTADAS`
- **THEN** the booking is fully blocked exactly as before this change; no `reservas` row is created

---

### Requirement: Server-side re-verification of the skip-confirmation flag
The booking service SHALL NOT rely solely on a client-supplied request flag to allow the pending-booking-without-plan path. Before creating a `reservas` row in `pendiente` without a satisfied plan/service requirement, the service SHALL independently query `entrenamientos_publicos` for the target `entrenamiento_id`/`tenant_id` (`activo = true`) and confirm `omitir_confirmacion_plan = true`.

#### Scenario: Tampered client flag on a non-opted-in training is rejected
- **WHEN** a booking request sets the client-side "allow pending" flag for a training whose `entrenamientos_publicos.omitir_confirmacion_plan` is `false` (or has no active publication)
- **THEN** the server SHALL return the original `SERVICIO_REQUERIDO`/`UNIDADES_AGOTADAS` rejection and SHALL NOT create a `reservas` row

---

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
