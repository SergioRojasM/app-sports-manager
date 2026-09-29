## ADDED Requirements

### Requirement: Wizard routes and access
The system SHALL render `EventoWizardPage` at two routes under the `(administrador)` route group:
- `/portal/orgs/[tenant_id]/gestion-eventos/nuevo` (create mode)
- `/portal/orgs/[tenant_id]/gestion-eventos/[evento_id]/editar` (edit mode)

The page SHALL follow the US-0116 visual system and render exactly one `h1`: "Nuevo evento" or "Editar evento". The breadcrumb SHALL label these segments "Nuevo evento" and "Editar evento", and SHALL never show a raw uuid.

#### Scenario: Admin opens the create page
- **WHEN** an active administrator of T navigates to `/portal/orgs/T/gestion-eventos/nuevo`
- **THEN** the wizard SHALL render on step 1 with an empty draft

#### Scenario: Non-administrator redirected
- **WHEN** a trainer or athlete of T opens either wizard URL
- **THEN** they SHALL be redirected to `/portal/orgs/T`

#### Scenario: Event not found
- **WHEN** the edit URL contains an id that does not exist or belongs to another tenant
- **THEN** the page SHALL show "Evento no encontrado" with a "Volver a eventos" link, and no event data

#### Scenario: Load failure
- **WHEN** loading the event or its option lists fails
- **THEN** the page SHALL show an error state with "Reintentar", which re-runs the load

### Requirement: Three-step stepper
The wizard SHALL show a stepper with three steps: "Configura tu evento", "Configura tus entradas", and "Configura tus métodos de pago".
- It MUST be an `<ol>` labelled "Pasos del evento". The current step has `aria-current="step"`, completed steps show a check, and steps with validation errors show the text "Revisar".
- Moving backwards SHALL always be allowed. Moving forward (with "Siguiente" or by clicking a later step) SHALL first validate the current step for completeness; on failure it SHALL stay on the step and focus the first invalid field.
- In edit mode every step SHALL be directly reachable.
- The current step SHALL be synced to `?paso=1|2|3`.
- Changing step MUST NOT discard data entered in any other step.

#### Scenario: Forward blocked by invalid step
- **WHEN** the admin clicks "Siguiente" on step 1 in create mode with an empty discipline
- **THEN** the wizard SHALL stay on step 1, show the inline error, and focus the discipline select

#### Scenario: Back keeps later data
- **WHEN** the admin fills a ticket on step 2, goes back to step 1, and returns to step 2
- **THEN** the ticket SHALL still be there with its values

#### Scenario: Step restored from URL
- **WHEN** the edit page loads with `?paso=3`
- **THEN** step 3 SHALL be displayed

### Requirement: Step 1 event configuration with live preview
Step 1 SHALL show the event form next to a live preview (stacked, with a "Ver vista previa" toggle, below `lg`). The preview SHALL switch between *Página* (default: `PublicTrainingDetalleBody` fed by `toDetallePreviewItem(draft)`) and *Tarjeta* (`EventoCard` with `hideActions`). Every edit SHALL update the preview without a network call. Prices in the preview SHALL come only from step-2 tickets with a valid value.

The form SHALL contain:
- `nombre`: required, max 150
- `descripcion`: max 300
- `descripcion_larga` (Markdown) and `pagina_evento_url` (http/https)
- a banner file: JPEG/PNG/WebP, max 5 MB, uploaded only on save, with "Quitar imagen"
- discipline: required on publish; a select of the tenant's active disciplines that stores the **name**
- `fecha_hora`: a Bogotá `datetime-local`, optional, and not in the past on create
- `duracion_minutos`
- venue selector (see the escenario requirement)
- `punto_encuentro`
- trainer multi-select (see the trainers requirement)
- `cupo_maximo`, `reserva_antelacion_horas`, `cancelacion_antelacion_horas` and `omitir_confirmacion_compra`
- `cronograma` and `incluye` row editors
- the `publico` toggle, and the `activo` toggle (labelled "Oculto" when off)

`estado` SHALL NOT be editable in the wizard.

#### Scenario: Preview updates live
- **WHEN** the admin types "Copa Verano" in the name field
- **THEN** the *Página* preview hero SHALL show "Copa Verano" immediately

