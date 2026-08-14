## MODIFIED Requirements

### Requirement: Featured card treatment and available-sessions widget
The marketplace grid SHALL render the most recently published active listing with a visually distinct "Featured" treatment (larger card, badge). A floating widget SHALL display an accurate count of trainings matching the currently active filters (date range, search, and organization combined), not a fixed current-week count, so the widget stays consistent with what the grid is actually showing.

#### Scenario: Most recent publication is featured
- **WHEN** the marketplace loads multiple active publications
- **THEN** the one with the most recent `created_at` (publish time) SHALL render with the Featured treatment and the rest SHALL render as standard cards

#### Scenario: Widget count reflects the active filter combination
- **WHEN** the marketplace page loads with its default date range (today through end of current month) or after a visitor changes the date range, search text, or Organización filter
- **THEN** the floating widget SHALL display the count of listings currently visible in the grid under that exact filter combination

---

### Requirement: Marketplace filtering by date, search, and organization
The marketplace page SHALL filter its already-loaded, unbounded-future list of published trainings by an explicit `dateFrom`/`dateTo` local date range (inclusive), a search field filtering by case-insensitive substring match on `nombre`/`descripcion`/required services, and an "Organización" dropdown filtering by the publishing tenant. On first load, `dateFrom`/`dateTo` SHALL default to today through the last day of the current calendar month, so the grid shows "próximos entrenamientos del mes" without manual filtering. The four quick chips (Hoy, Mañana, Esta semana, Fin de semana) SHALL remain available as shortcuts that compute and apply the equivalent `dateFrom`/`dateTo` pair, replacing any custom range; a chip SHALL show as active only when the current range exactly matches its computed range, and clicking an already-active chip SHALL clear the date range entirely (not revert to the current-month default). All three filters (date range, search, organization) SHALL apply client-side to the fetched list, SHALL be combinable (AND semantics), and SHALL show the grid's existing empty state — with no crash or stale results — when the combination matches zero trainings.

#### Scenario: Default view shows current month's upcoming trainings
- **WHEN** a logged-in visitor opens `/portal/entrenamientos-publicos` for the first time in a session
- **THEN** the grid SHALL show only published trainings whose `fecha_hora` falls between the current moment and the end of the current calendar month, inclusive, with no filter applied manually

#### Scenario: Explicit date range filters the list
- **WHEN** a visitor has selected a `dateFrom`/`dateTo` range via the calendar or a quick chip
- **THEN** only publications whose `fecha_hora` falls within `[dateFrom, dateTo]` inclusive SHALL remain visible

#### Scenario: Quick chip applies its equivalent range and toggles off
- **WHEN** a visitor selects the "Esta semana" quick chip
- **THEN** `dateFrom`/`dateTo` SHALL be set to the equivalent current-week range and only publications within that range SHALL remain visible
- **WHEN** the visitor then clicks the same "Esta semana" chip again
- **THEN** the date range SHALL be cleared entirely and all upcoming publications SHALL be visible again, not just those in the current month

#### Scenario: Search filters by name, description, or required service
- **WHEN** a visitor types a substring into the search field that matches a listing's `nombre`, `descripcion`, or a required service name
- **THEN** only matching listings SHALL remain visible, combined with any active date range and organization filter

#### Scenario: Organization dropdown filters by tenant
- **WHEN** a visitor selects a specific organization from the dropdown
- **THEN** only that organization's published listings SHALL remain visible, combined with any active date range and search filter

#### Scenario: Filter combination with zero matches shows the empty state
- **WHEN** the active date range, search, and organization filters together match no published trainings
- **THEN** the grid SHALL show its existing empty state, with no crash and no results carried over from the previous filter combination

---

## ADDED Requirements

### Requirement: Filters drawer calendar defaults to current month and supports month navigation
The filters drawer's calendar SHALL default to displaying the current real-world month and SHALL expose Prev/Next controls that move the displayed month back or forward one month at a time. The displayed month SHALL be owned by shared filter state (not transient component state), so it persists if the drawer is closed and reopened without a page reload. The "Prev" control SHALL be disabled once the displayed month is the current real-world month, since no bookable date exists before today. Days belonging to the previous or next month (leading/trailing filler cells) and days strictly before today SHALL be rendered disabled and SHALL NOT be clickable.

#### Scenario: Drawer opens showing the current month
- **WHEN** a visitor opens the "Filtrar" drawer for the first time
- **THEN** the calendar SHALL display the current real-world month, with today and the default active range (today through end of month) visually indicated

#### Scenario: Next chevron advances the calendar indefinitely
- **WHEN** a visitor clicks the "Next" chevron repeatedly
- **THEN** the displayed month SHALL advance one month at a time with no upper limit

#### Scenario: Prev chevron is disabled at the current month
- **WHEN** the calendar is displaying the current real-world month
- **THEN** the "Prev" control SHALL be disabled and clicking or activating it SHALL have no effect

