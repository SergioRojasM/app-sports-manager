## ADDED Requirements

### Requirement: Editing a training SHALL hydrate the saved category-level configuration
When an administrator or trainer opens "Editar entrenamiento" for a recurring group, a single instance, or an instance edited with `series`/`future` scope, the `categoriasForm` state (the "¿Usar categorías?" toggle and per-level `cupos_asignados` values) SHALL be populated from the corresponding saved rows in `entrenamiento_grupo_categorias` or `entrenamiento_categorias` before the user interacts with the form. The discipline-change effect that normally resets `categoriasForm` when `disciplina_id` changes SHALL NOT overwrite this hydrated state during edit-prep.

#### Scenario: Editing a group with saved group categories hydrates the toggle and cupos
- **WHEN** an administrator opens "Editar entrenamiento" for a recurring group that has rows in `entrenamiento_grupo_categorias`
- **THEN** the "¿Usar categorías?" toggle SHALL be checked and each active level's `cupos_asignados` input SHALL display its saved value

#### Scenario: Editing a single instance with saved instance categories hydrates the toggle and cupos
- **WHEN** an administrator opens "Editar entrenamiento" with scope `single` for an instance that has rows in `entrenamiento_categorias`
- **THEN** the "¿Usar categorías?" toggle SHALL be checked and each active level's `cupos_asignados` input SHALL display its saved value from `entrenamiento_categorias`

#### Scenario: Editing with series/future scope hydrates categories from the source group
- **WHEN** an administrator opens "Editar entrenamiento" with scope `series` or `future` for an instance belonging to a group
- **THEN** `categoriasForm` SHALL be hydrated from the group's `entrenamiento_grupo_categorias` rows

#### Scenario: Editing a training with no saved categories shows the default empty state
- **WHEN** an administrator opens "Editar entrenamiento" for a group/instance whose discipline has active levels but has no rows in `entrenamiento_grupo_categorias` / `entrenamiento_categorias`
- **THEN** the "¿Usar categorías?" toggle SHALL remain unchecked and all per-level `cupos_asignados` inputs SHALL be empty, matching the create-mode default

#### Scenario: Hydrated categories survive the discipline-change effect during edit-prep
- **WHEN** the edit modal opens and `formValues.disciplina_id` is set during edit-prep, triggering the discipline-change effect
- **THEN** the effect SHALL NOT reset the `categoriasForm` values that were just hydrated from saved data

#### Scenario: Manually changing the discipline still resets categories
- **WHEN** an administrator manually changes `disciplina_id` in the training form (not as part of opening the edit modal or applying a template)
- **THEN** `categoriasForm` SHALL be reset to `{ enabled: false, items: {} }` as before
