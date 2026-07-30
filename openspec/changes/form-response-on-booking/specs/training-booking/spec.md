## ADDED Requirements

### Requirement: Form fill-out step gates booking when an internal form is attached
When the selected training instance has `formulario_id` set (an internal `formularios_plantillas` reference), submitting `ReservaFormModal` in create mode SHALL NOT call `submitCreate` directly. It MUST instead run the existing base field validation and, if it passes, close `ReservaFormModal` and open a new `FormularioRespuestaModal` rendering that template's sections before any reservation is created. Trainings with `formulario_tipo` of `ninguno` or `externo` SHALL be entirely unaffected — no second modal, `submitCreate` runs exactly as it did before this change.

#### Scenario: Internal form attached — fill-out step opens
- **WHEN** a training instance has `formulario_id` set and the user submits `ReservaFormModal` with all base fields valid
- **THEN** `ReservaFormModal` closes and `FormularioRespuestaModal` opens showing the attached template's sections, and no reservation has been created yet

#### Scenario: No form or external form — flow unchanged
- **WHEN** a training instance has `formulario_id = null` (tipo `ninguno` or `externo`)
- **THEN** submitting `ReservaFormModal` calls `submitCreate` directly and creates the reservation exactly as before this change, with no second modal rendered

#### Scenario: Base field validation still blocks the transition
- **WHEN** a training instance has `formulario_id` set and the user submits `ReservaFormModal` with an invalid base field (e.g., no level selected when categories exist)
- **THEN** the existing inline validation error is shown and `FormularioRespuestaModal` does not open

### Requirement: Self-booking form fill-out is mandatory when the training's form is obligatorio
When an atleta is booking for themself and the training's `formulario_obligatorio` is `true`, `FormularioRespuestaModal` SHALL NOT offer any way to skip filling out the form, and MUST block submission until every section with `seccion_tipo = 'datos'` and `campo_obligatorio = true` has a non-empty value.

#### Scenario: Self-booking, obligatorio — no skip option rendered
- **WHEN** an atleta opens the fill-out modal for a training with `formulario_obligatorio = true`
- **THEN** no "Reservar sin formulario" action is rendered anywhere in the modal

#### Scenario: Self-booking, obligatorio — required field left empty blocks submit
- **WHEN** an atleta attempts to submit the fill-out modal with a `campo_obligatorio` field left empty
- **THEN** submission is blocked, an inline error is shown on that field, and no reservation is created

### Requirement: Skip action available for optional self-booking and all staff bookings
`FormularioRespuestaModal` SHALL render a "Reservar sin formulario" action whenever the current booking is NOT a self-booking with `formulario_obligatorio = true` — i.e., whenever it is a self-booking with `formulario_obligatorio = false`, or any booking created by an administrador/entrenador on behalf of an athlete, regardless of the flag. Activating it SHALL create the reservation with `formulario_respuesta_id = null`, without requiring any field to be filled.

#### Scenario: Self-booking, not obligatorio — skip available
- **WHEN** an atleta opens the fill-out modal for a training with `formulario_obligatorio = false`
- **THEN** a "Reservar sin formulario" action is visible and, when clicked, creates the reservation immediately with no response persisted

#### Scenario: Staff booking, obligatorio — skip still available
- **WHEN** an administrador or entrenador opens the fill-out modal on behalf of an athlete for a training with `formulario_obligatorio = true`
- **THEN** a "Reservar sin formulario" action is visible and, when clicked, creates the reservation immediately with no response persisted

#### Scenario: Staff booking, not obligatorio — skip available
- **WHEN** an administrador or entrenador opens the fill-out modal on behalf of an athlete for a training with `formulario_obligatorio = false`
- **THEN** a "Reservar sin formulario" action is visible and behaves the same as the obligatorio case above

### Requirement: Booking creation carries the collected form response
`useReservaForm`'s `submitCreate` SHALL accept an optional payload of `{ formulario_plantilla_id, formulario_respuesta }` and merge it into the `CreateReservaInput` passed to `onCreateReserva`. `reservasService.create()` SHALL forward these as `p_formulario_plantilla_id`/`p_formulario_respuesta` to the `book_and_deduct_service_units` RPC. The resulting reservation's `formulario_respuesta_id` SHALL reflect the response the RPC inserted, or remain `null` when no payload was supplied.

#### Scenario: Submitting the fill-out form links the response
- **WHEN** the fill-out modal's "Guardar y reservar" action is used with all required fields completed
- **THEN** the created `reservas` row has `formulario_respuesta_id` set to the id of the newly inserted `formulario_respuestas` row, whose `respuesta` JSON matches the submitted values keyed by each field's `campo_nombre`

#### Scenario: Skipping the form leaves no response linked
- **WHEN** "Reservar sin formulario" is used
- **THEN** the created `reservas` row has `formulario_respuesta_id = null` and no `formulario_respuestas` row is inserted

### Requirement: Admin no-units confirmation replays the collected form response
When a staff booking with a submitted form response triggers the existing `ADMIN_CONFIRM_NO_UNITS` flow, the already-collected `formulario_plantilla_id`/`formulario_respuesta` values SHALL be preserved and replayed unchanged when the admin confirms, without requiring the form to be filled out a second time.

#### Scenario: Confirming a no-units booking preserves the submitted response
- **WHEN** a staff member fills out the form, submits, receives an `ADMIN_CONFIRM_NO_UNITS` rejection, and then confirms the booking anyway
- **THEN** the reservation created on confirmation has `formulario_respuesta_id` set to a `formulario_respuestas` row containing the same answers originally submitted — the athlete is not asked to fill out the form again

### Requirement: "Ver respuesta" action visible on reservation rows with a linked response
`ReservasPanel` SHALL render a "Ver respuesta" action on any reservation row whose `formulario_respuesta_id` is set, visible to administrador/entrenador for any row and to the atleta for their own row only. Activating it SHALL open a read-only viewer showing each answered field's label and value.

#### Scenario: Staff views any athlete's response
- **WHEN** an administrador or entrenador clicks "Ver respuesta" on a reservation row that has a linked response
- **THEN** a read-only modal opens showing the template's `datos` sections with each `campo_etiqueta` next to the submitted value

#### Scenario: Athlete views their own response
- **WHEN** an atleta clicks "Ver respuesta" on their own reservation row that has a linked response
- **THEN** the same read-only viewer opens with their submitted answers

#### Scenario: No action shown when no response is linked
- **WHEN** a reservation row's `formulario_respuesta_id` is `null` (no form was attached, or the form was skipped)
- **THEN** no "Ver respuesta" action is rendered on that row
