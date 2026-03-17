## ADDED Requirements

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
`NivelesDisciplinaPanel` SHALL fetch and render the levels for the expanded discipline sorted by `orden ASC`. Each row SHALL display `orden`, `nombre`, an `activo` indicator, and action buttons for edit and delete.

#### Scenario: Levels are displayed sorted by orden
- **WHEN** the `NivelesDisciplinaPanel` is opened for a discipline with multiple levels
- **THEN** the system SHALL render the levels in ascending `orden` order

#### Scenario: Empty level list shows empty state
- **WHEN** a discipline has no `nivel_disciplina` rows for the tenant
- **THEN** the system SHALL render an inline empty state with an "Agregar nivel" prompt

#### Scenario: Loading state is shown while fetching levels
- **WHEN** the panel is first expanded and the fetch is in progress
- **THEN** the system SHALL render a loading indicator instead of the level rows

---

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
