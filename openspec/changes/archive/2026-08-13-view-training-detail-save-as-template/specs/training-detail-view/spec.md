## ADDED Requirements

### Requirement: Read-only training detail modal
The system SHALL provide a read-only `EntrenamientoDetalleModal` that can be opened for **any** `TrainingInstance`, including historical (past) trainings, regardless of `canManage`. The modal SHALL render as a right-side slide-over (`aside`, `role="dialog"`, `aria-modal="true"`), closeable via ESC, backdrop click, or a "Cerrar" button.

#### Scenario: Detail view opens for a future training
- **WHEN** any tenant member selects a future training instance and triggers "Ver detalle"
- **THEN** `EntrenamientoDetalleModal` opens showing that instance's configuration

#### Scenario: Detail view opens for a historical training
- **WHEN** any tenant member selects a past training instance (one where "Editar"/"Eliminar" are disabled) and triggers "Ver detalle"
- **THEN** `EntrenamientoDetalleModal` opens showing that instance's configuration, with no editing controls

#### Scenario: Closing resets view state
- **WHEN** the user closes `EntrenamientoDetalleModal` via ESC, backdrop click, or "Cerrar"
- **THEN** `isViewModalOpen` becomes `false` and `viewTarget` becomes `null`, so reopening the modal for a different instance never briefly shows the previous instance's data

---

### Requirement: Basic info renders immediately without waiting for async fetches
`EntrenamientoDetalleModal` SHALL render `nombre`, `descripcion`, `punto_encuentro`, `formulario_externo`, resolved disciplina/escenario/entrenador labels (entrenador shows "Sin asignar" when `entrenador_id` is null), `duracion_minutos`, `cupo_maximo`, and a `visibilidad` badge (via the shared `VisibilidadBadge`) immediately on open, sourced from `instance` and the lookup maps already available to `EntrenamientosPage` — without waiting for the categorias/restricciones/niveles fetches.

#### Scenario: Basic info appears on open
- **WHEN** `EntrenamientoDetalleModal` opens for an instance
- **THEN** `nombre`, `descripcion`, `punto_encuentro`, `formulario_externo`, resolved disciplina/escenario/entrenador names, `duracion_minutos`, `cupo_maximo`, and the `visibilidad` badge are visible immediately, before `viewLoading` becomes `false`

#### Scenario: Unassigned coach shows fallback label
- **WHEN** the viewed instance has `entrenador_id = null`
- **THEN** the entrenador field displays "Sin asignar"

---

### Requirement: Recurrence / schedule information display
`EntrenamientoDetalleModal` SHALL display the viewed instance's schedule information read-only. For a standalone (`unico`, no `entrenamiento_grupo_id`) instance, it SHALL show only that instance's `fecha_hora` (formatted as date + time). For an instance belonging to a group (`entrenamiento_grupo_id` set and `relatedGroup` resolved), it SHALL additionally show the group's `tipo`, `fecha_inicio`/`fecha_fin`, `dias_semana` (translated to weekday names), `repetir_cada_semanas`, and each rule's `tipo_bloque`/`hora_inicio`/`hora_fin`/`horas_especificas` from `relatedGroup.reglas`. This section is informational only and is excluded from the "Guardar como plantilla" snapshot.

#### Scenario: Standalone training shows only its own date/time
- **WHEN** the viewed instance has no `entrenamiento_grupo_id`
- **THEN** the recurrence section shows only this instance's `fecha_hora` as a formatted date and time

#### Scenario: Recurring training shows group schedule plus instance date
- **WHEN** the viewed instance has `entrenamiento_grupo_id` set and `relatedGroup` is resolved
- **THEN** the recurrence section shows the group's `tipo`, `dias_semana` translated to weekday names, `repetir_cada_semanas`, `fecha_inicio`/`fecha_fin`, each rule's `tipo_bloque`/`hora_inicio`/`hora_fin`/`horas_especificas`, and this instance's own `fecha_hora`

---

### Requirement: Categorías por nivel display with loading and empty states
While `viewLoading` is `true`, `EntrenamientoDetalleModal` SHALL show a loading indicator in place of the "Categorías por nivel" section. Once loaded, if `categorias.length > 0`, it SHALL list each category's resolved nivel name (matched by `categoria.nivel_id` against the fetched `niveles`, falling back to "Nivel no disponible" when no match exists) and its `cupos_asignados`. If `categorias.length === 0`, it SHALL show "Sin configuración de categorías" instead of an empty table.

