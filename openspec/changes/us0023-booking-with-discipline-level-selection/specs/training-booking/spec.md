## ADDED Requirements

### Requirement: Level selector displayed when training has categories
The system SHALL render a level-selection control inside `ReservaFormModal` (create mode only) when the selected training instance has one or more rows in `entrenamiento_categorias`. When no categories exist the form MUST remain unchanged — no level selector is displayed and `entrenamiento_categoria_id` is stored as `null` on the created reserva.

#### Scenario: Training has categories — selector is shown
- **WHEN** the booking form opens for a training that has one or more `entrenamiento_categorias` rows
- **THEN** the form renders a level-selection control listing all categories ordered by `nivel_disciplina.orden` ASC

#### Scenario: Training has no categories — selector is hidden
- **WHEN** the booking form opens for a training that has zero `entrenamiento_categorias` rows
- **THEN** no level-selection control is rendered and the form behaves exactly as it did before this change

#### Scenario: Level selector is hidden in edit mode
- **WHEN** an admin or coach opens the booking form in edit mode to update `estado` or `notas`
- **THEN** the level-selection control is not rendered; level is not reassignable after booking creation

---

### Requirement: Available spots per level displayed in the selector
The system SHALL show the remaining available spots for each level option. Fully booked levels (where active reservas count ≥ `cupos_asignados`) MUST be rendered as disabled and visually distinct. The spot count MUST be computed as `cupos_asignados − reservas_activas` and refreshed after each booking mutation.

#### Scenario: Level with available spots
- **WHEN** a category has `reservas_activas < cupos_asignados`
- **THEN** the option is enabled and displays `X cupos disponibles` where X = `cupos_asignados − reservas_activas`

#### Scenario: Level with no remaining spots
- **WHEN** a category has `reservas_activas >= cupos_asignados`
- **THEN** the option is rendered as disabled with `aria-disabled="true"` and the text `0 cupos disponibles`

#### Scenario: Spot counts refresh after booking
- **WHEN** a booking is successfully created or cancelled
- **THEN** `refetchCategorias()` is called and the level selector updates to reflect the new availability counts before the next booking attempt

---

### Requirement: Level selection is required when categories exist
The system MUST prevent form submission when `categorias.length > 0` and no level has been selected. An inline validation error MUST be shown on the level field.

#### Scenario: Submit without selecting a level
- **WHEN** an athlete (or admin on-behalf) submits the booking form without choosing a level and categories exist
- **THEN** the form does not submit and displays the inline error `'Debes seleccionar un nivel para esta reserva.'`

#### Scenario: Submit with a valid level selected
- **WHEN** an athlete submits the form with a level selected from an available category
- **THEN** the validation passes and the booking is submitted with `entrenamiento_categoria_id` set to the chosen category's id

---

### Requirement: Athlete's assigned level is auto-selected on form open
The system SHALL automatically pre-select the level that matches the athlete's `usuario_nivel_disciplina` record for the training's discipline when opening the booking form in self-booking mode, provided that level's category is available (`disponible = true`). If no match or the category is full, no level is pre-selected.

#### Scenario: Athlete has an assigned level matching an available category
- **WHEN** an authenticated atleta opens the booking form for a training with categories and their `usuario_nivel_disciplina` for that discipline matches an available category
- **THEN** that category is pre-selected in the level selector

#### Scenario: Athlete's assigned level is fully booked
- **WHEN** an authenticated atleta opens the booking form and their assigned level's category has `disponible = false`
- **THEN** no level is pre-selected; the athlete must manually choose an available level

#### Scenario: Athlete has no assigned level for the discipline
- **WHEN** an authenticated atleta opens the booking form and has no `usuario_nivel_disciplina` record for the training's discipline
- **THEN** no level is pre-selected

#### Scenario: Admin on-behalf booking — no auto-select
- **WHEN** an administrador or entrenador opens the booking form on behalf of an athlete
- **THEN** no level is pre-selected (auto-select is not applied for on-behalf flows in this iteration)

---

### Requirement: Per-category capacity validation in service layer
The service MUST validate per-category capacity before inserting a reservation when `entrenamiento_categoria_id` is provided. If active reservas for that category equal or exceed its `cupos_asignados`, the service MUST reject the operation with a typed `capacity_exceeded` error. The service MUST also verify that the provided `entrenamiento_categoria_id` belongs to the requested `entrenamiento_id`.

#### Scenario: Per-category capacity check passes
- **WHEN** a booking is submitted with an `entrenamiento_categoria_id` whose active reservas count is less than `cupos_asignados`
- **THEN** the booking is created with `entrenamiento_categoria_id` set accordingly

#### Scenario: Per-category capacity check fails — category full
- **WHEN** a booking is submitted with an `entrenamiento_categoria_id` that has reached its `cupos_asignados` limit (race condition or stale UI)
- **THEN** the service rejects with `capacity_exceeded` and the modal shows `'No hay cupos disponibles para el nivel seleccionado.'`

#### Scenario: Mismatched categoria reference rejected
- **WHEN** a booking is submitted with an `entrenamiento_categoria_id` that does not belong to the requested `entrenamiento_id`
- **THEN** the service rejects with `categoria_not_found` and no booking is inserted

#### Scenario: No category provided — existing capacity check applies
- **WHEN** a booking is submitted without `entrenamiento_categoria_id` (training has no categories configured)
- **THEN** only the existing overall `cupo_maximo` capacity check runs, unchanged from prior behavior

---

### Requirement: Booking record persists the selected category reference
The system SHALL store `entrenamiento_categoria_id` on the created `reserva` row. Existing reservas with `entrenamiento_categoria_id = null` MUST continue to function without error.

#### Scenario: New booking with level selected
- **WHEN** an athlete completes a booking for a training with categories and selects a level
- **THEN** the resulting `reservas` row has `entrenamiento_categoria_id` set to the chosen `entrenamiento_categorias.id`

#### Scenario: New booking without categories
- **WHEN** an athlete completes a booking for a training with no categories configured
- **THEN** the resulting `reservas` row has `entrenamiento_categoria_id = null`

#### Scenario: Legacy reservas unaffected
- **WHEN** the booking panel loads reservas that were created before this feature was deployed
- **THEN** rows with `entrenamiento_categoria_id = null` are displayed and function correctly without errors
