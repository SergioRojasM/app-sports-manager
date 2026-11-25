# Spec Delta

## MODIFIED Requirements

### Requirement: Levels panel SHALL display in ascending orden order
The detail panel of the selected discipline SHALL render a "Niveles de progresión" section with an "Agregar nivel" action and a ladder of level tiles sorted by `orden ASC`. Each tile SHALL display the position as a two-digit number ("01"), `nombre`, the number of athletes assigned to the level ("N atletas"), an "Inactivo" tag when `activo = false`, and actions for edit, move and delete. The ladder SHALL end with an add tile labelled with the next position ("Nivel 04").

#### Scenario: Levels are displayed sorted by orden
- **WHEN** the detail panel is shown for a discipline with multiple levels
- **THEN** the system SHALL render the level tiles in ascending `orden` order, numbered "01", "02", … in that order

#### Scenario: Empty level list shows empty state
- **WHEN** a discipline has no `nivel_disciplina` rows for the tenant
- **THEN** the system SHALL render an inline empty state with an "Agregar nivel" prompt

#### Scenario: Loading state is shown while fetching levels
- **WHEN** a discipline is selected for the first time and the fetch is in progress
- **THEN** the system SHALL render a loading indicator instead of the level tiles

#### Scenario: Add tile opens the level drawer
- **WHEN** the administrator activates the "Nivel 04" add tile
- **THEN** the level drawer SHALL open in create mode with `orden` prefilled with the next free position

## ADDED Requirements

### Requirement: Athletes per level
The system SHALL count, per level, the athletes with an assignment in `usuario_nivel_disciplina` for the tenant, and SHALL show a distribution bar whose segments are proportional to those counts, with a text alternative listing each level and its count.

#### Scenario: Distribution reflects counts
- **WHEN** a discipline has levels with 18, 14 and 6 athletes
- **THEN** the tiles SHALL show "18 atletas", "14 atletas" and "6 atletas", and the bar's text alternative SHALL read "Principiante 18, Intermedio 14, Avanzado 6"

#### Scenario: No athletes assigned
- **WHEN** no athlete has a level in the discipline
- **THEN** every tile SHALL show "0 atletas" and the bar SHALL render empty

#### Scenario: Count fails
- **WHEN** the athlete counts cannot be loaded
- **THEN** the tiles SHALL show "—" instead of the count and the bar SHALL be hidden

### Requirement: Level reordering
Each level tile SHALL offer "Mover antes" and "Mover después" actions (absent at the ends of the ladder). Moving a level SHALL swap its `orden` with the adjacent level, persist both values, and keep focus on the moved level's control.

#### Scenario: Move a level up
- **WHEN** the administrator activates "Mover antes" on the level at position 02
- **THEN** that level SHALL become 01, the previous 01 SHALL become 02, and both SHALL be persisted

#### Scenario: Ends of the ladder
- **WHEN** the ladder renders
- **THEN** the first level SHALL NOT offer "Mover antes" and the last level SHALL NOT offer "Mover después"

#### Scenario: Move fails
- **WHEN** persisting the swap fails
- **THEN** the ladder SHALL reload from the server and an alert SHALL explain that the order was not changed
