## MODIFIED Requirements

### Requirement: Admin can manage form templates
A tenant administrator SHALL be able to create, list, edit, and delete form templates (`formularios_plantillas`) scoped to their own tenant, each with a name, optional description, and active flag.

#### Scenario: Viewing the templates list
- **WHEN** an administrador navigates to `/portal/orgs/{tenant_id}/gestion-formularios`
- **THEN** the system displays a table of all form templates belonging to that tenant, or an empty state if none exist

#### Scenario: Creating a template
- **WHEN** an administrador submits the "Nueva plantilla" modal with a `nombre` and optional `descripcion`
- **THEN** the system creates a row in `formularios_plantillas` scoped to the current tenant and navigates the administrador to that template's dedicated editor page instead of refreshing the list in place

#### Scenario: Duplicate template name is rejected
- **WHEN** an administrador submits a template `nombre` that already exists for the same tenant
- **THEN** the system shows the inline error "Ya existe una plantilla con este nombre." without crashing the page

#### Scenario: Editing a template
- **WHEN** an administrador changes `nombre`, `descripcion`, or `activo` in the header of the template's dedicated editor page
- **THEN** the system persists each change automatically (on blur/change) without a separate save button, and without deleting the template's sections

#### Scenario: Deleting a template
- **WHEN** an administrador confirms deletion of a template
- **THEN** the system deletes the template row and cascades deletion to all of its `formulario_plantilla_esquema` section rows

### Requirement: Field internal key is a unique, formatted slug
Each data-collecting section's `campo_nombre` SHALL be a `snake_case` string matching `^[a-z][a-z0-9_]*$`, unique within its parent template, distinct from the display label `campo_etiqueta`, computed automatically by the system, and never shown or directly editable by the administrator.

#### Scenario: Computing the key from the label
- **WHEN** an administrador collapses a new "Datos" section for the first time
- **THEN** the system computes `campo_nombre` by slugifying `campo_etiqueta` (lowercase, accents/spaces/punctuation replaced with `_`) and persists it, without ever rendering an input for it

#### Scenario: Resolving a naming collision
- **WHEN** the slugified `campo_etiqueta` matches another section's `campo_nombre` already saved within the same template
- **THEN** the system appends a numeric suffix (`_2`, `_3`, …) until the value is unique before saving

#### Scenario: Duplicate key despite client-side computation is rejected gracefully
- **WHEN** a concurrent edit causes a `23505` unique-constraint violation on `(formulario_plantilla_id, campo_nombre)` even after the client-side collision check
- **THEN** the system retries the save once with an incremented suffix before surfacing a friendly error

#### Scenario: No manual override exists
- **WHEN** an administrador opens a "Datos" section in edit mode
- **THEN** no `campo_nombre` / "Nombre interno" input is rendered anywhere in the section's edit form

### Requirement: Field type constrains allowed field-type values
For a section whose `seccion_tipo` is `datos`, its `campo_tipo` SHALL be one of exactly: `fecha`, `texto_corto`, `texto_largo`, `numerico`, `imagen`, `lista`.

#### Scenario: Selecting a field type
- **WHEN** an administrador expands a "Datos" section for editing
- **THEN** the `campo_tipo` select offers exactly the options Fecha, Texto corto, Texto largo, Numérico, Imagen, and Lista, mapped to `fecha`, `texto_corto`, `texto_largo`, `numerico`, `imagen`, `lista`

### Requirement: List-type fields require allowed values
When a "Datos" section's `campo_tipo` is `lista`, the system SHALL require a non-empty, comma-separated list of allowed values (`campo_lista_valores`); for any other type, this value SHALL be absent.

#### Scenario: Selecting "Lista" reveals the values input
- **WHEN** an administrador sets `campo_tipo` to "Lista" within a "Datos" section's edit form
- **THEN** the system shows a required `campo_lista_valores` textarea for comma-separated values

#### Scenario: Submitting "Lista" without values is rejected
- **WHEN** an administrador tries to collapse a "Datos" section with `campo_tipo = 'lista'` and an empty `campo_lista_valores`
- **THEN** the system keeps the section expanded and shows an inline validation error before sending any request to the database

#### Scenario: Non-list types hide the values input
- **WHEN** an administrador sets `campo_tipo` to any value other than "Lista"
- **THEN** the system hides the `campo_lista_valores` input and does not require it

### Requirement: Only tenant administrators can modify form templates and sections
Read access to `formularios_plantillas` and `formulario_plantilla_esquema` SHALL be available to any authenticated user; write access (insert, update, delete) SHALL be restricted to administrators of the owning tenant, enforced at the database row-level-security layer.

#### Scenario: Non-admin attempts a write
- **WHEN** a usuario or entrenador role attempts to create, update, or delete a form template or section via the API
- **THEN** the database rejects the operation with a permission error, and the UI surfaces a friendly "No tienes permisos" message rather than a raw error

#### Scenario: Non-admin can still read
- **WHEN** any authenticated tenant member requests the list of form templates or a template's sections
- **THEN** the request succeeds regardless of the requester's role

#### Scenario: Non-admin is redirected from the management routes
- **WHEN** a usuario or entrenador navigates directly to `/portal/orgs/{tenant_id}/gestion-formularios` or `/portal/orgs/{tenant_id}/gestion-formularios/{plantilla_id}`
- **THEN** the existing `(administrador)` layout guard redirects them away from the page

