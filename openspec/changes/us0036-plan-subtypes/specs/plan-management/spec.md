## ADDED Requirements

### Requirement: Plan form modal includes an inline subtype management section
The plan form modal (`PlanFormModal`) SHALL include a visually separated "Tipos de plan / Subtipos" section below the main plan fields. The section SHALL render a list of inline subtype rows; each row SHALL display: Name (required), Price, Validity in days, Classes Included, Active toggle, and a Remove button. An "+ Agregar subtipo" button SHALL append a new empty row to the list.

#### Scenario: New plan form shows empty subtype section with add button
- **WHEN** the plan form modal opens in create mode
- **THEN** the subtypes section SHALL be empty and the "+ Agregar subtipo" button SHALL be visible

#### Scenario: Edit plan form pre-populates existing subtypes
- **WHEN** the plan form modal opens in edit mode for a plan with existing subtypes
- **THEN** each existing subtype SHALL appear as a pre-filled row in the subtypes section

#### Scenario: Administrator adds a new subtype row
- **WHEN** the administrator clicks "+ Agregar subtipo"
- **THEN** a new empty subtype row SHALL be appended to the list with default `activo = true`

#### Scenario: Administrator removes a subtype row
- **WHEN** the administrator clicks the Remove button on a subtype row
- **THEN** the row SHALL be removed from the form list immediately without any database call

#### Scenario: Removed subtype with active subscriptions is soft-deactivated on save
- **WHEN** the administrator removes a subtype row that corresponds to an existing subtype with active or pending subscriptions and saves the plan
- **THEN** the system SHALL call `deletePlanTipo` which SHALL soft-deactivate the subtype and return `{ deleted: false, deactivated: true }`
- **THEN** the UI SHALL display the inline notice: _"Este subtipo tiene suscripciones activas y no puede eliminarse. Se marcará como inactivo."_

---

### Requirement: Plan save requires at least one active subtype
The system SHALL enforce client-side validation that at least one subtype row with `activo = true` exists before the plan form can be submitted.

#### Scenario: Plan submitted with no active subtypes shows validation error
- **WHEN** the administrator submits the plan form and no subtype row has `activo = true`
- **THEN** the system SHALL display a validation error in the subtypes section and SHALL NOT submit any request

#### Scenario: Plan submitted with one active subtype passes subtype validation
- **WHEN** the administrator submits the plan form and at least one subtype row has `activo = true`
- **THEN** subtype validation SHALL pass and the form MAY proceed to persist the plan

#### Scenario: Each subtype row requires a nombre value
- **WHEN** the administrator submits the plan form and a subtype row has an empty `nombre`
- **THEN** the system SHALL display a required-field error on that row's `nombre` input and SHALL NOT submit the request

---

### Requirement: Plan save persists subtypes via diff-based upsert
The system SHALL persist subtype changes using a diff against the initial subtype state loaded when the edit modal opened. The diff SHALL identify: rows to create (no existing id), rows to update (id exists and values differ), rows to deactivate (id existed but was removed from the form). New subtype rows SHALL be inserted and their `tenant_id` SHALL be derived from the parent plan's `tenant_id`, never from client input.

#### Scenario: New subtype rows are inserted on plan save
- **WHEN** the administrator adds a subtype row that did not exist before and saves the plan
- **THEN** the service SHALL insert a new `plan_tipos` row with `tenant_id` copied from the parent plan

#### Scenario: Modified subtype rows are updated on plan save
- **WHEN** the administrator edits an existing subtype row and saves the plan
- **THEN** the service SHALL call `updatePlanTipo` for that row with the new values

#### Scenario: Removed subtype rows trigger deletion logic on plan save
- **WHEN** the administrator removes a subtype row that had an existing id and saves the plan
- **THEN** the service SHALL call `deletePlanTipo` for that id, which either hard-deletes or soft-deactivates based on subscription state

---

### Requirement: Plans list table shows active subtype count per plan
The plans table (`PlanesTable`) SHALL include a "Subtipos" column displaying the count of active subtypes (`activo = true`) for each plan. If a plan has no active subtypes, the column SHALL display "—". The count SHALL be derived from the embedded `plan_tipos` array already loaded with `getPlanes`; no additional query SHALL be issued.

#### Scenario: Plan with active subtypes shows count
- **WHEN** a plan has one or more `plan_tipos` rows with `activo = true`
- **THEN** the "Subtipos" column SHALL display the count of active subtypes (e.g., "3")

#### Scenario: Plan with no active subtypes shows dash
- **WHEN** a plan has no `plan_tipos` rows with `activo = true`
- **THEN** the "Subtipos" column SHALL display "—"

---

### Requirement: usePlanesView exposes getActiveTipos selector
The `usePlanesView` hook SHALL expose a `getActiveTipos(plan: Plan): PlanTipo[]` function that returns only the subtype entries where `activo === true` from the plan's embedded `plan_tipos` array, sorted by `nombre`.

#### Scenario: getActiveTipos filters inactive subtypes
- **WHEN** a plan has a mix of active and inactive subtypes
- **THEN** `getActiveTipos` SHALL return only entries where `activo === true`

#### Scenario: getActiveTipos returns empty array when no active subtypes
- **WHEN** a plan has no subtypes or all subtypes are inactive
- **THEN** `getActiveTipos` SHALL return an empty array

---

### Requirement: Plans without active subtypes hide the Adquirir button
The athlete plan view (`PlanesViewPage`) SHALL NOT render the "Adquirir" button for a plan that has no active subtypes. The button SHALL be disabled/hidden rather than shown in a broken state.

#### Scenario: Adquirir hidden when plan has no active subtypes
- **WHEN** a `usuario` views the plan catalogue and a plan has zero active subtypes
- **THEN** the "Adquirir" button SHALL NOT be rendered for that plan row

#### Scenario: Adquirir visible when plan has at least one active subtype
- **WHEN** a `usuario` views the plan catalogue and a plan has at least one active subtype
- **THEN** the "Adquirir" button SHALL be rendered for that plan row
