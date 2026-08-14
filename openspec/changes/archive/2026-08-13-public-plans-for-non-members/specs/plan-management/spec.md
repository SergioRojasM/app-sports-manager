## ADDED Requirements

### Requirement: Administrator can configure a plan as public
The plan create/edit form SHALL expose a "Plan público" control bound to `planes.es_publico`, with helper text explaining that public plans can be seen and acquired by people who do not belong to the organization. The control SHALL default to unchecked for new plans, SHALL reflect the stored value when editing, and SHALL be carried over when duplicating a plan. The value SHALL be persisted on create and update, and SHALL be writable only by administrators of the plan's tenant.

#### Scenario: New plan defaults to private
- **WHEN** an administrator opens the plan form in create mode
- **THEN** the "Plan público" control SHALL be unchecked

#### Scenario: Public flag is saved on create
- **WHEN** an administrator creates a plan with "Plan público" checked
- **THEN** the plan SHALL be persisted with `es_publico = true`

#### Scenario: Public flag is saved on edit
- **WHEN** an administrator edits a plan and toggles "Plan público"
- **THEN** the new value SHALL be persisted and SHALL be reflected when the form is reopened

#### Scenario: Non-administrator cannot change the flag
- **WHEN** a user who is not an administrator of the plan's tenant attempts to update `es_publico`
- **THEN** the update SHALL be rejected by row level security

---

### Requirement: Plans table shows a visibility column to administrators
The plans management table SHALL include a `Visibilidad` column, separate from the existing `Estado` column, showing `Público` for rows with `es_publico = true` and `Privado` otherwise. The column SHALL be rendered **only** in the administrator's plans management view, and SHALL NOT appear in the read-only or athlete-facing plan views.

#### Scenario: Administrator sees the visibility column
- **WHEN** an administrator opens the plans management screen
- **THEN** the table SHALL render a `Visibilidad` column
- **THEN** each row SHALL show `Público` or `Privado` according to its `es_publico` value

#### Scenario: Athlete does not see the visibility column
- **WHEN** a user with role `usuario` opens the plans view, where row actions are still enabled so they can acquire a plan
- **THEN** the `Visibilidad` column SHALL NOT be rendered

#### Scenario: Coach does not see the visibility column
- **WHEN** a user with role `entrenador` opens the read-only plans view
- **THEN** the `Visibilidad` column SHALL NOT be rendered

---

### Requirement: Plan catalog read access is membership-scoped
Read access to the plan catalog (`planes`, `plan_tipos`, `plan_tipos_servicios`, `planes_disciplina`, `servicios`) SHALL no longer be granted to every authenticated user unconditionally. Access SHALL be granted when the caller is a member of the owning tenant, when the plan is public, or when the caller already holds a subscription referencing the plan (respectively, already holds units of the service). All administrator, coach and athlete flows that read these tables from inside a tenant SHALL continue to work unchanged.

#### Scenario: Administrator plan management is unaffected
- **WHEN** an administrator opens the plans management screen for their tenant
- **THEN** all plans of that tenant, their subtypes, service assignments and discipline associations SHALL be readable

#### Scenario: Member read-only plan view is unaffected
- **WHEN** a user with role `usuario` or `entrenador` opens the plans view for their tenant
- **THEN** all active plans of that tenant SHALL be readable

#### Scenario: Service-dependent flows are unaffected
- **WHEN** a member uses the services catalog, plan subtype service assignment, subscription management, training restriction editing or booking with service unit deduction
- **THEN** the service and plan rows those flows depend on SHALL remain readable

#### Scenario: Cross-tenant private plan is not readable
- **WHEN** an authenticated user queries the private plans of a tenant they do not belong to
- **THEN** no rows SHALL be returned
