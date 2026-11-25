# Capability: discipline-levels-management

## Purpose
Defines the ordered level catalogue (progression ladder) of each discipline and how administrators manage it.

## Requirements

### Requirement: Tenant administrator can manage the level catalogue for a discipline
The system SHALL allow authenticated users with `administrador` role to create, edit, and delete ordered levels for any discipline belonging to their tenant. Levels are scoped to `(tenant_id, disciplina_id)` and represent a progression hierarchy used for training category assignments.

#### Scenario: Administrator creates a new level for a discipline
- **WHEN** an administrator submits a valid `NivelDisciplinaFormModal` for a discipline
- **THEN** the system SHALL persist a new row in `public.nivel_disciplina` with the provided `nombre`, `orden`, `activo = true`, and the correct `tenant_id` and `disciplina_id`

#### Scenario: Duplicate level name is rejected
- **WHEN** an administrator submits a level with a `nombre` that already exists for the same `disciplina_id` and `tenant_id`
- **THEN** the system SHALL reject the insert and display an inline validation error indicating the name is already in use

#### Scenario: Duplicate orden value is rejected
- **WHEN** an administrator submits a level with an `orden` value that already exists for the same `disciplina_id` and `tenant_id`
- **THEN** the system SHALL reject the insert and display an inline validation error indicating the order position is already taken

#### Scenario: Administrator edits an existing level
- **WHEN** an administrator submits a valid edit for an existing `nivel_disciplina` row
- **THEN** the system SHALL update the `nombre`, `orden`, and `activo` fields in `public.nivel_disciplina` and the panel SHALL reflect the updated values

#### Scenario: Non-administrator cannot mutate nivel_disciplina
- **WHEN** an authenticated user without `administrador` role attempts to insert, update, or delete a `nivel_disciplina` row
- **THEN** the database RLS policy SHALL deny the operation and no row SHALL be persisted or modified

---

### Requirement: Level deletion SHALL be blocked when active references exist
The system SHALL prevent deletion of a `nivel_disciplina` row when any `usuario_nivel_disciplina` or `entrenamiento_categorias` record references it. The FK is defined with `ON DELETE RESTRICT`. The UI SHALL surface a clear error message.

#### Scenario: Delete blocked by usuario_nivel_disciplina reference
- **WHEN** an administrator attempts to delete a level that is referenced by at least one `usuario_nivel_disciplina` row
- **THEN** the system SHALL display an error message stating the level cannot be deleted because it is assigned to one or more athletes

#### Scenario: Delete blocked by entrenamiento_categorias reference
- **WHEN** an administrator attempts to delete a level that is referenced by at least one `entrenamiento_categorias` row
- **THEN** the system SHALL display an error message stating the level cannot be deleted because it is used in one or more training configurations

#### Scenario: Delete succeeds when no references exist
- **WHEN** an administrator attempts to delete a level that has no `usuario_nivel_disciplina` or `entrenamiento_categorias` references
- **THEN** the system SHALL delete the row from `public.nivel_disciplina` and remove it from the panel list

---

### Requirement: Levels panel SHALL display in ascending orden order
The detail panel of the selected discipline SHALL render a "Niveles de progresión" section with an "Agregar nivel" action and a ladder of level tiles sorted by `orden ASC`. Each tile SHALL display the position as a two-digit number ("01"), `nombre`, the number of athletes assigned to the level ("N atletas"), an "Inactivo" tag when `activo = false`, and actions for edit, move and delete. The ladder SHALL end with an add tile labelled with the next position ("Nivel 04").

#### Scenario: Levels are displayed sorted by orden
- **WHEN** the detail panel is shown for a discipline with multiple levels
- **THEN** the system SHALL render the level tiles in ascending `orden` order, numbered "01", "02", … in that order

#### Scenario: Empty level list shows empty state
- **WHEN** a discipline has no `nivel_disciplina` rows for the tenant
- **THEN** the system SHALL render an inline empty state with an "Agregar nivel" prompt

#### Scenario: Loading state is shown while fetching levels
- **WHEN** a discipline is selected for the first time and the fetch is in progress
- **THEN** the system SHALL render a loading indicator instead of the level tiles

#### Scenario: Add tile opens the level drawer
- **WHEN** the administrator activates the "Nivel 04" add tile
- **THEN** the level drawer SHALL open in create mode with `orden` prefilled with the next free position

### Requirement: nivel_disciplina database migration SHALL create correct schema
The migration SHALL create `public.nivel_disciplina` with columns `id`, `tenant_id` (FK → `public.tenants`), `disciplina_id` (FK → `public.disciplinas`), `nombre varchar(50)`, `orden integer`, `activo boolean DEFAULT true`, `created_at timestamptz DEFAULT now()`. It SHALL include:
- `UNIQUE (tenant_id, disciplina_id, nombre)`
- `UNIQUE (tenant_id, disciplina_id, orden)`
- `CHECK (orden > 0)`
- RLS: SELECT for any authenticated tenant member; INSERT/UPDATE/DELETE restricted to `get_admin_tenants_for_authenticated_user()`
- Index on `(tenant_id, disciplina_id)`

#### Scenario: Valid nivel_disciplina row is inserted
- **WHEN** an authenticated administrator inserts a valid row into `public.nivel_disciplina`
- **THEN** the insert SHALL succeed and the row SHALL be retrievable

#### Scenario: orden = 0 is rejected by check constraint
- **WHEN** a row is inserted with `orden = 0`
- **THEN** the database SHALL reject the insert with a check constraint violation

#### Scenario: Deleting a disciplina cascades to its nivel_disciplina rows
- **WHEN** a `public.disciplinas` row is deleted
- **THEN** all associated `nivel_disciplina` rows for that discipline SHALL be deleted via CASCADE

### Requirement: Athletes per level
The system SHALL count, per level, the athletes with an assignment in `usuario_nivel_disciplina` for the tenant, and SHALL show a distribution bar whose segments are proportional to those counts, with a text alternative listing each level and its count.

#### Scenario: Distribution reflects counts
- **WHEN** a discipline has levels with 18, 14 and 6 athletes
- **THEN** the tiles SHALL show "18 atletas", "14 atletas" and "6 atletas", and the bar's text alternative SHALL read "Principiante 18, Intermedio 14, Avanzado 6"

#### Scenario: No athletes assigned
- **WHEN** no athlete has a level in the discipline
- **THEN** every tile SHALL show "0 atletas" and the bar SHALL render empty

#### Scenario: Count fails
- **WHEN** the athlete counts cannot be loaded
- **THEN** the tiles SHALL show "—" instead of the count and the bar SHALL be hidden

### Requirement: Level reordering
Each level tile SHALL offer "Mover antes" and "Mover después" actions (absent at the ends of the ladder). Moving a level SHALL swap its `orden` with the adjacent level, persist both values, and keep focus on the moved level's control.

#### Scenario: Move a level up
- **WHEN** the administrator activates "Mover antes" on the level at position 02
- **THEN** that level SHALL become 01, the previous 01 SHALL become 02, and both SHALL be persisted

#### Scenario: Ends of the ladder
- **WHEN** the ladder renders
- **THEN** the first level SHALL NOT offer "Mover antes" and the last level SHALL NOT offer "Mover después"

#### Scenario: Move fails
- **WHEN** persisting the swap fails
- **THEN** the ladder SHALL reload from the server and an alert SHALL explain that the order was not changed