#### Scenario: Card preview
- **WHEN** the admin switches the preview to *Tarjeta*
- **THEN** an `EventoCard` with the draft data and no actions menu SHALL be shown

#### Scenario: Invalid banner rejected
- **WHEN** the admin selects a 6 MB PNG or a GIF
- **THEN** an inline error SHALL be shown and the file SHALL NOT be used

#### Scenario: Discipline stored as name
- **WHEN** the admin selects the discipline "Running" and publishes
- **THEN** the saved event SHALL have `disciplina_id = 'Running'`

#### Scenario: Invalid URL
- **WHEN** `pagina_evento_url` is `ftp://x`
- **THEN** the error "Ingresa una URL válida (http o https)" SHALL be shown

### Requirement: Venue selector with inline creation
The escenario selector SHALL list the tenant's active scenarios (name and location), the option "Sin escenario", and "+ Crear nuevo escenario". The last one SHALL open the existing `ScenarioFormModal`, driven by `useScenarios` with an `onCreated` callback. On success the new scenario SHALL be added to the options and selected. The saved value SHALL be the full scenario snapshot, or `null` for "Sin escenario".

#### Scenario: Create and auto-select a venue
- **WHEN** the admin chooses "+ Crear nuevo escenario" and saves a valid scenario "Cancha Norte"
- **THEN** the modal SHALL close, and "Cancha Norte" SHALL be listed and selected

#### Scenario: Cancel restores the previous selection
- **WHEN** the admin opens the create-scenario modal and cancels
- **THEN** the previously selected option SHALL remain selected

#### Scenario: Scenario creation error stays in the modal
- **WHEN** creating the scenario fails
- **THEN** the modal SHALL stay open with its error message

#### Scenario: Snapshot saved
- **WHEN** the admin selects "Cancha 1" and saves
- **THEN** `escenario_id` SHALL be an object with that scenario's `id`, `nombre`, `tipo`, `ubicacion`, `direccion`, `coordenadas`, `capacidad` and `image_url`

### Requirement: Multiple trainers with experience
The trainer selector SHALL let the admin select zero or more of the tenant's trainers, through a searchable checkbox list. Each selected trainer SHALL get a row with an `experiencia` textarea (max 500) and a remove button. A trainer MUST NOT be selectable twice. The saved `entrenador_id` SHALL be `[{id, nombre, experiencia}]` in selection order.

#### Scenario: Two trainers with experience
- **WHEN** the admin selects "Ana" and "Luis", and writes an experience for each
- **THEN** the saved `entrenador_id` SHALL contain both objects, in that order, with their `experiencia` texts

### Requirement: Step 2 tickets, coupons and access form
Step 2 SHALL manage ticket cards. Each card SHALL have:
- `nombre`: required on publish, max 100, unique case-insensitively within the event
- `tipo_entrada`: Sencilla (default) or Múltiple. Múltiple shows a bundle multi-select of the tenant's other non-cancelled events, never the current one, with at least 1 required on publish. Switching back to Sencilla SHALL clear the bundle.
- `valor`: COP, a raw-string input, >= 0, required on publish, and never coerced from an empty string to 0
- `valida_desde` / `valida_hasta`: optional Bogotá datetimes, `desde < hasta`. `hasta` must not be after the event's end when `fecha_hora` is set.
- move up / move down, and delete (with confirmation when the ticket has coupons)
- a coupon editor: rows with `nombre`, `cupon` (uppercased while typing, `^[A-Z0-9_-]{3,30}$`, unique across the event), `descuento` (a percentage in `(0, 100]` with a "$X → $Y" preview), and an optional validity window. "Añadir cupón" SHALL be disabled on tickets with `valor = 0`.

Publishing SHALL require at least one ticket. The step SHALL also offer the access-form select: "Sin formulario", plus the tenant's active form templates, with a "Vista previa" that opens `FormularioPreviewModal`. When there are no templates, it SHALL show an empty state linking to `gestion-formularios`.

#### Scenario: Múltiple ticket requires a bundle on publish
- **WHEN** the admin publishes with a Múltiple ticket that has no bundled event
- **THEN** an inline error SHALL be shown on that ticket and nothing SHALL be saved

