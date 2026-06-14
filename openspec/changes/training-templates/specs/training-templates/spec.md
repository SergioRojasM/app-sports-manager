## ADDED Requirements

### Requirement: Template persistence table
The system SHALL provide a tenant-scoped table `public.entrenamiento_plantillas` with columns `id` (uuid, primary key), `tenant_id` (uuid, FK to `tenants`, not null), `nombre` (varchar(150), not null), `descripcion` (text, nullable), `contenido` (jsonb, not null), `created_by` (uuid, FK to `usuarios`, nullable), `created_at` and `updated_at` (timestamptz, not null, defaulted). The table SHALL enforce a unique constraint on `(tenant_id, nombre)` and SHALL maintain `updated_at` via a trigger on update.

#### Scenario: Inserting a template sets timestamps
- **WHEN** a new row is inserted into `entrenamiento_plantillas` without specifying `created_at`/`updated_at`
- **THEN** both columns are set to the current UTC time

#### Scenario: Updating a template refreshes updated_at
- **WHEN** an existing `entrenamiento_plantillas` row is updated
- **THEN** `updated_at` is set to the current UTC time while `created_at` remains unchanged

#### Scenario: Duplicate name within tenant is rejected
- **WHEN** an insert is attempted with a `(tenant_id, nombre)` pair that already exists
- **THEN** the database rejects the insert with a unique-violation error (Postgres code `23505`)

---

### Requirement: Template row-level security
`entrenamiento_plantillas` SHALL have row level security enabled. SELECT SHALL be allowed to any authenticated member of the row's `tenant_id` (via `miembros_tenant`). INSERT, UPDATE, and DELETE SHALL be allowed only when `tenant_id` is among the tenants returned by `get_trainer_or_admin_tenants_for_authenticated_user()` for the authenticated user.

#### Scenario: Tenant member can list templates
- **WHEN** an authenticated user who is a member of tenant A queries `entrenamiento_plantillas` filtered by `tenant_id = A`
- **THEN** rows belonging to tenant A are returned

#### Scenario: Cross-tenant read returns no rows
- **WHEN** an authenticated user with no membership in tenant B queries `entrenamiento_plantillas` filtered by `tenant_id = B`
- **THEN** zero rows are returned

#### Scenario: Trainer or admin can create a template
- **WHEN** a user with role `entrenador` or `administrador` in tenant A inserts a row with `tenant_id = A`
- **THEN** the insert succeeds

#### Scenario: Athlete cannot create a template
- **WHEN** a user with role `usuario` in tenant A attempts to insert a row with `tenant_id = A`
- **THEN** the insert is rejected by RLS (Postgres code `42501`)

#### Scenario: Cross-tenant write is rejected
- **WHEN** a trainer or admin of tenant A attempts to insert, update, or delete a row with `tenant_id = B`
- **THEN** the operation is rejected by RLS

---

### Requirement: Template content snapshot shape
The `contenido` JSONB column SHALL store a versioned snapshot (`version: 1`) containing exactly the following data from the training creation form, and SHALL NOT contain any Section 2 "Tipo y programación" scheduling fields:

- Section 1 "Datos base": `nombre`, `descripcion`, `punto_encuentro`, `formulario_externo`, `disciplina_id`, `escenario_id`, `entrenador_id`, `duracion_minutos`, `cupo_maximo`, `visibilidad`.
- `categorias`: `{ enabled: boolean, items: { nivel_id, cupos_asignados }[] }`.
- `restricciones`: `{ reserva_antelacion_horas, cancelacion_antelacion_horas, items: EntrenamientoRestriccionInput[] }` (each item without `entrenamiento_id`/`orden`).

Excluded fields: `tipo`, `fecha_inicio`, `fecha_fin`, `fecha_hora_unico`, `dias_semana`, `repetir_cada_semanas`, `reglas`.

