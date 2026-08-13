## ADDED Requirements

### Requirement: Admin can manage form templates
A tenant administrator SHALL be able to create, list, edit, and delete form templates (`formularios_plantillas`) scoped to their own tenant, each with a name, optional description, and active flag.

#### Scenario: Viewing the templates list
- **WHEN** an administrador navigates to `/portal/orgs/{tenant_id}/gestion-formularios`
- **THEN** the system displays a table of all form templates belonging to that tenant, or an empty state if none exist

#### Scenario: Creating a template
- **WHEN** an administrador submits the "Nueva plantilla" modal with a `nombre` and optional `descripcion`
- **THEN** the system creates a row in `formularios_plantillas` scoped to the current tenant and refreshes the table

#### Scenario: Duplicate template name is rejected
- **WHEN** an administrador submits a template `nombre` that already exists for the same tenant
- **THEN** the system shows the inline error "Ya existe una plantilla con este nombre." without crashing the page

#### Scenario: Editing a template
- **WHEN** an administrador updates `nombre`, `descripcion`, or `activo` on an existing template
- **THEN** the system persists the change and reflects it in the table without deleting the template's fields

#### Scenario: Deleting a template
- **WHEN** an administrador confirms deletion of a template
- **THEN** the system deletes the template row and cascades deletion to all of its `formulario_plantilla_esquema` field rows

### Requirement: Admin can manage a template's field definitions
A tenant administrator SHALL be able to define an ordered list of field definitions (`formulario_plantilla_esquema`) within a template, each specifying a label, an internal key, a data type, a required flag, and (for list-type fields) allowed values.

#### Scenario: Viewing a template's fields
- **WHEN** an administrador expands a template row
- **THEN** the system shows that template's fields ordered by `orden`, each displaying `campo_etiqueta`, a type badge, an "Obligatorio" indicator when `campo_obligatorio` is true, and edit/delete actions

#### Scenario: Adding a field
- **WHEN** an administrador submits the "Agregar campo" modal with `campo_etiqueta`, `campo_nombre`, `campo_tipo`, `campo_obligatorio`, and `orden`
- **THEN** the system creates a row in `formulario_plantilla_esquema` linked to the selected template and refreshes the fields panel

#### Scenario: Editing or deleting a field
- **WHEN** an administrador edits or deletes a field within an expanded template
- **THEN** the system updates or removes only that row and refreshes the panel without affecting the parent template or its other fields

### Requirement: Field type constrains allowed field-type values
Each field definition's `campo_tipo` SHALL be one of exactly: `fecha`, `texto_corto`, `texto_largo`, `numerico`, `imagen`, `lista`.

#### Scenario: Selecting a field type
- **WHEN** an administrador opens the field creation/edit modal
- **THEN** the `campo_tipo` select offers exactly the options Fecha, Texto corto, Texto largo, Numérico, Imagen, and Lista, mapped to `fecha`, `texto_corto`, `texto_largo`, `numerico`, `imagen`, `lista`

### Requirement: List-type fields require allowed values
When a field's `campo_tipo` is `lista`, the system SHALL require a non-empty, comma-separated list of allowed values (`campo_lista_valores`); for any other type, this value SHALL be absent.

#### Scenario: Selecting "Lista" reveals the values input
- **WHEN** an administrador sets `campo_tipo` to "Lista" in the field modal
- **THEN** the system shows a required `campo_lista_valores` textarea for comma-separated values

#### Scenario: Submitting "Lista" without values is rejected
- **WHEN** an administrador submits a field with `campo_tipo = 'lista'` and an empty `campo_lista_valores`
- **THEN** the system shows an inline validation error before sending the request to the database

#### Scenario: Non-list types hide the values input
- **WHEN** an administrador sets `campo_tipo` to any value other than "Lista"
- **THEN** the system hides the `campo_lista_valores` input and does not require it

### Requirement: Field internal key is a unique, formatted slug
Each field's `campo_nombre` SHALL be a `snake_case` string matching `^[a-z][a-z0-9_]*$`, unique within its parent template, distinct from the display label `campo_etiqueta`, and independent of the field's row identifier.

#### Scenario: Auto-suggesting the key while creating a field
- **WHEN** an administrador types into `campo_etiqueta` while creating a new field and has not yet manually edited `campo_nombre`
- **THEN** the system auto-fills `campo_nombre` with a slugified version of `campo_etiqueta` (lowercase, accents/spaces/punctuation replaced with `_`)

#### Scenario: Manual override stops auto-sync
- **WHEN** an administrador manually edits `campo_nombre` during field creation
- **THEN** the system stops auto-updating `campo_nombre` from further changes to `campo_etiqueta` for that modal session

#### Scenario: Editing an existing field never auto-changes the key
- **WHEN** an administrador opens the edit modal for an existing field and changes `campo_etiqueta`
- **THEN** the system does not modify `campo_nombre` automatically

#### Scenario: Duplicate key within the same template is rejected
- **WHEN** an administrador submits a field whose `campo_nombre` already exists within the same template
- **THEN** the system shows an inline error mapped from the underlying unique-constraint violation on `(formulario_plantilla_id, campo_nombre)`

### Requirement: Only tenant administrators can modify form templates and fields
Read access to `formularios_plantillas` and `formulario_plantilla_esquema` SHALL be available to any authenticated user; write access (insert, update, delete) SHALL be restricted to administrators of the owning tenant, enforced at the database row-level-security layer.

#### Scenario: Non-admin attempts a write
- **WHEN** a usuario or entrenador role attempts to create, update, or delete a form template or field via the API
- **THEN** the database rejects the operation with a permission error, and the UI surfaces a friendly "No tienes permisos" message rather than a raw error

#### Scenario: Non-admin can still read
- **WHEN** any authenticated tenant member requests the list of form templates or a template's fields
- **THEN** the request succeeds regardless of the requester's role

#### Scenario: Non-admin is redirected from the management route
- **WHEN** a usuario or entrenador navigates directly to `/portal/orgs/{tenant_id}/gestion-formularios`
- **THEN** the existing `(administrador)` layout guard redirects them away from the page

### Requirement: Form templates module is discoverable from the admin menu
The admin sidebar navigation SHALL include a "Formularios" entry linking to the form templates management route.

#### Scenario: Admin sees the menu entry
- **WHEN** an administrador views the tenant sidebar menu
- **THEN** a "Formularios" item appears, linking to `/portal/orgs/{tenant_id}/gestion-formularios`