#### Scenario: Past and adjacent-month days are disabled
- **WHEN** the calendar renders a day strictly before today, or a filler day belonging to the previous or next month
- **THEN** that day SHALL be visually disabled and SHALL NOT respond to a click

#### Scenario: Displayed month persists across drawer close and reopen
- **WHEN** a visitor navigates the calendar to a future month, closes the drawer, and reopens it without a page reload
- **THEN** the calendar SHALL still display that same month, not reset to the current real-world month

---

### Requirement: Filters drawer calendar supports click-to-select date range
Clicking a selectable calendar day SHALL update the active `dateFrom`/`dateTo` range according to the current selection state: if no range is in progress (no `dateFrom`, or both `dateFrom` and `dateTo` already set), the clicked day SHALL become the new `dateFrom` with `dateTo` cleared; if `dateFrom` is set and `dateTo` is not, and the clicked day is on or after `dateFrom`, it SHALL become `dateTo`, completing the range; if `dateFrom` is set and `dateTo` is not, and the clicked day is before `dateFrom`, the clicked day SHALL replace `dateFrom` and restart the selection rather than producing an inverted range or an error. Days within the selected range (inclusive of both endpoints) SHALL be visually highlighted, with `dateFrom`/`dateTo` endpoints receiving a stronger highlight than days between them. The selected range SHALL be echoed as short text near the calendar. A "Limpiar fechas" action SHALL clear `dateFrom`/`dateTo` entirely, without affecting the search text or Organización filter. The selected `dateFrom`/`dateTo` SHALL persist if the drawer is closed and reopened without a page reload.

#### Scenario: Selecting a single day starts a range
- **WHEN** a visitor clicks a selectable day while no range is in progress
- **THEN** that day SHALL become `dateFrom`, `dateTo` SHALL remain unset, the day SHALL be highlighted, and the grid SHALL update to show only trainings on or after that date

#### Scenario: Selecting a second, later-or-equal day completes the range
- **WHEN** a visitor clicks a selectable day on or after the current `dateFrom`, with `dateTo` unset
- **THEN** that day SHALL become `dateTo`, the full inclusive range SHALL be highlighted, and the grid SHALL update to show only trainings within `[dateFrom, dateTo]`

#### Scenario: Selecting an earlier day restarts the selection
- **WHEN** a visitor clicks a selectable day earlier than the current `dateFrom`, with `dateTo` unset
- **THEN** that day SHALL replace `dateFrom`, any prior selection SHALL be discarded, and no error or inverted range SHALL result

#### Scenario: Range summary text reflects the selection
- **WHEN** only `dateFrom` is set, or both `dateFrom` and `dateTo` are set
- **THEN** a short text summary near the calendar SHALL legibly describe the current selection (e.g. "Desde 12 ago" or "12 ago – 20 ago")

#### Scenario: "Limpiar fechas" clears the range without affecting other filters
- **WHEN** a visitor clicks "Limpiar fechas"
- **THEN** `dateFrom`/`dateTo` SHALL both be cleared, the grid SHALL show all upcoming trainings, and the active search text and Organización selection SHALL remain unchanged

#### Scenario: Selected range persists across drawer close and reopen
- **WHEN** a visitor selects a `dateFrom`/`dateTo` range, closes the drawer, and reopens it without a page reload
- **THEN** the same range SHALL still be selected and highlighted

---

### Requirement: Filters drawer calendar day cells are keyboard accessible
Each selectable calendar day cell SHALL be a real `<button>` element reachable via Tab and activatable with Enter or Space, with an `aria-label` stating the full date (e.g. "12 de agosto de 2026"). Disabled day cells (past days and adjacent-month filler days) SHALL expose `aria-disabled="true"` and SHALL NOT be reachable via Tab. The Prev/Next month controls SHALL each have a descriptive `aria-label` ("Mes anterior" / "Mes siguiente"), and the disabled "Prev" state SHALL expose a native `disabled` attribute so assistive technology and keyboard navigation skip it, not merely a visual dimming.

#### Scenario: Selectable day is reachable and activatable via keyboard
- **WHEN** a visitor tabs through the calendar
- **THEN** each selectable day SHALL receive focus in order, expose an `aria-label` with the full date, and SHALL be activatable with Enter or Space

#### Scenario: Disabled day is skipped by keyboard navigation
- **WHEN** a visitor tabs through the calendar
- **THEN** disabled days (past days and adjacent-month filler days) SHALL be skipped and SHALL expose `aria-disabled="true"`

#### Scenario: Disabled Prev control is skipped and non-activatable
- **WHEN** the calendar displays the current real-world month
- **THEN** the "Prev" button SHALL expose a native `disabled` attribute, be unreachable via Tab, and have no effect if activated
