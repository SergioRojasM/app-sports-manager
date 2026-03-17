## ADDED Requirements

### Requirement: Training series form SHALL offer an optional categories step when discipline has active levels
The `EntrenamientoFormModal` SHALL conditionally render an `EntrenamientoCategoriasSection` step only when the selected `disciplina_id` has at least one `nivel_disciplina` row with `activo = true` for the tenant. When no active levels exist for the discipline, the categories step SHALL be hidden and no `entrenamiento_grupo_categorias` rows SHALL be created.

#### Scenario: Categories step appears for a discipline with active levels
- **WHEN** an administrator selects a `disciplina_id` that has at least one active `nivel_disciplina` for the tenant
- **THEN** the training form SHALL display the categories step with a "¿Usar categorías?" toggle

#### Scenario: Categories step is absent for a discipline without levels
- **WHEN** an administrator selects a `disciplina_id` that has no `nivel_disciplina` rows for the tenant
- **THEN** the training form SHALL NOT render the categories step and the form layout SHALL be unchanged from the pre-feature state

#### Scenario: Toggling "¿Usar categorías?" off hides the capacity inputs
- **WHEN** the "¿Usar categorías?" toggle is set to inactive
- **THEN** the per-level `cupos_asignados` inputs SHALL be hidden and no category rows SHALL be submitted

---

### Requirement: Category capacity allocation SHALL not exceed training series capacidad_maxima
`useEntrenamientoForm` SHALL validate in-memory that `SUM(cupos_asignados)` across all category rows does not exceed `capacidad_maxima` of the series. If exceeded, form submission SHALL be blocked and an inline error SHALL be shown. The summary row SHALL display total allocated and remaining unallocated seats.

#### Scenario: Sum equals capacidad_maxima allows submission
- **WHEN** the sum of all `cupos_asignados` values equals `capacidad_maxima`
- **THEN** no capacity validation error SHALL be shown and form submission SHALL be permitted

#### Scenario: Sum exceeds capacidad_maxima blocks submission
- **WHEN** the sum of all `cupos_asignados` values exceeds `capacidad_maxima`
- **THEN** the system SHALL display a validation error and the submit button SHALL be disabled

#### Scenario: Summary row shows correct unallocated seats
- **WHEN** `capacidad_maxima = 20` and sum of `cupos_asignados = 15`
- **THEN** the summary row SHALL display "Cupos sin categoría: 5"

#### Scenario: At least one category must have cupos_asignados > 0 when categories are enabled
- **WHEN** categories are enabled but all `cupos_asignados` inputs are 0
- **THEN** the system SHALL block submission with an inline error indicating at least one category must have capacity

---

### Requirement: createTrainingSeries SHALL persist group categories and propagate to instances
When categories are enabled on the series form, `createTrainingSeries()` SHALL insert the category rows into `public.entrenamiento_grupo_categorias` after the group is created, and SHALL also insert corresponding rows into `public.entrenamiento_categorias` for every generated training instance with `sincronizado_grupo = true`.

#### Scenario: Group categories are persisted on series creation
- **WHEN** an administrator creates a series with categories enabled
- **THEN** `public.entrenamiento_grupo_categorias` SHALL contain one row per enabled level with the correct `grupo_id`, `nivel_id`, and `cupos_asignados`

#### Scenario: Instance categories are created with sincronizado_grupo = true
- **WHEN** a series with categories is created and instances are generated
- **THEN** each generated training instance SHALL have corresponding `entrenamiento_categorias` rows with `sincronizado_grupo = true` matching the group category definitions

#### Scenario: Series created without categories produces no category rows
- **WHEN** a series is created with categories disabled or on a discipline without levels
- **THEN** no `entrenamiento_grupo_categorias` or `entrenamiento_categorias` rows SHALL be inserted

---

