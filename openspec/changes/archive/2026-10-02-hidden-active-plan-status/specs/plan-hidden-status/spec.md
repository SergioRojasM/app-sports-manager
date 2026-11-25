## ADDED Requirements

### Requirement: Plans SHALL store athlete visibility separately from active state
The `planes` table SHALL have a column `visible_atletas boolean not null default true`. The plan status SHALL be derived as: "Activo" when `activo` and `visible_atletas`; "Activo no visible" when `activo` and not `visible_atletas`; "Inactivo" when not `activo`. A plan with `visible_atletas = false` SHALL NOT have `es_publico = true`, enforced by a check constraint.

#### Scenario: Existing plans after migration
- **WHEN** the migration is applied
- **THEN** every pre-existing plan has `visible_atletas = true` and behaves as before

#### Scenario: Hidden plan cannot be made public
- **WHEN** an update sets `es_publico = true` on a plan with `visible_atletas = false`
- **THEN** the database rejects it with a check-constraint violation

### Requirement: Plan form SHALL offer a three-value Estado selector
The plan form modal SHALL replace the "Plan activo" checkbox with a labelled "Estado" select offering exactly "Activo", "Activo no visible" and "Inactivo". New plans SHALL default to "Activo". Selecting "Inactivo" SHALL NOT change the stored `visible_atletas`.

#### Scenario: Save as Activo no visible
- **WHEN** the administrator selects "Activo no visible" and saves
- **THEN** the plan is stored with `activo = true`, `visible_atletas = false`, `es_publico = false`

#### Scenario: Helper text for hidden status
- **WHEN** "Activo no visible" is selected
- **THEN** the form shows "Los atletas no pueden ver ni adquirir este plan. Solo un administrador puede asignarlo desde Gestión de suscripciones."

#### Scenario: Public checkbox locked
- **WHEN** "Activo no visible" is selected
- **THEN** "Plan público" is unchecked and disabled, with the text "Un plan no visible no puede ser público."

#### Scenario: Inactivating a hidden plan keeps it hidden
- **WHEN** the administrator sets a hidden plan to "Inactivo", saves and reopens it
- **THEN** the select shows "Inactivo" and `visible_atletas` is still `false`

#### Scenario: Duplicating a hidden plan
- **WHEN** the administrator duplicates a plan whose status is "Activo no visible"
- **THEN** the duplicate form opens with "Activo no visible" selected

#### Scenario: Constraint error on save
- **WHEN** saving fails with the hidden/public check constraint
- **THEN** the form shows the inline error "Un plan no visible no puede ser público."

### Requirement: Plans table SHALL show the Activo no visible status
The administrator plans table SHALL render a distinct status badge for hidden plans with the text "Activo no visible" and a `visibility_off` icon, so the state is not conveyed by color alone.

#### Scenario: Hidden plan badge
- **WHEN** the administrator views the plans table containing a hidden plan
- **THEN** that row shows the amber "Activo no visible" badge with the icon, and the Visibilidad column shows "Privado"

### Requirement: Hidden plans SHALL NOT be readable by athletes or non-members
Row-level security SHALL allow reading a plan with `visible_atletas = false` only to administrators and trainers of its tenant and to users who already hold a subscription to it. The same rule SHALL apply to its `plan_tipos`, `planes_disciplina` and `plan_tipos_servicios` rows.

#### Scenario: Athlete member queries a hidden plan
- **WHEN** an athlete member without a subscription to it selects the hidden plan or its subtypes, disciplines or plan-services
- **THEN** zero rows are returned

#### Scenario: Non-member queries a hidden plan
- **WHEN** a user who is not a member of the tenant selects the hidden plan
- **THEN** zero rows are returned

#### Scenario: Administrator creates a plan
- **WHEN** an administrator inserts a plan and requests the created row back
- **THEN** the insert succeeds and the row is returned

#### Scenario: Trainer sees plan name in reports
- **WHEN** a trainer opens booking management for an athlete subscribed to a hidden plan
- **THEN** the plan name is shown in the table and in the CSV export

### Requirement: Hidden plans SHALL be excluded from athlete-facing catalogs
The athlete and trainer plans view and the organization "Ver planes" modal (member and non-member) SHALL NOT list plans with `visible_atletas = false`.

#### Scenario: Athlete plans view
- **WHEN** an athlete opens the tenant plans page
- **THEN** hidden plans are not listed

#### Scenario: Trainer plans view
- **WHEN** a trainer opens the tenant plans page
- **THEN** hidden plans are not listed

#### Scenario: Organization catalog modal
- **WHEN** any user opens "Ver planes" for the organization
- **THEN** hidden plans are not listed

#### Scenario: Only hidden plans exist
- **WHEN** all active plans of the tenant are hidden
- **THEN** the catalogs show their existing empty state

### Requirement: Athletes SHALL NOT be able to subscribe themselves to a hidden plan
`can_subscribe_to_plan` SHALL return false for a plan with `visible_atletas = false`, so a self-service `suscripciones` insert is rejected.

#### Scenario: Forged self-service insert
- **WHEN** an athlete inserts a subscription for a hidden plan with `atleta_id = auth.uid()`
- **THEN** the insert is rejected with error `42501` and the UI service surfaces the existing plan-unavailable error

### Requirement: Administrators SHALL be able to assign hidden plans
The "Crear suscripción" and "Editar suscripción" plan pickers SHALL list active plans including hidden ones, labelling hidden plans "{nombre} (No visible)". Inactive plans SHALL NOT be listed.

#### Scenario: Create a subscription with a hidden plan
- **WHEN** the administrator selects a hidden plan in "Crear suscripción" and completes the flow
- **THEN** the subscription and its service balances are created

#### Scenario: Edit a subscription to a hidden plan
- **WHEN** the administrator changes a subscription's plan to a hidden plan and saves
- **THEN** the change is persisted

#### Scenario: Inactive plans excluded
- **WHEN** the administrator opens either plan picker
- **THEN** inactive plans are not listed regardless of `visible_atletas`

### Requirement: Holders of a hidden plan SHALL keep access to their own subscription data
A user holding a subscription to a hidden plan SHALL read the plan, its subtypes and services, and use them for bookings, without the plan appearing in any catalog.

#### Scenario: Assigned athlete views subscriptions
- **WHEN** an athlete who was assigned a hidden plan opens "Mis Suscripciones" or Inicio
- **THEN** the plan name, subtype and service balances are shown

#### Scenario: Assigned athlete books a training
- **WHEN** that athlete books a training requiring a service granted by the hidden plan
- **THEN** the booking succeeds and the unit is deducted

#### Scenario: Assigned athlete cannot re-acquire
- **WHEN** that athlete browses the plan catalogs
- **THEN** the hidden plan is not listed

#### Scenario: Visible plan becomes hidden
- **WHEN** a plan with existing athlete subscriptions is changed to "Activo no visible"
- **THEN** existing subscriptions are unchanged and their holders keep reading the plan
