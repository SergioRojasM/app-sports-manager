# team-events-management Specification

## Purpose
Defines the administrator "Eventos" management page: switchable cards / list / calendar views, filters and stats, delete and confirmado⇄cancelado status actions, the phase-1 placeholders for create/edit, and loading/error/empty states and accessibility (US-0118).
## Requirements
### Requirement: Eventos management page
The system SHALL render `GestionEventosPage` at `/portal/orgs/[tenant_id]/gestion-eventos`, under the `(administrador)` route group. The page SHALL follow the US-0116 visual system and render:
- exactly one `h1`, "Eventos", via `GritPageHeader`
- a primary "Nuevo evento" button
- a toolbar with the view switcher and filters
- a stats row
- the active view

Access MUST be restricted to active tenant administrators by the existing `(administrador)` layout.

#### Scenario: Administrator opens the page
- **WHEN** an active administrator of tenant T navigates to `/portal/orgs/T/gestion-eventos`
- **THEN** the page SHALL render the "Eventos" header, the "Nuevo evento" button, the toolbar, the stats row, and the cards view

#### Scenario: Non-administrator is redirected
- **WHEN** a trainer or athlete of tenant T navigates directly to `/portal/orgs/T/gestion-eventos`
- **THEN** they SHALL be redirected to `/portal/orgs/T`

### Requirement: Switchable event views
The page SHALL offer three views sharing the same dataset, filters, and actions: **Tarjetas** (default), **Lista**, and **Calendario**.
- The selected view MUST be synced to the URL query parameter `vista` (`tarjetas` | `lista` | `calendario`) without a full page reload or scroll jump.
- A missing or unknown value SHALL fall back to `tarjetas`.
- The switcher MUST be a `role="radiogroup"` labelled "Vista de eventos", with `role="radio"` / `aria-checked` options operable by keyboard (Tab, Arrow keys, Enter/Space).

#### Scenario: Default view is cards
- **WHEN** the page loads without a `vista` parameter
- **THEN** the cards view SHALL be displayed and the "Tarjetas" option SHALL have `aria-checked="true"`

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
- **WHEN** focus is on the view switcher and the user presses the Right Arrow key followed by Enter
- **THEN** the next view SHALL be selected

### Requirement: Cards view
The cards view SHALL render a responsive grid: 1 column below `sm`, 2 columns from `sm` to `lg`, 3 columns from `lg`. Each card SHALL show:
- the banner (`banner_url`), or a discipline-colored placeholder when it is null
- name and discipline
- date and time in `America/Bogota`, or "Fecha por definir" when `fecha_hora` is null
- duration
- location: the venue name, else `punto_encuentro`
- the trainer name, when present
- capacity: "Cupo: N", or "Cupo ilimitado" when null
- a price summary: "Gratis" when `precio` is empty, "$X" for a single option, "Desde $X" for several
- the estado badge
- a "Privado" tag when `publico = false`, and an "Inactivo" tag when `activo = false`
- the actions menu

#### Scenario: Card for a dated public event
- **WHEN** an event has `fecha_hora`, a venue, a trainer, `cupo_maximo = 30`, `precio` with one option of 20000, and `publico = true`
- **THEN** its card SHALL show the Bogotá-formatted date/time, venue name, trainer name, "Cupo: 30", "$20.000", the "Confirmado" badge, and no "Privado" tag

#### Scenario: Card for an undated private free event
- **WHEN** an event has `fecha_hora = null`, no venue, `punto_encuentro = 'Parque central'`, `cupo_maximo = null`, `precio = []`, and `publico = false`
- **THEN** its card SHALL show "Fecha por definir", "Parque central", "Cupo ilimitado", "Gratis", and the "Privado" tag

#### Scenario: Cancelled event card
- **WHEN** an event has `estado = 'cancelado'`
- **THEN** its card SHALL show the "Cancelado" badge with muted emphasis and SHALL still expose the actions menu

### Requirement: List view
The list view SHALL render a table with the following columns: Evento (name and discipline), Fecha y hora, Lugar, Entrenador, Cupo, Visibilidad (Público/Privado), Estado, and Acciones.
- It SHALL paginate client-side at 20 rows per page.
- Below `md` it SHALL collapse into stacked rows.
- Rows SHALL be sorted by `fecha_hora`, nulls last: ascending when periodo is "Próximos", descending otherwise.

#### Scenario: Table columns rendered
- **WHEN** the list view is shown with at least one event
- **THEN** the table SHALL display the columns Evento, Fecha y hora, Lugar, Entrenador, Cupo, Visibilidad, Estado, Acciones

#### Scenario: Pagination
- **WHEN** the filtered dataset has 45 events
- **THEN** the list view SHALL show 20 rows on page 1, 20 on page 2, and 5 on page 3

### Requirement: Calendar view
The calendar view SHALL render a Monday-first month grid for the current month in `America/Bogota`, with previous and next month navigation.
- Each month SHALL be loaded via `listEventos` with the month's `desde`/`hasta` range.
- Each day cell SHALL show up to 3 event chips (discipline color dot and truncated name; struck through when cancelled) plus a "+N" overflow indicator.
- Selecting a day SHALL list that day's events below the grid, with time, name, estado badge and actions menu.
- Undated events SHALL NOT be placed on the grid. A note "N eventos sin fecha" SHALL link to the list view.
- Day cells MUST be buttons with an `aria-label` that includes the date and the event count.
- The periodo filter SHALL be ignored in this view.

#### Scenario: Bogotá day placement
- **WHEN** an event has `fecha_hora = 2026-10-01T01:00:00Z`
- **THEN** it SHALL appear on September 30 in the calendar

