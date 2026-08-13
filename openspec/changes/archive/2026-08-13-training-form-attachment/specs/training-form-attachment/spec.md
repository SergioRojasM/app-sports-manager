## ADDED Requirements

### Requirement: Form attachment data model
`public.entrenamientos` and `public.entrenamientos_grupo` SHALL each carry `formulario_id` (uuid, nullable, foreign key to `formularios_plantillas.id` with `on delete set null`) and `formulario_obligatorio` (boolean, not null, default `false`), in addition to the pre-existing `formulario_externo` column. `formulario_id` and `formulario_externo` SHALL be mutually exclusive on the same row, and `formulario_obligatorio` SHALL only be `true` when at least one of `formulario_id` or `formulario_externo` is set.

#### Scenario: Default state has no form
- **WHEN** a training or training series is created without touching the form section
- **THEN** it is persisted with `formulario_id = null`, `formulario_externo = null`, `formulario_obligatorio = false`

#### Scenario: Mutual exclusivity is enforced at the database level
- **WHEN** an insert or update attempts to set both `formulario_id` and `formulario_externo` to non-null values on the same row
- **THEN** the database rejects the write with a check constraint violation

#### Scenario: Obligatorio requires a form to be set
- **WHEN** an insert or update attempts to set `formulario_obligatorio = true` while both `formulario_id` and `formulario_externo` are null
- **THEN** the database rejects the write with a check constraint violation

#### Scenario: Deleting a referenced template detaches it gracefully
- **WHEN** an administrator deletes a `formularios_plantillas` row that is currently referenced by one or more trainings' `formulario_id`
- **THEN** the delete succeeds, and every referencing training's `formulario_id` is set to `null` without deleting the training itself

---

### Requirement: Enable/disable a form on the training wizard
The training create/edit wizard SHALL expose a toggle asking whether a form is required to reserve a spot for this training. When disabled, no further form-related controls SHALL be shown and no form-related fields SHALL be submitted.

#### Scenario: Form disabled by default
- **WHEN** an administrator or coach opens the wizard to create a new training
- **THEN** the form toggle defaults to disabled and no sub-fields are visible

#### Scenario: Disabling the form clears previously entered values
- **WHEN** an administrator or coach enables the form section, enters values, then disables it again
- **THEN** any external URL or selected template is discarded from the in-memory form state before submit

---

### Requirement: External vs. internal form type selection
When the form section is enabled, the wizard SHALL ask whether the form is external (e.g. Google Forms) or internal. When external is selected, the wizard SHALL show a URL input bound to `formulario_externo`. When internal is selected, the wizard SHALL show a `<select>` listing the current tenant's active (`activo = true`) `formularios_plantillas` templates, sorted by `nombre`, bound to `formulario_id`.

#### Scenario: External form requires a URL
- **WHEN** an administrator or coach selects "externo" and submits without entering a URL
- **THEN** the wizard shows an inline validation error and does not submit

#### Scenario: Internal form requires a template selection
- **WHEN** an administrador or coach selects "interno" and submits without choosing a template
- **THEN** the wizard shows an inline validation error and does not submit

#### Scenario: Internal picker only lists the current tenant's active templates
- **WHEN** an administrator or coach opens the internal template `<select>`
- **THEN** it lists only `formularios_plantillas` rows belonging to the current tenant with `activo = true`, sorted by `nombre`

#### Scenario: Switching type discards the other type's value
- **WHEN** an administrator or coach switches from "externo" (with a URL already entered) to "interno"
- **THEN** the URL value is cleared from the in-memory form state, and vice versa when switching from "interno" to "externo"

---

### Requirement: Role-gated shortcut to create a new form template
The internal template picker SHALL show a "crear nueva plantilla" entry point that navigates to the tenant's form templates management route. This entry point SHALL be visible only to users with the `administrador` role.

#### Scenario: Administrador sees the shortcut
- **WHEN** a user with role `administrador` selects "interno" in the form section
- **THEN** a "crear nueva plantilla" link/button is visible that navigates to `/portal/orgs/{tenant_id}/gestion-formularios`

#### Scenario: Entrenador does not see the shortcut
- **WHEN** a user with role `entrenador` selects "interno" in the form section
- **THEN** no "crear nueva plantilla" entry point is rendered

---

### Requirement: Obligatorio flag
When the form section is enabled (type is `externo` or `interno`), the wizard SHALL show a checkbox to mark the form as required to reserve, bound to `formulario_obligatorio`. This checkbox SHALL NOT be rendered, and its value SHALL NOT be submitted as `true`, while the form section is disabled.

