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
