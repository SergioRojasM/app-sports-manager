## ADDED Requirements

### Requirement: Booking panel access from training detail
The system SHALL render a `ReservasPanel` within the `gestion-entrenamientos` page when a training instance is selected, without navigating to a new route. The panel SHALL display a booking list and role-appropriate action controls.

#### Scenario: Atleta opens booking panel
- **WHEN** an authenticated atleta selects a training instance from the calendar or list view
- **THEN** the system renders the booking panel showing only the atleta's own booking (if any) plus a "Reservar" button when no active booking exists

#### Scenario: Entrenador or administrador opens booking panel
- **WHEN** an authenticated entrenador or administrador selects a training instance
- **THEN** the system renders the booking panel showing all bookings for that training, a capacity indicator, and action controls for create, edit, cancel, and delete

### Requirement: Atleta self-booking — class deduction integrated into create flow
The `create()` function in `reservas.service.ts` SHALL delegate the reservation INSERT to the `book_and_deduct_class` RPC. The service MUST:
1. Run all pre-booking validation checks (`validateBookingRestrictions`) to produce non-database rejections (TIMING_RESERVA, PLAN_REQUERIDO, NIVEL_INSUFICIENTE, etc.) before calling the RPC.
2. Call `book_and_deduct_class(p_tenant_id, p_atleta_id, p_entrenamiento_id, p_entrenamiento_categoria_id, p_notas, p_suscripcion_id)` where `p_suscripcion_id` is the result of the subscription selection strategy (see `subscription-class-deduction/spec.md`) or `NULL` when no class deduction applies.
3. If the RPC raises a Postgres `P0001` exception with message matching `'CLASES_AGOTADAS'`, the service SHALL return `{ ok: false, code: 'CLASES_AGOTADAS', message: '...' }`.
4. The `book_and_deduct_class` RPC is the sole write path for reservation creation — direct INSERT into `reservas` without class management is not a supported flow.

Before invoking the RPC, the service MUST evaluate all booking restrictions configured for the training: advance-notice timing (`reserva_antelacion_horas`) and access condition rows (`entrenamiento_restricciones`). If any check fails, the booking MUST be rejected with a typed `BookingRejection` result containing a `code` and a human-readable Spanish `message`. No booking row is inserted on rejection.

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

#### Scenario: Booking form delegates to `book_and_deduct_class`
- **WHEN** a user submits the booking form and validation passes
- **THEN** the service calls `book_and_deduct_class` and a reservation row is returned; no direct INSERT into `reservas` is issued by the client

#### Scenario: Validation rejection is returned before RPC call
- **WHEN** `validateBookingRestrictions` returns a rejection (e.g., PLAN_REQUERIDO)
- **THEN** the service returns the rejection immediately and `book_and_deduct_class` is NOT called

### Requirement: Atleta self-cancellation — class restoration integrated into cancel flow
The `cancel()` function in `reservas.service.ts` SHALL delegate the reservation status update to the `cancel_and_restore_class` RPC. The service MUST:
1. Run `validateCancellationRestriction` to produce timing-based rejections (TIMING_CANCELACION) before calling the RPC.
2. Determine `suscripcion_id` from the fetched reservation row (may be `NULL`).
3. Call `cancel_and_restore_class(p_reserva_id, p_tenant_id, p_suscripcion_id)`.
4. Direct `UPDATE reservas SET estado='cancelada'` without the RPC is not a supported flow.

Cancellation MUST check `cancelacion_antelacion_horas` on the training. If less than `cancelacion_antelacion_horas` hours remain before `fecha_hora`, the cancellation MUST be rejected with code `TIMING_CANCELACION` and a descriptive message. Admin and coach cancellations bypass this timing check.

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

#### Scenario: Admin/coach cancellation also uses cancel_and_restore_class
- **WHEN** an admin or entrenador cancels a booking
- **THEN** the same `cancel_and_restore_class` RPC is called; timing restriction is bypassed for admin roles but class restoration logic is identical

#### Scenario: Cancellation of booking with no linked subscription
- **WHEN** `reservas.suscripcion_id IS NULL` and a cancellation is requested
- **THEN** `cancel_and_restore_class` is called with `p_suscripcion_id = NULL`; the RPC performs only the status update and the caller receives a success result

