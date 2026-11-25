# Spec Delta

## MODIFIED Requirements

### Requirement: Disciplines list displays tenant-scoped table with operational states
The system SHALL show the page heading "Tus disciplinas.", a search field labelled "Buscar disciplina" and a "Nueva disciplina" primary action, and SHALL list tenant disciplines in a side list headed "N DISCIPLINAS" with an "Activas" / "Todas" filter. Each list item SHALL show the discipline icon, name and the meta "N niveles · N atletas". The list SHALL include loading, empty, no-match and error states and SHALL support search over discipline name and description.

#### Scenario: Disciplines found for tenant
- **WHEN** tenant disciplines are returned from the data source
- **THEN** the system SHALL render the list with one item per discipline matching the filter and search, ordered by name

#### Scenario: No disciplines available
- **WHEN** no disciplines exist for the tenant
- **THEN** the system SHALL render an explicit empty state for disciplines management with a create action

#### Scenario: Disciplines are loading
- **WHEN** disciplines data fetch is in progress
- **THEN** the system SHALL render a loading state instead of empty/error fallback content

#### Scenario: Activas filter is the default
- **WHEN** the administrator opens the page
- **THEN** the "Activas" filter SHALL be selected and inactive disciplines SHALL be hidden until "Todas" is selected

#### Scenario: Item meta counts
- **WHEN** a discipline has 3 active levels and 38 athletes with an assigned level
- **THEN** its list item SHALL read "3 niveles · 38 atletas"

#### Scenario: Counts unavailable
- **WHEN** the athlete counts fail to load
- **THEN** the list SHALL render and the athlete part of the meta SHALL be omitted

## ADDED Requirements

### Requirement: Discipline selection drives a detail panel
Selecting a list item SHALL show that discipline in a detail panel next to the list (stacked below it under `lg`) and SHALL store the selection in the `disciplina` query parameter. Without a valid parameter, the first listed discipline SHALL be selected.

#### Scenario: Select a discipline
- **WHEN** the administrator selects "Acuatlón"
- **THEN** the detail panel SHALL show "Acuatlón", the item SHALL be marked with `aria-current="true"`, and the URL SHALL contain `?disciplina=<id>`

#### Scenario: Reload keeps the selection
- **WHEN** the page is opened with `?disciplina=<id>` of an existing discipline
- **THEN** that discipline SHALL be selected even if it is not the first one

#### Scenario: Unknown or filtered-out selection
- **WHEN** the `disciplina` parameter does not match a listed discipline
- **THEN** the first listed discipline SHALL be selected and the parameter SHALL be replaced

#### Scenario: Mobile selection
- **WHEN** the viewport is narrower than `lg` and the administrator selects an item
- **THEN** the page SHALL scroll to the detail panel and move focus to its heading

### Requirement: Discipline detail panel
The detail panel SHALL show the discipline icon, name, an "Activa" / "Inactiva" tag, the description (or "Sin descripción"), an "Editar" action, a delete action named "Eliminar {nombre}", and the stats "Atletas con nivel" and "Niveles activos".

#### Scenario: Detail content
- **WHEN** "Acuatlón" is selected, is active, has 3 active levels and 38 athletes with a level
- **THEN** the panel SHALL show "Acuatlón", the "Activa" tag, "38" under "Atletas con nivel" and "3" under "Niveles activos"

#### Scenario: Edit from the detail
- **WHEN** the administrator activates "Editar"
- **THEN** the discipline drawer SHALL open in edit mode prefilled with the selected discipline

#### Scenario: Delete from the detail
- **WHEN** the administrator confirms "Eliminar Acuatlón" in the confirmation dialog and the discipline has no dependent records
- **THEN** the discipline SHALL be deleted and the next listed discipline SHALL be selected

#### Scenario: Delete blocked by dependencies
- **WHEN** the deletion fails because plans, trainings or levels reference the discipline
- **THEN** the discipline SHALL remain and an alert SHALL explain the dependency

## REMOVED Requirements

### Requirement: DisciplinesTable row SHALL expose an expand toggle to reveal the levels panel
**Reason**: The v3 frame `fXuVP` replaces the table with an expandable row by a list + detail workspace. The levels are always visible in the detail panel of the selected discipline.
**Migration**: Select the discipline in the list; its levels render in the "Niveles de progresión" ladder of the detail panel (see `discipline-levels-management`). The levels are fetched when a discipline is selected and cached per discipline for the page session.
