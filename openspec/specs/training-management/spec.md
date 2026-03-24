## ADDED Requirements

### Requirement: Training instance visibility assignment
Each training instance SHALL carry a `visibilidad` field with values `'privado'` or `'publico'`. The default value MUST be `'privado'`. The form MUST expose a radio group selector labelled "Visibilidad" with options `Privado` and `Público`, placed after the `descripcion` field, including a reactive helper text paragraph that describes the implication of the current selection.

#### Scenario: Default visibility on new training form
- **WHEN** an administrator opens the training form modal to create a new training
- **THEN** the visibility selector defaults to `Privado` and the helper text reads "Este entrenamiento solo será visible para los miembros de tu organización."

#### Scenario: Helper text updates on visibility change
- **WHEN** an administrator selects `Público` in the visibility selector
- **THEN** the helper text immediately changes to "Este entrenamiento será visible públicamente y podrá ser descubierto por atletas fuera de tu organización."

#### Scenario: Visibility value is persisted on create
- **WHEN** an administrator submits the form with `visibilidad = 'publico'`
- **THEN** the created training instance has `visibilidad = 'publico'` in the database

#### Scenario: Visibility is loaded correctly on edit
- **WHEN** an administrator opens the form modal to edit an existing training with `visibilidad = 'publico'`
- **THEN** the radio selector is pre-selected to `Público` and the correct helper text is shown

---

### Requirement: Server-side visible_para computation
The service layer SHALL always compute `visible_para` from `visibilidad` and `tenant_id` using the rule: `visibilidad = 'privado'` → `visible_para = tenant_id`; `visibilidad = 'publico'` → `visible_para = PUBLIC_TENANT_ID ('2a089688-3cfc-4216-9372-33f50079fbd1')`. The client MUST NOT send `visible_para` directly.

#### Scenario: Private training sets visible_para to own tenant
- **WHEN** a training is created or updated with `visibilidad = 'privado'`
- **THEN** the persisted `visible_para` equals the training's `tenant_id`

#### Scenario: Public training sets visible_para to the public tenant
- **WHEN** a training is created or updated with `visibilidad = 'publico'`
- **THEN** the persisted `visible_para` equals `'2a089688-3cfc-4216-9372-33f50079fbd1'`

---

### Requirement: Visibility-based cross-tenant data access
The RLS SELECT policy on `public.entrenamientos` SHALL allow any authenticated user to read training instances where `visibilidad = 'publico'`, regardless of their tenant membership. Private trainings SHALL remain readable only by members of the owning tenant.

#### Scenario: Authenticated user reads public training from another tenant
- **WHEN** an authenticated user with no membership in tenant A queries `entrenamientos`
- **THEN** they can read training instances from tenant A that have `visibilidad = 'publico'`

#### Scenario: Authenticated user cannot read private training from another tenant
- **WHEN** an authenticated user with no membership in tenant A queries `entrenamientos`
- **THEN** they cannot read training instances from tenant A that have `visibilidad = 'privado'`

#### Scenario: Unauthenticated access is never allowed
- **WHEN** an unauthenticated request queries `public.entrenamientos`
- **THEN** no rows are returned, regardless of the `visibilidad` value

---

### Requirement: Visibility propagation in series sync
When a series edit is applied with `scope = 'series'` or `scope = 'future'`, the `visibilidad` and `visible_para` fields SHALL be propagated to eligible instances using the same eligibility rules as all other synced fields: future instances (`fecha_hora >= now()` or `fecha_hora IS NULL`), not cancelled, and `bloquear_sync_grupo = false`.

#### Scenario: Series edit propagates visibility to eligible future instances
- **WHEN** an administrator edits a series with scope `'series'` and sets `visibilidad = 'publico'`
- **THEN** all eligible future instances have their `visibilidad` set to `'publico'` and `visible_para` recomputed to `PUBLIC_TENANT_ID`

