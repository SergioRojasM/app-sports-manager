## ADDED Requirements

### Requirement: DisciplinesTable row SHALL expose an expand toggle to reveal the levels panel
Each row in `DisciplinesTable` SHALL render a chevron icon button that toggles the visibility of `NivelesDisciplinaPanel` inline below the row. The toggle SHALL be visible only to users with `administrador` role (matching the existing gate on the Disciplines page). Expanding a row triggers a lazy fetch of `nivel_disciplina` rows for that discipline and tenant. Once fetched, the data is cached in component state for the life of the modal/page session.

#### Scenario: Administrator expands a discipline row to view levels
- **WHEN** an authenticated administrator clicks the expand toggle on a discipline row
- **THEN** the system SHALL render `NivelesDisciplinaPanel` inline below that row with the levels for that discipline

#### Scenario: Only one panel can be expanded at a time (or multiple — either is acceptable)
- **WHEN** the administrator expands a second discipline row
- **THEN** `NivelesDisciplinaPanel` SHALL be rendered for the newly expanded row; the previous row's panel state is independent

#### Scenario: Expand toggle is not affected by existing DisciplinesTable actions
- **WHEN** the expand toggle is added to the table
- **THEN** all existing row actions (edit, toggle active, delete) SHALL continue to function without regression

#### Scenario: Levels fetch is triggered on first expand only
- **WHEN** an administrator collapses and re-expands a discipline row
- **THEN** the system SHALL use the cached levels data and SHALL NOT issue a second Supabase query
