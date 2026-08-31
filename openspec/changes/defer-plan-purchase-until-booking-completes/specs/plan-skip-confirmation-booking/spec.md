## MODIFIED Requirements

### Requirement: Booking continues as pending when only the plan/service requirement fails
When a booking attempt on a public training is rejected with code `SERVICIO_REQUERIDO` or `UNIDADES_AGOTADAS`, and the target training's publication has `omitir_confirmacion_plan = true`, the system SHALL let the athlete continue instead of blocking the booking: the athlete selects a plan/subtype and fills in payment details through the existing plan-purchase form, but the system SHALL NOT create the `suscripciones` or `pagos` rows at that point — the selection is held only in memory. The athlete then completes the normal booking form. On the athlete's final booking submit, the system SHALL create the `suscripciones` row (`estado = 'pendiente'`), its `suscripcion_servicios` rows, the `pagos` row (`estado = 'pendiente'`), and the `reservas` row (`estado = 'pendiente'`, `suscripcion_id` set to the newly created subscription's id) together, without deducting any service unit. Every other check that already applies to a booking — timing, `usuario_estado`, `validar_nivel_disciplina`, capacity, per-category capacity, duplicate-booking, and attached-form validation — SHALL still be enforced unchanged; only the plan/service requirement is bypassed.

#### Scenario: Athlete without the required plan can still reserve a spot
- **WHEN** an athlete books a public training whose publication has `omitir_confirmacion_plan = true`, and the only failing condition is a missing/exhausted required service
- **THEN** after selecting a plan through the catalog and completing the booking form, submitting the booking inserts a `suscripciones` row and a `reservas` row with `estado = 'pendiente'`, with the reservation's `suscripcion_id` pointing at the newly created subscription

#### Scenario: Selecting a plan does not write anything to the database yet
- **WHEN** an athlete on the skip-confirmation path selects a plan/subtype and confirms the payment-method form
- **THEN** no `suscripciones` or `pagos` row exists yet; the selection is held only in the booking UI's in-memory state until the booking form is submitted

#### Scenario: Other restriction failures still block the booking even with the toggle on
- **WHEN** an athlete books a public training with `omitir_confirmacion_plan = true`, and the rejection code is `TIMING_RESERVA`, `USUARIO_INACTIVO`, `NIVEL_INSUFICIENTE`, `ENTRENAMIENTO_PASADO`, `FORMULARIO_CAMPOS_FALTANTES`, or `PERFIL_INCOMPLETO`
- **THEN** the booking remains fully blocked; no reservation or subscription is created

#### Scenario: Capacity and duplicate checks still apply
- **WHEN** an athlete attempts the skip-confirmation booking path on a training that is at full capacity, or for which the athlete already holds an active reservation
- **THEN** the booking is rejected the same way a normal booking would be, and no `reservas`, `suscripciones`, or `pagos` row is inserted

#### Scenario: Toggle off preserves today's blocking behavior
- **WHEN** an athlete books a public training whose publication has `omitir_confirmacion_plan = false` (the default) and is rejected with `SERVICIO_REQUERIDO` or `UNIDADES_AGOTADAS`
- **THEN** the booking is fully blocked exactly as before this change; no `reservas` row is created

---

## ADDED Requirements

### Requirement: Atomic creation of the pending plan purchase and the pending reservation
The system SHALL create the `suscripciones`, `suscripcion_servicios`, `pagos`, and `reservas` rows for a skip-confirmation booking-with-plan-purchase in a single database transaction, such that either all of them are created or none of them are. If the reservation cannot ultimately be inserted (e.g., a capacity or duplicate-booking race detected at submit time), no `suscripciones` or `pagos` row SHALL exist afterward either.

#### Scenario: Abandoning after selecting a plan leaves nothing behind
- **WHEN** an athlete selects a plan and confirms payment details on the skip-confirmation path, then closes the booking modal or navigates away before submitting the booking form
- **THEN** no `suscripciones`, `suscripcion_servicios`, or `pagos` row was ever created for that selection

#### Scenario: A later capacity or duplicate-booking failure at final submit creates nothing
- **WHEN** an athlete completes the plan selection and the booking form, and the final submit is rejected because the training reached capacity or the athlete already has an active reservation for it
- **THEN** no `suscripciones`, `suscripcion_servicios`, or `pagos` row is created, exactly as if the athlete had not selected a plan at all

#### Scenario: A retried booking after abandonment behaves like a first attempt
- **WHEN** an athlete who previously abandoned a skip-confirmation booking after selecting a plan (per the scenario above) later retries booking the same training, or a different training requiring the same plan
- **THEN** the athlete sees the same fresh eligibility rejection a first-time visitor would see, with no "solicitud pendiente" duplicate block caused by the earlier, abandoned attempt

---

### Requirement: Defense-in-depth re-verification at final submit
Because time may pass between the athlete selecting a plan and the athlete's final booking submit, the system SHALL re-verify, at submit time and inside the same transaction as the writes, that (a) the selected plan is still purchasable by the athlete, and (b) no `pendiente` subscription already exists for that athlete and plan. Either failing condition SHALL abort the entire operation with no rows created.

#### Scenario: Plan became unavailable between selection and submit
- **WHEN** an athlete selects a plan, and before they submit the booking form the plan is deactivated or unpublished
- **THEN** the final booking submit fails with a clear message, and no `suscripciones`, `pagos`, or `reservas` row is created

#### Scenario: A genuine duplicate pending subscription appears before final submit
- **WHEN** an athlete selects a plan on the skip-confirmation path, and before they submit the booking form a `pendiente` subscription for that same athlete and plan is created through another path (e.g. a second browser tab)
- **THEN** the final booking submit fails with a clear message, and no additional `suscripciones`, `pagos`, or `reservas` row is created

#### Scenario: A genuinely duplicate plan request is still blocked when selecting the plan
- **WHEN** an athlete who already has a `pendiente` subscription for a plan (created by a previously completed skip-confirmation booking) tries to select that same plan again on a new booking
- **THEN** the plan-purchase form shows "Ya tienes una solicitud pendiente para este plan" and does not let the athlete proceed with that plan

---

### Requirement: Proof-of-payment upload follows the atomic write
When the athlete attaches a proof-of-payment file during plan selection on the skip-confirmation path, the system SHALL upload it only after the atomic subscription+reservation write has succeeded, using the newly created payment's id. A failed upload SHALL NOT fail the booking or the plan purchase; the athlete can resubmit the proof later through the existing payment-proof resubmission flow.

#### Scenario: Proof file is uploaded after a successful booking
- **WHEN** an athlete attaches a proof-of-payment file while selecting a plan, and the subsequent booking submit succeeds
- **THEN** the file is uploaded to storage and the resulting payment's `comprobante_path` is set to its path

#### Scenario: A failed upload does not undo the booking
- **WHEN** an athlete attaches a proof-of-payment file, the booking submit succeeds, and the subsequent file upload fails
- **THEN** the reservation and subscription remain created and pending; the payment is left without a `comprobante_path`, and the athlete can attach it later via the existing "Resubir comprobante" flow
