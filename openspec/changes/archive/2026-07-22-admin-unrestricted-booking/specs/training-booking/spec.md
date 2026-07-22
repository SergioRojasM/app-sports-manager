## MODIFIED Requirements

### Requirement: Atleta self-booking — class deduction integrated into create flow
The `create()` function in `reservas.service.ts` SHALL delegate the reservation INSERT to the `book_and_deduct_class` RPC. The service MUST:
1. **As step 0 (skipped when `bypass_restrictions` is `true`)**: Call `isEntrenamientoPast(entrenamientoId, tenantId)`. If the training's `fecha_hora` is not null and is in the past, the service SHALL return `{ ok: false, code: 'ENTRENAMIENTO_PASADO', message: 'No puedes reservar un entrenamiento que ya ha finalizado.' }` and no further validation or database operation SHALL be performed.
2. **Run all pre-booking validation checks (skipped when `bypass_restrictions` is `true`)**: Call `validateBookingRestrictions` to produce non-database rejections (TIMING_RESERVA, PLAN_REQUERIDO, NIVEL_INSUFICIENTE, etc.) before calling the RPC.
3. **Subscription deduction lookup (always runs)**: Call `findSubscriptionToCharge` to find the athlete's eligible active subscription. This step is unconditional — it runs for both standard and admin-override bookings.
4. **Global capacity check (skipped when `bypass_restrictions` is `true`)**: If `cupo_maximo` is not null and `reservas_activas >= cupo_maximo`, the service SHALL throw `ReservaServiceError('capacity_exceeded', ...)`.
5. **Duplicate-booking check (always runs, unconditional)**: If the athlete already has a non-cancelled booking for the same training, the service SHALL throw `ReservaServiceError('duplicate_booking', ...)`.
6. **Per-category capacity check (skipped when `bypass_restrictions` is `true`)**: If `entrenamiento_categoria_id` is provided, the service SHALL verify that the category has available slots before proceeding.
7. Call `book_and_deduct_class(p_tenant_id, p_atleta_id, p_entrenamiento_id, p_entrenamiento_categoria_id, p_notas, p_suscripcion_id)` where `p_suscripcion_id` is the result of the subscription selection strategy (see `subscription-class-deduction/spec.md`) or `NULL` when no class deduction applies.
8. If the RPC raises a Postgres `P0001` exception with message matching `'CLASES_AGOTADAS'`, the service SHALL return `{ ok: false, code: 'CLASES_AGOTADAS', message: '...' }`.
9. The `book_and_deduct_class` RPC is the sole write path for reservation creation — direct INSERT into `reservas` without class management is not a supported flow.

The `CreateReservaInput` type SHALL include an optional `bypass_restrictions?: boolean` field. When `true`, steps 0, 2, 4, and 6 are skipped. Steps 3 (subscription deduction), 5 (duplicate check), and 7–9 (RPC call) always run regardless of this flag.

#### Scenario: Successful self-booking
- **WHEN** an atleta clicks "Reservar" on an available future training, all restriction checks pass, and the atleta confirms the action
- **THEN** a new booking record is created in `confirmada` state and the panel reflects the new booking immediately

#### Scenario: Booking blocked for past training (athlete)
- **WHEN** an atleta attempts to book a training whose `fecha_hora` is not null and is before the current timestamp
- **THEN** the service returns `{ ok: false, code: 'ENTRENAMIENTO_PASADO' }`, no RPC is called, and the panel displays the message "No puedes reservar un entrenamiento que ya ha finalizado."

#### Scenario: Booking allowed for past training by admin (bypass)
- **WHEN** an administrador creates a booking with `bypass_restrictions: true` for a training whose `fecha_hora` is in the past
- **THEN** the past-date guard is skipped, the booking is created successfully, and the panel reflects the new booking

#### Scenario: Booking allowed when fecha_hora is null
- **WHEN** an atleta attempts to book a training whose `fecha_hora` is null
- **THEN** the past-date guard does not block the action and standard validation continues

#### Scenario: Booking blocked when training is full (athlete)
- **WHEN** an atleta attempts to book a training whose active booking count equals `cupo_maximo`
- **THEN** the "Reservar" button is disabled and a message indicating the training is full is shown

#### Scenario: Booking allowed when training is full (admin override)
- **WHEN** an administrador creates a booking with `bypass_restrictions: true` for a training that is at or over `cupo_maximo`
- **THEN** the global capacity check is skipped and the booking is created successfully

#### Scenario: Booking allowed when category is at capacity (admin override)
- **WHEN** an administrador creates a booking with `bypass_restrictions: true` and an `entrenamiento_categoria_id` whose `cupos_asignados` are fully consumed
- **THEN** the per-category capacity check is skipped and the booking is created successfully

