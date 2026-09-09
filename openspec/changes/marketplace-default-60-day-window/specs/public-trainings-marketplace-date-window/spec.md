## ADDED Requirements

### Requirement: Default 60-Day Marketplace Window
The logged-in Public Trainings Marketplace (`/portal/entrenamientos-publicos`) SHALL default its active date filter, on initial mount and before any user filter interaction, to a rolling window spanning from the current date through 60 calendar days later, inclusive, independent of calendar-month boundaries.

#### Scenario: Loading the page shows only trainings within the next 60 days
- **WHEN** a logged-in user opens `/portal/entrenamientos-publicos` for the first time in a session, with no prior filter interaction
- **THEN** the grid displays only published trainings whose `fechaHora` falls between now and 60 calendar days from today, inclusive

#### Scenario: Default window size does not shrink near month-end
- **WHEN** a logged-in user opens `/portal/entrenamientos-publicos` on any day of the month, including the first or last day of the month
- **THEN** the resulting default date window still spans a full 60 days from that day, unaffected by how many days remain in the current calendar month

### Requirement: Default-Range Indicator Note
The marketplace page SHALL display an explanatory note communicating the active 60-day default window and the availability of date filtering, visible only while the currently active date filter exactly equals the default 60-day window, and hidden while the page is loading or in an error state.

#### Scenario: Note is visible under the default window
- **WHEN** the active `dateFrom`/`dateTo` filter exactly matches the default 60-day window (today → today + 60 days)
- **THEN** the page shows a note stating that trainings for the next 60 days are being shown and that the user can filter by dates to see more

#### Scenario: Note is hidden while loading or on error
- **WHEN** the marketplace listing is loading or has failed to load
- **THEN** the default-range note is not rendered, regardless of the current date filter values

#### Scenario: Note hides after applying a quick chip
- **WHEN** the user selects one of the quick date chips (Hoy, Mañana, Esta semana, Fin de semana) from the filters drawer
- **THEN** the resulting date filter no longer matches the default 60-day window and the note is hidden

#### Scenario: Note hides after selecting a custom date range
- **WHEN** the user selects a custom date range via the filters drawer's calendar that differs from the default 60-day window
- **THEN** the note is hidden

#### Scenario: Note hides after clearing the date filter
- **WHEN** the user clicks "Limpiar fechas" in the filters drawer
- **THEN** the date filter is removed entirely (all upcoming trainings shown) and the note is hidden

#### Scenario: Note reappears if the user's selection reproduces the default window
- **WHEN** the user's filter selection, through any combination of chip clicks, custom range selection, or clearing and reselecting, results in `dateFrom`/`dateTo` values that exactly equal the freshly computed default 60-day window
- **THEN** the note becomes visible again

### Requirement: Default Window Composes with Other Marketplace Filters
The default 60-day date window SHALL combine with the existing search (name/description/required-service) and Organización (`tenantId`) filters using AND semantics, consistent with how any other active date filter already combines with them.

#### Scenario: Search filter narrows results within the default window
- **WHEN** the default 60-day window is active and the user enters search text matching a subset of the trainings within that window
- **THEN** the grid shows only trainings that fall within the 60-day window AND match the search text

#### Scenario: Organización filter narrows results within the default window
- **WHEN** the default 60-day window is active and the user selects a specific organization in the Organización filter
- **THEN** the grid shows only trainings that fall within the 60-day window AND belong to the selected organization
