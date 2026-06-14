## MODIFIED Requirements

### Requirement: Save current configuration as a template
`EntrenamientoFormModal` SHALL render a "Guardar como plantilla" button in its footer, visible only when `mode === 'create'`. The button SHALL be disabled while the form is submitting, or while `disciplina_id` or `escenario_id` is empty. Clicking it SHALL set the template-content source to `'form'` and open `GuardarPlantillaModal`.

`EntrenamientoDetalleModal` SHALL also render a "Guardar como plantilla" button in its footer, visible only when `canManage` is `true`, disabled while `viewLoading` is `true`. Clicking it SHALL set the template-content source to `'view'` and open the same `GuardarPlantillaModal`.

In both cases, `GuardarPlantillaModal` collects a required `nombre` (max 150 characters) and an optional `descripcion`, then calls `entrenamientoPlantillasService.create` with `tenant_id` set to the current tenant and `contenido` built according to the active template-content source:
- `'form'` (default): `contenido = form.buildPlantillaContenido()`, sourced from the live create-form state (unchanged from prior behavior).
- `'view'`: `contenido = buildPlantillaContenidoFromInstance(viewTarget.instance, viewTarget.categorias, viewTarget.restricciones)`, sourced from the viewed `TrainingInstance` and its fetched categorías/restricciones — including for historical (past) trainings.

Both sources produce the same versioned `EntrenamientoPlantillaContenido` shape (`version: 1`, Section 1 "Datos base" fields, `categorias`, `restricciones`), excluding all scheduling/recurrence fields, and both call `plantillas.createPlantilla({ tenantId, nombre, descripcion, contenido })`. Saving via either path is purely additive: it creates a new `entrenamiento_plantillas` row and does not modify the source training/instance.

#### Scenario: Button hidden in edit mode
- **WHEN** `EntrenamientoFormModal` is rendered with `mode === 'edit'`
- **THEN** the "Guardar como plantilla" button is not rendered in the form modal's footer

#### Scenario: Button disabled without discipline or scenario
- **WHEN** `mode === 'create'` and either `disciplina_id` or `escenario_id` is empty
- **THEN** the "Guardar como plantilla" button in `EntrenamientoFormModal` is disabled

#### Scenario: Successful save from the create form
- **WHEN** the user fills `nombre` (and optionally `descripcion`) in `GuardarPlantillaModal` opened from `EntrenamientoFormModal` and submits, with valid `disciplina_id`/`escenario_id` set in the form
- **THEN** a new row is created in `entrenamiento_plantillas` with the current tenant's `tenant_id`, the entered `nombre`/`descripcion`, and `contenido` equal to `form.buildPlantillaContenido()`'s output, and `GuardarPlantillaModal` closes while the main training form remains open and unchanged

#### Scenario: Successful save from the detail view of a past training
- **WHEN** a trainer or admin opens `EntrenamientoDetalleModal` for a historical training instance, clicks "Guardar como plantilla", fills `nombre` (and optionally `descripcion`) in `GuardarPlantillaModal`, and submits
- **THEN** a new row is created in `entrenamiento_plantillas` with `contenido` equal to `buildPlantillaContenidoFromInstance(viewTarget.instance, viewTarget.categorias, viewTarget.restricciones)`'s output (excluding scheduling fields), `GuardarPlantillaModal` closes, the detail modal remains open, and the viewed training instance is unchanged

#### Scenario: Template saved from a past training can be applied like any other template
- **WHEN** a template created via the "Successful save from the detail view of a past training" scenario is later opened via "Usar plantilla" while creating a new training
- **THEN** Section 1 "Datos base", categorías, and restricciones are populated from its `contenido` exactly as for a template saved from the create form, with no regression to existing "Usar plantilla" behavior

#### Scenario: Duplicate name shows inline error regardless of source
- **WHEN** the user submits `GuardarPlantillaModal` (opened from either `EntrenamientoFormModal` or `EntrenamientoDetalleModal`) with a `nombre` that already exists as a template for the current tenant
- **THEN** the modal shows the inline error "Ya existe una plantilla con ese nombre." and no new row is created