#### Scenario: Loading indicator while fetching
- **WHEN** `viewLoading` is `true`
- **THEN** the "Categorías por nivel" section shows a loading indicator instead of a table

#### Scenario: Categories list with resolved nivel names
- **WHEN** `viewLoading` is `false` and `categorias.length > 0`
- **THEN** each row shows the matching nivel's name and its `cupos_asignados`

#### Scenario: Deactivated nivel falls back to placeholder label
- **WHEN** a `categoria.nivel_id` has no matching entry in the fetched `niveles`
- **THEN** that row displays "Nivel no disponible" as the nivel name

#### Scenario: No categories configured
- **WHEN** `viewLoading` is `false` and `categorias.length === 0`
- **THEN** the section shows "Sin configuración de categorías" instead of an empty table

---

### Requirement: Restricciones de reserva display with loading and empty states
While `viewLoading` is `true`, `EntrenamientoDetalleModal` SHALL show a loading indicator in place of the "Restricciones de reserva" section. Once loaded, if `restricciones.length > 0` or `reserva_antelacion_horas != null` or `cancelacion_antelacion_horas != null`, it SHALL show `reserva_antelacion_horas`/`cancelacion_antelacion_horas` and, for each restriction row, `usuario_estado`, `validar_nivel_disciplina`, `descripcion`, and resolved labels for `servicio_1_id`–`servicio_4_id` (looked up against `servicios`). If `restricciones.length === 0` and both antelación values are `null`, it SHALL show "Sin restricciones configuradas" instead of an empty list.

#### Scenario: Loading indicator while fetching
- **WHEN** `viewLoading` is `true`
- **THEN** the "Restricciones de reserva" section shows a loading indicator instead of a list

#### Scenario: Restrictions list with resolved service names
- **WHEN** `viewLoading` is `false` and `restricciones.length > 0`
- **THEN** `reserva_antelacion_horas`/`cancelacion_antelacion_horas` are shown, and each row shows `usuario_estado`, `validar_nivel_disciplina`, `descripcion`, and resolved `servicio_1_id`–`servicio_4_id` names

#### Scenario: No restrictions configured
- **WHEN** `viewLoading` is `false`, `restricciones.length === 0`, `reserva_antelacion_horas` is `null`, and `cancelacion_antelacion_horas` is `null`
- **THEN** the section shows "Sin restricciones configuradas" instead of an empty list

---

### Requirement: Modal is strictly read-only
`EntrenamientoDetalleModal` SHALL contain no input fields, and no add/remove/duplicate controls, anywhere in its content — regardless of `canManage`.

#### Scenario: No editable controls present
- **WHEN** `EntrenamientoDetalleModal` is open, for any user role
- **THEN** no `<input>`, `<select>`, `<textarea>`, or add/remove/duplicate buttons are rendered in the basic info, recurrence, categorías, or restricciones sections

---

### Requirement: "Guardar como plantilla" available from the detail view for managers only
`EntrenamientoDetalleModal` SHALL render a "Guardar como plantilla" button in its footer only when `canManage` is `true`, disabled while `viewLoading` is `true`. A "Cerrar" button SHALL always be present in the footer regardless of role. Clicking "Guardar como plantilla" SHALL open the same `GuardarPlantillaModal` used by `EntrenamientoFormModal`.

#### Scenario: Manager sees "Guardar como plantilla"
- **WHEN** `EntrenamientoDetalleModal` is open and `canManage` is `true`
- **THEN** the footer shows both "Guardar como plantilla" and "Cerrar"

#### Scenario: Athlete does not see "Guardar como plantilla"
- **WHEN** `EntrenamientoDetalleModal` is open and `canManage` is `false`
- **THEN** the footer shows only "Cerrar"; "Ver detalle" remains available and the rest of the modal renders identically to the `canManage` case

#### Scenario: Button disabled while loading
- **WHEN** `EntrenamientoDetalleModal` is open, `canManage` is `true`, and `viewLoading` is `true`
- **THEN** "Guardar como plantilla" is disabled until `viewLoading` becomes `false`