#### Scenario: Snapshot omits scheduling fields
- **WHEN** `buildPlantillaContenido()` is called on the current form state
- **THEN** the returned object's `tipo`, `fecha_inicio`, `fecha_fin`, `fecha_hora_unico`, `dias_semana`, `repetir_cada_semanas`, and `reglas` keys are absent

#### Scenario: Snapshot includes Section 1, categories, and restrictions
- **WHEN** `buildPlantillaContenido()` is called on a form with `disciplina_id`, `escenario_id`, `entrenador_id`, `duracion_minutos`, `cupo_maximo`, `visibilidad` set, categories enabled with at least one `nivel_id`/`cupos_asignados` pair, and at least one restriction row
- **THEN** the returned object includes all of those values nested under the documented `categorias` and `restricciones` keys, and includes `version: 1`

---

### Requirement: Save current configuration as a template
`EntrenamientoFormModal` SHALL render a "Guardar como plantilla" button in its footer, visible only when `mode === 'create'`. The button SHALL be disabled while the form is submitting, or while `disciplina_id` or `escenario_id` is empty. Clicking it SHALL open `GuardarPlantillaModal`, which collects a required `nombre` (max 150 characters) and an optional `descripcion`, then calls `entrenamientoPlantillasService.create` with `tenant_id` set to the current tenant and `contenido` built via `buildPlantillaContenido()`.

#### Scenario: Button hidden in edit mode
- **WHEN** `EntrenamientoFormModal` is rendered with `mode === 'edit'`
- **THEN** the "Guardar como plantilla" button is not rendered

#### Scenario: Button disabled without discipline or scenario
- **WHEN** `mode === 'create'` and either `disciplina_id` or `escenario_id` is empty
- **THEN** the "Guardar como plantilla" button is disabled

#### Scenario: Successful save creates a template row
- **WHEN** the user fills `nombre` (and optionally `descripcion`) in `GuardarPlantillaModal` and submits, with valid `disciplina_id`/`escenario_id` set in the form
- **THEN** a new row is created in `entrenamiento_plantillas` with the current tenant's `tenant_id`, the entered `nombre`/`descripcion`, and `contenido` equal to `buildPlantillaContenido()`'s output, and `GuardarPlantillaModal` closes while the main training form remains open and unchanged

#### Scenario: Duplicate name shows inline error
- **WHEN** the user submits `GuardarPlantillaModal` with a `nombre` that already exists as a template for the current tenant
- **THEN** the modal shows the inline error "Ya existe una plantilla con ese nombre." and no new row is created

---

### Requirement: Browse saved templates
`EntrenamientoFormModal` SHALL render a "Ver plantillas" button in its header area, visible only when `mode === 'create'`. Clicking it SHALL open `PlantillasListModal`, which lists all `entrenamiento_plantillas` rows for the current tenant ordered by `updated_at` descending, each showing `nombre`, a truncated `descripcion`, and a formatted `updated_at` date, with "Usar plantilla" and "Eliminar" actions per row.

#### Scenario: Button hidden in edit mode
- **WHEN** `EntrenamientoFormModal` is rendered with `mode === 'edit'`
- **THEN** the "Ver plantillas" button is not rendered

#### Scenario: List shows templates ordered by recency
- **WHEN** the current tenant has two or more templates with different `updated_at` values
- **THEN** `PlantillasListModal` lists them with the most recently updated first

#### Scenario: Empty state when no templates exist
- **WHEN** the current tenant has zero rows in `entrenamiento_plantillas`
- **THEN** `PlantillasListModal` shows the message "Aún no has creado plantillas. Guarda la configuración de un entrenamiento como plantilla para reutilizarla." instead of an empty list

#### Scenario: Loading and error states
- **WHEN** `PlantillasListModal` is opened and the list request is pending, or fails
- **THEN** it shows the existing `Loading` indicator or `ErrorMessage` pattern used elsewhere in this feature, respectively

---

