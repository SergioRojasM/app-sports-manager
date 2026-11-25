# Spec Delta

## MODIFIED Requirements

### Requirement: Capacity indicator on training cards and calendar events
The system SHALL display a capacity indicator on every session block, agenda card, month pill (when it shows capacity) and list row, showing the number of active bookings relative to `cupo_maximo` as "N/M". The indicator MUST use the v3 signal: the brand accent (or the discipline tone on week blocks) while active bookings < `cupo_maximo`, and the warning tone plus a "Lleno" status tag when active bookings ≥ `cupo_maximo`. When `cupo_maximo` is null, only the active booking count is shown, with no track, denominator or colour signal.

#### Scenario: Capacity indicator shows current utilization
- **WHEN** a training instance with 18 active bookings and `cupo_maximo = 24` is displayed in the agenda panel or list view
- **THEN** the card shows "18/24" next to a capacity track filled to 75% in the accent tone

#### Scenario: Full training is visually distinguished
- **WHEN** active bookings equal `cupo_maximo` for a training
- **THEN** the capacity indicator renders in the warning tone, the agenda card and list row show a "Lleno" tag, and the "Reservar" action is disabled for atletas

#### Scenario: Unlimited capacity training omits ratio
- **WHEN** `cupo_maximo` is null for a training
- **THEN** the indicator shows only the count of active bookings (for example "18 reservas") without a denominator, track or colour signal

#### Scenario: Capacity lookup failed
- **WHEN** the active booking count of an instance could not be loaded
- **THEN** the instance is still displayed and its count is treated as 0

### Requirement: External form link display in training list view
The training list view (Lista) SHALL conditionally render a clickable "Formulario externo" link in the training cell of a row (and in the stacked card on small screens) when `formulario_externo` is non-null on a training instance. The link MUST open in a new browser tab with `target="_blank"` and include `rel="noopener noreferrer"` to prevent tabnapping. When `formulario_externo` is null or empty, no link element SHALL be rendered.

#### Scenario: Link is shown when formulario_externo is present
- **WHEN** the Lista view renders an instance with a non-null `formulario_externo`
- **THEN** a visible clickable link labelled "Formulario externo" is displayed for that row

#### Scenario: Link opens in a new tab
- **WHEN** a user clicks the "Formulario externo" link in the Lista view
- **THEN** the external URL opens in a new browser tab without navigating away from the app

#### Scenario: No link element rendered when field is null
- **WHEN** the Lista view renders an instance with `formulario_externo = NULL`
- **THEN** no link or placeholder for "Formulario externo" is displayed for that row

### Requirement: Direct "Reservar" action on training cards
The system SHALL render a "Reservar" button on each agenda card of the "Agenda del día" panel and on each row of the Lista view in `gestion-entrenamientos` for users who cannot manage trainings (role `usuario`), when the training is neither historical nor cancelled. Activating it SHALL open the `ReservasPanel` for that training in auto-book mode, so the booking dialog opens without further clicks. When the training is full (`cupo_maximo` is not null and `reservas_activas` ≥ `cupo_maximo`) the button MUST be disabled and read "Cupo lleno". Opening the training itself (clicking the card, block or row action) MUST remain available and opens the action modal. Administradores and entrenadores MUST NOT see the "Reservar" button. The button MUST have an accessible name that includes the training name.

#### Scenario: Athlete sees the card button
- **WHEN** an atleta views the agenda of a day with an upcoming training
- **THEN** the agenda card shows a "Reservar" button, and the card itself still opens the action modal

#### Scenario: Athlete sees the row button in Lista
- **WHEN** an atleta views the Lista view with an upcoming training
- **THEN** the row shows a "Reservar" button next to the row action

#### Scenario: Card button starts the booking
- **WHEN** the atleta activates a "Reservar" button
- **THEN** the reservations drawer opens for that training and the booking dialog opens automatically for the current user

#### Scenario: Successful booking from the card updates the card
- **WHEN** the atleta confirms the booking started from the card and it succeeds
- **THEN** the reservation is created as in the regular flow and the capacity indicator of the block, card and row reflects the new count

#### Scenario: Full training
- **WHEN** a training's active bookings equal or exceed `cupo_maximo`
- **THEN** the button is disabled and reads "Cupo lleno"

#### Scenario: Historical training
- **WHEN** a training's date is in the past
- **THEN** its card and row show no "Reservar" button