### Requirement: Admin and trainer booking management — create on behalf
The system SHALL allow entrenadores and administradores to create a booking on behalf of any tenant atleta by selecting that atleta from a picker filtered to tenant members with `atleta` role.

#### Scenario: Create booking on behalf of athlete
- **WHEN** an entrenador or administrador submits the booking form with a valid `atleta_id` and optional notes
- **THEN** a new booking is created for the selected atleta in `pendiente` state

#### Scenario: Athlete picker only shows tenant atletas
- **WHEN** the booking form is opened by an entrenador or administrador
- **THEN** the athlete selector MUST only list members of the current tenant with the `atleta` role

### Requirement: Admin and trainer booking status management
The system SHALL allow entrenadores and administradores to update the `estado` and `notas` of any booking. Setting `estado = 'cancelada'` MUST also set `fecha_cancelacion = now()`.

#### Scenario: Confirm a pending booking
- **WHEN** an entrenador or administrador updates a booking `estado` from `pendiente` to `confirmada`
- **THEN** the booking is updated and the panel reflects the new status

#### Scenario: Complete a booking
- **WHEN** an entrenador or administrador sets `estado = 'completada'` on a booking for a training whose `fecha_hora` is in the past
- **THEN** the booking is marked as completed

#### Scenario: Status set to completada blocked for future trainings
- **WHEN** an entrenador or administrador attempts to set `estado = 'completada'` for a booking on a training whose `fecha_hora` is in the future or null
- **THEN** the update is rejected with a validation message

### Requirement: Admin and trainer booking deletion
The system SHALL allow entrenadores and administradores to hard-delete a booking only when its `estado` is `pendiente` or `cancelada`. A confirmation dialog MUST be shown before deletion.

#### Scenario: Delete a cancellable booking with confirmation
- **WHEN** an entrenador or administrador confirms deletion of a booking in `pendiente` or `cancelada` state
- **THEN** the booking record is permanently removed and the panel updates

#### Scenario: Delete blocked for confirmed or completed bookings
- **WHEN** an entrenador or administrador attempts to delete a booking in `confirmada` or `completada` state
- **THEN** the delete action is unavailable

### Requirement: Capacity validation in service layer
The system MUST validate available capacity before creating a booking by counting non-cancelled bookings for the training. If `cupo_maximo` is not null and active bookings count ≥ `cupo_maximo`, the service MUST reject the operation with a typed `capacity_exceeded` error.

#### Scenario: Capacity check passes
- **WHEN** a booking is submitted and active bookings count < `cupo_maximo` (or `cupo_maximo` is null)
- **THEN** the booking is created successfully

#### Scenario: Capacity check fails
- **WHEN** a booking is submitted and active bookings count ≥ `cupo_maximo`
- **THEN** the service rejects with `capacity_exceeded` and no booking is inserted

### Requirement: RLS enforcement on reservas
The system MUST enforce Row Level Security on `public.reservas` through database-level policies. All browser client calls go through RLS automatically.

#### Scenario: Atleta can only read own bookings
- **WHEN** an atleta queries `reservas` for a training
- **THEN** only rows where `atleta_id = auth.uid()` and `tenant_id` matches their membership are returned

#### Scenario: Cross-tenant access is blocked
- **WHEN** an authenticated user attempts to access bookings for a training outside their tenant membership
- **THEN** no rows are returned by the RLS policy

#### Scenario: Atleta cannot update or delete other athletes' bookings
- **WHEN** an atleta attempts to mutate a booking where `atleta_id ≠ auth.uid()`
- **THEN** the operation is rejected by RLS

### Requirement: Layered architecture compliance for reservas
The booking feature implementation SHALL follow the project architecture: `components → hooks → service → supabase`. No direct Supabase calls from components or pages are permitted.

#### Scenario: Supabase access is service-layer only
- **WHEN** the reservas feature code is reviewed
- **THEN** all `supabase` calls are in `reservas.service.ts` and consumed via `useReservas` or `useReservaForm`

## ADDED Requirements

### Requirement: Level selector displayed when training has categories
The system SHALL render a level-selection control inside `ReservaFormModal` (create mode only) when the selected training instance has one or more rows in `entrenamiento_categorias`. When no categories exist the form MUST remain unchanged — no level selector is displayed and `entrenamiento_categoria_id` is stored as `null` on the created reserva.

