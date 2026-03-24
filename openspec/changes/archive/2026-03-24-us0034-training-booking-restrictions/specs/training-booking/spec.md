## MODIFIED Requirements

### Requirement: Atleta self-booking
The system SHALL allow an atleta to reserve a spot in a training instance. The booking MUST be created with `atleta_id = auth.uid()`, `estado = 'pendiente'`, and `fecha_reserva = now()`. Before inserting, the service MUST evaluate all booking restrictions configured for the training: advance-notice timing (`reserva_antelacion_horas`) and access condition rows (`entrenamiento_restricciones`). If any check fails, the booking MUST be rejected with a typed `BookingRejection` result containing a `code` and a human-readable Spanish `message`. No booking row is inserted on rejection.

#### Scenario: Successful self-booking
- **WHEN** an atleta clicks "Reservar" on an available training, all restriction checks pass, and the atleta confirms the action
- **THEN** a new booking record is created in `pendiente` state and the panel reflects the new booking immediately

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

### Requirement: Atleta self-cancellation
The system SHALL allow an atleta to cancel their own booking while its `estado` is `pendiente` or `confirmada`. Cancellation MUST set `estado = 'cancelada'` and `fecha_cancelacion = now()`. Before cancelling, the service MUST check `cancelacion_antelacion_horas` on the training. If less than `cancelacion_antelacion_horas` hours remain before `fecha_hora`, the cancellation MUST be rejected with code `TIMING_CANCELACION` and a descriptive message. Admin and coach cancellations bypass this timing check.

#### Scenario: Successful self-cancellation
- **WHEN** an atleta cancels their own booking in `pendiente` or `confirmada` state and the cancellation timing check passes
- **THEN** the booking `estado` is updated to `cancelada`, `fecha_cancelacion` is set, and the panel updates accordingly

#### Scenario: Cancellation blocked for completed bookings
- **WHEN** an atleta attempts to cancel a booking with `estado = 'completada'`
- **THEN** the cancel action is unavailable

#### Scenario: Self-cancellation blocked by cancellation timing restriction
- **WHEN** an atleta attempts to cancel their booking and less than `cancelacion_antelacion_horas` hours remain before the training's `fecha_hora`
- **THEN** the cancellation is rejected and the panel displays the `TIMING_CANCELACION` rejection message inline

#### Scenario: Admin/coach cancellation bypasses timing check
- **WHEN** an administrador or entrenador cancels a booking regardless of remaining time before `fecha_hora`
- **THEN** the `cancelacion_antelacion_horas` check is not evaluated and the cancellation proceeds

## ADDED Requirements

### Requirement: Booking rejection feedback in ReservasPanel
The `ReservasPanel` SHALL display a contextual inline alert when a booking or cancellation attempt is rejected due to access restrictions or timing. The alert MUST render the `message` from the `BookingRejection` result. The alert MUST be cleared when the panel is closed or when the atleta retries the action successfully.

#### Scenario: Rejection alert displayed after failed booking attempt
- **WHEN** an atleta's booking attempt is rejected by any restriction check
- **THEN** an inline alert appears in `ReservasPanel` above the action buttons showing the human-readable rejection message

#### Scenario: Rejection alert cleared on panel close
- **WHEN** the atleta closes `ReservasPanel` after a rejection alert is shown
- **THEN** the `bookingRejection` state is cleared; re-opening the panel shows no alert until a new attempt is made

#### Scenario: Rejection alert cleared on successful retry
- **WHEN** an atleta retries a booking action and it succeeds
- **THEN** the rejection alert is removed and the panel reflects the new booking state

#### Scenario: Atleta role sees rejection alert; admin does not
- **WHEN** an administrador or entrenador creates a booking on behalf of an atleta and it is blocked by a restriction
- **THEN** the rejection message is shown in the admin/coach booking form context (not silently ignored), using the same `message` string