#### Scenario: Cancelled training
- **WHEN** a training's `estado` is `cancelado`
- **THEN** its card and row show no "Reservar" button

#### Scenario: Managers do not get the card button
- **WHEN** an administrador or entrenador views the agenda or the Lista view
- **THEN** no "Reservar" button is shown and clicking a training opens the action modal with the management options

#### Scenario: Rejected booking started from the card
- **WHEN** a booking started from the card is rejected (for example, the atleta has no plan)
- **THEN** the booking rejection modal is shown above the booking dialog

## ADDED Requirements

### Requirement: Trainings page header
The `gestion-entrenamientos` page SHALL follow the grit-arena-v3 frame `p5Ms22` and render exactly one `h1` via the page header: "Gestiona tus entrenamientos." for administradores and entrenadores, "Calendario de entrenamientos." for `usuario`, with "entrenamientos." as the cyan accent. The header actions SHALL hold the view switch and, for managers only, a large "Crear entrenamiento" button that opens the creation flow.

#### Scenario: Manager opens the page
- **WHEN** an administrador or entrenador of tenant T opens `/portal/orgs/T/gestion-entrenamientos`
- **THEN** the page shows "Gestiona tus entrenamientos.", the Mes / Semana / Lista switch and "Crear entrenamiento", then the KPI row and the week workspace

#### Scenario: Athlete opens the page
- **WHEN** a `usuario` of tenant T opens the page
- **THEN** the page shows "Calendario de entrenamientos." and the view switch, and no "Crear entrenamiento" button

#### Scenario: Single heading
- **WHEN** the page renders in any view or state
- **THEN** the document contains exactly one `h1`

### Requirement: Switchable training views
The page SHALL offer three views over the same trainings: **Semana** (default), **Mes** and **Lista**. The selected view MUST be synced to the URL query parameter `vista` (`semana` | `mes` | `lista`) without a full reload; a missing or unknown value SHALL fall back to `semana`. The switch MUST be a labelled group ("Vista del calendario") of buttons exposing the selection with `aria-pressed`.

#### Scenario: Default view is the week
- **WHEN** the page loads without a `vista` parameter
- **THEN** the week view of the current Bogotá week is displayed and "Semana" has `aria-pressed="true"`

#### Scenario: View persists on reload
- **WHEN** the user reloads a page whose URL contains `?vista=mes`
- **THEN** the month view is displayed

#### Scenario: Unknown view falls back
- **WHEN** the page loads with `?vista=foo`
- **THEN** the week view is displayed

### Requirement: Period navigation
Every view SHALL show a period header with previous / next buttons, the period label and a "Hoy" control. Semana and Lista navigate by Monday–Sunday weeks in America/Bogota; Mes navigates by months. Switching view SHALL keep the anchor date (the week containing the selected day, or the month containing the week).

#### Scenario: Week label
- **WHEN** the week of 16–22 November 2026 is displayed
- **THEN** the label reads "16 – 22 nov 2026"

#### Scenario: Cross-month and cross-year labels
- **WHEN** the displayed week spans 28 November – 4 December 2026, or 29 December 2026 – 4 January 2027
- **THEN** the label reads "28 nov – 4 dic 2026" or "29 dic 2026 – 4 ene 2027"

#### Scenario: Navigate and return to today
- **WHEN** the user activates "Semana siguiente" twice and then "Hoy"
- **THEN** the calendar shows two weeks ahead, and then returns to the week containing today

#### Scenario: Switching to the month keeps the anchor
- **WHEN** the week of 16–22 November 2026 is displayed and the user selects "Mes"
- **THEN** the month view shows November 2026

### Requirement: Trainings KPI row
The page SHALL show four KPI cards computed from the non-cancelled instances of the visible period: number of sessions (with the number of distinct disciplines), total active bookings (with the number of full sessions), occupancy as total bookings over total `cupo_maximo` of sessions that define one, rounded to a whole percent, and the number of distinct assigned trainers. Labels SHALL read "de la semana" in Semana and Lista and "del mes" in Mes.

#### Scenario: KPI values for a week
- **WHEN** the visible week has 3 non-cancelled sessions with bookings 18/24, 22/30 and 24/24 across 2 disciplines and 2 trainers, plus 1 cancelled session
- **THEN** the KPIs read 3 sessions · 2 disciplinas, 64 reservas · 1 sesión llena, 82 % · sobre 78 cupos, and 2 entrenadores