#### Scenario: Duplicate booking prevented (unconditional)
- **WHEN** any user (including an administrador with `bypass_restrictions: true`) attempts to book a training for an athlete who already has a non-cancelled booking for the same training
- **THEN** the service throws `ReservaServiceError('duplicate_booking', ...)` and no new booking is created

#### Scenario: Booking blocked on inactive training
- **WHEN** an atleta attempts to book a training with `estado = 'cancelado'` or `'finalizado'`
- **THEN** the booking action is unavailable and a descriptive message is shown

#### Scenario: Booking blocked by advance-notice restriction (athlete)
- **WHEN** `reserva_antelacion_horas` is set on the training and the atleta attempts to book with less time remaining than required
- **THEN** the booking is rejected and the panel displays the `TIMING_RESERVA` rejection message inline

#### Scenario: Admin bypasses advance-notice restriction
- **WHEN** an administrador creates a booking with `bypass_restrictions: true` and `reserva_antelacion_horas` would normally block the booking
- **THEN** the timing restriction is skipped and the booking is created successfully

#### Scenario: Booking blocked by unmet plan requirement (athlete)
- **WHEN** a restriction row requires an active subscription to a specific plan and the atleta does not have one
- **THEN** the booking is rejected and the panel displays the `PLAN_REQUERIDO` rejection message naming the required plan

#### Scenario: Admin bypasses plan requirement
- **WHEN** an administrador creates a booking with `bypass_restrictions: true` for a training that requires a specific plan the athlete lacks
- **THEN** the restriction check is skipped and the booking is created successfully

#### Scenario: Admin booking deducts class when valid subscription exists
- **WHEN** an administrador creates a booking with `bypass_restrictions: true` and the athlete has an active subscription with available classes for the training's required plan
- **THEN** `findSubscriptionToCharge` returns the subscription ID, `book_and_deduct_class` is called with that ID, and one class is deducted from the athlete's subscription

#### Scenario: Admin booking with no eligible subscription creates booking without deduction
- **WHEN** an administrador creates a booking with `bypass_restrictions: true` and no active subscription with available classes is found for the athlete
- **THEN** `findSubscriptionToCharge` returns `null`, `book_and_deduct_class` is called with `p_suscripcion_id = NULL`, the booking is created successfully, and `reservas.suscripcion_id` is `NULL`

#### Scenario: Booking blocked by insufficient discipline level (athlete)
- **WHEN** a restriction row has `validar_nivel_disciplina = true` and the atleta's level order is below the training's assigned level order
- **THEN** the booking is rejected and the panel displays the `NIVEL_INSUFICIENTE` rejection message naming the discipline and minimum level

#### Scenario: Booking allowed when at least one restriction row passes
- **WHEN** multiple restriction rows exist and the atleta satisfies all conditions of at least one row
- **THEN** the access check passes and the booking proceeds normally

#### Scenario: Booking form delegates to `book_and_deduct_class`
- **WHEN** a user submits the booking form and all applicable validation passes
- **THEN** the service calls `book_and_deduct_class` and a reservation row is returned; no direct INSERT into `reservas` is issued by the client

#### Scenario: Validation rejection is returned before RPC call (athlete)
- **WHEN** `validateBookingRestrictions` returns a rejection (e.g., PLAN_REQUERIDO) for an atleta
- **THEN** the service returns the rejection immediately and `book_and_deduct_class` is NOT called

### Requirement: Admin and trainer booking management — create on behalf
The system SHALL allow entrenadores and administradores to create a booking on behalf of any tenant atleta by selecting that atleta from a picker filtered to tenant members with `atleta` role.

When the caller is an `administrador`, the `useReservas` hook SHALL automatically inject `bypass_restrictions: true` into the `CreateReservaInput` before forwarding to `reservasService.create()`. Entrenadores do NOT receive this flag injection.

#### Scenario: Create booking on behalf of athlete (entrenador)
- **WHEN** an entrenador submits the booking form with a valid `atleta_id` and optional notes
- **THEN** a new booking is created for the selected atleta applying all standard restriction and capacity checks

#### Scenario: Create booking on behalf of athlete (administrador)
- **WHEN** an administrador submits the booking form with a valid `atleta_id`
- **THEN** `bypass_restrictions: true` is automatically injected by `useReservas`, past-date guard, restriction validation, and capacity checks are skipped, and the booking is created successfully

#### Scenario: Athlete picker only shows tenant atletas
- **WHEN** the booking form is opened by an entrenador or administrador
- **THEN** the athlete selector MUST only list members of the current tenant with the `atleta` role
