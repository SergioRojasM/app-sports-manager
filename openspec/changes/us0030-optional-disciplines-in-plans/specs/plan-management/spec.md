## MODIFIED Requirements

### Requirement: Plans list displays tenant-scoped table with operational states
The system SHALL load and display tenant membership plans in table format with columns `Name`, `Description`, `Price`, `Validity`, `Disciplines`, `Status`, and `Actions`, plus header and primary `New Plan` CTA. The list SHALL include loading, empty, and error states and SHALL support search/filter over plan name.

#### Scenario: Plans found for tenant
- **WHEN** tenant plans are returned from the data source
- **THEN** the system SHALL render the plans table with all required columns and row-level edit and delete actions

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

### Requirement: Plan form SHALL validate required fields and input constraints
The system SHALL enforce client-side validation on plan form submissions before sending any request. The form SHALL display field-level errors adjacent to offending inputs without clearing other field values.

#### Scenario: Missing required name field
- **WHEN** the administrator submits the plan form with an empty `nombre` field
- **THEN** the system SHALL display a required-field validation error on `nombre` and SHALL NOT submit the request

#### Scenario: Name exceeds maximum length
- **WHEN** the administrator submits the plan form with a `nombre` longer than 100 characters
- **THEN** the system SHALL display a length validation error on `nombre` and SHALL NOT submit the request

#### Scenario: Invalid price value
- **WHEN** the administrator submits the plan form with a `precio` value below zero
- **THEN** the system SHALL display a validation error on `precio` and SHALL NOT submit the request

#### Scenario: Invalid validity value
- **WHEN** the administrator submits the plan form with a `vigencia_meses` value less than 1
- **THEN** the system SHALL display a validation error on `vigencia_meses` and SHALL NOT submit the request

### Requirement: Plan form SHALL include a multi-discipline selector from tenant active disciplines
The system SHALL load the tenant's active disciplines and present them as a multi-select list (checkboxes) inside the plan form modal. Discipline selection is optional; a plan MAY be saved with zero discipline associations.

#### Scenario: Disciplines loaded into form modal
- **WHEN** the plan form modal opens
- **THEN** the system SHALL display a checklist of all active disciplines for the current tenant

#### Scenario: Edit modal pre-selects existing discipline associations
- **WHEN** the plan form modal opens in edit mode
- **THEN** the checkboxes for disciplines already associated with the plan SHALL be pre-checked

#### Scenario: Disciplines list is empty
- **WHEN** the tenant has no active disciplines
- **THEN** the system SHALL display an informational message indicating no disciplines are available and the submit action SHALL remain enabled
