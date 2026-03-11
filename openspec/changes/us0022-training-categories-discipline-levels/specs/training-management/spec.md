## ADDED Requirements

### Requirement: EntrenamientoFormModal SHALL conditionally include a categories step
`EntrenamientoFormModal` SHALL check whether the selected `disciplina_id` has active `nivel_disciplina` rows for the tenant after the discipline is selected. If active levels exist, the form SHALL render `EntrenamientoCategoriasSection` as an additional step. The step SHALL only be shown when the condition is met; the rest of the form flow SHALL be unaffected for disciplines without levels.

#### Scenario: Categories section appears after selecting a discipline with levels
- **WHEN** an administrator selects a discipline that has active `nivel_disciplina` rows for the tenant
- **THEN** `EntrenamientoCategoriasSection` SHALL be rendered in the form

#### Scenario: Categories section is absent for disciplines without levels
- **WHEN** an administrator selects a discipline that has no active `nivel_disciplina` rows for the tenant
- **THEN** `EntrenamientoCategoriasSection` SHALL NOT be rendered and the form flow SHALL behave as before this feature

#### Scenario: Discipline change clears previously entered category values
- **WHEN** an administrator changes the selected discipline after having entered category values
- **THEN** the category inputs SHALL be reset to their default (empty/disabled) state

---

### Requirement: TrainingGroup and TrainingInstance types SHALL include optional categorias arrays
`TrainingGroup` SHALL be extended with an optional `categorias?: EntrenamientoGrupoCategoria[]` field. `TrainingInstance` SHALL be extended with an optional `categorias?: EntrenamientoCategoria[]` field. Both fields are nullable/absent for trainings without categories — all existing code that constructs or consumes these types SHALL remain valid without modification.

#### Scenario: TrainingGroup without categories is backward-compatible
- **WHEN** a `TrainingGroup` is fetched for a training series that has no `entrenamiento_grupo_categorias` rows
- **THEN** the `categorias` field SHALL be `undefined` or an empty array and no existing consumer code SHALL error

#### Scenario: TrainingInstance with categories includes the full category list
- **WHEN** a `TrainingInstance` is fetched for a training that has `entrenamiento_categorias` rows
- **THEN** the `categorias` field SHALL contain all rows for that instance ordered by `nivel_disciplina.orden ASC`

---

### Requirement: useEntrenamientos hook SHALL wire category data for the selected instance
`useEntrenamientos` SHALL use `useEntrenamientoCategorias` to fetch and expose the categories for the currently selected training instance. The categories SHALL be made available to components that render training detail (e.g., `ReservasPanel`).

#### Scenario: Categories are fetched when an instance is selected
- **WHEN** an administrator selects a training instance in the training management view
- **THEN** `useEntrenamientoCategorias` SHALL fetch the `entrenamiento_categorias` rows for that instance and expose them via `useEntrenamientos`

#### Scenario: No category fetch if instance has no categories
- **WHEN** the selected training instance has no `entrenamiento_categorias` rows
- **THEN** `useEntrenamientoCategorias` SHALL return an empty array and no error SHALL be shown

---

### Requirement: reservas types SHALL include the nullable entrenamiento_categoria_id field
`ReservaView` and `CreateReservaInput` types in `src/types/portal/reservas.types.ts` SHALL include optional fields `entrenamiento_categoria_id?: string | null` and `categoria_nombre?: string | null`. These fields are nullable and backward-compatible. No existing reservas flow SHALL be required to populate them until Phase 5.

#### Scenario: CreateReservaInput without categoria is still valid
- **WHEN** a reserva is created without setting `entrenamiento_categoria_id`
- **THEN** the type checker SHALL accept the input and the DB insert SHALL succeed with `entrenamiento_categoria_id = NULL`