### Requirement: Apply a template to the current form
Clicking "Usar plantilla" on a row in `PlantillasListModal` SHALL call `useEntrenamientoForm.applyPlantillaContenido(contenido)`, overwriting the form's Section 1 fields (`nombre`, `descripcion`, `punto_encuentro`, `formulario_externo`, `disciplina_id`, `escenario_id`, `entrenador_id`, `duracion_minutos`, `cupo_maximo`, `visibilidad`), `categoriasForm`, `restricciones`, `reservaAntelacionHoras`, and `cancelacionAntelacionHoras` with the template's values, while leaving all Section 2 "Tipo y programación" fields (`tipo`, `fecha_inicio`, `fecha_fin`, `fecha_hora_unico`, `dias_semana`, `repetir_cada_semanas`, `reglas`) at their current values. It SHALL then close `PlantillasListModal`, clear `fieldErrors` for the overwritten fields, and return focus to the main form.

#### Scenario: Applying a template overwrites Section 1, categories, and restrictions
- **WHEN** the user clicks "Usar plantilla" on a template
- **THEN** the form's `nombre`, `descripcion`, `punto_encuentro`, `formulario_externo`, `disciplina_id`, `escenario_id`, `entrenador_id`, `duracion_minutos`, `cupo_maximo`, `visibilidad`, `categoriasForm`, `restricciones`, `reservaAntelacionHoras`, and `cancelacionAntelacionHoras` are replaced with the template's `contenido` values

#### Scenario: Applying a template does not change scheduling fields
- **WHEN** the user has already entered values for `tipo`, `fecha_inicio`/`fecha_fin` or `fecha_hora_unico`, `dias_semana`, `repetir_cada_semanas`, or `reglas`, and then clicks "Usar plantilla"
- **THEN** those fields retain their pre-existing values after the template is applied

#### Scenario: Applying a template closes the list and returns to the form
- **WHEN** the user clicks "Usar plantilla"
- **THEN** `PlantillasListModal` closes and the main "Crear entrenamiento" form is shown with the applied values

#### Scenario: Discipline level re-evaluation after applying a template
- **WHEN** the applied template's `disciplina_id` has active `nivel_disciplina` rows for the tenant
- **THEN** the categories section re-evaluates `disciplinaHasNiveles`/`activeNiveles` for the newly-applied `disciplina_id`, consistent with the existing discipline-change effect

#### Scenario: Applying a template with stale referenced IDs
- **WHEN** a template's `contenido` references a `disciplina_id`, `escenario_id`, `entrenador_id`, `servicio_*_id`, or `nivel_id` that no longer exists
- **THEN** the form applies the value without error, the corresponding `<select>` shows no matching option (falls back to its empty/placeholder option), and existing required-field validation prevents submission until the user selects a valid value

---

### Requirement: Delete a template
Clicking "Eliminar" on a row in `PlantillasListModal` SHALL prompt for confirmation via `window.confirm`. On confirmation, it SHALL call `entrenamientoPlantillasService.delete(tenantId, id)` and remove the row from the visible list. Cancelling the confirmation SHALL leave the template unchanged.

#### Scenario: Confirmed deletion removes the template
- **WHEN** the user clicks "Eliminar" on a template and confirms the `window.confirm` prompt
- **THEN** the row is deleted from `entrenamiento_plantillas` and no longer appears in `PlantillasListModal`

#### Scenario: Cancelled deletion leaves the template
- **WHEN** the user clicks "Eliminar" on a template and cancels the `window.confirm` prompt
- **THEN** no delete request is made and the template remains in the list

---

### Requirement: No full-page reload for template operations
Saving, listing, applying, and deleting templates SHALL be performed entirely through the existing `Component → Hook → Service → Supabase` flow (`useEntrenamientoPlantillas` and `entrenamientoPlantillasService`), without triggering a full page navigation or reload.

#### Scenario: Template operations keep the form modal open
- **WHEN** the user saves, lists, applies, or deletes a template from within `EntrenamientoFormModal`
- **THEN** the page does not reload and `EntrenamientoFormModal` remains open with its current state (aside from the fields intentionally changed by the operation)
