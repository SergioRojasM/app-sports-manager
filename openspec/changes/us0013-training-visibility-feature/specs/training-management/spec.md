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