## REMOVED Requirements

### Requirement: Admin can manage a template's field definitions
**Reason**: Superseded by the section-based builder — a template row can now be a heading, subtitle, or text block in addition to a data-collecting question, and editing no longer happens by expanding a row inline in the templates list.
**Migration**: Administrators now manage every row type — including data-collecting questions, which keep their existing `campo_etiqueta`/`campo_tipo`/`campo_lista_valores`/`campo_obligatorio`/`orden` shape — through the section cards on the template's dedicated editor page (`/portal/orgs/{tenant_id}/gestion-formularios/{plantilla_id}`), covered by the new "Admin builds a template as an ordered list of typed sections" requirement below.

## ADDED Requirements

### Requirement: Admin builds a template as an ordered list of typed sections
A tenant administrator SHALL be able to compose a form template as an ordered sequence of sections on a dedicated per-template editor page, where each section has a `seccion_tipo` of `titulo`, `subtitulo`, `texto`, or `datos`, and the edit form shown for a section reacts live to its selected type.

#### Scenario: Opening the section builder
- **WHEN** an administrador navigates to a template's editor page
- **THEN** the system shows that template's sections ordered by `orden`, each rendered according to its `seccion_tipo`, followed by a pinned "+ Añadir sección de formulario" button

#### Scenario: Adding a section
- **WHEN** an administrador clicks "+ Añadir sección de formulario"
- **THEN** the system appends a new section card in expanded edit mode with the `seccion_tipo` selector visible first and its type-specific fields rendered underneath

#### Scenario: Switching section type live
- **WHEN** an administrador changes the `seccion_tipo` selector while a section card is expanded
- **THEN** the system immediately re-renders the fields shown below the selector to match the newly selected type, without a page reload

#### Scenario: Collapsing a section persists it
- **WHEN** an administrador collapses a valid section card (via its "Listo" control) for the first time
- **THEN** the system creates a new `formulario_plantilla_esquema` row for it; collapsing an already-saved section instead updates its existing row

#### Scenario: Validation blocks collapsing
- **WHEN** an administrador tries to collapse a section card that is missing required data for its type
- **THEN** the system keeps the card expanded and shows an inline error instead of persisting anything

#### Scenario: Reordering sections
- **WHEN** an administrador uses the move-up/move-down controls on a collapsed section
- **THEN** the system persists the new `orden` values immediately and the new order survives a page reload

#### Scenario: Deleting a section
- **WHEN** an administrador confirms deletion of a section via its delete control
- **THEN** the system removes only that section's row and updates the visible list, without affecting the parent template or its other sections

#### Scenario: Discarding an unsaved new section
- **WHEN** an administrador deletes a newly-added section card, or navigates away, before it has ever been successfully collapsed
- **THEN** the system performs no database write for that section

### Requirement: Display-only sections require descriptive content
For sections whose `seccion_tipo` is `titulo`, `subtitulo`, or `texto`, the system SHALL require a non-empty `seccion_descripcion` and SHALL NOT require, show, or store any `campo_etiqueta`/`campo_nombre`/`campo_tipo`/`campo_lista_valores` field-definition values for that section.

#### Scenario: Título, Subtítulo, and Texto only ask for a description
- **WHEN** an administrador sets a section's `seccion_tipo` to Título, Subtítulo, or Texto
- **THEN** the expanded edit form shows exactly one field, a required "Descripción" textarea, and no field-definition inputs

#### Scenario: Empty description is rejected
- **WHEN** an administrador tries to collapse a Título, Subtítulo, or Texto section with an empty or blank "Descripción"
- **THEN** the system keeps the card expanded and shows an inline validation error

### Requirement: Template list actions are icon-based, including read-only preview
The templates list SHALL present "Previsualizar", "Editar", and "Eliminar" as icon actions per row, each with a descriptive accessible label, where "Previsualizar" opens a read-only rendering of the template's sections and "Editar" navigates to that template's dedicated editor page.

#### Scenario: Previewing a template
- **WHEN** an administrador clicks the "Previsualizar" icon on a template row
- **THEN** the system opens a read-only modal rendering that template's sections in order (headings/text as static content, data questions as disabled input previews) with no way to submit or save answers

#### Scenario: Editing navigates to the dedicated page
- **WHEN** an administrador clicks the "Editar" icon on a template row
- **THEN** the system navigates to `/portal/orgs/{tenant_id}/gestion-formularios/{plantilla_id}` instead of opening an in-place modal

#### Scenario: Deleting from the list
- **WHEN** an administrador clicks the "Eliminar" icon on a template row and confirms
- **THEN** the system deletes the template as described in "Admin can manage form templates"

### Requirement: Template editor route is correctly identified in navigation
The dedicated per-template editor route SHALL be reachable at `/portal/orgs/{tenant_id}/gestion-formularios/{plantilla_id}` and SHALL be labeled by the template's own name (not the tenant's name) in the breadcrumb.

#### Scenario: Breadcrumb shows the template name
- **WHEN** an administrador is on a template's editor page
- **THEN** the breadcrumb shows the tenant's name for the organization segment and the template's own `nombre` for the trailing segment, not the tenant's name repeated

#### Scenario: Non-admin is redirected from the editor route
- **WHEN** a usuario or entrenador navigates directly to `/portal/orgs/{tenant_id}/gestion-formularios/{plantilla_id}`
- **THEN** the existing `(administrador)` layout guard redirects them away from the page
