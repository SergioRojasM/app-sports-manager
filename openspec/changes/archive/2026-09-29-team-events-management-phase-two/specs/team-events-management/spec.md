## MODIFIED Requirements

### Requirement: Cards view
The cards view SHALL render a responsive grid: 1 column below `sm`, 2 columns from `sm` to `lg`, 3 columns from `lg`. Each card SHALL show:
- the banner (`banner_url`), or a discipline-colored placeholder when it is null
- name, and discipline ("Sin disciplina" when null)
- date and time in `America/Bogota`, or "Fecha por definir" when `fecha_hora` is null
- duration
- location: the venue snapshot name, else `punto_encuentro`
- the trainer names, comma-separated, when any
- capacity: "Cupo: N", or "Cupo ilimitado" when null
- a price summary: "Gratis" when `precio` is empty on a published event, "Precio por definir" when `precio` is empty on a draft, "$X" for a single option, "Desde $X" for several
- the estado badge on published events, and the "Borrador" tag on drafts instead
- a "Privado" tag when `publico = false`, and an "Inactivo" tag when `activo = false`
- the actions menu, unless `hideActions` is set (used by the wizard preview)

#### Scenario: Card for a dated public event
- **WHEN** a published event has `fecha_hora`, a venue, a trainer, `cupo_maximo = 30`, `precio` with one option of 20000, and `publico = true`
- **THEN** its card SHALL show the Bogotá-formatted date/time, venue name, trainer name, "Cupo: 30", "$20.000", the "Confirmado" badge, and no "Privado" tag

#### Scenario: Card for an undated private free event
- **WHEN** a published event has `fecha_hora = null`, no venue, `punto_encuentro = 'Parque central'`, `cupo_maximo = null`, `precio = []`, and `publico = false`
- **THEN** its card SHALL show "Fecha por definir", "Parque central", "Cupo ilimitado", "Gratis", and the "Privado" tag

#### Scenario: Card with several trainers
- **WHEN** an event's trainer snapshots are "Ana" and "Luis"
- **THEN** its card SHALL show "Ana, Luis"

#### Scenario: Cancelled event card
- **WHEN** an event has `estado = 'cancelado'`
- **THEN** its card SHALL show the "Cancelado" badge with muted emphasis and SHALL still expose the actions menu

### Requirement: Event filters and stats
The toolbar SHALL provide the following filters. They SHALL combine with AND in the cards and list views.
- Search by `nombre`: case-insensitive, debounced 250 ms.
- Estado: Todos (default) / Confirmado / Cancelado / Borrador. Confirmado and Cancelado SHALL exclude drafts; Borrador SHALL show only drafts.
- Periodo: Próximos (default; `fecha_hora >= now` or null) / Pasados / Todos.
- Disciplina: Todas, plus the tenant's discipline names. It matches the event's `disciplina_id` name.

A "Limpiar filtros" action SHALL reset all filters to their defaults. The stats row SHALL show Total (including drafts), Próximos confirmados (excluding drafts), Cancelados and Borradores, computed over the unfiltered dataset.

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
- **THEN** the stats values SHALL remain unchanged

#### Scenario: Drafts counted separately
- **WHEN** the tenant has 3 published upcoming confirmed events and 2 drafts
- **THEN** Total SHALL be 5, Próximos confirmados SHALL be 3, and Borradores SHALL be 2

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

## REMOVED Requirements

### Requirement: Create and edit entry points (phase 1)
**Reason**: Phase 2 (US-0119) delivers the real create/edit wizard, so the "próximamente" placeholder modal is obsolete.
**Migration**: "Nuevo evento" and "Editar" / "Continuar editando" now navigate to the wizard routes (see "Create and edit navigation"). `EventoProximamenteModal.tsx` is deleted.

## ADDED Requirements

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
When the page loads with `?guardado=creado` or `?guardado=editado`, it SHALL show a dismissible success banner ("Evento creado correctamente." / "Evento actualizado correctamente."), then remove the `guardado` parameter with `router.replace` while preserving `vista`.

#### Scenario: Banner after publish
- **WHEN** the wizard redirects to `/gestion-eventos?guardado=creado`
- **THEN** the banner "Evento creado correctamente." SHALL be shown, and the URL SHALL no longer contain `guardado`

#### Scenario: Banner not repeated on reload
- **WHEN** the user reloads the page after the banner was shown
- **THEN** no banner SHALL be shown
