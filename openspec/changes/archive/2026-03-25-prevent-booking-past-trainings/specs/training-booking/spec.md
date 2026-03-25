## MODIFIED Requirements

### Requirement: Atleta self-booking — class deduction integrated into create flow
The `create()` function in `reservas.service.ts` SHALL delegate the reservation INSERT to the `book_and_deduct_class` RPC. The service MUST:
1. **As step 0**, call `isEntrenamientoPast(entrenamientoId, tenantId)`. If the training's `fecha_hora` is not null and is in the past, the service SHALL return `{ ok: false, code: 'ENTRENAMIENTO_PASADO', message: 'No puedes reservar un entrenamiento que ya ha finalizado.' }` and no further validation or database operation SHALL be performed.
2. Run all pre-booking validation checks (`validateBookingRestrictions`) to produce non-database rejections (TIMING_RESERVA, PLAN_REQUERIDO, NIVEL_INSUFICIENTE, etc.) before calling the RPC.
3. Call `book_and_deduct_class(p_tenant_id, p_atleta_id, p_entrenamiento_id, p_entrenamiento_categoria_id, p_notas, p_suscripcion_id)` where `p_suscripcion_id` is the result of the subscription selection strategy (see `subscription-class-deduction/spec.md`) or `NULL` when no class deduction applies.
4. If the RPC raises a Postgres `P0001` exception with message matching `'CLASES_AGOTADAS'`, the service SHALL return `{ ok: false, code: 'CLASES_AGOTADAS', message: '...' }`.
5. The `book_and_deduct_class` RPC is the sole write path for reservation creation — direct INSERT into `reservas` without class management is not a supported flow.

Before invoking the RPC, the service MUST evaluate all booking restrictions configured for the training: advance-notice timing (`reserva_antelacion_horas`) and access condition rows (`entrenamiento_restricciones`). If any check fails, the booking MUST be rejected with a typed `BookingRejection` result containing a `code` and a human-readable Spanish `message`. No booking row is inserted on rejection.

#### Scenario: Successful self-booking
- **WHEN** an atleta clicks "Reservar" on an available future training, all restriction checks pass, and the atleta confirms the action
- **THEN** a new booking record is created in `pendiente` state and the panel reflects the new booking immediately

#### Scenario: Booking blocked for past training
- **WHEN** an atleta attempts to book a training whose `fecha_hora` is not null and is before the current timestamp
- **THEN** the service returns `{ ok: false, code: 'ENTRENAMIENTO_PASADO' }`, no RPC is called, and the panel displays the message "No puedes reservar un entrenamiento que ya ha finalizado."

#### Scenario: Booking allowed when fecha_hora is null
- **WHEN** an atleta attempts to book a training whose `fecha_hora` is null
- **THEN** the past-date guard does not block the action and standard validation continues

#### Scenario: Booking blocked when training is full
- **WHEN** an atleta attempts to book a training whose active booking count equals `cupo_maximo`
- **THEN** the "Reservar" button is disabled and a message indicating the training is full is shown

#### Scenario: Duplicate booking prevented
- **WHEN** an atleta who already has a non-cancelled booking for the same training attempts to book again
- **THEN** the "Reservar" button is replaced with a "Ya reservado" indicator and no new booking is created

#### Scenario: Booking blocked on inactive training
- **WHEN** an atleta attempts to book a training with `estado = 'cancelado'` or `'finalizado'`
- **THEN** the booking action is unavailable and a descriptive message is shown

#### Scenario: Booking blocked by advance-notice restriction
- **WHEN** `reserva_antelacion_horas` is set on the training and the atleta attempts to book with less time remaining than required
- **THEN** the booking is rejected and the panel displays the `TIMING_RESERVA` rejection message inline

#### Scenario: Booking blocked by unmet plan requirement
- **WHEN** a restriction row requires an active subscription to a specific plan and the atleta does not have one
- **THEN** the booking is rejected and the panel displays the `PLAN_REQUERIDO` rejection message naming the required plan

#### Scenario: Booking blocked by unmet discipline requirement
- **WHEN** a restriction row requires an active subscription including a specific discipline and the atleta does not satisfy it
- **THEN** the booking is rejected and the panel displays the `DISCIPLINA_REQUERIDA` rejection message naming the required discipline

#### Scenario: Booking blocked by insufficient discipline level
- **WHEN** a restriction row has `validar_nivel_disciplina = true` and the atleta's level order is below the training's assigned level order
- **THEN** the booking is rejected and the panel displays the `NIVEL_INSUFICIENTE` rejection message naming the discipline and minimum level

#### Scenario: Booking allowed when at least one restriction row passes
- **WHEN** multiple restriction rows exist and the atleta satisfies all conditions of at least one row
- **THEN** the access check passes and the booking proceeds normally

#### Scenario: Booking form delegates to `book_and_deduct_class`
- **WHEN** a user submits the booking form and validation passes
- **THEN** the service calls `book_and_deduct_class` and a reservation row is returned; no direct INSERT into `reservas` is issued by the client

#### Scenario: Validation rejection is returned before RPC call
- **WHEN** `validateBookingRestrictions` returns a rejection (e.g., PLAN_REQUERIDO)
- **THEN** the service returns the rejection immediately and `book_and_deduct_class` is NOT called

