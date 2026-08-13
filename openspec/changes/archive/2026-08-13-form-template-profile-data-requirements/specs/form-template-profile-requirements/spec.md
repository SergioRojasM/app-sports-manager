## ADDED Requirements

### Requirement: Fixed profile fields catalog
The system SHALL define a fixed catalog of 9 requestable profile field keys spanning `public.usuarios` and `public.perfil_deportivo`: `nombre`, `apellido`, `telefono`, `fecha_nacimiento`, `tipo_identificacion` (representing BOTH `usuarios.tipo_identificacion` and `usuarios.numero_identificacion`), `fecha_exp_identificacion`, `rh`, `peso_kg`, `altura_cm`. No other values SHALL be accepted by `formularios_plantillas.perfil_campos_requeridos`.

#### Scenario: Only catalog values are accepted
- **WHEN** any code path attempts to write a value to `perfil_campos_requeridos` that is not one of the 9 catalog keys
- **THEN** the database check constraint rejects the write and no row is persisted with an invalid value

#### Scenario: Selecting "Identificación" requires both underlying columns
- **WHEN** a template has `tipo_identificacion` in its `perfil_campos_requeridos`
- **THEN** the completeness check treats the requirement as satisfied only when BOTH `usuarios.tipo_identificacion` is non-null AND `usuarios.numero_identificacion` is non-empty

### Requirement: Admin selects requested profile fields per form template
The system SHALL render a checkbox grid in the form template editor (`FormularioEditorPage`) listing all 9 catalog fields, grouped as "Datos personales" and "Datos deportivos". Toggling a checkbox SHALL immediately persist the updated `perfil_campos_requeridos` array on the template (auto-save), with no separate save action required — matching the existing "Plantilla activa" toggle's behavior.

#### Scenario: Admin checks a profile field
- **WHEN** an admin editing a form template checks one of the catalog checkboxes
- **THEN** the template's `perfil_campos_requeridos` is updated immediately to include that key, without requiring any additional save action

#### Scenario: Admin unchecks a profile field
- **WHEN** an admin editing a form template unchecks a previously-selected catalog checkbox
- **THEN** the template's `perfil_campos_requeridos` is updated immediately to remove that key

#### Scenario: New templates request no profile fields by default
- **WHEN** a new form template is created
- **THEN** its `perfil_campos_requeridos` defaults to an empty array and no checkbox is pre-checked

### Requirement: Template preview shows requested profile fields
The system SHALL display a read-only list/chips of the requested profile fields near the top of `FormularioPreviewModal` when `perfil_campos_requeridos` is non-empty. When empty, no additional element SHALL be rendered.

#### Scenario: Preview shows requested fields
- **WHEN** an admin opens the preview for a template with one or more requested profile fields
- **THEN** the preview displays a chip or label for each requested field, using the catalog's Spanish labels

#### Scenario: Preview hides the section when nothing is requested
- **WHEN** an admin opens the preview for a template with an empty `perfil_campos_requeridos`
- **THEN** no profile-fields section is rendered in the preview

### Requirement: Fill-out flow displays a read-only profile summary when complete
When the athlete's (or the target athlete's, for staff on-behalf bookings) profile already has every field requested by the attached internal (`formulario_id`) template, the fill-out flow SHALL render a single compact, read-only summary line above the template's own sections, showing the current values of the requested fields. These values SHALL NOT be editable from this modal.

#### Scenario: Summary shown for a complete profile
- **WHEN** the fill-out modal opens for a training whose attached template requests profile fields, and the target athlete's profile already has all of them
- **THEN** a compact read-only summary line is shown above the form's own sections, listing the requested fields' current values, with no input controls

#### Scenario: No summary for templates with no profile requirements
- **WHEN** the fill-out modal opens for a training whose attached template has an empty `perfil_campos_requeridos`
- **THEN** no profile summary is rendered and the modal behaves exactly as before this change

### Requirement: Fill-out flow blocks submission when the profile is incomplete
When one or more requested profile fields are missing from the target athlete's profile, the fill-out flow SHALL replace the summary line with a warning panel naming the missing fields, and SHALL disable the submit action ("Guardar y reservar") until the profile is confirmed complete. The panel SHALL offer a way to re-check completeness without discarding any already-entered "Datos" section answers.

#### Scenario: Self-booking with an incomplete profile
- **WHEN** an athlete opens the fill-out modal for their own booking and their profile is missing one or more requested fields
- **THEN** a warning panel lists the missing fields, offers a link to `/portal/perfil` (opened in a new tab) and a re-check action, and the "Guardar y reservar" button is disabled

#### Scenario: Staff on-behalf booking with an incomplete profile
- **WHEN** an entrenador or administrador opens the fill-out modal to book on behalf of a selected athlete whose profile is missing one or more requested fields
- **THEN** the warning panel lists the missing fields against the SELECTED athlete's profile (not the staff member's own), and the submit button remains disabled until resolved

#### Scenario: Re-check unblocks submission after the profile is updated
- **WHEN** the missing fields are added to the target athlete's profile (e.g., via `/portal/perfil` or `EditarPerfilMiembroModal`) and the "Ya actualicé, verificar de nuevo" action is triggered
- **THEN** the profile is re-fetched, the warning panel is replaced by the summary line if now complete, and the submit button is re-enabled

#### Scenario: In-progress "Datos" answers survive a re-check
- **WHEN** an athlete has already filled in one or more custom "Datos" section answers and then triggers the profile re-check action
- **THEN** the previously entered "Datos" values remain intact after the re-check completes

### Requirement: Profile requirements apply uniformly across booking surfaces
Both the tenant-scoped booking panel (`ReservasPanel`) and the cross-tenant marketplace booking flow (`PublicTrainingReservaModal`) SHALL exhibit the same profile summary/gate behavior, since both consume the shared `useFormularioRespuestaForm` hook and `FormularioRespuestaModal` component.

#### Scenario: Marketplace booking flow shows the same gate
- **WHEN** an athlete books a training through the cross-tenant public marketplace and the attached template requests profile fields the athlete is missing
- **THEN** the same warning panel and submit-blocking behavior is shown as in the tenant-scoped booking panel

### Requirement: Profile requirements do not apply to external forms
The profile-fields feature SHALL only apply to trainings with an internal form attachment (`formulario_id` referencing a `formularios_plantillas` row). Trainings using `formulario_externo` (an external link) SHALL be unaffected.

#### Scenario: External formulario is unaffected
- **WHEN** a training has `formulario_externo` set (and no `formulario_id`)
- **THEN** no profile summary, warning panel, or completeness gate is shown or evaluated for that booking
