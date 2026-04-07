## ADDED Requirements

### Requirement: Administrator can duplicate an existing plan from the plans table
The system SHALL allow a tenant administrator to duplicate an existing membership plan by clicking a "Duplicar" button on any plan row. The duplication SHALL open the plan creation modal pre-filled with all source plan data so the administrator can review and modify before saving.

#### Scenario: Duplicate button triggers pre-filled modal
- **WHEN** an administrator clicks the "Duplicar" button on a plan row
- **THEN** the system SHALL open the plan form modal in `'duplicate'` mode with all source plan fields pre-loaded

#### Scenario: Duplicate button absent in read-only table
- **WHEN** `PlanesTable` is rendered with `readOnly={true}`
- **THEN** the system SHALL NOT render the "Duplicar" button on any row

### Requirement: Duplicate modal pre-fills name with "Copia de" prefix
The system SHALL pre-fill the plan name field with `"Copia de " + sourceName`, where `sourceName` is the source plan's `nombre` truncated to a maximum of 91 characters, ensuring the total does not exceed the 100-character `nombre` constraint.

#### Scenario: Source name is 91 characters or fewer
- **WHEN** the administrator duplicates a plan whose `nombre` is 91 characters or fewer
- **THEN** the modal SHALL pre-fill `nombre` with `"Copia de " + sourceName` (full name, no truncation)

#### Scenario: Source name exceeds 91 characters
- **WHEN** the administrator duplicates a plan whose `nombre` is longer than 91 characters
- **THEN** the modal SHALL pre-fill `nombre` with `"Copia de " + sourceName.slice(0, 91)`

### Requirement: Duplicate modal pre-fills all plan fields from the source plan
The system SHALL pre-fill the duplicate modal with `descripcion`, `tipo`, `beneficios`, `activo`, and `disciplinaIds` values copied from the source plan.

#### Scenario: All plan-level fields are pre-loaded
- **WHEN** the duplicate modal opens
- **THEN** the `descripcion`, `tipo`, `beneficios`, `activo`, and `disciplinaIds` fields SHALL reflect the source plan's values

#### Scenario: Pre-filled fields are editable
- **WHEN** the administrator edits any pre-filled field before submitting
- **THEN** the submitted plan SHALL use the modified values, not the source plan's values

### Requirement: Duplicate modal pre-fills all plan subtypes without original IDs
The system SHALL pre-load all `plan_tipos` from the source plan into the duplicate modal's subtype rows. Each row SHALL include all original field values (`nombre`, `descripcion`, `precio`, `vigencia_dias`, `clases_incluidas`, `activo`) but SHALL NOT carry the source subtype's database `id`. This ensures that on submission each subtype is persisted as a new row.

#### Scenario: Source plan subtypes appear as pre-filled rows
- **WHEN** the duplicate modal opens for a plan with N active and inactive subtypes
- **THEN** the modal SHALL show N subtype rows, each pre-filled with the source subtype's field values

#### Scenario: Duplicated subtypes are created as new DB rows
- **WHEN** the administrator submits the duplicate modal without modifying subtypes
- **THEN** each subtype SHALL be inserted into `plan_tipos` with a new UUID; the source plan's `plan_tipos` rows SHALL NOT be modified

#### Scenario: Source plan has no subtypes
- **WHEN** the administrator duplicates a plan with zero subtypes
- **THEN** the modal SHALL open with no pre-filled subtype rows and validation SHALL block submission until at least one subtype is added

### Requirement: Duplicate modal displays "duplicate" labeling and submits as a new plan
The system SHALL display "Duplicar plan" as the modal title and "Crear plan" as the submit button label when `mode === 'duplicate'`. On submission the system SHALL call `createPlan` (not `updatePlan`) and execute the full create path.

#### Scenario: Modal title and submit label in duplicate mode
- **WHEN** the duplicate modal is open
- **THEN** the modal title SHALL read "Duplicar plan" and the submit button SHALL read "Crear plan"

#### Scenario: Successful duplication creates a new independent plan
- **WHEN** the administrator submits the duplicate modal with valid data
- **THEN** the system SHALL insert a new row in `planes`, insert new `plan_tipos` rows, refresh the plans list, close the modal, and display "Plan creado correctamente."

#### Scenario: Duplicate name conflict on submit
- **WHEN** the administrator submits the duplicate modal and a plan with the same name already exists in the tenant
- **THEN** the system SHALL display the error "Ya existe un plan con ese nombre en esta organización." inline in the modal and SHALL NOT close the modal