#### Scenario: Current event excluded from the bundle
- **WHEN** the admin opens the bundle selector while editing event E
- **THEN** E SHALL NOT be listed

#### Scenario: Empty value not coerced
- **WHEN** the admin clears a ticket's value and publishes
- **THEN** a validation error SHALL be shown, instead of the ticket being saved as free

#### Scenario: Duplicate coupon flagged before save
- **WHEN** two coupons of the event, on different tickets, both have code `PREVENTA`
- **THEN** both rows SHALL show a duplicate-code error before any request is sent

#### Scenario: Discount preview
- **WHEN** a coupon with `descuento = 20` is on a ticket with `valor = 50000`
- **THEN** the row SHALL show "$50.000 → $40.000"

#### Scenario: Free ticket cannot have coupons
- **WHEN** a ticket's value is 0
- **THEN** "Añadir cupón" SHALL be disabled, with the hint "Las entradas gratuitas no admiten cupones"

#### Scenario: Access form saved
- **WHEN** the admin selects the template "Inscripción torneo" and saves
- **THEN** `eventos.formulario_id` SHALL equal that template's id

### Requirement: Step 3 payment methods and summary
Step 3 SHALL list the tenant's active payment methods, ordered by `orden`, as checkbox cards, with "Seleccionar todos" / "Quitar todos". On publish, at least one method SHALL be required when any ticket has `valor > 0`. The saved `metodos_pago` SHALL be the snapshots of exactly the checked methods. A summary panel SHALL show the name, date, ticket count and price range, coupon count, form, and method count.

#### Scenario: Paid event without a method
- **WHEN** the admin publishes with a paid ticket and no method checked
- **THEN** the error "Selecciona al menos un método de pago para las entradas con costo" SHALL be shown

#### Scenario: Free event without methods
- **WHEN** every ticket is free and no method is checked
- **THEN** the publish SHALL succeed with `metodos_pago = []`

### Requirement: Draft save
A secondary "Guardar borrador" button SHALL be shown on every step in create mode, and when editing an event with `borrador = true`. It SHALL NOT be shown when editing a published event.
- It SHALL be disabled while `nombre` is empty (hint "Escribe el nombre del evento para guardar"), and disabled with the label "Borrador guardado" when there are no unsaved changes.
- It SHALL validate only the name and format errors, and call `guardarEventoCompleto` with `borrador: true`. On success it SHALL:
  - write the returned ticket and coupon ids back into the draft by `clientKey`
  - reset the unsaved-changes baseline
  - show a `role="status"` "Borrador guardado" confirmation, and update "Último guardado"
  - keep the admin on the same step with the same data
- On the first save of a new event, the URL SHALL change to `/gestion-eventos/{id}/editar?paso={step}` without a visible reload or loss of state.
- The header SHALL show a "Borrador" tag for drafts.

#### Scenario: Name-only draft
- **WHEN** the admin types only a name on a new event and clicks "Guardar borrador"
- **THEN** the event SHALL be saved as a draft, the URL SHALL become its edit URL with `?paso=1`, and the typed data SHALL remain on screen

#### Scenario: Button disabled without name
- **WHEN** `nombre` is empty
- **THEN** "Guardar borrador" SHALL be disabled, with the hint announced

#### Scenario: Incomplete data kept
- **WHEN** the admin saves a draft with a ticket that has no value and a coupon that has no code, closes the tab, and reopens the event via "Continuar editando"
- **THEN** the ticket and the coupon SHALL be restored exactly, with no validation errors shown until publishing

#### Scenario: No duplicate rows on repeated draft saves
- **WHEN** the admin saves a draft, edits a ticket, and saves the draft again
- **THEN** the event SHALL still have the same number of tickets, with the edit applied

#### Scenario: Format error blocks the draft
- **WHEN** a coupon code is `a!` and the admin clicks "Guardar borrador"
- **THEN** the inline error SHALL be shown, the wizard SHALL jump to step 2, and nothing SHALL be saved

#### Scenario: Not offered for published events
- **WHEN** the admin edits an event with `borrador = false`
- **THEN** "Guardar borrador" SHALL NOT be shown

