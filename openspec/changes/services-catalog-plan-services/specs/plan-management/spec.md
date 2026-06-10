## ADDED Requirements

### Requirement: Plan tipo sub-form includes a Services section
The system SHALL add a `PlanTipoServiciosSection` component below the existing `clases_incluidas` input inside the plan tipo sub-form in `PlanFormModal`. The Services section SHALL allow the admin to add, edit, and remove service-unit assignments for the plan tipo being created or edited. The existing `clases_incluidas` field SHALL remain present and functional.

#### Scenario: Plan tipo sub-form shows Services section
- **WHEN** the admin opens the plan form modal and views the plan tipo sub-form
- **THEN** the system SHALL render the `PlanTipoServiciosSection` below `clases_incluidas` with an "Agregar servicio" control

#### Scenario: Edit plan tipo pre-fills existing service assignments
- **WHEN** the admin opens the plan form in edit mode for a plan that has plan tipos with service assignments
- **THEN** the Services section SHALL pre-fill with the existing service rows (service name and unidades) for each plan tipo

#### Scenario: Create plan tipo with services persists assignments
- **WHEN** the admin creates a new plan with a plan tipo that has service rows added
- **THEN** after successful submission the `plan_tipos_servicios` table SHALL contain the assigned rows

#### Scenario: Edit plan tipo and remove all services clears assignments
- **WHEN** the admin removes all service rows from a plan tipo and saves
- **THEN** all `plan_tipos_servicios` rows for that plan tipo SHALL be deleted

#### Scenario: clases_incluidas field remains functional
- **WHEN** the admin sets a value in the `clases_incluidas` field and saves
- **THEN** the `plan_tipos.clases_incluidas` value SHALL be persisted as before, unaffected by the new Services section