#### Scenario: Blocked exception instance is not overwritten by series sync
- **WHEN** a series edit with scope `'series'` propagates visibility
- **THEN** instances with `bloquear_sync_grupo = true` retain their current `visibilidad` and `visible_para` values unchanged

#### Scenario: Single-instance edit does not affect sibling instances
- **WHEN** an administrator edits one instance with scope `'single'` and changes `visibilidad`
- **THEN** only that instance has its `visibilidad` and `visible_para` updated; no sibling instances are affected

---

### Requirement: Visibility badge in training list view
Each row in the trainings list view (`EntrenamientosList`) SHALL display a small badge indicating the visibility state of the training instance. The badge SHALL use a visually distinct accent color for `'publico'` and a neutral/muted color for `'privado'`.

#### Scenario: Public training shows accented badge in list
- **WHEN** the training list renders an instance with `visibilidad = 'publico'`
- **THEN** a badge with the label "Público" in the defined accent color is displayed adjacent to the training name

#### Scenario: Private training shows muted badge in list
- **WHEN** the training list renders an instance with `visibilidad = 'privado'`
- **THEN** a badge with the label "Privado" in the neutral/muted color is displayed adjacent to the training name

---

### Requirement: Visibility color coding and legend in calendar view
The calendar view (`EntrenamientosCalendar`) SHALL use different dot/indicator colors per training instance based on `visibilidad`. A legend MUST be displayed in the calendar header or footer that explains the dot color semantics: one entry for public (accent color) and one for private (muted color).

#### Scenario: Public training instance uses accent dot color in calendar
- **WHEN** the calendar renders a day cell that contains a public training instance
- **THEN** the instance indicator dot uses the accent color defined for public visibility

#### Scenario: Private training instance uses muted dot color in calendar
- **WHEN** the calendar renders a day cell that contains a private training instance
- **THEN** the instance indicator dot uses the neutral/muted color defined for private visibility

#### Scenario: Calendar legend is always visible
- **WHEN** the calendar view is displayed
- **THEN** a legend is permanently shown (in the header or footer) with two entries: one for the public color and one for the private color, with descriptive labels

---

### Requirement: Capacity indicator on training cards and calendar events
The system SHALL display a capacity indicator on every training card and calendar event showing the number of active bookings relative to `cupo_maximo`. The indicator MUST use a color signal: green when utilization < 70%, yellow when 70–99%, and red when full (active bookings ≥ `cupo_maximo`). When `cupo_maximo` is null, only the active booking count is shown with no color signal.

#### Scenario: Capacity indicator shows current utilization
- **WHEN** a training instance is displayed in the calendar or list view
- **THEN** the card shows a pill such as "3 / 10" reflecting active (non-cancelled) bookings vs max capacity

#### Scenario: Full training is visually distinguished
- **WHEN** active bookings equal `cupo_maximo` for a training
- **THEN** the capacity indicator renders in red and the "Reservar" action is disabled for atletas

#### Scenario: Unlimited capacity training omits ratio
- **WHEN** `cupo_maximo` is null for a training
- **THEN** the indicator shows only the count of active bookings without a denominator or color signal

### Requirement: reservas_activas enrichment on training instances
The system SHALL enrich each `TrainingInstance` fetched by `useEntrenamientos` with a `reservas_activas` count representing non-cancelled bookings. This count MUST be derived from a join or subquery in the same training fetch operation, not a separate per-instance request.

#### Scenario: Count is available on each instance without extra requests
- **WHEN** training instances are loaded for the active month
- **THEN** each instance includes a `reservas_activas` field populated from the same query

#### Scenario: Count reflects real-time state after booking mutations
- **WHEN** a booking is created, cancelled, or deleted from the reservas panel
- **THEN** the training list/calendar is refreshed and the updated `reservas_activas` count is reflected on the affected instance

### Requirement: Booking panel trigger in training action context
The system SHALL expose a "Ver reservas" action within the training action context (accessible after selecting a training instance) that opens the `ReservasPanel` for that instance. This action MUST be visible to all roles.

