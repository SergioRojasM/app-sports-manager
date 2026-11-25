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
The system SHALL display every booking or cancellation rejection (`BookingRejection` held in `useReservas().bookingRejection`) in a modal dialog, `ReservaRechazoModal`, rendered on `document.body` above the reservations drawer, `ReservaFormModal`, `FormularioRespuestaModal` and any dropdown they contain. The modal MUST render the `message` of the `BookingRejection` as plain text. The rejection MUST NOT be rendered as an inline alert inside the drawer. The modal MUST close through its action button(s), the Escape key and a backdrop click; closing MUST only clear the rejection and MUST NOT close the booking dialog underneath or discard its entered data. The rejection MUST be cleared when the panel is closed or when the user retries the action successfully.

The default variant of the modal SHALL be titled "No es posible cancelar la reserva" when the rejection code is `TIMING_CANCELACION` and "No es posible completar la reserva" for every other code, and SHALL offer a single "Entendido" action.

The modal MUST expose `role="dialog"`, `aria-modal="true"` and an accessible name bound to its title, and MUST receive focus when it opens.

#### Scenario: Rejection modal displayed above the booking dialog
- **WHEN** an atleta's booking attempt is rejected by any restriction check while `ReservaFormModal` is open
- **THEN** `ReservaRechazoModal` appears fully visible above `ReservaFormModal` and the drawer, showing the human-readable rejection message

#### Scenario: Rejection modal displayed above the form-answers dialog
- **WHEN** a booking submitted from `FormularioRespuestaModal` ("Guardar y reservar") is rejected
- **THEN** `ReservaRechazoModal` appears above `FormularioRespuestaModal`

#### Scenario: No inline rejection alert in the drawer
- **WHEN** a booking or cancellation is rejected
- **THEN** the drawer renders no inline rejection alert; the rejection is shown only in the modal

#### Scenario: Default variant for a non-plan rejection
- **WHEN** a booking is rejected for a reason not solved by acquiring a plan (booking window, insufficient level, inactive membership, past training, pending plan request, plan no longer available, missing form fields, incomplete profile)
- **THEN** the modal is titled "No es posible completar la reserva", shows the rejection message and a single "Entendido" button, with no link to the plans page

#### Scenario: Rejected cancellation
- **WHEN** a cancellation is rejected with code `TIMING_CANCELACION`
- **THEN** the modal is titled "No es posible cancelar la reserva" and shows the rejection message with an "Entendido" button

#### Scenario: Closing the modal keeps the booking dialog
- **WHEN** the user closes the rejection modal with its button, Escape or a backdrop click
- **THEN** only the rejection modal closes; the booking dialog underneath stays open with the previously entered data

#### Scenario: Rejection repeats on retry
- **WHEN** the user closes the modal and retries the booking, and it is rejected again
- **THEN** the modal is shown again

#### Scenario: Rejection cleared on panel close
- **WHEN** the user closes `ReservasPanel` after a rejection was shown
- **THEN** the `bookingRejection` state is cleared; re-opening the panel shows no modal until a new attempt is made

#### Scenario: Rejection cleared on successful retry
- **WHEN** a user retries a booking action and it succeeds
- **THEN** no rejection modal is shown and the panel reflects the new booking state

#### Scenario: Admin or trainer booking on behalf sees the modal
- **WHEN** an administrador or entrenador creates a booking on behalf of an atleta and it is rejected
- **THEN** the rejection message is shown in `ReservaRechazoModal` (not silently ignored), using the same `message` string

#### Scenario: Admin no-units confirmation unchanged
- **WHEN** an administrador's booking returns `ADMIN_CONFIRM_NO_UNITS`
- **THEN** the existing confirmation inside `ReservaFormModal` is shown and `ReservaRechazoModal` does not open

---

### Requirement: CLASES_AGOTADAS rejection code in BookingResult
The `BookingRejectionCode` type in `entrenamiento-restricciones.types.ts` SHALL include the literal `'CLASES_AGOTADAS'` in its union. The booking form component SHALL handle this code by displaying the message: `"No te quedan clases disponibles en tu suscripción al plan requerido. Contacta al administrador para renovar o ampliar tu plan."` No further action (e.g., redirect or retry) is required.

#### Scenario: CLASES_AGOTADAS is type-safe at service boundary
- **WHEN** the RPC raises a P0001 exception with message 'CLASES_AGOTADAS'
- **THEN** the service returns `BookingResult = { ok: false, code: 'CLASES_AGOTADAS', message: <human-readable string> }` and `BookingRejectionCode` includes this literal so TypeScript exhaustive checks compile without cast

#### Scenario: Booking form shows inline error for CLASES_AGOTADAS
- **WHEN** the `ReservaFormModal` (or equivalent booking UI component) receives a `BookingResult` with `code === 'CLASES_AGOTADAS'`
- **THEN** an inline error message is rendered inside the modal without closing it; the submit button is re-enabled so the user can dismiss and seek help

---

