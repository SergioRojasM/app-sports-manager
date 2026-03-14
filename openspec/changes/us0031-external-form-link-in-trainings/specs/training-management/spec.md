## ADDED Requirements

### Requirement: External form URL field on training group and instance
Both `entrenamientos_grupo` and `entrenamientos` tables SHALL include an optional `formulario_externo` column of type `VARCHAR(500)` with `DEFAULT NULL`. The column MUST be nullable and SHALL have no NOT NULL constraint. No changes to existing RLS policies are required — the column inherits the row-level access of its table.

#### Scenario: Column exists with NULL default on new training group
- **WHEN** a new `entrenamientos_grupo` row is inserted without specifying `formulario_externo`
- **THEN** the stored value is `NULL`

#### Scenario: Column exists with NULL default on new training instance
- **WHEN** a new `entrenamientos` row is inserted without specifying `formulario_externo`
- **THEN** the stored value is `NULL`

#### Scenario: URL is persisted correctly on create
- **WHEN** a training group is created with `formulario_externo = 'https://forms.example.com/registro'`
- **THEN** the stored value equals `'https://forms.example.com/registro'`

---

### Requirement: External form URL input in training wizard
The training creation/edit wizard (step 1 — general details) SHALL expose an optional text input labelled **"Formulario externo"** placed immediately after the "Punto de encuentro" field. The input MUST use `type="url"` and enforce a `maxLength` of 500 characters. The field SHALL be pre-populated when editing an existing training group that has a non-null `formulario_externo`.

#### Scenario: Field is empty by default on new training form
- **WHEN** an administrator or trainer opens the training form modal to create a new training
- **THEN** the "Formulario externo" input is visible and empty

#### Scenario: Field is pre-populated when editing an existing training
- **WHEN** an administrator opens the edit form for a training group with `formulario_externo = 'https://forms.example.com/encuesta'`
- **THEN** the "Formulario externo" input displays `'https://forms.example.com/encuesta'`

#### Scenario: Value is persisted on creation
- **WHEN** an administrator submits the form with `formulario_externo = 'https://forms.example.com/registro'`
- **THEN** the created training group and its generated instances store `formulario_externo = 'https://forms.example.com/registro'`

#### Scenario: Saving with empty field stores null
- **WHEN** an administrator submits the form leaving "Formulario externo" empty or clearing it
- **THEN** `formulario_externo` is stored as `NULL` in the database

---

### Requirement: External form URL propagation through series sync
When a training series is edited with `scope = 'series'` or `scope = 'future'`, `formulario_externo` SHALL be propagated to eligible instances using the same eligibility rules as all other synced fields: future instances (`fecha_hora >= now()` or `fecha_hora IS NULL`), not cancelled, and `bloquear_sync_grupo = false`. The `sync_entrenamientos_from_grupo()` database trigger function SHALL also include `formulario_externo` in its `UPDATE SET` clause.

#### Scenario: Series edit propagates external form URL to eligible instances
- **WHEN** an administrator edits a series with scope `'series'` and sets `formulario_externo = 'https://forms.example.com/nuevo'`
- **THEN** all eligible future instances have `formulario_externo` updated to `'https://forms.example.com/nuevo'`

#### Scenario: Blocked exception instance is not overwritten
- **WHEN** a series edit with scope `'series'` propagates `formulario_externo`
- **THEN** instances with `bloquear_sync_grupo = true` retain their current `formulario_externo` value unchanged

#### Scenario: Single-instance edit does not affect sibling instances
- **WHEN** an administrator edits one instance with scope `'single'` and changes `formulario_externo`
- **THEN** only that instance has its `formulario_externo` updated; no sibling instances are affected

#### Scenario: Clearing the field on a series clears eligible instances
- **WHEN** an administrator edits a series with scope `'series'` and clears `formulario_externo` (sets to null)
- **THEN** all eligible future instances have `formulario_externo` set to `NULL`

---

### Requirement: External form link display in training list view
The training list view (`EntrenamientosList`) SHALL conditionally render a clickable link for `formulario_externo` when the value is non-null on a training instance. The link MUST open in a new browser tab with `target="_blank"` and include `rel="noopener noreferrer"` to prevent tabnapping. When `formulario_externo` is null or empty, no link element SHALL be rendered.

#### Scenario: Link is shown when formulario_externo is present
- **WHEN** the training list renders an instance with a non-null `formulario_externo`
- **THEN** a visible clickable link labelled "Formulario externo" (or equivalent) is displayed for that row

#### Scenario: Link opens in a new tab
- **WHEN** a user clicks the "Formulario externo" link in the training list
- **THEN** the external URL opens in a new browser tab without navigating away from the app

#### Scenario: No link element rendered when field is null
- **WHEN** the training list renders an instance with `formulario_externo = NULL`
- **THEN** no link or placeholder for "Formulario externo" is displayed for that row

---

### Requirement: External form link display in reservas panel
The `ReservasPanel` SHALL conditionally render a clickable link for `formulario_externo` from the current `TrainingInstance` prop when the value is non-null. The link MUST be placed in the panel's header/summary area, after the training subtitle. It MUST open in a new tab with `target="_blank"` and `rel="noopener noreferrer"`.

#### Scenario: Link is visible in reservas panel for training with external form
- **WHEN** a user opens the reservas panel for a training instance that has a non-null `formulario_externo`
- **THEN** a clickable "Formulario externo" link is shown in the panel header area

#### Scenario: No link rendered in panel when field is null
- **WHEN** a user opens the reservas panel for a training instance with `formulario_externo = NULL`
- **THEN** no external form link element is displayed in the panel
