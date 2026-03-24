## ADDED Requirements

### Requirement: Timing restriction fields on training form
The training create/edit form (`EntrenamientoFormModal`) SHALL include two optional numeric fields in a collapsible "Restricciones" section: `reserva_antelacion_horas` (minimum hours before `fecha_hora` to allow new bookings) and `cancelacion_antelacion_horas` (minimum hours before `fecha_hora` to allow cancellations). Both fields MUST accept non-negative integers only. An empty value is persisted as `null` (no restriction).

#### Scenario: Admin sets advance-notice booking hours
- **WHEN** an administrator enters `24` in the "Horas de antelación para reservar" field and saves the training
- **THEN** `reserva_antelacion_horas = 24` is persisted on the `entrenamientos` record

#### Scenario: Admin leaves timing fields blank
- **WHEN** an administrator leaves both timing fields empty and saves the training
- **THEN** both `reserva_antelacion_horas` and `cancelacion_antelacion_horas` are persisted as `null`

#### Scenario: Timing fields are pre-populated on edit
- **WHEN** an administrator opens the form to edit a training that already has `reserva_antelacion_horas = 48`
- **THEN** the "Horas de antelación para reservar" field is pre-filled with `48`

### Requirement: Access restriction row editor in training form
The training create/edit form SHALL include a dynamic restriction-row table inside the "Restricciones" section. Each row represents one access alternative (OR branch) and contains four condition columns: `usuario_estado` (select), `plan_id` (select from tenant plans), `disciplina_id` (select from tenant disciplines), and `validar_nivel_disciplina` (toggle). An information banner MUST be displayed above the row table explaining the AND/OR semantics. The row table supports add, duplicate, and delete operations. Zero rows is a valid state (unrestricted).

#### Scenario: Admin adds a new blank restriction row
- **WHEN** an administrator clicks "+ Añadir restricción" in the restrictions section
- **THEN** a new blank row is appended with all conditions unset and `validar_nivel_disciplina = false`

#### Scenario: Plan selector shows only active tenant plans
- **WHEN** an administrator opens the plan dropdown in a restriction row
- **THEN** only plans from the current tenant with `activo = true` are listed

#### Scenario: Discipline selector shows only active tenant disciplines
- **WHEN** an administrator opens the discipline dropdown in a restriction row
- **THEN** only disciplines from the current tenant with `activo = true` are listed

#### Scenario: Inline warning shown when level validation enabled without discipline
- **WHEN** an administrator toggles `validar_nivel_disciplina = true` in a row that has no `disciplina_id` set
- **THEN** an inline warning is displayed on that row: "Seleccione una disciplina para que la validación de nivel tenga efecto."

#### Scenario: Admin duplicates a row
- **WHEN** an administrator clicks the duplicate icon on a restriction row
- **THEN** a new row is inserted directly below it with identical column values

#### Scenario: Admin deletes a row
- **WHEN** an administrator clicks the delete icon on a restriction row
- **THEN** the row is removed from the editor; if it was the only row the table becomes empty (zero-row state)

#### Scenario: Restrictions section is collapsed by default
- **WHEN** an administrator opens the training form for a training with no existing restrictions
- **THEN** the "Restricciones" section is collapsed; expanding it reveals the timing fields and the empty row table

#### Scenario: Restrictions section is expanded when restrictions exist
- **WHEN** an administrator opens the training form for a training that already has restriction rows or timing values set
- **THEN** the "Restricciones" section is expanded by default to surface the configured values

### Requirement: Restriction rows persisted on training save
When a training is saved (create or update), the service layer SHALL persist `reserva_antelacion_horas` and `cancelacion_antelacion_horas` on the `entrenamientos` record, and atomically replace all existing `entrenamiento_restricciones` rows for that training with the current set from the form state.

#### Scenario: New training saved with one restriction row
- **WHEN** an administrator creates a training with one restriction row requiring a specific plan
- **THEN** the new `entrenamientos` row is created and one `entrenamiento_restricciones` row is inserted linked to it

#### Scenario: Existing training updated — old rows replaced
- **WHEN** an administrator edits a training that had two restriction rows and saves with one row
- **THEN** the original two rows are deleted and exactly one new row is inserted; no stale rows remain
