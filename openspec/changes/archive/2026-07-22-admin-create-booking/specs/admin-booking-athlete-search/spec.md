## ADDED Requirements

### Requirement: Admin can search athletes by name or identification number
When creating a booking on behalf of an athlete, the system SHALL present a searchable combobox that filters the team's active member list by full name or `numero_identificacion` (cédula), replacing the former plain `<select>`.

#### Scenario: Dropdown opens on input focus
- **WHEN** the admin focuses the search input in the athlete picker
- **THEN** the system SHALL display a scrollable dropdown list of all active team members

#### Scenario: Filter by name
- **WHEN** the admin types a partial name (e.g., "Juan") into the search input
- **THEN** the system SHALL show only athletes whose full name contains "Juan" (case-insensitive)
- **THEN** athletes whose name does not match SHALL be hidden

#### Scenario: Filter by identification number
- **WHEN** the admin types digits (e.g., "1023") into the search input
- **THEN** the system SHALL show only athletes whose `numero_identificacion` contains "1023"

#### Scenario: No results
- **WHEN** the search term matches no athlete's name or identification number
- **THEN** the system SHALL show a "Sin resultados" message in the dropdown

#### Scenario: Select athlete by click
- **WHEN** the admin clicks an option in the dropdown
- **THEN** the system SHALL set that athlete's `id` as the selected `atleta_id`
- **THEN** the search input SHALL display the athlete's full name
- **THEN** the dropdown SHALL close

#### Scenario: Select athlete by keyboard Enter
- **WHEN** the dropdown is open and an item is highlighted
- **WHEN** the admin presses `Enter`
- **THEN** the system SHALL select the highlighted athlete (same as clicking)

#### Scenario: Navigate with arrow keys
- **WHEN** the admin presses `ArrowDown` while the dropdown is open
- **THEN** the highlight SHALL move to the next item in the list
- **WHEN** the admin presses `ArrowUp`
- **THEN** the highlight SHALL move to the previous item

#### Scenario: Close with Escape
- **WHEN** the admin presses `Escape` while the dropdown is open
- **THEN** the dropdown SHALL close without selecting any athlete

#### Scenario: Editing search clears selection
- **WHEN** the admin modifies the search input text after selecting an athlete
- **THEN** the system SHALL reset `atleta_id` to empty, requiring re-selection

#### Scenario: Secondary line shows identification
- **WHEN** an athlete has a non-null `numero_identificacion`
- **THEN** the dropdown option SHALL display `{tipo_identificacion}: {numero_identificacion}` as a secondary text line beneath the athlete's name

#### Scenario: Auto-focus on modal open
- **WHEN** the booking modal opens in create mode with `showAtletaPicker=true`
- **THEN** the search input SHALL receive focus automatically

#### Scenario: Loading state
- **WHEN** the athlete list is being fetched from the database
- **THEN** the search input SHALL be disabled
- **THEN** the placeholder SHALL read "Cargando atletas…"

#### Scenario: ARIA accessibility
- **WHEN** the combobox is rendered
- **THEN** the input element SHALL have `role="combobox"` and `aria-expanded` reflecting dropdown open state
- **THEN** the dropdown list SHALL have `role="listbox"`
- **THEN** each option SHALL have `role="option"` and a stable `id`
- **THEN** the input SHALL have `aria-activedescendant` pointing to the highlighted option's `id`