### Requirement: Plan-offer flag on booking rejections
The `BookingRejection` type in `entrenamiento-restricciones.types.ts` SHALL include an optional boolean `ofrecerPlan`. `reservasService.create` SHALL set `ofrecerPlan: true` only on rejections that are solved by acquiring a plan: (a) `SERVICIO_REQUERIDO` raised because no active subscription grants a required service, (b) `UNIDADES_AGOTADAS` raised before the RPC because the service units are exhausted, (c) `UNIDADES_AGOTADAS` raised by the RPC, and (d) `SERVICIO_REQUERIDO` raised from the RPC error `SUSCRIPCION_INACTIVA`. Every other rejection MUST leave the flag unset. Rejection codes and messages MUST NOT change.

#### Scenario: Missing service sets the flag
- **WHEN** an atleta without an active subscription granting the training's required service attempts to book
- **THEN** the service returns `{ ok: false, code: 'SERVICIO_REQUERIDO', message, ofrecerPlan: true }`

#### Scenario: Exhausted units set the flag
- **WHEN** the atleta's subscription has no units left for a required service
- **THEN** the service returns `{ ok: false, code: 'UNIDADES_AGOTADAS', message, ofrecerPlan: true }`

#### Scenario: Pending plan request does not set the flag
- **WHEN** the RPC rejects the booking with `SUSCRIPCION_PENDIENTE_EXISTENTE`
- **THEN** the service returns a `SERVICIO_REQUERIDO` rejection without `ofrecerPlan`

#### Scenario: Non-plan restrictions do not set the flag
- **WHEN** a booking is rejected with `TIMING_RESERVA`, `USUARIO_INACTIVO`, `NIVEL_INSUFICIENTE`, `ENTRENAMIENTO_PASADO`, `FORMULARIO_CAMPOS_FALTANTES` or `PERFIL_INCOMPLETO`
- **THEN** the rejection has no `ofrecerPlan`

### Requirement: Plan offer in the booking rejection modal
When a rejection carries `ofrecerPlan: true` and the rejected booking was for the currently authenticated user, `ReservaRechazoModal` SHALL render its plan-offer variant: title "¿Deseas adquirir un plan?", the rejection message followed by "Adquiere un plan para poder reservar este entrenamiento.", a primary "Ver planes" link that navigates in the same tab to `/portal/orgs/{tenant_id}/gestion-planes` of the training's tenant, and a secondary "Ahora no" button that closes the modal. When the booking was made on behalf of another athlete, the default variant MUST be used even if `ofrecerPlan` is true.

#### Scenario: Athlete without a plan is offered the plans page
- **WHEN** an atleta with no active subscription granting the required service confirms a booking for themself
- **THEN** the modal is titled "¿Deseas adquirir un plan?", shows the rejection reason and "Adquiere un plan para poder reservar este entrenamiento.", and offers "Ver planes" and "Ahora no"

#### Scenario: Ver planes navigates to the tenant plans page
- **WHEN** the user activates "Ver planes"
- **THEN** the browser navigates in the same tab to `/portal/orgs/{tenant_id}/gestion-planes`

#### Scenario: Ahora no dismisses the offer
- **WHEN** the user activates "Ahora no"
- **THEN** the modal closes and the booking dialog underneath remains open

#### Scenario: Exhausted units offer the plans page
- **WHEN** an atleta's booking for themself is rejected with `UNIDADES_AGOTADAS`
- **THEN** the plan-offer variant is shown

#### Scenario: Trainer booking for another athlete gets the default variant
- **WHEN** an entrenador books on behalf of another athlete who has no plan
- **THEN** the default variant is shown, with no "¿Deseas adquirir un plan?" title and no plans link

#### Scenario: Trainer booking for themself gets the plan offer
- **WHEN** an entrenador books for themself and has no plan granting the required service
- **THEN** the plan-offer variant is shown

### Requirement: ReservasPanel auto-opens the booking dialog on request
`ReservasPanel` SHALL accept an optional `autoReservar` boolean. When the panel opens with `autoReservar` true, it SHALL open the self-booking dialog (`ReservaFormModal` for the current user) automatically, exactly once per panel opening, after the current user and the panel data (reservations, capacity, categories) have loaded, and only if the user is not an administrador or entrenador, has no active reservation for the training, the training is not past, and capacity is available. Otherwise the panel MUST stay open without opening the dialog. Opening the panel without `autoReservar` MUST never auto-open the dialog.

#### Scenario: Dialog auto-opens for an athlete without a reservation
- **WHEN** the panel opens with `autoReservar` for an upcoming training with available capacity and the atleta has no active reservation
- **THEN** once loading finishes, `ReservaFormModal` opens in create mode for the current user with the level auto-selected as in the regular flow

#### Scenario: Existing reservation prevents auto-open
- **WHEN** the panel opens with `autoReservar` and the atleta already has an active reservation for the training
- **THEN** the panel shows that reservation and the booking dialog does not open

#### Scenario: Auto-open happens only once
- **WHEN** the atleta cancels the auto-opened booking dialog
- **THEN** the panel stays open and the dialog does not reopen by itself

#### Scenario: Regular opening does not auto-open
- **WHEN** the panel is opened through "Ver reservas"
- **THEN** the booking dialog does not open until the user presses "Reservar"