#### Scenario: No session defines a cupo
- **WHEN** no non-cancelled session of the period has `cupo_maximo`
- **THEN** the occupancy KPI shows "—" with "Sin cupos definidos"

#### Scenario: Month labels
- **WHEN** the month view is displayed
- **THEN** the KPI labels read "Sesiones del mes", "Reservas del mes" and "Ocupación del mes"

### Requirement: Discipline tones and legend
Each discipline SHALL have a stable colour tone derived from its position in the tenant's discipline options sorted by name, cycling through accent, violet, warning, danger, success and teal. The same discipline MUST use the same tone in every view and period. The period header SHALL show a legend with one dot and name per discipline that has sessions in the period.

#### Scenario: Stable tone across views
- **WHEN** "Natación" renders as violet in the week view
- **THEN** its pills in the month view, its agenda bar and its Lista dot are violet too

#### Scenario: Legend lists only present disciplines
- **WHEN** the visible week has sessions of Running and Natación only
- **THEN** the legend shows exactly those two disciplines with their tones

### Requirement: Week view time grid
The week view SHALL show seven day-header tiles (today highlighted, selected day tinted) and an hourly grid spanning at least 5 am to 9 pm, extended to fit any earlier or later session. Each session SHALL be a block in its Bogotá day column, placed at its start time with a height proportional to its duration (default 60 min, minimum 30 min), showing name, start time and capacity in the discipline tone.

#### Scenario: Session placement
- **WHEN** a 60-minute session starts at 6:30 am Bogotá on Friday 20 November
- **THEN** its block appears in the Friday column starting at the 6:30 position with the height of one hour

#### Scenario: Early session extends the range
- **WHEN** a session starts at 4:00 am
- **THEN** the grid starts at 4 am

#### Scenario: Overlapping sessions
- **WHEN** two sessions on the same day overlap in time
- **THEN** their blocks are shown side by side in the column without covering each other

#### Scenario: Cancelled and past sessions
- **WHEN** a session is cancelled, or has already started
- **THEN** a cancelled block shows its name struck through and muted, and a past block is dimmed

#### Scenario: Opening a session
- **WHEN** the user activates a session block with mouse or keyboard
- **THEN** the training action modal opens for that instance and its day becomes the selected day

### Requirement: Collapsible empty hours
In the week view, every run of three or more consecutive hours with no session on any day of the week SHALL collapse into a compact band with a toggle labelled with the hidden range (for example "Mostrar 10 am – 3 pm"). The toggle MUST expose `aria-expanded`. Expanded bands SHALL reset when the week changes.

#### Scenario: Empty midday collapses
- **WHEN** no session of the week starts or runs between 10 am and 4 pm
- **THEN** those hours render as one band with a "Mostrar 10 am – 3 pm" toggle with `aria-expanded="false"`

#### Scenario: Expanding a band
- **WHEN** the user activates the band toggle
- **THEN** the hourly rows for that range are shown and the toggle has `aria-expanded="true"`

### Requirement: Day agenda panel
Next to the week and month views, the page SHALL show an "Agenda del día" panel for the selected day, with the full date, "N sesiones · M reservas" and one card per session in start order. Each card shows the start time (24-hour), the discipline bar, the name, a status tag, the scenario, the trainer's initials and short name, and the capacity indicator. Activating a card opens the action modal.

#### Scenario: Default selected day
- **WHEN** the current week is displayed
- **THEN** the agenda shows today; for another week it shows the first day with sessions, or Monday when the week is empty

#### Scenario: Selecting a day
- **WHEN** the user activates the Friday 20 header tile in the week view, or the 20 November cell in the month view
- **THEN** the agenda shows "Viernes 20 de noviembre" and that tile or cell has `aria-pressed="true"`

#### Scenario: Status tags
- **WHEN** the selected day is today with sessions at 5:30 (ended), 6:30 (not started) and 18:00 (full)
- **THEN** the cards show "Finalizado", "Próxima" (highlighted card) and "Lleno" respectively; a cancelled session shows "Cancelado"

#### Scenario: Session without trainer
- **WHEN** a session has no `entrenador_id`
- **THEN** its card shows "Sin entrenador" instead of the trainer name

#### Scenario: Empty day
- **WHEN** the selected day has no sessions
- **THEN** the panel shows "Sin sesiones este día", plus "Crear entrenamiento" for managers

