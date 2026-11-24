# portal-my-bookings Specification

## Purpose
Defines the cross-tenant `/portal/mis-reservas` page, where a signed-in user reviews their training bookings across organizations, filters them by date, attendance, discipline and organization, sees a summary of outcomes, and exports the result.

## Requirements

### Requirement: Mis reservas route and data scope
The system SHALL serve `/portal/mis-reservas` to any signed-in user and SHALL list only that user's bookings across all organizations. Without filters it SHALL load the latest 100 bookings; with filters, the bookings that match them. Unauthenticated visitors SHALL be redirected to login with `next=/portal/mis-reservas`.

#### Scenario: Default load
- **WHEN** a user with 140 bookings opens the page without filters
- **THEN** the 100 most recent bookings SHALL be loaded

#### Scenario: Unauthenticated visitor
- **WHEN** a visitor without a session opens the page
- **THEN** they SHALL be redirected to `/auth/login?next=%2Fportal%2Fmis-reservas`

### Requirement: Mis reservas header and export
The page SHALL show the single `h1` "Mis reservas." with "reservas." as the accent, and an "Exportar CSV" action. The action SHALL download the currently filtered bookings as CSV, and SHALL be disabled when there are none.

#### Scenario: Export filtered rows
- **WHEN** the "Asistió" filter is active and 2 bookings match
- **THEN** "Exportar CSV" SHALL download a file with those 2 bookings

#### Scenario: Nothing to export
- **WHEN** no booking matches
- **THEN** "Exportar CSV" SHALL be disabled

### Requirement: Mis reservas filters apply immediately
The filter bar SHALL offer:
- a date segmented control (7 días, Último mes, Mes a la fecha, Todo; default Todo);
- an attendance segmented control (Todos, Asistió, No asistió, Sin registrar; default Todos);
- a "Disciplinas" select;
- an "Organización" select, only when the user's bookings span several organizations.

Each change SHALL reload the list at once; only the newest response SHALL be shown. Select options SHALL come from the unfiltered load.

#### Scenario: Segment applies without a button
- **WHEN** the user selects "Último mes"
- **THEN** the list SHALL reload with the bookings of the last month and no "Aplicar" button SHALL be required

#### Scenario: Out-of-order responses
- **WHEN** the user selects "7 días" and then "Todo" before the first response arrives
- **THEN** the list SHALL show the result for "Todo"

#### Scenario: Options do not shrink
- **WHEN** the user filters by discipline "Natación piscina"
- **THEN** the "Disciplinas" select SHALL still list every discipline of the unfiltered load

#### Scenario: Organization select hidden for one organization
- **WHEN** all of the user's bookings belong to the same organization
- **THEN** the "Organización" select SHALL NOT be rendered

### Requirement: Mis reservas custom date range
A "Personalizado" control SHALL open a popover with "Desde" and "Hasta" date inputs and an "Aplicar" button. The range SHALL be applied only on "Aplicar". The popover SHALL reject an end before the start or a span over 60 days, with an inline message. When a custom range is active, the control SHALL show it and no date segment SHALL be pressed. Escape and clicking outside SHALL close the popover and return focus to its trigger.

#### Scenario: Valid custom range
- **WHEN** the user enters 2026-08-01 to 2026-08-31 and clicks "Aplicar"
- **THEN** the list SHALL show the August bookings and the control SHALL read "1 ago – 31 ago"

#### Scenario: Range too long
- **WHEN** the user enters a 75-day range
- **THEN** "El rango de fechas no puede superar los 60 días." SHALL be shown and "Aplicar" SHALL be disabled

### Requirement: Mis reservas stats strip
Above the list, a strip SHALL show four counts over the filtered bookings:
- **Reservas**: all bookings;
- **Asistidas**: attendance registered as attended;
- **No asistió**: attendance registered as absent;
- **Canceladas**: estado `cancelada`.

#### Scenario: Counts match the list
- **WHEN** the filtered list holds 7 bookings: 2 attended, 1 absent and 3 cancelled
- **THEN** the strip SHALL read 7 Reservas, 2 Asistidas, 1 No asistió, 3 Canceladas

### Requirement: Mis reservas grouped list
Bookings SHALL be listed by training date, newest first, under month headings like "SEPTIEMBRE 2026" (Bogotá). Each row SHALL show:
- a day-and-month tile, highlighted for confirmed bookings;
- "{organización} · {entrenamiento}";
- the discipline with its icon, the Bogotá time and the plan name, when present;
- the estado as a text tag;
- the attendance: "Asistió", "No asistió" or "Sin registrar";
- the booking date ("16 sep");
- the rejection reason for rejected bookings.

#### Scenario: Month grouping across years
- **WHEN** bookings fall on 2026-01-03 and 2025-12-28
- **THEN** they SHALL appear under "ENERO 2026" and then "DICIEMBRE 2025"

#### Scenario: Row content
- **WHEN** a confirmed booking of "SwimLab" for "Resistencia 2K", discipline "Natación piscina", on 2026-09-03 06:00 Bogotá with plan "SwimLab Mensual", attended, booked on 2026-09-01, is listed
- **THEN** its row SHALL show "03 SEP", "SwimLab · Resistencia 2K", "Natación piscina", "6:00 am", "SwimLab Mensual", "Confirmada", "Asistió" and "1 sep"

#### Scenario: Rejected booking reason
- **WHEN** a booking is `rechazada` with reason "Cupo lleno"
- **THEN** its row SHALL show "Rechazada" and "Cupo lleno"

### Requirement: Mis reservas footnote and pagination
Below the list, without filters, the page SHALL show "Mostrando tus últimas 100 reservas. Usa los filtros para ver más." when 100 bookings were loaded, and "Mostrando N reservas." in every other case. When the filtered bookings exceed the page size (25 by default; 25, 50 or 100), the page SHALL paginate them, and month headings SHALL repeat on each page.

#### Scenario: Cap reached
- **WHEN** no filter is active and 100 bookings were loaded
- **THEN** the footnote SHALL read "Mostrando tus últimas 100 reservas. Usa los filtros para ver más."

#### Scenario: Pagination
- **WHEN** 60 bookings match and the page size is 25
- **THEN** the page SHALL show bookings 1–25 and a pager with 3 pages

### Requirement: Mis reservas states
While loading, the page SHALL show a loading state. On failure it SHALL show "No se pudieron cargar tus reservas" and a "Reintentar" button that repeats the last request. With no bookings and no filters, it SHALL show "Aún no tienes reservas" with "Ver organizaciones" → `/portal/orgs`. With filters that match nothing, it SHALL show "No hay reservas con estos filtros" and "Limpiar filtros".

#### Scenario: Retry
- **WHEN** the request fails and the user clicks "Reintentar"
- **THEN** the same request SHALL be repeated and, on success, the list SHALL render

#### Scenario: Filter empty
- **WHEN** filters match nothing and the user clicks "Limpiar filtros"
- **THEN** all filters SHALL reset and the default list SHALL reload

### Requirement: Mis reservas responsive layout
From 1024px, rows SHALL align to the column headings ENTRENAMIENTO, ESTADO, ASISTENCIA and RESERVADA. Below 1024px, the headings SHALL be hidden and each row SHALL stack the estado, attendance and booking date under the training. The stats strip SHALL become a 2×2 grid, and segmented controls SHALL scroll inside their tracks. No viewport from 360px up SHALL scroll horizontally.

#### Scenario: Phone width
- **WHEN** the page is viewed at 375px
- **THEN** rows SHALL stack, the stats SHALL form a 2×2 grid, and the page SHALL NOT scroll horizontally