### Requirement: updateTrainingSeries SHALL re-sync categories according to scope
When categories are edited on an existing series, the sync behavior SHALL mirror the `bloquear_sync_grupo` pattern:
- Scope `single`: update only the selected instance's `entrenamiento_categorias` rows; mark them `sincronizado_grupo = false`.
- Scope `future`: update `entrenamiento_grupo_categorias` and re-sync all future instances where `sincronizado_grupo = true`.
- Scope `series`: update `entrenamiento_grupo_categorias` and re-sync all instances where `sincronizado_grupo = true`.

#### Scenario: Single-scope edit sets sincronizado_grupo = false on overridden instance
- **WHEN** an administrator edits categories with scope `'single'` for one instance
- **THEN** that instance's `entrenamiento_categorias` rows SHALL have `sincronizado_grupo = false` and sibling instances SHALL be unaffected

#### Scenario: Future-scope edit does not touch past instances
- **WHEN** an administrator edits categories with scope `'future'`
- **THEN** only current and future instances with `sincronizado_grupo = true` SHALL have their `entrenamiento_categorias` rows updated

#### Scenario: Series-scope edit re-syncs all eligible instances
- **WHEN** an administrator edits categories with scope `'series'`
- **THEN** all instances with `sincronizado_grupo = true` SHALL have their `entrenamiento_categorias` rows updated to match the new group category definition

---

### Requirement: entrenamiento_grupo_categorias and entrenamiento_categorias database tables SHALL be created with correct schema
The migration SHALL create `public.entrenamiento_grupo_categorias` with `grupo_id` (FK → `public.entrenamientos_grupo` ON DELETE CASCADE), `nivel_id` (FK → `public.nivel_disciplina` ON DELETE RESTRICT), `cupos_asignados integer CHECK >= 0`, and `UNIQUE (grupo_id, nivel_id)`.

It SHALL also create `public.entrenamiento_categorias` with `entrenamiento_id` (FK → `public.entrenamientos` ON DELETE CASCADE), `nivel_id` (FK → `public.nivel_disciplina` ON DELETE RESTRICT), `cupos_asignados integer CHECK >= 0`, `sincronizado_grupo boolean NOT NULL DEFAULT true`, and `UNIQUE (entrenamiento_id, nivel_id)`.

Both tables SHALL have RLS: SELECT for authenticated tenant members; INSERT/UPDATE/DELETE restricted to `get_trainer_or_admin_tenants_for_authenticated_user()` (via join through parent tables). Indexes SHALL exist on `grupo_id` and `entrenamiento_id` respectively.

#### Scenario: Valid entrenamiento_grupo_categorias row is inserted
- **WHEN** an authenticated administrator inserts a valid row into `public.entrenamiento_grupo_categorias`
- **THEN** the insert SHALL succeed and the row SHALL be retrievable

#### Scenario: cupos_asignados < 0 is rejected by constraint
- **WHEN** a row is inserted with `cupos_asignados = -1`
- **THEN** the database SHALL reject the insert with a check constraint violation

#### Scenario: Deleting an entrenamientos_grupo row cascades to its group categories
- **WHEN** a `public.entrenamientos_grupo` row is deleted
- **THEN** all associated `entrenamiento_grupo_categorias` rows SHALL be deleted via CASCADE

---

### Requirement: reservas table SHALL include a nullable entrenamiento_categoria_id column
The migration SHALL add `entrenamiento_categoria_id uuid NULLABLE` to `public.reservas` with `REFERENCES public.entrenamiento_categorias(id) ON DELETE SET NULL`. Existing reservas with no category SHALL remain valid. An index SHALL be created on this column.

#### Scenario: Existing reservas are unaffected after migration
- **WHEN** the migration is applied to a database with existing `reservas` rows
- **THEN** all existing rows SHALL retain their data and the new column SHALL be `NULL`

#### Scenario: A reserva can reference a category
- **WHEN** a reserva is inserted with a valid `entrenamiento_categoria_id`
- **THEN** the insert SHALL succeed

#### Scenario: Deleting the referenced entrenamiento_categorias row sets the FK to NULL
- **WHEN** a `public.entrenamiento_categorias` row referenced by a reserva is deleted
- **THEN** the referencing `reservas.entrenamiento_categoria_id` SHALL be set to `NULL` (ON DELETE SET NULL)