#### Scenario: All roles can open the booking panel
- **WHEN** any authenticated tenant member selects a training and triggers "Ver reservas"
- **THEN** the `ReservasPanel` renders for that training instance with role-appropriate content

## ADDED Requirements

### Requirement: EntrenamientoFormModal SHALL conditionally include a categories step
`EntrenamientoFormModal` SHALL check whether the selected `disciplina_id` has active `nivel_disciplina` rows for the tenant after the discipline is selected. If active levels exist, the form SHALL render `EntrenamientoCategoriasSection` as an additional step. The step SHALL only be shown when the condition is met; the rest of the form flow SHALL be unaffected for disciplines without levels.

#### Scenario: Categories section appears after selecting a discipline with levels
- **WHEN** an administrator selects a discipline that has active `nivel_disciplina` rows for the tenant
- **THEN** `EntrenamientoCategoriasSection` SHALL be rendered in the form

#### Scenario: Categories section is absent for disciplines without levels
- **WHEN** an administrator selects a discipline that has no active `nivel_disciplina` rows for the tenant
- **THEN** `EntrenamientoCategoriasSection` SHALL NOT be rendered and the form flow SHALL behave as before this feature

#### Scenario: Discipline change clears previously entered category values
- **WHEN** an administrator changes the selected discipline after having entered category values
- **THEN** the category inputs SHALL be reset to their default (empty/disabled) state

---

### Requirement: TrainingGroup and TrainingInstance types SHALL include optional categorias arrays
`TrainingGroup` SHALL be extended with an optional `categorias?: EntrenamientoGrupoCategoria[]` field. `TrainingInstance` SHALL be extended with an optional `categorias?: EntrenamientoCategoria[]` field. Both fields are nullable/absent for trainings without categories — all existing code that constructs or consumes these types SHALL remain valid without modification.

#### Scenario: TrainingGroup without categories is backward-compatible
- **WHEN** a `TrainingGroup` is fetched for a training series that has no `entrenamiento_grupo_categorias` rows
- **THEN** the `categorias` field SHALL be `undefined` or an empty array and no existing consumer code SHALL error

#### Scenario: TrainingInstance with categories includes the full category list
- **WHEN** a `TrainingInstance` is fetched for a training that has `entrenamiento_categorias` rows
- **THEN** the `categorias` field SHALL contain all rows for that instance ordered by `nivel_disciplina.orden ASC`

---

### Requirement: useEntrenamientos hook SHALL wire category data for the selected instance
`useEntrenamientos` SHALL use `useEntrenamientoCategorias` to fetch and expose the categories for the currently selected training instance. The categories SHALL be made available to components that render training detail (e.g., `ReservasPanel`).

#### Scenario: Categories are fetched when an instance is selected
- **WHEN** an administrator selects a training instance in the training management view
- **THEN** `useEntrenamientoCategorias` SHALL fetch the `entrenamiento_categorias` rows for that instance and expose them via `useEntrenamientos`

#### Scenario: No category fetch if instance has no categories
- **WHEN** the selected training instance has no `entrenamiento_categorias` rows
- **THEN** `useEntrenamientoCategorias` SHALL return an empty array and no error SHALL be shown

---

### Requirement: reservas types SHALL include the nullable entrenamiento_categoria_id field
`ReservaView` and `CreateReservaInput` types in `src/types/portal/reservas.types.ts` SHALL include optional fields `entrenamiento_categoria_id?: string | null` and `categoria_nombre?: string | null`. These fields are nullable and backward-compatible. No existing reservas flow SHALL be required to populate them until Phase 5.

#### Scenario: CreateReservaInput without categoria is still valid
- **WHEN** a reserva is created without setting `entrenamiento_categoria_id`
- **THEN** the type checker SHALL accept the input and the DB insert SHALL succeed with `entrenamiento_categoria_id = NULL`

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

---

