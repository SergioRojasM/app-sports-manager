## MODIFIED Requirements

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

## ADDED Requirements

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
