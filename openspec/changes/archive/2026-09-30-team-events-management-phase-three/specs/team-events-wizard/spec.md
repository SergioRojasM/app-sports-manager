## MODIFIED Requirements

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

### Requirement: Step 3 payment methods and summary
Step 3 SHALL show the helper text "Los métodos que selecciones se mostrarán a quienes adquieran entradas para este evento." and SHALL list the tenant's active payment methods, ordered by `orden`, as checkbox cards, with "Seleccionar todos" / "Quitar todos". On publish, at least one method SHALL be required when any ticket has `valor > 0`. The saved `metodos_pago` SHALL be the snapshots of exactly the checked methods. A summary panel SHALL show the name, date, ticket count and price range, coupon count, form, and method count.

#### Scenario: Paid event without a method
- **WHEN** the admin publishes with a paid ticket and no method checked
- **THEN** the error "Selecciona al menos un método de pago para las entradas con costo" SHALL be shown

#### Scenario: Free event without methods
- **WHEN** every ticket is free and no method is checked
- **THEN** the publish SHALL succeed with `metodos_pago = []`

#### Scenario: Public visibility disclosed
- **WHEN** the admin opens step 3
- **THEN** the helper text "Los métodos que selecciones se mostrarán a quienes adquieran entradas para este evento." SHALL be shown

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

#### Scenario: Public trainings unchanged
- **WHEN** a public training detail page is rendered
- **THEN** it SHALL still show the "Entrenamiento público" tag, the location and reservation cards, and the "¿Listo para mejorar tu rendimiento?" banner

#### Scenario: Organization shown on the event page
- **WHEN** an event with `nombre_tenant = 'Wolfpack Club'` is rendered on a detail page
- **THEN** the hero SHALL show "Wolfpack Club"