#### Scenario: Training has categories — selector is shown
- **WHEN** the booking form opens for a training that has one or more `entrenamiento_categorias` rows
- **THEN** the form renders a level-selection control listing all categories ordered by `nivel_disciplina.orden` ASC

#### Scenario: Training has no categories — selector is hidden
- **WHEN** the booking form opens for a training that has zero `entrenamiento_categorias` rows
- **THEN** no level-selection control is rendered and the form behaves exactly as it did before this change

#### Scenario: Level selector is hidden in edit mode
- **WHEN** an admin or coach opens the booking form in edit mode to update `estado` or `notas`
- **THEN** the level-selection control is not rendered; level is not reassignable after booking creation

---

### Requirement: Available spots per level displayed in the selector
The system SHALL show the remaining available spots for each level option. Fully booked levels (where active reservas count ≥ `cupos_asignados`) MUST be rendered as disabled and visually distinct. The spot count MUST be computed as `cupos_asignados − reservas_activas` and refreshed after each booking mutation.

#### Scenario: Level with available spots
- **WHEN** a category has `reservas_activas < cupos_asignados`
- **THEN** the option is enabled and displays `X cupos disponibles` where X = `cupos_asignados − reservas_activas`

#### Scenario: Level with no remaining spots
- **WHEN** a category has `reservas_activas >= cupos_asignados`
- **THEN** the option is rendered as disabled with `aria-disabled="true"` and the text `0 cupos disponibles`

#### Scenario: Spot counts refresh after booking
- **WHEN** a booking is successfully created or cancelled
- **THEN** `refetchCategorias()` is called and the level selector updates to reflect the new availability counts before the next booking attempt

---

### Requirement: Level selection is required when categories exist
The system MUST prevent form submission when `categorias.length > 0` and no level has been selected. An inline validation error MUST be shown on the level field.

#### Scenario: Submit without selecting a level
- **WHEN** an athlete (or admin on-behalf) submits the booking form without choosing a level and categories exist
- **THEN** the form does not submit and displays the inline error `'Debes seleccionar un nivel para esta reserva.'`

#### Scenario: Submit with a valid level selected
- **WHEN** an athlete submits the form with a level selected from an available category
- **THEN** the validation passes and the booking is submitted with `entrenamiento_categoria_id` set to the chosen category's id

---

### Requirement: Athlete's assigned level is auto-selected on form open
The system SHALL automatically pre-select the level that matches the athlete's `usuario_nivel_disciplina` record for the training's discipline when opening the booking form in self-booking mode, provided that level's category is available (`disponible = true`). If no match or the category is full, no level is pre-selected.

#### Scenario: Athlete has an assigned level matching an available category
- **WHEN** an authenticated atleta opens the booking form for a training with categories and their `usuario_nivel_disciplina` for that discipline matches an available category
- **THEN** that category is pre-selected in the level selector

#### Scenario: Athlete's assigned level is fully booked
- **WHEN** an authenticated atleta opens the booking form and their assigned level's category has `disponible = false`
- **THEN** no level is pre-selected; the athlete must manually choose an available level

#### Scenario: Athlete has no assigned level for the discipline
- **WHEN** an authenticated atleta opens the booking form and has no `usuario_nivel_disciplina` record for the training's discipline
- **THEN** no level is pre-selected

#### Scenario: Admin on-behalf booking — no auto-select
- **WHEN** an administrador or entrenador opens the booking form on behalf of an athlete
- **THEN** no level is pre-selected (auto-select is not applied for on-behalf flows in this iteration)

---

### Requirement: Per-category capacity validation in service layer
The service MUST validate per-category capacity before inserting a reservation when `entrenamiento_categoria_id` is provided. If active reservas for that category equal or exceed its `cupos_asignados`, the service MUST reject the operation with a typed `capacity_exceeded` error. The service MUST also verify that the provided `entrenamiento_categoria_id` belongs to the requested `entrenamiento_id`.

#### Scenario: Per-category capacity check passes
- **WHEN** a booking is submitted with an `entrenamiento_categoria_id` whose active reservas count is less than `cupos_asignados`
- **THEN** the booking is created with `entrenamiento_categoria_id` set accordingly

#### Scenario: Per-category capacity check fails — category full
- **WHEN** a booking is submitted with an `entrenamiento_categoria_id` that has reached its `cupos_asignados` limit (race condition or stale UI)
- **THEN** the service rejects with `capacity_exceeded` and the modal shows `'No hay cupos disponibles para el nivel seleccionado.'`

