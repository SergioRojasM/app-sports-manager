## ADDED Requirements

### Requirement: Editing a training SHALL display saved restriction configuration expanded by default
When an administrator or trainer opens "Editar entrenamiento" for a group or instance that has saved restriction rows (`entrenamiento_grupo_restricciones` / `entrenamiento_restricciones`) and/or non-null `reserva_antelacion_horas` / `cancelacion_antelacion_horas`, the "Restricciones de reserva" section SHALL render expanded by default once that data has loaded, displaying the saved rows and antelación values. If the group/instance has no restriction rows and no antelación values, the section SHALL render collapsed by default, matching create-mode behavior.

#### Scenario: Editing a training with saved restrictions auto-expands the section
- **WHEN** an administrator opens "Editar entrenamiento" for a group/instance that has rows in `entrenamiento_grupo_restricciones` or `entrenamiento_restricciones`, and/or non-null `reserva_antelacion_horas` or `cancelacion_antelacion_horas`
- **THEN** the "Restricciones de reserva" section SHALL be expanded once the restriction data has loaded, displaying the saved rows (descripción, estado usuario, servicio 1-4, validar nivel) and antelación values

#### Scenario: Editing a training with no saved restrictions keeps the section collapsed
- **WHEN** an administrator opens "Editar entrenamiento" for a group/instance with zero restriction rows and `reserva_antelacion_horas = null` and `cancelacion_antelacion_horas = null`
- **THEN** the "Restricciones de reserva" section SHALL remain collapsed by default

#### Scenario: Manually collapsing the auto-expanded section persists
- **WHEN** an administrator manually collapses the "Restricciones de reserva" section after it has auto-expanded due to hydrated edit data
- **THEN** the section SHALL remain collapsed and SHALL NOT be re-expanded automatically on subsequent re-renders of the same modal session

### Requirement: Saving restriction rows from the edit form SHALL persist service and description fields
When an administrator saves the "Editar entrenamiento" form with one or more restriction rows, the persisted `entrenamiento_grupo_restricciones` (group/series scope) or `entrenamiento_restricciones` (`single` scope) rows SHALL include the row's `descripcion` and `servicio_1_id`–`servicio_4_id` values, in addition to `usuario_estado`, `validar_nivel_disciplina`, and `orden`. This SHALL hold whether the restriction row was created at training-creation time or added/edited later via the edit form.

#### Scenario: Adding a service restriction during edit persists the selected service
- **WHEN** an administrator edits a training group that was created with no restrictions, adds a restriction row with `servicio_1_id` set to a specific service, and saves with scope `series` or `future`
- **THEN** the corresponding `entrenamiento_grupo_restricciones` row SHALL have `servicio_1_id` set to the selected service, not `null`

#### Scenario: Adding a service restriction during a single-instance edit persists the selected service
- **WHEN** an administrator edits a single training instance (scope `single`) that was created with no restrictions, adds a restriction row with `servicio_1_id` and `descripcion` set, and saves
- **THEN** the corresponding `entrenamiento_restricciones` row SHALL have `servicio_1_id` and `descripcion` set to the saved values, not `null`

#### Scenario: Re-editing after adding a service restriction shows the saved service
- **WHEN** an administrator saves a service restriction added during edit (as in the scenarios above), then re-opens "Editar entrenamiento" for the same group/instance
- **THEN** the "Restricciones de reserva" section SHALL display the restriction row with its saved `servicio_1_id`–`servicio_4_id` and `descripcion` values, matching what was selected when it was saved
