# team-events-management Specification

## Purpose
Defines the administrator "Eventos" management page: switchable cards / list / calendar views, filters and stats, delete and confirmado⇄cancelado status actions, the phase-1 placeholders for create/edit, and loading/error/empty states and accessibility (US-0118).

## Requirements

### Requirement: Eventos management page
The system SHALL render `GestionEventosPage` at `/portal/orgs/[tenant_id]/gestion-eventos`, under the `(administrador)` route group. The page SHALL follow the grit-arena-v3 frame `ZYxt2` and render, in this order:
- exactly one `h1`, "Gestiona tus eventos." ("eventos." as the italic cyan accent), via `GritPageHeader`;
- in the header actions: the view switch, the search toggle, and the "Nuevo evento" button (`size="lg"`, the page's only large button);
- the success / activo / error banners, when present;
- a KPI row;
- the active view: Tarjetas and Lista are preceded by a filter bar; Calendario holds its filters inside the calendar card.

The page SHALL NOT render a separate toolbar card. Access MUST be restricted to active tenant administrators by the existing `(administrador)` layout.

#### Scenario: Administrator opens the page
- **WHEN** an active administrator of tenant T navigates to `/portal/orgs/T/gestion-eventos`
- **THEN** the page SHALL render the "Gestiona tus eventos." header with the view switch, the search toggle and "Nuevo evento", then the KPI row, the filter bar and the cards view

#### Scenario: Non-administrator is redirected
- **WHEN** a trainer or athlete of tenant T navigates directly to `/portal/orgs/T/gestion-eventos`
- **THEN** they SHALL be redirected to `/portal/orgs/T`

#### Scenario: Single heading
- **WHEN** the page renders in any view
- **THEN** the document SHALL contain exactly one `h1`

### Requirement: Switchable event views
The page SHALL offer three views sharing the same dataset, filters, and actions: **Tarjetas** (default), **Lista**, and **Calendario**.
- The selected view MUST be synced to the URL query parameter `vista` (`tarjetas` | `lista` | `calendario`) without a full page reload or scroll jump.
- A missing or unknown value SHALL fall back to `tarjetas`.
- The switch MUST be a labelled group ("Vista de eventos") of buttons, each with an icon and a text label, exposing the selected view with `aria-pressed="true"`. It MUST be operable with Tab and Enter/Space.

#### Scenario: Default view is cards
- **WHEN** the page loads without a `vista` parameter
- **THEN** the cards view SHALL be displayed and the "Tarjetas" button SHALL have `aria-pressed="true"`

#### Scenario: Switching view updates URL
- **WHEN** the user selects "Lista"
- **THEN** the list view SHALL be displayed and the URL SHALL contain `?vista=lista` without a full reload

#### Scenario: View persists on reload
- **WHEN** the user reloads a page whose URL contains `?vista=calendario`
- **THEN** the calendar view SHALL be displayed

#### Scenario: Unknown view falls back
- **WHEN** the page loads with `?vista=foo`
- **THEN** the cards view SHALL be displayed

#### Scenario: Keyboard switching
- **WHEN** focus moves with Tab to the "Calendario" button and the user presses Enter
- **THEN** the calendar view SHALL be selected and the button SHALL have `aria-pressed="true"`

### Requirement: Cards view
The cards view SHALL render a responsive grid: 1 column below `sm`, 2 columns from `sm` to `lg`, 3 columns from `lg`. Each card SHALL be a photo card with radius 24 and show:
- the banner (`banner_url`) as the photo, or the placeholder (dark gradient + discipline icon) when it is null or fails to load
- over the photo, opaque overlay pills: the estado tag on published events (the "Borrador" tag on drafts instead), the "Activo" / "Inactivo" tag, and a "Privado" tag when `publico = false`
- a date tile with the Bogotá day and month, or "Por definir" when `fecha_hora` is null
- name, and discipline ("Sin disciplina" when null)
- date and time in `America/Bogota`, or "Fecha por definir" when `fecha_hora` is null
- duration
- location: the venue snapshot name, else `punto_encuentro`
- the trainer names, comma-separated, when any
- capacity: "Cupo: N", or "Cupo ilimitado" when null
- a price summary: "Gratis" when `precio` is empty on a published event, "Precio por definir" when `precio` is empty on a draft, "$X" for a single option, "Desde $X" for several
- the actions menu, unless `hideActions` is set (used by the wizard preview)

#### Scenario: Card for a dated public event
- **WHEN** a published event has `fecha_hora`, a venue, a trainer, `cupo_maximo = 30`, `precio` with one option of 20000, and `publico = true`
- **THEN** its card SHALL show the Bogotá-formatted date/time, venue name, trainer name, "Cupo: 30", "$20.000", the "Confirmado" tag, and no "Privado" tag

#### Scenario: Card for an undated private free event
- **WHEN** a published event has `fecha_hora = null`, no venue, `punto_encuentro = 'Parque central'`, `cupo_maximo = null`, `precio = []`, and `publico = false`
- **THEN** its card SHALL show "Fecha por definir", "Parque central", "Cupo ilimitado", "Gratis", and the "Privado" tag

#### Scenario: Card with several trainers
- **WHEN** an event's trainer snapshots are "Ana" and "Luis"
- **THEN** its card SHALL show "Ana, Luis"

#### Scenario: Cancelled event card
- **WHEN** an event has `estado = 'cancelado'`
- **THEN** its card SHALL show the "Cancelado" tag with muted emphasis and SHALL still expose the actions menu

#### Scenario: Banner fails to load
- **WHEN** an event's `banner_url` returns an error
- **THEN** the card SHALL show the placeholder instead of a broken image

### Requirement: List view
The list view SHALL render a table inside a card with the following columns: Evento (name and discipline), Fecha y hora, Lugar, Entrenador, Cupo, Visibilidad (Público/Privado), Activo, Estado, and Acciones.
- Column heads SHALL be 10px uppercase muted text; rows SHALL be separated by hairlines.
- Estado, Activo and Visibilidad SHALL be shown as tags with text.
- It SHALL paginate client-side at 20 rows per page with the kit pagination and the summary "Mostrando A–B de N eventos".
- Below `md` it SHALL collapse into stacked rows.
- Rows SHALL be sorted by `fecha_hora`, nulls last: ascending when periodo is "Próximos", descending otherwise.

#### Scenario: Table columns rendered
- **WHEN** the list view is shown with at least one event
- **THEN** the table SHALL display the columns Evento, Fecha y hora, Lugar, Entrenador, Cupo, Visibilidad, Activo, Estado, Acciones

#### Scenario: Pagination
- **WHEN** the filtered dataset has 45 events
- **THEN** the list view SHALL show 20 rows on page 1, 20 on page 2, and 5 on page 3, and page 1 SHALL read "Mostrando 1–20 de 45 eventos"

#### Scenario: Single page hides pagination
- **WHEN** the filtered dataset has 8 events
- **THEN** no page buttons SHALL be rendered

### Requirement: Calendar view
The calendar view SHALL render a two-column workspace from `xl` (calendar card + 320px next-event panel), stacked below `xl`. The calendar card SHALL show a Monday-first month grid for the current month in `America/Bogota`:
- **Header**: previous / next month icon buttons, the month title (for example "Noviembre 2026"), a "Hoy" pill that returns to the current month, and the Estado and Disciplina filter selects.
- **Weekday row**: LUN … DOM; SÁB and DOM in a dimmer tone.
- **Day cells**: buttons with an `aria-label` that includes the date and the event count. Weekend cells SHALL use a darker surface. Today SHALL have a cyan ring with a glow. The selected day SHALL be tinted.
- **Adjacent-month days**: cells before day 1 and after the last day SHALL show the adjacent month's day numbers, muted and not interactive (`aria-hidden`).
- **Event pills**: each cell SHALL show up to 2 event pills, then "+N".
  - A confirmed published event's pill SHALL use the cyan gradient with the name and the time.
  - A cancelled event's pill SHALL be muted and struck through, with the text "Cancelado" available to assistive technology.
  - A draft's pill SHALL have a dashed outline and an italic name.
  - Below `sm`, pills SHALL collapse to dots.
- Each month SHALL be loaded via `listEventos` with the month's `desde`/`hasta` range.
- Selecting a day SHALL list that day's events below the grid as list rows: time, name, discipline, activo and estado tags, and the actions menu.
- Undated events SHALL NOT be placed on the grid. A note "N eventos sin fecha" SHALL link to the list view.
- The periodo filter SHALL be ignored in this view.

#### Scenario: Bogotá day placement
- **WHEN** an event has `fecha_hora = 2026-10-01T01:00:00Z`
- **THEN** it SHALL appear on September 30 in the calendar

#### Scenario: Month navigation loads range
- **WHEN** the user clicks the next-month button
- **THEN** the calendar SHALL display the next month and request events with `desde` = first day of that month and `hasta` = first day of the following month (Bogotá)

#### Scenario: Return to today
- **WHEN** the user is viewing January 2027 and today is 24 November 2026, and they click "Hoy"
- **THEN** the calendar SHALL display November 2026 and load its range

#### Scenario: Day overflow
- **WHEN** a day has 5 events
- **THEN** its cell SHALL show 2 pills and "+3"

#### Scenario: Adjacent-month days
- **WHEN** November 2026 is displayed (it starts on a Sunday)
- **THEN** the first row SHALL show 26–31 October muted and not focusable, and 1 November as the first interactive cell

#### Scenario: Select a day
- **WHEN** the user clicks a day with events
- **THEN** the events of that day SHALL be listed below the grid with their actions menu

#### Scenario: Undated events note
- **WHEN** the tenant has 2 events without `fecha_hora`
- **THEN** the calendar SHALL show "2 eventos sin fecha" linking to the list view

#### Scenario: Filters inside the calendar
- **WHEN** the calendar view is shown
- **THEN** the Estado and Disciplina selects SHALL be inside the calendar header, no Periodo select SHALL be shown, and the filter bar SHALL NOT be rendered

### Requirement: Event filters and stats
The page SHALL provide the following filters. They SHALL combine with AND in the cards and list views.
- Search by `nombre`: case-insensitive, debounced 250 ms. It SHALL live in the page header (see "Expandable header search").
- Estado: Todos (default) / Confirmado / Cancelado / Borrador. Confirmado and Cancelado SHALL exclude drafts; Borrador SHALL show only drafts.
- Periodo: Próximos (default; `fecha_hora >= now` or null) / Pasados / Todos.
- Disciplina: Todas, plus the tenant's discipline names. It matches the event's `disciplina_id` name.

In the cards and list views, Estado, Periodo and Disciplina SHALL be pill selects in a filter bar above the content, each with a visible or accessible label. In the calendar view, Estado and Disciplina SHALL be in the calendar header. A "Limpiar filtros" action SHALL be shown when any filter differs from its default, and SHALL reset all filters, including the search.

The KPI row SHALL show four KPI cards, computed over the unfiltered dataset: "Total de eventos" (including drafts), "Próximos confirmados" (excluding drafts), "Cancelados" (danger icon) and "Borradores" (muted icon).

#### Scenario: Filters combine
- **WHEN** the user searches "copa", selects estado "Confirmado", and selects a discipline
- **THEN** only published events whose name contains "copa" (case-insensitive), with `estado = 'confirmado'`, whose discipline name matches, and matching the periodo SHALL be shown

#### Scenario: Borrador filter
- **WHEN** the user selects estado "Borrador"
- **THEN** only events with `borrador = true` SHALL be shown

#### Scenario: Default periodo includes undated events
- **WHEN** the page loads with default filters
- **THEN** future events and events without `fecha_hora` SHALL be shown, and past events SHALL NOT

#### Scenario: Stats ignore filters
- **WHEN** the user applies filters that hide some events
- **THEN** the KPI values SHALL remain unchanged

#### Scenario: Drafts counted separately
- **WHEN** the tenant has 3 published upcoming confirmed events and 2 drafts
- **THEN** "Total de eventos" SHALL be 5, "Próximos confirmados" SHALL be 3, and "Borradores" SHALL be 2

#### Scenario: Clear filters
- **WHEN** the user has a search and a discipline set and clicks "Limpiar filtros"
- **THEN** the search SHALL be emptied, every select SHALL return to its default, and "Limpiar filtros" SHALL disappear

### Requirement: Change event status
The actions menu SHALL offer "Cancelar evento" when `estado = 'confirmado'`, and "Confirmar evento" when `estado = 'cancelado'`. Neither SHALL be offered for draft events (`borrador = true`). Either action SHALL open `CambiarEstadoEventoModal`; confirming SHALL call `updateEstadoEvento` with the target estado.
- On success, the modal SHALL close and the dataset (and the calendar month, when active) SHALL reload.
- On failure, the modal SHALL stay open and show the mapped error inline.
- While submitting, the confirm button MUST be disabled with a loading indicator, and `Escape` MUST NOT close the modal.

#### Scenario: Cancel a confirmed event
- **WHEN** the admin chooses "Cancelar evento" on a confirmed event and confirms
- **THEN** the event's `estado` SHALL become `cancelado` and it SHALL re-render with the "Cancelado" badge in the current view

#### Scenario: Reconfirm a cancelled event
- **WHEN** the admin chooses "Confirmar evento" on a cancelled event and confirms
- **THEN** the event's `estado` SHALL become `confirmado`

#### Scenario: No status actions on drafts
- **WHEN** the admin opens the actions menu of a draft event
- **THEN** it SHALL show only "Continuar editando" and "Eliminar"

#### Scenario: Status change failure
- **WHEN** `updateEstadoEvento` throws `EventoServiceError`
- **THEN** the modal SHALL remain open showing its message and the dataset SHALL NOT change

#### Scenario: Escape blocked while submitting
- **WHEN** the status change is in flight and the user presses Escape
- **THEN** the modal SHALL remain open

### Requirement: Delete event
The actions menu SHALL offer "Eliminar", which opens `EliminarEventoModal` showing the event name and date and a warning that the action cannot be undone. Confirming SHALL call `deleteEvento`.
- On success, the event SHALL disappear from all views and stats.
- On failure, the modal SHALL stay open and show the mapped error inline.
- An event with purchases or tickets SHALL NOT be deletable: `deleteEvento` throws `has_purchases`, and the modal shows "No puedes eliminar un evento con entradas vendidas. Cancélalo en su lugar."
- Cancelling SHALL make no change.
- Submit state and `Escape` handling SHALL match the status-change modal.

#### Scenario: Delete confirmed
- **WHEN** the admin chooses "Eliminar" and confirms
- **THEN** the row SHALL be deleted and the event SHALL no longer appear in any view or count

#### Scenario: Delete cancelled by user
- **WHEN** the admin opens the delete modal and clicks "Cancelar" or presses Escape
- **THEN** the modal SHALL close and the event SHALL remain

#### Scenario: Delete failure
- **WHEN** `deleteEvento` throws `EventoServiceError` with code `forbidden`
- **THEN** the modal SHALL show "No tienes permisos para gestionar este evento." and the event SHALL remain

#### Scenario: Delete event with sales
- **WHEN** the admin confirms deleting an event that has at least one purchase
- **THEN** the modal SHALL stay open showing "No puedes eliminar un evento con entradas vendidas. Cancélalo en su lugar." and the event SHALL remain

### Requirement: Loading, error, and empty states
- While loading, the active view SHALL show skeletons: cards, rows, or the calendar grid. The KPI row SHALL show skeleton cards.
- On load failure, the page SHALL show `GritEmptyState` with the error message and a "Reintentar" button that re-fetches.
- With no events, the page SHALL show "Aún no hay eventos" with a "Nuevo evento" button.
- When filters match nothing, the page SHALL show "No hay eventos que coincidan con los filtros" with "Limpiar filtros".
- A calendar month that fails to load SHALL show an inline error inside the calendar card with "Reintentar", and SHALL keep the header and navigation usable.

#### Scenario: Load error with retry
- **WHEN** `listEventos` fails
- **THEN** the error state with "Reintentar" SHALL be shown, and clicking it SHALL call `listEventos` again

#### Scenario: Empty tenant
- **WHEN** the tenant has no events
- **THEN** "Aún no hay eventos" SHALL be shown with a "Nuevo evento" button

#### Scenario: No filter matches
- **WHEN** the filters match no events
- **THEN** "No hay eventos que coincidan con los filtros" SHALL be shown, and "Limpiar filtros" SHALL restore the defaults

#### Scenario: Calendar month fails
- **WHEN** the request for the next month fails
- **THEN** the calendar card SHALL show the error with "Reintentar", and the month navigation SHALL still work

### Requirement: Accessible menus and dialogs
- The actions menu trigger MUST be an icon button with `aria-haspopup="menu"`, `aria-expanded` and an `aria-label` that includes the event name. Items MUST use `role="menuitem"`. `Escape` MUST close the menu and return focus to the trigger.
- Modals MUST use `role="dialog"`, `aria-modal="true"` and `aria-labelledby`, move focus into the dialog on open, close on `Escape` and on backdrop click when not submitting, and return focus to the element that opened them.
- Modal backdrops MUST use `bg-grit-bg/70 backdrop-blur-sm`. The panel MUST be a glass card with a close icon button labelled "Cerrar", and at most one filled primary action.
- Cancelled status MUST be conveyed by text, not only by color or strikethrough.

#### Scenario: Menu keyboard close
- **WHEN** the actions menu is open and the user presses Escape
- **THEN** the menu SHALL close and focus SHALL return to its trigger

#### Scenario: Dialog focus
- **WHEN** any event modal opens
- **THEN** focus SHALL move inside the dialog

#### Scenario: Dialog closes and returns focus
- **WHEN** the delete modal is open, not submitting, and the user presses Escape
- **THEN** the modal SHALL close and focus SHALL return to the menu trigger that opened it

### Requirement: Create and edit navigation
"Nuevo evento" (header and empty state) SHALL navigate to `/portal/orgs/{tenantId}/gestion-eventos/nuevo`. "Editar" on a published event, and "Continuar editando" on a draft, from any view SHALL navigate to `/portal/orgs/{tenantId}/gestion-eventos/{eventoId}/editar`. No modal SHALL open.

#### Scenario: New event navigation
- **WHEN** the admin clicks "Nuevo evento"
- **THEN** the browser SHALL navigate to `/gestion-eventos/nuevo`

#### Scenario: Edit navigation from calendar
- **WHEN** the admin chooses "Editar" on an event listed under a selected calendar day
- **THEN** the browser SHALL navigate to `/gestion-eventos/{thatId}/editar`

### Requirement: Draft events in management views
Draft events SHALL be listed in all three views with a "Borrador" tag (icon `edit_note`). In the calendar, drafts SHALL be shown with a dashed chip outline, plus text that identifies the draft state. Missing data SHALL render with the fallbacks "Sin disciplina", "Fecha por definir", the placeholder banner, and "Precio por definir". Undated drafts SHALL count toward the calendar's "N eventos sin fecha" note.

#### Scenario: Name-only draft renders
- **WHEN** a draft has only `nombre = "Copa verano"`
- **THEN** its card SHALL show "Copa verano", "Sin disciplina", "Fecha por definir", "Precio por definir", and the "Borrador" tag, with no error

#### Scenario: Draft in list view
- **WHEN** the list view shows a draft
- **THEN** its Estado cell SHALL show "Borrador" instead of the estado badge

### Requirement: Publish success banner
When the page loads with `?guardado=creado` or `?guardado=editado`, it SHALL show a dismissible success alert (`role="status"`, success tone, check icon): "Evento creado correctamente." / "Evento actualizado correctamente.". It SHALL then remove the `guardado` parameter with `router.replace` while preserving `vista`.

#### Scenario: Banner after publish
- **WHEN** the wizard redirects to `/gestion-eventos?guardado=creado`
- **THEN** the alert "Evento creado correctamente." SHALL be shown, and the URL SHALL no longer contain `guardado`

#### Scenario: Banner not repeated on reload
- **WHEN** the user reloads the page after the banner was shown
- **THEN** no banner SHALL be shown

#### Scenario: Dismiss
- **WHEN** the user activates the alert's close button
- **THEN** the alert SHALL disappear

### Requirement: Activo indicator in every management view
The management page SHALL show whether each event is **Activo** or **Inactivo** (`eventos.activo`) in the cards, list and calendar views, with a text label and an icon (`visibility` / `visibility_off`), never by color alone. An inactive event is hidden from members and visitors, so the indicator SHALL be prominent:
- **Cards**: an "Activo" / "Inactivo" overlay pill next to the estado tag over the photo, both opaque so they stay legible over any image. An inactive card SHALL also have a dashed warning-tone border.
- **List**: an "Activo" column with the tag (table) and an "Activo" row (stacked layout below `md`).
- **Calendar**: inactive pills SHALL show a `visibility_off` icon and warning-tone text. The day cell's `aria-label` SHALL count inactive events. The selected-day list SHALL show the tag next to the estado tag. The next-event panel SHALL show an "Inactivo" tag when the event is inactive.

#### Scenario: Inactive event in the cards view
- **WHEN** the admin opens the cards view and an event has `activo = false`
- **THEN** its card SHALL show an opaque "Inactivo" pill over the photo and a dashed warning-tone border

#### Scenario: List column
- **WHEN** the admin opens the list view
- **THEN** the table SHALL have an "Activo" column showing "Activo" or "Inactivo" for each event

#### Scenario: Calendar day with an inactive event
- **WHEN** a day has 2 events, one of them inactive
- **THEN** the day cell's `aria-label` SHALL read "…, 2 eventos, 1 inactivo", the inactive pill SHALL show the `visibility_off` icon, and the selected-day list SHALL show its "Inactivo" tag

### Requirement: Quick activar / desactivar action
The actions menu of every event (cards, list and calendar views, including drafts) SHALL offer **"Desactivar evento"** when the event is active and **"Activar evento"** when it is inactive. The action SHALL run immediately, without a confirmation modal, through `eventosService.updateActivoEvento(tenantId, eventoId, activo)` (scoped by `tenant_id`, RLS-enforced; zero rows → `forbidden`). On success the page SHALL show a dismissible `role="status"` message ("… está activo: se publica en el panel de eventos públicos." / "… está inactivo: solo será visible para el administrador.") and refresh the data, including the calendar month. On failure it SHALL show a dismissible `role="alert"` message and change nothing. A second toggle while one is in flight SHALL be ignored.

#### Scenario: Deactivate from the list
- **WHEN** the admin chooses "Desactivar evento" on an active event
- **THEN** `activo` SHALL become `false`, the row SHALL show "Inactivo", and the status message SHALL be shown

#### Scenario: Activate from a card
- **WHEN** the admin chooses "Activar evento" on an inactive event
- **THEN** `activo` SHALL become `true`, the card SHALL show "Activo" without the dashed border, and the event SHALL become visible again on the discovery pages when it is otherwise published

#### Scenario: Toggle fails
- **WHEN** the update fails (for example, the user lost admin rights)
- **THEN** an error alert SHALL be shown and the event SHALL keep its previous state

### Requirement: Ver compras action
The actions menu of every published event (`borrador = false`), in the cards, list and calendar views, SHALL offer **"Ver compras"** (icon `receipt_long`). It SHALL navigate to `/portal/orgs/{tenantId}/gestion-eventos/{eventoId}/compras`. Draft events SHALL NOT offer it.

#### Scenario: Published event
- **WHEN** the admin opens the actions menu of a published event and chooses "Ver compras"
- **THEN** they SHALL navigate to that event's Compras page

#### Scenario: Draft event
- **WHEN** the admin opens the actions menu of a draft
- **THEN** "Ver compras" SHALL NOT be offered

### Requirement: Control de ingreso action
The actions menu of every published event (`borrador = false`) with `estado = 'confirmado'`, in the cards, list and calendar views, SHALL offer **"Control de ingreso"** (icon `qr_code_scanner`) right after "Ver compras". It SHALL navigate to `/portal/orgs/{tenantId}/control-ingreso/{eventoId}`. Drafts and cancelled events SHALL NOT offer it.

#### Scenario: Confirmed event
- **WHEN** the admin chooses "Control de ingreso" on a confirmed published event
- **THEN** they SHALL navigate to that event's check-in page

#### Scenario: Draft event
- **WHEN** the admin opens the actions menu of a draft
- **THEN** "Control de ingreso" SHALL NOT be offered

### Requirement: Expandable header search
The page header SHALL show a round search icon button labelled "Buscar evento". Activating it SHALL replace it with a pill search field ("Buscar evento por nombre") that receives focus. The field SHALL collapse back to the icon on blur or on Escape, but only while it is empty. While the search has a value, the field SHALL stay expanded. Below `sm`, the expanded field SHALL take the full header width.

#### Scenario: Expand and type
- **WHEN** the admin clicks the search icon and types "copa"
- **THEN** the field SHALL be focused and, after 250 ms, the cards and list views SHALL show only events whose name contains "copa"

#### Scenario: Collapse when empty
- **WHEN** the field is empty and the admin presses Escape
- **THEN** the field SHALL collapse to the icon button, and focus SHALL return to it

#### Scenario: Stays open with a value
- **WHEN** the field contains "copa" and loses focus
- **THEN** the field SHALL remain expanded

### Requirement: Next event panel
In the calendar view, the right column SHALL show a "PRÓXIMO EVENTO" panel for the first event with `borrador = false`, `estado = 'confirmado'` and `fecha_hora` at or after today 00:00 America/Bogotá, ordered by `fecha_hora`. The event is taken from the unfiltered dataset, so it does not depend on the month shown.

#### Scenario: Next event chosen across months
- **WHEN** today is 24 November 2026, the calendar shows January 2027, and the next confirmed published event is on 28 November 2026
- **THEN** the panel SHALL show the 28 November event

#### Scenario: Drafts and cancelled events skipped
- **WHEN** the soonest future event is a draft and the next one is cancelled
- **THEN** the panel SHALL show the first confirmed published event after them

#### Scenario: No upcoming event
- **WHEN** the tenant has no upcoming confirmed published event
- **THEN** the panel SHALL show "Sin eventos próximos" and SHALL NOT request counters

### Requirement: Next event panel content
The panel SHALL show:
- the banner as cover (placeholder when missing), with an edit icon button to the wizard;
- the name, and the Bogotá date and time;
- tags for discipline, place ("Por definir" when none) and estado, plus "Inactivo" when inactive;
- the actions "Abrir check-in" → `control-ingreso/{id}` and "Ver asistentes" → `gestion-eventos/{id}/compras`.

#### Scenario: Open check-in from the panel
- **WHEN** the admin clicks "Abrir check-in"
- **THEN** they SHALL navigate to `/portal/orgs/{tenantId}/control-ingreso/{eventoId}`

#### Scenario: Edit from the panel
- **WHEN** the admin clicks the panel's edit button
- **THEN** they SHALL navigate to `/portal/orgs/{tenantId}/gestion-eventos/{eventoId}/editar`

### Requirement: Next event panel meters
The panel SHALL show two meters, from `resumen_ingresos_evento` for that event: "Entradas emitidas" (`activas` / `cupo_maximo`, or "Sin límite" without a track when there is no cupo) and "Check-in" (`ingresaron` / `activas`).

#### Scenario: Counters shown
- **WHEN** the next event has `cupo_maximo = 100`, and `resumen_ingresos_evento` returns `activas = 1` and `ingresaron = 0`
- **THEN** the panel SHALL show "Entradas emitidas 1 / 100" and "Check-in 0 / 1"

#### Scenario: Unlimited capacity
- **WHEN** the next event has `cupo_maximo = null` and 12 `activas`
- **THEN** "Entradas emitidas" SHALL read "12" with "Sin límite" and no track

#### Scenario: Counters fail
- **WHEN** `resumen_ingresos_evento` fails for the next event
- **THEN** both meters SHALL show "—", and the actions SHALL remain available