#### Scenario: Day detail
- **WHEN** the user activates "Ver detalle del día"
- **THEN** the Lista view opens filtered to that day

### Requirement: Month view
The month view SHALL show a Monday-first grid of 42 day cells for the displayed month. Days of adjacent months are muted and not selectable, and today is ringed. Each in-month cell shows at most two session pills in the discipline tone (start time and name), then "+N" for the rest. Clicking a cell selects the day for the agenda; clicking a pill opens the action modal.

#### Scenario: Overflowing day
- **WHEN** a day has five sessions
- **THEN** its cell shows two pills and "+3"

#### Scenario: Adjacent month day
- **WHEN** the November 2026 grid shows 30 November's following days 1–6 December
- **THEN** those cells are muted, show no pills and cannot be selected

### Requirement: List view
The list view SHALL show the week's sessions in a table with columns Fecha, Entrenamiento (name and series), Disciplina, Escenario, Entrenador, Cupo, Estado and Acciones, paginated at 20 rows. A day filter, when set, shows a removable chip. Below the `md` breakpoint, rows render as stacked cards without horizontal scrolling.

#### Scenario: Paginated week
- **WHEN** the visible week has 26 sessions
- **THEN** the table shows 20 rows and pagination to a second page with 6 rows

#### Scenario: Removing the day filter
- **WHEN** the list is filtered to Friday 20 and the user removes the chip
- **THEN** all sessions of the week are listed and pagination returns to page 1

#### Scenario: Row action
- **WHEN** the user activates the row action of a session
- **THEN** the training action modal opens for that instance

#### Scenario: Empty week
- **WHEN** the visible week has no sessions
- **THEN** the list shows "No hay entrenamientos programados para esta semana"

### Requirement: Training action modal
Activating a training from any view SHALL open a dialog titled with the training name that offers the existing actions (ver detalle, ver reservas, editar, eliminar, publicar en eventos) with their existing role, enable and disable rules and reasons. The dialog MUST trap focus, close with Escape, and return focus to the element that opened it.

#### Scenario: Historical training for a manager
- **WHEN** an administrador opens a past training
- **THEN** "Editar" and "Eliminar" are disabled with the reasons "No se pueden editar entrenamientos pasados." and "No se pueden eliminar entrenamientos pasados."

#### Scenario: Keyboard dismissal
- **WHEN** the dialog is open and the user presses Escape
- **THEN** the dialog closes and focus returns to the session block, card or row action that opened it

### Requirement: Trainings page loading and error states
The page SHALL show distinct loading, empty and error states. While a period loads, only the calendar and agenda show the loading state and the KPIs show "—". A load error SHALL show the error message with a "Reintentar" action that reloads. Mutation feedback SHALL appear as a dismissible success or error alert.

#### Scenario: Load error and retry
- **WHEN** loading the trainings fails
- **THEN** the page shows "No fue posible cargar los entrenamientos de la organización." with "Reintentar", and activating it reloads the data

#### Scenario: Success feedback
- **WHEN** a training is created, edited or deleted successfully
- **THEN** a dismissible success alert shows the existing success message and the calendar reflects the change

### Requirement: Period changes reload only trainings
The page SHALL load the tenant's catalogs (training series, disciplines, scenarios, trainers, services and form templates) once per tenant visit, and SHALL reload only the training instances and their booking counts when the visible period changes. Data mutations SHALL refresh the instances of the current period.

#### Scenario: Navigating weeks
- **WHEN** the user moves to the next week
- **THEN** only the instances (and booking counts) of the new week are requested; catalogs are not requested again

#### Scenario: Month range covers the grid
- **WHEN** the month view of November 2026 is displayed
- **THEN** the instances requested cover the whole 42-cell grid from Monday 26 October to Sunday 6 December 2026

### Requirement: Trainings page responsive layout
From the `lg` breakpoint the calendar and the 340px agenda panel SHALL sit side by side; below it the agenda SHALL stack under the calendar. Below `md` the week grid SHALL scroll horizontally inside its card while the page never scrolls horizontally, at 375, 768 and 1440px widths.

#### Scenario: Mobile week view
- **WHEN** the page is displayed at 375px in the week view
- **THEN** the week grid scrolls horizontally inside its card, the agenda appears below it, and the page body has no horizontal scroll
