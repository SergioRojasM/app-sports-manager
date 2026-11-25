# Spec Delta

## MODIFIED Requirements

### Requirement: Plans list displays tenant-scoped table with operational states
The system SHALL load and display tenant membership plans as a grid of plan cards, one per plan, showing each plan's disciplines and the validity of its subtypes, with loading and empty states.

#### Scenario: Plans found for tenant
- **WHEN** tenant plans are returned from the data source
- **THEN** the system SHALL render one card per plan with the required content and the card-level edit, duplicate, and delete actions, each with an accessible name that includes the plan name

#### Scenario: No plans available
- **WHEN** no plans exist for the tenant
- **THEN** the system SHALL render an explicit empty state with a "Nuevo plan" action

#### Scenario: Plans data is loading
- **WHEN** the plans data fetch is in progress
- **THEN** the system SHALL render a loading state instead of empty or error content

#### Scenario: Disciplines column renders as badge chips
- **WHEN** a plan has one or more associated disciplines
- **THEN** its card SHALL render the discipline names as chips under the plan name

#### Scenario: Disciplines column is empty
- **WHEN** a plan has no associated disciplines
- **THEN** its card SHALL render a muted "Sin disciplinas" text under the plan name

#### Scenario: Validity column shows uniform vigencia
- **WHEN** all active plan_tipos of a plan have the same `vigencia_dias` (e.g. 30)
- **THEN** the card's price line SHALL show that validity ("/ 30 d")

#### Scenario: Validity column shows vigencia range
- **WHEN** the active plan_tipos of a plan have different `vigencia_dias` values (e.g. 30 and 90)
- **THEN** the price line SHALL show the validity of the cheapest active subtype and the subtype rows SHALL list every active subtype

#### Scenario: Validity column shows dash when no active tipos
- **WHEN** a plan has no active plan_tipos
- **THEN** the card SHALL show "Sin precio" instead of a price and validity

### Requirement: Usuario sees Adquirir action per plan
`PlanesViewPage` SHALL render the same plan cards in read-only mode (no edit, duplicate or delete actions) and SHALL render an "Adquirir" button on each card exclusively when the requesting user has role `usuario`. The button MUST NOT be rendered for `entrenador` role.

#### Scenario: Usuario sees Adquirir button on each plan row
- **WHEN** a `usuario` views the plan catalogue
- **THEN** each plan card SHALL display an "Adquirir" button

#### Scenario: Entrenador does not see Adquirir button
- **WHEN** an `entrenador` views the plan catalogue
- **THEN** no "Adquirir" button SHALL be rendered for any plan card

#### Scenario: Read-only cards
- **WHEN** a `usuario` or `entrenador` views the plan catalogue
- **THEN** no card SHALL render edit, duplicate or delete actions, nor the visibility pill

### Requirement: Delete plan SHALL require confirmation and remove associated records
The system SHALL require the administrator to confirm deletion in an accessible dialog that names the plan before committing. Deletion SHALL hard-delete the plan row; `public.planes_disciplina` rows SHALL be removed via cascade.

#### Scenario: Administrator confirms plan deletion
- **WHEN** the administrator confirms the delete action for a plan
- **THEN** the system SHALL delete the plan row from `public.planes` (cascading to `planes_disciplina`) and SHALL remove the plan from the rendered list

#### Scenario: Administrator cancels plan deletion
- **WHEN** the administrator dismisses the delete confirmation
- **THEN** the system SHALL take no action, the plan SHALL remain in the list, and focus SHALL return to the card's delete action

## ADDED Requirements

### Requirement: Plans page header and search
The plans page SHALL show the heading "Planes de membresía.", a search field labelled "Buscar plan" that filters the cards by plan name, and a "Nuevo plan" primary action. A search without matches SHALL show a no-results state with "Limpiar búsqueda".

#### Scenario: Search without matches
- **WHEN** the administrator searches a name that no plan has
- **THEN** the page SHALL show the no-results state and "Limpiar búsqueda" SHALL restore every card

### Requirement: Plans page load error
When loading the plans fails, the page SHALL show an error state with a "Reintentar" action, distinct from the empty state.

#### Scenario: Load error
- **WHEN** loading the plans fails
- **THEN** the system SHALL render an error state with a "Reintentar" action, distinct from the empty state

### Requirement: Plan card status tags
Each plan card SHALL show the modality tag (when the plan has one), the visibility pill (administrators only) and the "Activo" / "Inactivo" status tag.

#### Scenario: Modality and visibility
- **WHEN** a plan has `tipo = 'presencial'`, `es_publico = false` and `visible_atletas = true`
- **THEN** its card SHALL show the "Presencial" tag and the "Privado" visibility pill with a lock icon

#### Scenario: Public plan
- **WHEN** a plan has `es_publico = true` and `visible_atletas = true`
- **THEN** its card SHALL show the "Público" visibility pill with a globe icon

#### Scenario: Plan without modality
- **WHEN** a plan has `tipo = null`
- **THEN** its card SHALL NOT render a modality tag

### Requirement: Plan card price and subtypes
Each plan card SHALL show the price of its cheapest active subtype with that subtype's validity, or "Sin precio" when no subtype is active, followed by one row per active subtype.

#### Scenario: Price summary from active subtypes
- **WHEN** a plan has active subtypes "Mensual" ($120.000, 30 días) and "Trimestral" ($330.000, 90 días)
- **THEN** the card SHALL show "$120.000" with "/ 30 d" as the main price, and the subtype rows "Mensual · 30 d" and "Trimestral · $330.000"

#### Scenario: Plan without active subtypes
- **WHEN** a plan has no active subtypes
- **THEN** the card SHALL show "Sin precio" instead of the price and the hint "Agrega un subtipo activo para publicarlo"

### Requirement: Plan card included items
Each plan card SHALL list under "INCLUYE" the distinct services of its active subtypes, then its benefits.

#### Scenario: Included services and benefits
- **WHEN** a plan's active subtypes include the services "Pista libre" and "Fondo largo dominical" and its `beneficios` is "10 % en eventos GRIT"
- **THEN** the "INCLUYE" list SHALL show the two services (each once) with a check icon, then the benefit with a gift icon

### Requirement: Plans page feedback
Plan mutation results SHALL be announced in an inline alert above the grid: success as a status message that the administrator can dismiss, and errors as an alert.

#### Scenario: Plan saved
- **WHEN** the administrator saves "GRIT Running"
- **THEN** a dismissible success alert SHALL read the success message and SHALL be announced with `role="status"`

#### Scenario: Delete blocked
- **WHEN** deleting a plan fails because subscriptions reference it
- **THEN** the plan SHALL remain and an alert with `role="alert"` SHALL explain why

## REMOVED Requirements

### Requirement: Plans list table shows active subtype count per plan
**Reason**: The v3 frame `J7Lw7d` replaces the plans table with cards. A card lists each active subtype by name, validity and price, which carries more information than a count column.
**Migration**: Read the active subtypes from the card's subtype rows. The count is still available as `getActiveTipos(plan).length` for code that needs it.
