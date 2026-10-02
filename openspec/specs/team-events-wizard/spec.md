# team-events-wizard Specification

## Purpose
Defines the administrator's full-page create/edit wizard for team events (US-0119): routes, the three-step stepper, the step 1–3 fields and rules, draft vs. final save, edit-mode restore of stale snapshots, the preview modal, the event-page layout variant, the unsaved-changes guard and accessibility.
## Requirements
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
Step 1 SHALL show the event form as a single centered column. The live preview SHALL NOT be inline: a "Vista previa" button in the wizard footer, available on every step, SHALL open `EventoPreviewModal`, a large dialog rendered on `document.body`. The preview SHALL switch between *Página* (default: `EventoDetalleBody`, fed by `toDetallePreviewItem(draft)`, which returns an `EventoPublicoDetalle` including the trainers with `experiencia`, the ticket options, and the organization name: the event's stored `nombre_tenant` in edit mode, or the tenant's current name before a new event's first save) and *Tarjeta* (`EventoCard` with `hideActions`). It SHALL reflect the current draft without a network call. Prices in the preview SHALL come only from step-2 tickets with a valid value.

The form SHALL contain:
- `nombre`: required, max 150
- `descripcion`: max 300
- `descripcion_larga` (Markdown) and `pagina_evento_url` (http/https)
- a banner file: JPEG/PNG/WebP, max 5 MB, uploaded only on save, with "Quitar imagen"
- discipline: required on publish; a select of the tenant's active disciplines that stores the **name**
- `fecha_hora`: a Bogotá `datetime-local`, optional, and not in the past on create
- `duracion_minutos`
- venue selector (see the escenario requirement)
- `punto_encuentro`: a Google Maps link (placeholder `https://maps.app.goo.gl/KAuYCWHmrx1udyUdA?g_st=ic`), shown on the event page as a location link
- trainer multi-select (see the trainers requirement)
- `cupo_maximo`, `reserva_antelacion_horas`, `cancelacion_antelacion_horas` and `omitir_confirmacion_compra`
- `cronograma` and `incluye` row editors, each row laid out as 1/3 (hora / título) + 2/3 (descripción) + delete button
- the `publico` toggle, and the `activo` toggle: checked means active, labelled "Activo" / "Inactivo", with the description "Si está activo, se publicará en el panel de eventos públicos. Si está inactivo, solo será visible para el administrador." (US-0120; replaces the inverted "Oculto" toggle)

`estado` SHALL NOT be editable in the wizard.

#### Scenario: Preview reflects the draft
- **WHEN** the admin types "Copa Verano" in the name field and clicks "Vista previa" in the footer
- **THEN** a dialog "Vista previa del evento" SHALL open, and its *Página* hero SHALL show "Copa Verano"

#### Scenario: Preview modal closes
- **WHEN** the preview dialog is open and the admin presses Escape, clicks the close button, or clicks the backdrop
- **THEN** the dialog SHALL close and the draft SHALL be unchanged

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

#### Scenario: Activo toggle
- **WHEN** the admin opens step 1 of a new event
- **THEN** the Visibilidad section SHALL show a checked "Activo" toggle with the description "Si está activo, se publicará en el panel de eventos públicos. Si está inactivo, solo será visible para el administrador.", and turning it off SHALL relabel it "Inactivo" and save `activo = false`

#### Scenario: Preview does not depend on public-training components
- **WHEN** the *Página* preview is rendered
- **THEN** it SHALL be rendered by `EventoDetalleBody` from `components/portal/eventos/detalle`, and no `entrenamientos-publicos` component SHALL be imported by the wizard

#### Scenario: Preview shows the organization name
- **WHEN** an admin of "Wolfpack Club" opens the preview while creating a new event, or while editing an event whose `nombre_tenant = 'Wolfpack Club'`
- **THEN** the *Página* hero SHALL show "Wolfpack Club"

#### Scenario: Preview shows trainers but not payment methods
- **WHEN** the draft has a trainer "Ana" with experience "10 años en trail" and one checked payment method "Nequi"
- **THEN** the *Página* preview SHALL show "Ana" with "10 años en trail" in Entrenadores, and SHALL NOT show "Nequi" (payment methods belong to the ticket-purchase flow)

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
- "Venta disponible desde" / "Venta disponible hasta" (`valida_desde` / `valida_hasta`): optional Bogotá datetimes, `desde < hasta`. `hasta` must not be after the event's end when `fecha_hora` is set. A newly added ticket SHALL be pre-filled with *desde* = today (Bogotá) at 00:00 and *hasta* = the event's `fecha_hora` (empty when the event has no date).
- move up / move down, and delete (with confirmation when the ticket has coupons)
- a coupon editor: rows with `nombre`, `cupon` (uppercased while typing, `^[A-Z0-9_-]{3,30}$`, unique across the event), `descuento` (a percentage in `(0, 100]` with a "$X → $Y" preview), and an optional validity window. "Añadir cupón" SHALL be disabled on tickets with `valor = 0`.

Publishing SHALL require at least one ticket. The step SHALL also offer the access-form select: "Sin formulario", plus the tenant's active form templates, with a "Vista previa" that opens `FormularioPreviewModal`. When there are no templates, it SHALL show an empty state linking to `gestion-formularios`.

#### Scenario: Sale window defaults
- **WHEN** the event's date is 2026-12-12 07:30, and the admin adds a ticket on 2026-09-29
- **THEN** "Venta disponible desde" SHALL be `2026-09-29T00:00` and "Venta disponible hasta" SHALL be `2026-12-12T07:30`

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
Step 3 SHALL show two sections that the administrator fills in, both empty on a new event:

1. **"Métodos para todas las entradas"**, with the helper text "Estos métodos se muestran a quienes compren cualquier entrada del evento." and the empty state "Aún no has agregado métodos de pago para todas las entradas." Its methods are saved in the event's `metodos_pago`.
2. **"Métodos para una entrada específica"**, with the helper text "Estos métodos solo se muestran a quienes compren la entrada indicada." It SHALL show one block per ticket of the draft, in on-screen order, titled with the ticket name (fallback "Entrada sin nombre") and its price, each with its own list and the empty state "Sin métodos específicos". Each block's methods are saved in that ticket's `metodos_pago`. When the draft has no tickets it SHALL show "Agrega entradas en el paso anterior para asignarles métodos de pago." and no add action.

Section 1 and every ticket block SHALL have an "Agregar método de pago" action offering:
- **"Elegir un método existente"**: the tenant's active payment methods ordered by `orden`, excluding the ones already in the target list and, for a ticket, the ones already in section 1. Choosing one SHALL append its snapshot with `origen: 'tenant'`. When none is left it SHALL show "No hay más métodos de tu organización para agregar."
- **"Crear un método solo para este evento"** (see "Event-only payment methods").

The step SHALL NOT offer "Seleccionar todos" / "Quitar todos" and SHALL NOT pre-select any tenant method.

Each method card SHALL show the name, the tipo label, `valor`, `url`, `comentarios`, and a "Quitar" action. In addition:
- Methods with `tipo = 'efectivo'` SHALL carry the tag "No disponible para compra en línea".
- Methods with `origen = 'evento'` SHALL carry the tag "Solo este evento".
- Methods whose `origen` is not `'evento'` and whose `id` is not among the tenant's active methods SHALL be marked "(inactivo o eliminado)" and SHALL stay until removed.

Consistency rules:
- A method `id` SHALL appear at most once per list.
- Adding a method to section 1 SHALL remove the same `id` from every ticket list.
- Deleting a ticket in step 2 SHALL discard its methods.

Validation and warnings:
- On publish, every ticket with `valor > 0` SHALL have at least one method between section 1 and its own list. When section 1 and every ticket list are empty, the error "Agrega al menos un método de pago para las entradas con costo." SHALL be shown on section 1. Otherwise each uncovered ticket block SHALL show "Esta entrada tiene costo y no tiene métodos de pago.". Either error SHALL mark step 3 as "Revisar". Draft saves SHALL NOT be blocked.
- For each ticket with `valor > 0` whose methods (section 1 plus its own) are all cash, the step SHALL show the warning "Los compradores de «{entrada}» no podrán pagar en línea: el efectivo no se ofrece en la compra de entradas." Publishing SHALL NOT be blocked by it.
- When every ticket is free, the step SHALL show "Todas las entradas son gratuitas: no es obligatorio seleccionar métodos de pago."

The saved event `metodos_pago` SHALL be exactly the snapshots of section 1, and each ticket's `metodos_pago` exactly the snapshots of its block.

A summary panel SHALL show the name, date, ticket count and price range, coupon count, form, and the method count as "{n} para todas las entradas · {m} por entrada" (or "Ninguno" when both are 0).

#### Scenario: New event starts empty
- **WHEN** the admin opens step 3 of a new event of a tenant with 3 active payment methods
- **THEN** both sections SHALL be empty and no method SHALL be selected

#### Scenario: Add an existing method for all tickets
- **WHEN** the admin uses "Agregar método de pago" → "Elegir un método existente" in section 1 and picks "Nequi"
- **THEN** "Nequi" SHALL appear in section 1 and, after saving, in the event's `metodos_pago`

#### Scenario: Add a method to one ticket
- **WHEN** the admin adds "Daviplata" to the block of ticket "VIP" and saves
- **THEN** only the "VIP" row of `evento_entradas` SHALL contain "Daviplata" in `metodos_pago`, and the event's `metodos_pago` SHALL NOT contain it

#### Scenario: Picker excludes methods already added
- **WHEN** "Nequi" is in section 1 and the admin opens "Elegir un método existente" for a ticket
- **THEN** "Nequi" SHALL NOT be offered

#### Scenario: Promoting a method to all tickets
- **WHEN** ticket "VIP" has "Daviplata" and the admin adds "Daviplata" to section 1
- **THEN** "Daviplata" SHALL be removed from the "VIP" block

#### Scenario: No tickets yet
- **WHEN** the draft has no tickets
- **THEN** section 2 SHALL show "Agrega entradas en el paso anterior para asignarles métodos de pago." and no add action

#### Scenario: Paid event without any method
- **WHEN** the admin publishes with a paid ticket and no method in either section
- **THEN** the error "Agrega al menos un método de pago para las entradas con costo." SHALL be shown and the event SHALL NOT be published

#### Scenario: One paid ticket uncovered
- **WHEN** section 1 is empty, paid ticket "VIP" has a method and paid ticket "General" has none, and the admin publishes
- **THEN** the "General" block SHALL show "Esta entrada tiene costo y no tiene métodos de pago." and the event SHALL NOT be published

#### Scenario: Paid ticket covered only by its own method
- **WHEN** section 1 is empty and the only paid ticket has one method of its own
- **THEN** the publish SHALL succeed

#### Scenario: Draft is not blocked
- **WHEN** the admin saves a draft with a paid ticket and no methods
- **THEN** the draft SHALL be saved

#### Scenario: Free event without methods
- **WHEN** every ticket is free and no method was added
- **THEN** the publish SHALL succeed with `metodos_pago = []` on the event and on every ticket

#### Scenario: Cash method tagged
- **WHEN** a cash method is in any list
- **THEN** its card SHALL show "No disponible para compra en línea"

#### Scenario: Cash-only warning per ticket
- **WHEN** paid ticket "General" has only cash methods between section 1 and its own list
- **THEN** the warning naming "General" SHALL be shown, and publishing SHALL still be allowed

#### Scenario: Existing event keeps its methods
- **WHEN** an event saved before this change with 2 methods in `metodos_pago` is opened for edit
- **THEN** both SHALL be listed in section 1 and every ticket block SHALL be empty

#### Scenario: Deleted ticket drops its methods
- **WHEN** the admin deletes in step 2 a ticket that had its own methods and saves
- **THEN** the ticket row and its methods SHALL no longer exist

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
- Dialogs (event preview, create scenario, form preview, leave without saving, delete ticket) MUST use `role="dialog"` and `aria-modal`, move focus inside on open, and close on `Escape` unless submitting.
- Every wizard dialog MUST render on `document.body` (`BodyPortal`), so it is painted above the sticky footer and never clipped by a backdrop-blur ancestor.

#### Scenario: Dialogs above the footer
- **WHEN** the create-scenario or the preview dialog is open
- **THEN** the element at the footer's position SHALL belong to the dialog or its backdrop, not to the wizard footer

#### Scenario: Focus on invalid field
- **WHEN** validation fails on step 2 for the second ticket's value
- **THEN** focus SHALL be on that input, which SHALL have `aria-invalid="true"`

### Requirement: Event page layout
The event page (the `/eventos/[event_id]` and `/portal/eventos/[event_id]` detail pages, and the wizard preview) SHALL be rendered by `EventoDetalleBody` in `src/components/portal/eventos/detalle/`. It SHALL NOT use `PublicTrainingDetalleBody`. Public-training pages keep `PublicTrainingDetalleBody` with the default `entrenamiento` variant, and their behavior is unchanged. The event page SHALL follow these rules:
- The kind tag SHALL read "Evento público" or "Evento privado".
- The hero SHALL show the organization name (`nombre_tenant`) when it is not empty.
- The "Ubicación" and "Reserva tu cupo" cards SHALL NOT be rendered.
- The header's location item SHALL render `punto_encuentro` as a "Ver ubicación" link, opening in a new tab, when it is an http(s) URL. Its title SHALL be the venue name, or "Punto de encuentro" when there is no venue. A non-URL value SHALL render as plain text.
- The header SHALL show "Reserva hasta N h antes" when `reserva_antelacion_horas` is set.
- The header SHALL show "Página del evento" with a "Ver página oficial" link, opening in a new tab, when `pagina_evento_url` is an http(s) URL.
- The body SHALL include Entrenadores (name + `experiencia`) and Entradas (the `precio` options) sections, each hidden when empty. It SHALL NOT show the event's payment methods; they are part of the ticket-purchase flow.
- Call-to-action buttons SHALL read "Obtener entrada".
- The closing banner SHALL show only the title "Reserva tu cupo", with no subtitle.

#### Scenario: Location as a link
- **WHEN** `punto_encuentro` is `https://maps.app.goo.gl/KAuYCWHmrx1udyUdA?g_st=ic`
- **THEN** the header SHALL show a "Ver ubicación" link with that href and `target="_blank"`, and no "Ubicación" card SHALL be rendered

#### Scenario: Lead time and official page in the header
- **WHEN** `reserva_antelacion_horas = 24` and `pagina_evento_url = 'https://wolfpack.com/trail-21k'`
- **THEN** the header SHALL show "Reserva hasta 24 h antes" and a "Ver página oficial" link to that URL, and no "Reserva tu cupo" card SHALL be rendered

#### Scenario: Closing banner
- **WHEN** the event page is rendered
- **THEN** the closing banner title SHALL be "Reserva tu cupo", with no subtitle, and its button SHALL read "Obtener entrada"

#### Scenario: Organization shown on the event page
- **WHEN** an event with `nombre_tenant = 'Wolfpack Club'` is rendered on a detail page
- **THEN** the hero SHALL show "Wolfpack Club"

### Requirement: Cancellation policy helper
Step 1 SHALL show the helper text "Déjalo vacío si las entradas no admiten cancelación ni reembolso." under the `cancelacion_antelacion_horas` field.

#### Scenario: Helper shown
- **WHEN** the admin opens step 1
- **THEN** the helper text SHALL be shown under the cancellation field

### Requirement: Múltiple bundle limited to one form
A *Múltiple* purchase only asks for the form of the event the ticket belongs to. The bundle selector SHALL therefore:
- show the notice "Al comprar esta entrada solo se pide el formulario de este evento. Por eso solo puedes incluir eventos sin formulario o con el mismo formulario.";
- disable (not selectable) every candidate event whose `formulario_id` is set and differs from the event's current form, tagging it "Formulario distinto";
- keep an already selected conflicting event checked so it can be removed, and show the inline error "Quita «{nombre}»: usa un formulario distinto al de este evento.".

The server errors SHALL be mapped to:
- `BUNDLE_FORMULARIO_DISTINTO` → "Una entrada múltiple incluye un evento con un formulario distinto. Solo puedes incluir eventos sin formulario o con el mismo formulario de este evento."
- `FORMULARIO_EN_PAQUETE_DISTINTO` → "Este evento está incluido en la entrada múltiple de otro evento que usa un formulario distinto. Usa el mismo formulario o quítalo de ese paquete."

#### Scenario: Event with another form cannot be picked
- **WHEN** the event uses form F1 and the tenant has another event with form F2
- **THEN** that event SHALL be listed disabled with the tag "Formulario distinto"

#### Scenario: Event without a form can be picked
- **WHEN** a candidate event has no form
- **THEN** it SHALL be selectable

#### Scenario: Form changed after choosing the bundle
- **WHEN** the admin selects an event with form F1 and then changes this event's form to F2
- **THEN** the selector SHALL show the inline error naming that event, and publishing SHALL fail with the mapped `BUNDLE_FORMULARIO_DISTINTO` message

### Requirement: Payment method snapshot includes the QR image
`EventoMetodoPagoSnapshot` SHALL have an optional `qr_url?: string | null`. When the administrator adds an existing tenant payment method in step 3 (to all tickets or to one ticket), the stored snapshot SHALL copy the method's current `qr_url` (or `null`). An event-only method SHALL store the signed URL of the image uploaded in its form (or `null`). Every method card in step 3, and every method offered by "Elegir un método existente", that has `qr_url` SHALL show the "QR" indicator. Snapshots saved before US-0128 SHALL remain valid without the key.

#### Scenario: Adding a method with a QR image
- **WHEN** the administrator adds a tenant payment method with `qr_url` and saves the event
- **THEN** the stored snapshot for that method SHALL contain the same `qr_url`

#### Scenario: Adding a method without a QR image
- **WHEN** the administrator adds a tenant payment method without `qr_url` and saves the event
- **THEN** the snapshot element SHALL have `qr_url` null and the save SHALL succeed

#### Scenario: Existing event is not backfilled
- **WHEN** a QR image is added to a tenant payment method already present in a saved event
- **THEN** the saved event's snapshot SHALL remain unchanged until the administrator removes and adds that method again and saves

#### Scenario: QR indicator in the step
- **WHEN** step 3 shows a method with `qr_url`
- **THEN** its card SHALL show the "QR" indicator

### Requirement: Event-only payment methods
"Crear un método solo para este evento" SHALL open the tenant payment method form (`MetodoPagoFormModal`) in an event variant: title "Nuevo método de pago del evento", helper text "Este método solo existe en este evento. No se guarda en los métodos de pago de tu organización.", no "Activo" toggle, and the same fields and validations as the tenant form (`nombre` required, `tipo` required, `valor`, `url` http/https only, `comentarios`, optional "Imagen QR" JPEG/PNG/WebP up to 2 MB).

On submit the wizard SHALL generate a UUID `id` in the client, upload the QR image (when chosen) to `orgs/{tenant_id}/metodos-pago/{id}/qr-{ts}.{ext}` and append the snapshot `{id, nombre, tipo, valor, url, comentarios, qr_url, origen: 'evento'}` to the target list. It SHALL NOT insert, update or delete any row of `tenant_metodos_pago`. When the upload fails, the form SHALL stay open with the error and nothing SHALL be added.

Event-only method cards SHALL also offer "Editar", which reopens the form pre-filled (title "Editar método de pago del evento") and replaces the snapshot in place keeping its `id`. Methods with another `origen` SHALL NOT be editable in the wizard.

`EventoMetodoPagoSnapshot` SHALL have an optional `origen?: 'tenant' | 'evento'`; a snapshot without it SHALL be treated as `'tenant'`.

#### Scenario: Event-only method is not stored in the tenant
- **WHEN** the admin creates the event-only method "Cuenta del torneo" in section 1 and saves the event
- **THEN** the event's `metodos_pago` SHALL contain it with `origen = 'evento'`, and `tenant_metodos_pago` SHALL have no new row

#### Scenario: Event-only method for one ticket
- **WHEN** the admin creates an event-only method in the block of ticket "VIP" and saves
- **THEN** it SHALL be stored only in that ticket's `metodos_pago`

#### Scenario: Same validations as the tenant form
- **WHEN** the admin submits the form without `nombre`, without `tipo`, with `url = "ftp://x"`, or with a 3 MB QR image
- **THEN** the corresponding inline error SHALL be shown and nothing SHALL be added

#### Scenario: Event-only method with a QR image
- **WHEN** the admin creates an event-only method with a valid QR image
- **THEN** its card SHALL show the "Solo este evento" and "QR" tags and its snapshot SHALL have a `qr_url`

#### Scenario: QR upload fails
- **WHEN** the QR upload fails while creating an event-only method
- **THEN** the form SHALL stay open showing the error and no method SHALL be added

#### Scenario: Editing an event-only method
- **WHEN** the admin edits the `valor` of an event-only method and saves the event
- **THEN** the stored snapshot SHALL keep its `id` and have the new `valor`

#### Scenario: Tenant method is not editable
- **WHEN** a method added from the tenant is shown in step 3
- **THEN** its card SHALL offer "Quitar" and SHALL NOT offer "Editar"

### Requirement: Ticket payment methods restored and duplicated
Edit mode SHALL restore each ticket's `metodos_pago` into its block. Duplicating an event (`?duplicar=`) SHALL copy the event-level methods and each ticket's methods unchanged to the copy's tickets.

#### Scenario: Edit restores both sections
- **WHEN** an event saved with 1 method for all tickets and 2 methods on ticket "VIP" is opened for edit
- **THEN** section 1 SHALL list the 1 method and the "VIP" block the 2 methods, including event-only ones

#### Scenario: Duplicate keeps ticket methods
- **WHEN** an event whose ticket "VIP" has an event-only method is duplicated and the copy is saved
- **THEN** the copy's "VIP" ticket SHALL have the same method in `metodos_pago`