#### Scenario: Mismatched categoria reference rejected
- **WHEN** a booking is submitted with an `entrenamiento_categoria_id` that does not belong to the requested `entrenamiento_id`
- **THEN** the service rejects with `categoria_not_found` and no booking is inserted

#### Scenario: No category provided — existing capacity check applies
- **WHEN** a booking is submitted without `entrenamiento_categoria_id` (training has no categories configured)
- **THEN** only the existing overall `cupo_maximo` capacity check runs, unchanged from prior behavior

---

### Requirement: Booking record persists the selected category reference
The system SHALL store `entrenamiento_categoria_id` on the created `reserva` row. Existing reservas with `entrenamiento_categoria_id = null` MUST continue to function without error.

#### Scenario: New booking with level selected
- **WHEN** an athlete completes a booking for a training with categories and selects a level
- **THEN** the resulting `reservas` row has `entrenamiento_categoria_id` set to the chosen `entrenamiento_categorias.id`

#### Scenario: New booking without categories
- **WHEN** an athlete completes a booking for a training with no categories configured
- **THEN** the resulting `reservas` row has `entrenamiento_categoria_id = null`

#### Scenario: Legacy reservas unaffected
- **WHEN** the booking panel loads reservas that were created before this feature was deployed
- **THEN** rows with `entrenamiento_categoria_id = null` are displayed and function correctly without errors

---

### Requirement: Booking panel displays attendance state per row
The system SHALL display an `AsistenciaStatusBadge` inline in each booking row rendered by `ReservasPanel`. The badge is derived from the `asistenciaMap` (keyed by `reserva_id`) returned by `useAsistencias`. This augments the existing booking row display without altering any booking-related data or actions.

#### Scenario: Entrenador or administrador booking panel shows attendance badges
- **WHEN** an authenticated entrenador or administrador opens the bookings panel for a training instance
- **THEN** the system renders booking rows showing the existing booking status badge AND an attendance status badge per row

#### Scenario: Booking rows show "Sin registrar" when no attendance has been recorded
- **WHEN** the bookings panel is opened for a training and no attendance records exist for any booking
- **THEN** every booking row displays a grey "Sin registrar" attendance badge alongside the booking status badge

### Requirement: Booking panel exposes attendance action control for admin and coach
The system SHALL render an attendance action button (pencil/verify icon) per booking row in `ReservasPanel` for users with `administrador` or `entrenador` role. Clicking the button MUST open `AsistenciaFormModal` for that booking. The button MUST NOT be rendered for users with `atleta` role.

#### Scenario: Admin or coach action button opens attendance modal
- **WHEN** an administrador or entrenador clicks the attendance action button on a booking row
- **THEN** the `AsistenciaFormModal` opens pre-filled with the existing attendance record for that booking (or empty if none exists)

#### Scenario: Attendance action button absent for athletes
- **WHEN** an atleta views the bookings panel showing their own booking
- **THEN** no attendance action button is rendered on the booking row

---

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

---

### Requirement: CLASES_AGOTADAS rejection code in BookingResult
The `BookingRejectionCode` type in `entrenamiento-restricciones.types.ts` SHALL include the literal `'CLASES_AGOTADAS'` in its union. The booking form component SHALL handle this code by displaying the message: `"No te quedan clases disponibles en tu suscripción al plan requerido. Contacta al administrador para renovar o ampliar tu plan."` No further action (e.g., redirect or retry) is required.

#### Scenario: CLASES_AGOTADAS is type-safe at service boundary
- **WHEN** the RPC raises a P0001 exception with message 'CLASES_AGOTADAS'
- **THEN** the service returns `BookingResult = { ok: false, code: 'CLASES_AGOTADAS', message: <human-readable string> }` and `BookingRejectionCode` includes this literal so TypeScript exhaustive checks compile without cast

#### Scenario: Booking form shows inline error for CLASES_AGOTADAS
- **WHEN** the `ReservaFormModal` (or equivalent booking UI component) receives a `BookingResult` with `code === 'CLASES_AGOTADAS'`
- **THEN** an inline error message is rendered inside the modal without closing it; the submit button is re-enabled so the user can dismiss and seek help