### Requirement: Final save
The primary button SHALL be "Publicar evento" (on step 3 only) in create mode and for drafts, and "Guardar cambios" (on every step) for published events. It SHALL:
1. Validate all steps; on failure, jump to the first step with errors and mark each invalid step "Revisar".
2. Upload a newly chosen banner.
3. Call `guardarEventoCompleto` with `borrador: false`.
4. Navigate to `/gestion-eventos?guardado=creado` when publishing a new event or a draft, and to `?guardado=editado` when saving a published event.

While either save is in flight, every control SHALL be disabled, and the pressed button SHALL read "Guardando…". On failure, the mapped message SHALL be shown in a `role="alert"` block, the draft SHALL be kept, and a retry SHALL be possible.

#### Scenario: Hidden-step error on publish
- **WHEN** the admin clicks "Guardar cambios" on step 1 while a step-2 ticket has no name
- **THEN** the wizard SHALL switch to step 2, show the error, and mark step 2 "Revisar"

#### Scenario: Publish success
- **WHEN** a complete new event is published
- **THEN** the browser SHALL navigate to the list with the "Evento creado correctamente." banner, and the event SHALL appear with its discipline, venue, trainer names and price summary

#### Scenario: Save error
- **WHEN** the RPC fails with `duplicate_cupon`
- **THEN** "El código de cupón ya está en uso en este evento." SHALL be shown, and all entered data SHALL remain

### Requirement: Edit mode restores and preserves stale values
In edit mode the wizard SHALL restore every stored field on all three steps. Stored values that no longer match a live option SHALL be kept and marked:
- a discipline name that no longer exists → an extra option "{nombre} (ya no existe)"
- a venue snapshot that is not among the active scenarios → "{nombre} (guardado en el evento)"
- a payment-method snapshot that is inactive or deleted → checked, with "(inactivo o eliminado)"; it cannot be re-checked once unchecked

Bundle ids of deleted events SHALL be dropped, with the warning "N eventos del paquete ya no existen y se quitaron".

#### Scenario: Round trip
- **WHEN** an event with 2 trainers (with experience), 2 ordered tickets (one Múltiple), coupons, a form and 2 payment methods is opened for edit
- **THEN** every one of those values SHALL be shown exactly as saved

#### Scenario: Stale discipline kept
- **WHEN** the event's discipline "Trail" was deleted from the tenant
- **THEN** the select SHALL show "Trail (ya no existe)" selected, and saving without changing it SHALL keep `disciplina_id = 'Trail'`

### Requirement: Unsaved-changes guard
While the draft differs from its last saved or loaded state, closing or reloading the tab SHALL trigger the browser's `beforeunload` prompt. "Volver a eventos" and "Cancelar" SHALL open a dialog reading "Tienes cambios sin guardar. ¿Salir sin guardar?". With no unsaved changes, they SHALL navigate directly.

#### Scenario: Guard with changes
- **WHEN** the admin edits the name and clicks "Volver a eventos"
- **THEN** the confirmation dialog SHALL open, and the admin SHALL stay unless they confirm

#### Scenario: No guard after a draft save
- **WHEN** the admin saves a draft and then clicks "Volver a eventos"
- **THEN** the list SHALL open without a prompt

### Requirement: Wizard accessibility
- Every input MUST have a label. Repeated row inputs MUST have indexed `aria-label`s (for example "Código del cupón 1 de la entrada 2"). Invalid fields MUST set `aria-invalid` and reference their error through `aria-describedby`.
- On a step change, focus MUST move to the step heading. On a failed validation, focus MUST move to the first invalid field.
- Ticket type and preview mode MUST be native radio groups or `role="radiogroup"`. Payment-method cards MUST be real checkboxes.
- Dialogs (create scenario, form preview, leave without saving, delete ticket) MUST use `role="dialog"` and `aria-modal`, move focus inside on open, and close on `Escape` unless submitting.

#### Scenario: Focus on invalid field
- **WHEN** validation fails on step 2 for the second ticket's value
- **THEN** focus SHALL be on that input, which SHALL have `aria-invalid="true"`
