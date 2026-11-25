## ADDED Requirements

### Requirement: Default Header on Template Creation
When a tenant administrator creates a new form template, the system SHALL automatically create four header rows (`encabezado_sobretitulo`, `encabezado_titulo`, `encabezado_subtitulo`, `encabezado_badges`) in the template's schema at positions 0–3, in addition to the template metadata row.

#### Scenario: Creating a new template seeds the header
- **WHEN** an administrator creates a new form template
- **THEN** the template's schema contains four header rows, ordered before any other content, prefilled with default eyebrow/título/subtítulo text and an empty badges list

### Requirement: Editable Hero Header
The form template editor and preview SHALL render a Hero-style header composed of the tenant's logo/name, the eyebrow, título, an accent divider, subtítulo, and up to 5 badge chips, styled consistently with the `P43Yo` design reference, with the eyebrow/título/subtítulo/badges editable inline.

#### Scenario: Header displays tenant identity
- **WHEN** an administrator opens the template editor
- **THEN** the header shows the tenant's logo (or name-only wordmark when no logo is configured) alongside the template's eyebrow, título, and subtítulo

#### Scenario: Editing header text updates the draft
- **WHEN** an administrator changes the título, subtítulo, or eyebrow text
- **THEN** the change is reflected immediately in the header preview without any database write occurring

#### Scenario: Badge list is capped at 5
- **WHEN** an administrator has already added 5 badges and attempts to add a 6th
- **THEN** the system SHALL block the addition and show inline feedback that the maximum has been reached

### Requirement: Checkbox Field Type
The system SHALL support a `checkbox` data field type representing a boolean answer, rendered as a single checkbox with its label, and stored as the string `"true"` or `"false"`.

#### Scenario: Adding a checkbox field
- **WHEN** an administrator adds a "Datos" field with type Checkbox
- **THEN** the section form shows only the label and required toggle (no list-of-values input), and the preview renders a disabled checkbox with that label

#### Scenario: Required checkbox blocks submission when unchecked
- **WHEN** an athlete submits a booking form where a required checkbox field has not been checked
- **THEN** the submission SHALL be blocked with the same required-field validation message used for other required fields

### Requirement: Single-Choice (Selección) Field Type
The system SHALL support a `seleccion` data field type representing a single choice among a fixed set of options (reusing the comma-separated values already used by the `lista` type), rendered as a row of selectable tiles/buttons where exactly one option is highlighted when selected.

#### Scenario: Adding a Selección field requires options
- **WHEN** an administrator adds a "Datos" field with type Selección and leaves the allowed values empty
- **THEN** the system SHALL block saving that section locally and require at least one comma-separated value, the same validation applied to the Lista type

#### Scenario: Athlete selects one option
- **WHEN** an athlete filling out a booking form clicks one tile of a Selección field
- **THEN** that tile SHALL be visually marked as selected and any previously selected tile in the same field SHALL be deselected, and the selected option's text is stored as the answer

### Requirement: Two-Column Field Layout
Data fields SHALL support a column-width setting of "completo" (full width, default) or "mitad" (half width); two consecutive half-width fields within the same group SHALL render side by side.

#### Scenario: Two consecutive half-width fields render side by side
- **WHEN** an administrator sets two adjacent "Datos" fields to Mitad width
- **THEN** both fields render in the same row, split evenly, in the section builder, the preview, and the live booking form

#### Scenario: An unpaired trailing half-width field renders alone
- **WHEN** a half-width field has no following half-width sibling to pair with (odd count within its group)
- **THEN** it renders alone at half width rather than blocking on a pair

### Requirement: Section Cards
The system SHALL support a `seccion` row type that visually groups, inside a numbered bordered card, every row that follows it in schema order until the next `seccion` row or the end of the schema. Grouping SHALL be derived purely from row order, without a parent-reference column.

#### Scenario: Adding a section creates a card
- **WHEN** an administrator adds a Sección row with a título
- **THEN** a numbered card is rendered (número derived from its position among Sección rows) showing that título and any optional subtítulo

#### Scenario: Fields after a section render inside its card
- **WHEN** an administrator adds "Datos" fields after a Sección row
- **THEN** those fields render visually inside that Sección's card, in the builder, the preview, and the live booking form, until the next Sección row is reached

### Requirement: Divider (Separador)
The system SHALL support a `separador` row type that renders a plain horizontal divider at its position, with no editable text content, inside the currently open section card if any or at the root level otherwise.

#### Scenario: Adding a divider
- **WHEN** an administrator adds a Separador row between two other rows
- **THEN** a horizontal rule renders at exactly that position in the builder, the preview, and the live booking form

### Requirement: Mid-List Field Insertion
The section builder SHALL allow inserting a new field or section row at any position in the schema, not only at the end of the list.

#### Scenario: Inserting a field between two existing rows
- **WHEN** an administrator uses the insert affordance between two existing rows and confirms a new row's content
- **THEN** the new row is placed at exactly that position, and every row after it shifts down by one position, without the administrator needing to manually reorder afterward

### Requirement: Draft-Based Editing (No Per-Change Persistence)
All edits to a form template — header text and badges, template metadata (nombre, descripción, activo, perfil fields requeridos), and section add/edit/delete/reorder — SHALL be held in an in-memory draft and SHALL NOT be written to the database until the administrator explicitly saves.

#### Scenario: Editing does not write to the database
- **WHEN** an administrator edits header text, adds/edits/deletes/reorders a section, or toggles the "Plantilla activa" or perfil-requerido checkboxes
- **THEN** no `formularios_plantillas` or `formulario_plantilla_esquema` write occurs as a result of that action alone

### Requirement: Manual Batched Save
The editor SHALL provide a "Guardar cambios" action that persists every pending draft change (template metadata, header content, and section creates/updates/deletes/reorders) in a single user-triggered operation, and SHALL preserve the draft unchanged if that operation fails partway.

#### Scenario: Saving persists all pending changes
- **WHEN** an administrator has made unsaved header, metadata, and section changes and clicks "Guardar cambios"
- **THEN** all of those changes are persisted, the button becomes disabled again, and the "unsaved changes" indicator clears

#### Scenario: A failed save preserves the draft
- **WHEN** the "Guardar cambios" operation fails (e.g. a network error)
- **THEN** the in-memory draft remains exactly as the administrator left it, an error is shown, and retrying "Guardar cambios" is possible without re-entering any data

### Requirement: Unsaved Changes Navigation Guard
The editor SHALL warn the administrator before they navigate away from the page (tab close or refresh) while unsaved draft changes exist.

#### Scenario: Attempting to leave with unsaved changes
- **WHEN** an administrator has unsaved draft changes and attempts to close or refresh the browser tab
- **THEN** the browser's native leave-confirmation prompt SHALL appear

### Requirement: Response Display Formatting for New Field Types
Read-only views of submitted form responses (the response viewer and the responses export) SHALL render `checkbox` answers as "Sí"/"No" rather than the raw stored string, and SHALL render `seleccion` answers as plain text.

#### Scenario: Viewing a submitted checkbox answer
- **WHEN** a tenant staff member opens the read-only viewer for a response containing a checkbox answer stored as `"true"`
- **THEN** the viewer displays "Sí" for that field

#### Scenario: Exporting responses with new field types
- **WHEN** a tenant staff member downloads the responses export for a training whose form includes checkbox and Selección fields
- **THEN** the export renders the checkbox column as "Sí"/"No" and the Selección column as the selected option's text
