## ADDED Requirements

### Requirement: Activo indicator in every management view
The management page SHALL show whether each event is **Activo** or **Inactivo** (`eventos.activo`) in the cards, list and calendar views, with a text label and an icon (`visibility` / `visibility_off`), never by color alone. An inactive event is hidden from members and visitors, so the indicator SHALL be prominent:
- **Cards**: an "Activo" / "Inactivo" pill next to the estado badge over the banner, both with an opaque background so they stay legible over any image; an inactive card SHALL also have a dashed amber border.
- **List**: an "Activo" column with the pill (table) and an "Activo" row (stacked layout below `md`).
- **Calendar**: inactive chips SHALL show a `visibility_off` icon and amber text; the day cell's `aria-label` SHALL count inactive events; the selected-day list SHALL show the pill next to the estado badge.

#### Scenario: Inactive event in the cards view
- **WHEN** the admin opens the cards view and an event has `activo = false`
- **THEN** its card SHALL show an opaque "Inactivo" pill over the banner and a dashed amber border

#### Scenario: List column
- **WHEN** the admin opens the list view
- **THEN** the table SHALL have an "Activo" column showing "Activo" or "Inactivo" for each event

#### Scenario: Calendar day with an inactive event
- **WHEN** a day has 2 events, one of them inactive
- **THEN** the day cell's `aria-label` SHALL read "…, 2 eventos, 1 inactivo", the inactive chip SHALL show the `visibility_off` icon, and the selected-day list SHALL show its "Inactivo" pill

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