#### Scenario: Month navigation loads range
- **WHEN** the user clicks the next-month button
- **THEN** the calendar SHALL display the next month and request events with `desde` = first day of that month and `hasta` = first day of the following month (Bogotá)

#### Scenario: Day overflow
- **WHEN** a day has 5 events
- **THEN** its cell SHALL show 3 chips and "+2"

#### Scenario: Select a day
- **WHEN** the user clicks a day with events
- **THEN** the events of that day SHALL be listed below the grid with their actions menu

#### Scenario: Undated events note
- **WHEN** the tenant has 2 events without `fecha_hora`
- **THEN** the calendar SHALL show "2 eventos sin fecha" linking to the list view

### Requirement: Event filters and stats
The toolbar SHALL provide the following filters. They SHALL combine with AND in the cards and list views.
- Search by `nombre`: case-insensitive, debounced 250 ms.
- Estado: Todos (default) / Confirmado / Cancelado.
- Periodo: Próximos (default; `fecha_hora >= now` or null) / Pasados / Todos.
- Disciplina: Todas, plus the tenant's disciplines.

A "Limpiar filtros" action SHALL reset all filters to their defaults. The stats row SHALL show Total, Próximos confirmados and Cancelados, computed over the unfiltered dataset.

#### Scenario: Filters combine
- **WHEN** the user searches "copa", selects estado "Confirmado", and selects a discipline
- **THEN** only events whose name contains "copa" (case-insensitive), with `estado = 'confirmado'`, in that discipline, and matching the periodo SHALL be shown

#### Scenario: Default periodo includes undated events
- **WHEN** the page loads with default filters
- **THEN** future events and events without `fecha_hora` SHALL be shown, and past events SHALL NOT

#### Scenario: Stats ignore filters
- **WHEN** the user applies filters that hide some events
- **THEN** the stats values SHALL remain unchanged

### Requirement: Change event status
The actions menu SHALL offer "Cancelar evento" when `estado = 'confirmado'`, and "Confirmar evento" when `estado = 'cancelado'`. Either action SHALL open `CambiarEstadoEventoModal`; confirming SHALL call `updateEstadoEvento` with the target estado.
- On success, the modal SHALL close and the dataset (and the calendar month, when active) SHALL reload.
- On failure, the modal SHALL stay open and show the mapped error inline.
- While submitting, the confirm button MUST be disabled with a loading indicator, and `Escape` MUST NOT close the modal.

#### Scenario: Cancel a confirmed event
- **WHEN** the admin chooses "Cancelar evento" on a confirmed event and confirms
- **THEN** the event's `estado` SHALL become `cancelado` and it SHALL re-render with the "Cancelado" badge in the current view

#### Scenario: Reconfirm a cancelled event
- **WHEN** the admin chooses "Confirmar evento" on a cancelled event and confirms
- **THEN** the event's `estado` SHALL become `confirmado`

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

### Requirement: Create and edit entry points (phase 1)
The "Nuevo evento" button and the "Editar" action SHALL exist and SHALL open `EventoProximamenteModal`, which states that event creation or editing will be available soon. They MUST NOT modify data. `GestionEventosPage` SHALL route both through dedicated `onNuevo` / `onEditar(evento)` handlers.

#### Scenario: Nuevo evento placeholder
- **WHEN** the admin clicks "Nuevo evento"
- **THEN** a modal SHALL state "La creación de eventos estará disponible próximamente" and no request SHALL be sent

#### Scenario: Editar placeholder
- **WHEN** the admin chooses "Editar" on an event
- **THEN** a modal SHALL state "La edición de eventos estará disponible próximamente" and the event SHALL be unchanged

### Requirement: Loading, error, and empty states
- While loading, the active view SHALL show skeletons: cards, rows, or the calendar grid.
- On load failure, the page SHALL show `GritEmptyState` with the error message and a "Reintentar" button that re-fetches.
- With no events, the page SHALL show "Aún no hay eventos" with a "Nuevo evento" button.
- When filters match nothing, the page SHALL show "No hay eventos que coincidan con los filtros" with "Limpiar filtros".

#### Scenario: Load error with retry
- **WHEN** `listEventos` fails
- **THEN** the error state with "Reintentar" SHALL be shown, and clicking it SHALL call `listEventos` again

#### Scenario: Empty tenant
- **WHEN** the tenant has no events
- **THEN** "Aún no hay eventos" SHALL be shown with a "Nuevo evento" button

#### Scenario: No filter matches
- **WHEN** the filters match no events
- **THEN** "No hay eventos que coincidan con los filtros" SHALL be shown, and "Limpiar filtros" SHALL restore the defaults

### Requirement: Accessible menus and dialogs
- The actions menu trigger MUST have `aria-haspopup="menu"`, `aria-expanded` and an `aria-label`. Items MUST use `role="menuitem"`. `Escape` MUST close the menu and return focus to the trigger.
- Modals MUST use `role="dialog"`, `aria-modal="true"` and `aria-labelledby`, move focus into the dialog on open, and close on `Escape` when not submitting.
- Modal backdrops MUST use `bg-grit-bg/70 backdrop-blur-sm`.
- Cancelled status MUST be conveyed by text, not only by color or strikethrough.

#### Scenario: Menu keyboard close
- **WHEN** the actions menu is open and the user presses Escape
- **THEN** the menu SHALL close and focus SHALL return to its trigger

#### Scenario: Dialog focus
- **WHEN** any event modal opens
- **THEN** focus SHALL move inside the dialog