#### Scenario: Obligatorio checkbox only appears when a form type is selected
- **WHEN** the form section is disabled
- **THEN** the "obligatorio" checkbox is not rendered

#### Scenario: Obligatorio persists with the selected form
- **WHEN** an administrator or coach enables the form section, selects a type, checks "obligatorio", and submits
- **THEN** the training is persisted with `formulario_obligatorio = true` alongside the selected `formulario_id` or `formulario_externo`

---

### Requirement: Correct pre-fill when editing an existing training
Opening the wizard to edit an existing training or series SHALL pre-fill the form section to accurately reflect its persisted state: enabled/disabled, external/internal, the URL or selected template, and the obligatorio checkbox.

#### Scenario: Editing a training with an internal template
- **WHEN** an administrator or coach opens the wizard to edit a training with `formulario_id` set
- **THEN** the form section shows enabled, "interno" selected, the correct template pre-selected in the dropdown, and the obligatorio checkbox reflecting its persisted value

#### Scenario: Editing a training with an external URL
- **WHEN** an administrator or coach opens the wizard to edit a training with `formulario_externo` set
- **THEN** the form section shows enabled, "externo" selected, and the URL pre-filled

#### Scenario: Editing a training with no form
- **WHEN** an administrator or coach opens the wizard to edit a training with neither `formulario_id` nor `formulario_externo` set
- **THEN** the form section shows disabled

---

### Requirement: Form visibility across training views
The training detail view, the calendar/list card, and the booking panel SHALL each display the training's attached form, handling both the external and internal cases, plus an "Obligatorio" indicator when applicable. The detail view and the booking panel SHALL additionally offer a way to preview an internal template's sections in a read-only view (no submission control).

#### Scenario: Detail view shows external form
- **WHEN** a user opens the "ver detalle" view for a training with `formulario_externo` set
- **THEN** the external link is shown, clickable, opening in a new tab

#### Scenario: Detail view shows internal form with preview
- **WHEN** a user opens the "ver detalle" view for a training with `formulario_id` set
- **THEN** the attached template's name is shown along with a "ver formulario" action that opens a read-only preview of its sections

#### Scenario: Obligatorio indicator shown when applicable
- **WHEN** a training has `formulario_obligatorio = true` and either `formulario_id` or `formulario_externo` set
- **THEN** an "Obligatorio" badge or note is shown alongside the form information in the detail view, list card, and booking panel

#### Scenario: No form section shown when none is attached
- **WHEN** a training has neither `formulario_id` nor `formulario_externo` set
- **THEN** no form-related section is rendered in the detail view, list card, or booking panel

#### Scenario: Booking action is not gated by obligatorio
- **WHEN** a training has `formulario_obligatorio = true`
- **THEN** the "Reservar" action in the booking panel remains available and is not blocked by the form requirement

---

### Requirement: Form configuration in training templates excludes the selected internal template
When a training is saved as a reusable template (`entrenamiento_plantillas.contenido`), the snapshot SHALL include `formulario_tipo` (`'ninguno' | 'externo' | 'interno'`) and `formulario_obligatorio`, and SHALL include `formulario_externo` only when `formulario_tipo === 'externo'`. The snapshot SHALL NOT include the source training's `formulario_id` under any circumstance.

#### Scenario: Saving an internal-form training as a template omits the template id
- **WHEN** an administrator or coach saves a training whose `formulario_id` is set as a reusable template
- **THEN** the saved `contenido` includes `formulario_tipo: 'interno'` and `formulario_obligatorio`, but does not include the source `formulario_id` anywhere

#### Scenario: Applying an internal-form template requires re-selection
- **WHEN** an administrator or coach applies a saved template whose `contenido.formulario_tipo === 'interno'`
- **THEN** the wizard pre-selects "interno" with the template picker left unselected, and submitting without picking a template shows the same inline validation error as a fresh "interno" selection

#### Scenario: Applying an external-form template restores the URL
- **WHEN** an administrator or coach applies a saved template whose `contenido.formulario_tipo === 'externo'`
- **THEN** the wizard pre-selects "externo" and restores the saved `formulario_externo` URL exactly

#### Scenario: Applying a pre-existing template without form fields defaults safely
- **WHEN** an administrator or coach applies a template saved before this capability existed (its `contenido` lacks `formulario_tipo`/`formulario_obligatorio`)
- **THEN** the wizard defaults to `'externo'` if the snapshot has a non-empty `formulario_externo`, otherwise `'ninguno'`, and `formulario_obligatorio` defaults to `false`, without error