### Requirement: Timing restriction fields on training form
The training create/edit form (`EntrenamientoFormModal`) SHALL include two optional numeric fields in a collapsible "Restricciones" section: `reserva_antelacion_horas` (minimum hours before `fecha_hora` to allow new bookings) and `cancelacion_antelacion_horas` (minimum hours before `fecha_hora` to allow cancellations). Both fields MUST accept non-negative integers only. An empty value is persisted as `null` (no restriction).

#### Scenario: Admin sets advance-notice booking hours
- **WHEN** an administrator enters `24` in the "Horas de antelación para reservar" field and saves the training
- **THEN** `reserva_antelacion_horas = 24` is persisted on the `entrenamientos` record

#### Scenario: Admin leaves timing fields blank
- **WHEN** an administrator leaves both timing fields empty and saves the training
- **THEN** both `reserva_antelacion_horas` and `cancelacion_antelacion_horas` are persisted as `null`

#### Scenario: Timing fields are pre-populated on edit
- **WHEN** an administrator opens the form to edit a training that already has `reserva_antelacion_horas = 48`
- **THEN** the "Horas de antelación para reservar" field is pre-filled with `48`

---

### Requirement: Access restriction row editor in training form
The training create/edit form SHALL include a dynamic restriction-row table inside the "Restricciones" section. Each row represents one access alternative (OR branch) and contains four condition columns: `usuario_estado` (select), `plan_id` (select from tenant plans), `disciplina_id` (select from tenant disciplines), and `validar_nivel_disciplina` (toggle). An information banner MUST be displayed above the row table explaining the AND/OR semantics. The row table supports add, duplicate, and delete operations. Zero rows is a valid state (unrestricted).

#### Scenario: Admin adds a new blank restriction row
- **WHEN** an administrator clicks "+ Añadir restricción" in the restrictions section
- **THEN** a new blank row is appended with all conditions unset and `validar_nivel_disciplina = false`

#### Scenario: Plan selector shows only active tenant plans
- **WHEN** an administrator opens the plan dropdown in a restriction row
- **THEN** only plans from the current tenant with `activo = true` are listed

#### Scenario: Discipline selector shows only active tenant disciplines
- **WHEN** an administrator opens the discipline dropdown in a restriction row
- **THEN** only disciplines from the current tenant with `activo = true` are listed

#### Scenario: Inline warning shown when level validation enabled without discipline
- **WHEN** an administrator toggles `validar_nivel_disciplina = true` in a row that has no `disciplina_id` set
- **THEN** an inline warning is displayed on that row: "Seleccione una disciplina para que la validación de nivel tenga efecto."

#### Scenario: Admin duplicates a row
- **WHEN** an administrator clicks the duplicate icon on a restriction row
- **THEN** a new row is inserted directly below it with identical column values

#### Scenario: Admin deletes a row
- **WHEN** an administrator clicks the delete icon on a restriction row
- **THEN** the row is removed from the editor; if it was the only row the table becomes empty (zero-row state)

#### Scenario: Restrictions section is collapsed by default
- **WHEN** an administrator opens the training form for a training with no existing restrictions
- **THEN** the "Restricciones" section is collapsed; expanding it reveals the timing fields and the empty row table

#### Scenario: Restrictions section is expanded when restrictions exist
- **WHEN** an administrator opens the training form for a training that already has restriction rows or timing values set
- **THEN** the "Restricciones" section is expanded by default to surface the configured values

---

### Requirement: Restriction rows persisted on training save
When a training is saved (create or update), the service layer SHALL persist `reserva_antelacion_horas` and `cancelacion_antelacion_horas` on the `entrenamientos` record, and atomically replace all existing `entrenamiento_restricciones` rows for that training with the current set from the form state.

#### Scenario: New training saved with one restriction row
- **WHEN** an administrator creates a training with one restriction row requiring a specific plan
- **THEN** the new `entrenamientos` row is created and one `entrenamiento_restricciones` row is inserted linked to it

#### Scenario: Existing training updated — old rows replaced
- **WHEN** an administrator edits a training that had two restriction rows and saves with one row
- **THEN** the original two rows are deleted and exactly one new row is inserted; no stale rows remain