### Requirement: Atleta self-cancellation — class restoration integrated into cancel flow
The `cancel()` function in `reservas.service.ts` SHALL delegate the reservation status update to the `cancel_and_restore_class` RPC. The service MUST:
1. **As step 0 (athletes only)**, call `isEntrenamientoPast(entrenamientoId, tenantId)` when `isAdminOrCoach` is falsy. If the training's `fecha_hora` is not null and is in the past, the service SHALL return `{ ok: false, code: 'ENTRENAMIENTO_PASADO', message: 'No puedes cancelar la reserva de un entrenamiento que ya ha finalizado.' }`. When `isAdminOrCoach` is true, this check is skipped entirely.
2. Run `validateCancellationRestriction` to produce timing-based rejections (TIMING_CANCELACION) before calling the RPC.
3. Determine `suscripcion_id` from the fetched reservation row (may be `NULL`).
4. Call `cancel_and_restore_class(p_reserva_id, p_tenant_id, p_suscripcion_id)`.
5. Direct `UPDATE reservas SET estado='cancelada'` without the RPC is not a supported flow.

Cancellation MUST check `cancelacion_antelacion_horas` on the training. If less than `cancelacion_antelacion_horas` hours remain before `fecha_hora`, the cancellation MUST be rejected with code `TIMING_CANCELACION` and a descriptive message. Admin and coach cancellations bypass this timing check.

#### Scenario: Successful self-cancellation
- **WHEN** an atleta cancels their own booking on a future training in `pendiente` or `confirmada` state and the cancellation timing check passes
- **THEN** the booking `estado` is updated to `cancelada`, `fecha_cancelacion` is set, and the panel updates accordingly

#### Scenario: Athlete cancellation blocked for past training
- **WHEN** an atleta attempts to cancel a booking for a training whose `fecha_hora` is not null and is in the past
- **THEN** the service returns `{ ok: false, code: 'ENTRENAMIENTO_PASADO' }`, no RPC is called, and the panel displays the message "No puedes cancelar la reserva de un entrenamiento que ya ha finalizado."

#### Scenario: Admin/coach can cancel booking on past training
- **WHEN** an administrador or entrenador cancels a booking on a training whose `fecha_hora` is in the past
- **THEN** the past-date check is not evaluated, the `cancel_and_restore_class` RPC is called normally, and the cancellation succeeds

#### Scenario: Cancellation blocked for completed bookings
- **WHEN** an atleta attempts to cancel a booking with `estado = 'completada'`
- **THEN** the cancel action is unavailable

#### Scenario: Self-cancellation blocked by cancellation timing restriction
- **WHEN** an atleta attempts to cancel their booking and less than `cancelacion_antelacion_horas` hours remain before the training's `fecha_hora`
- **THEN** the cancellation is rejected and the panel displays the `TIMING_CANCELACION` rejection message inline

#### Scenario: Admin/coach cancellation bypasses timing check
- **WHEN** an administrador or entrenador cancels a booking regardless of remaining time before `fecha_hora`
- **THEN** the `cancelacion_antelacion_horas` check is not evaluated and the cancellation proceeds

#### Scenario: Admin/coach cancellation also uses cancel_and_restore_class
- **WHEN** an admin or entrenador cancels a booking
- **THEN** the same `cancel_and_restore_class` RPC is called; timing restriction is bypassed for admin roles but class restoration logic is identical

#### Scenario: Cancellation of booking with no linked subscription
- **WHEN** `reservas.suscripcion_id IS NULL` and a cancellation is requested
- **THEN** `cancel_and_restore_class` is called with `p_suscripcion_id = NULL`; the RPC performs only the status update and the caller receives a success result

## ADDED Requirements

### Requirement: Past training UI guard in ReservasPanel
The `ReservasPanel` component SHALL derive a boolean `isPast` from the entrenamiento instance prop using `!!instance.fecha_hora && new Date(instance.fecha_hora) < new Date()`. No extra network request SHALL be made for this computation.

When `isPast` is true:
- The "Reservar" self-book button SHALL be rendered in a `disabled` state with a visible label or tooltip "Entrenamiento finalizado". The `disabled` HTML attribute MUST be set.
- The per-row cancel button for the **atleta** role SHALL be rendered in a `disabled` state. The `disabled` HTML attribute MUST be set.
- Admin and coach users SHALL see no change in cancel button behavior.

When `isPast` is false or `fecha_hora` is null, all buttons behave as they do today.

#### Scenario: Athlete sees disabled book button on past training
- **WHEN** an atleta opens the booking panel for a training whose `fecha_hora` is in the past
- **THEN** the "Reservar" button is disabled (`disabled` attribute set) and the label "Entrenamiento finalizado" is visible

#### Scenario: Athlete sees disabled cancel button on past training
- **WHEN** an atleta views their booking row on a past training
- **THEN** the cancel button for that row is disabled (`disabled` attribute set)

#### Scenario: Admin/coach cancel button unaffected for past training
- **WHEN** an administrador or entrenador views the booking panel for a past training
- **THEN** the cancel buttons are enabled and functional as normal

#### Scenario: Future training buttons unaffected
- **WHEN** the panel is opened for a training whose `fecha_hora` is in the future or is null
- **THEN** `isPast` is false and no buttons are affected by the past-training guard
