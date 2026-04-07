## MODIFIED Requirements

### Requirement: Create and edit plan flows use a shared right-side modal
The system SHALL support create, edit, and duplicate plan workflows through a single right-side modal component that switches mode by state (`'create'`, `'edit'`, or `'duplicate'`). The modal SHALL close via backdrop click, close button, or `Esc` key when not submitting, and SHALL expose submit and cancel controls with disabled and loading behavior during pending requests. The modal title SHALL read "Crear plan" for `'create'` mode, "Editar plan" for `'edit'` mode, and "Duplicar plan" for `'duplicate'` mode. The submit button SHALL read "Crear plan" for `'create'` and `'duplicate'` modes, and "Guardar cambios" for `'edit'` mode.

#### Scenario: Create flow opened from plans screen
- **WHEN** the administrator clicks the `New Plan` button
- **THEN** the system SHALL open the right-side modal in create mode with empty or default form values

#### Scenario: Edit flow opened from plan row action
- **WHEN** the administrator selects the edit action on an existing plan
- **THEN** the system SHALL open the same modal in edit mode with all plan fields and discipline associations pre-filled

#### Scenario: Duplicate flow opened from plan row duplicate action
- **WHEN** the administrator selects the duplicate action on an existing plan
- **THEN** the system SHALL open the same modal in duplicate mode, pre-filled with source plan data, showing "Duplicar plan" as the title and "Crear plan" as the submit label

#### Scenario: Modal submit during pending request
- **WHEN** the administrator submits create, edit, or duplicate and the request is pending
- **THEN** the system SHALL disable submit interactions and show a loading state until the operation completes

### Requirement: Plans list displays tenant-scoped table with operational states
The system SHALL load and display tenant membership plans in table format with columns `Name`, `Description`, `Price`, `Validity`, `Disciplines`, `Status`, and `Actions`, plus header and primary `New Plan` CTA. The list SHALL include loading, empty, and error states and SHALL support search/filter over plan name. The `Actions` column SHALL include "Editar", "Duplicar", and "Eliminar" buttons for each row in editable (non-read-only) view.

#### Scenario: Plans found for tenant
- **WHEN** tenant plans are returned from the data source
- **THEN** the system SHALL render the plans table with all required columns and row-level edit, duplicate, and delete actions

#### Scenario: No plans available
- **WHEN** no plans exist for the tenant
- **THEN** the system SHALL render an explicit empty state in the plans table

#### Scenario: Plans data is loading
- **WHEN** the plans data fetch is in progress
- **THEN** the system SHALL render a loading state instead of empty or error content

#### Scenario: Disciplines column renders as badge chips
- **WHEN** a plan has one or more associated disciplines
- **THEN** the system SHALL render the discipline names as badge chips in the Disciplines column

#### Scenario: Disciplines column is empty
- **WHEN** a plan has no associated disciplines
- **THEN** the system SHALL render a muted "Sin disciplinas" placeholder text in the Disciplines column
