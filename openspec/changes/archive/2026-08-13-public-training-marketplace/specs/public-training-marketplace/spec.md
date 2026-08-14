## ADDED Requirements

### Requirement: entrenamientos_publicos publication table
The system SHALL provide a `public.entrenamientos_publicos` table storing a curated, denormalized snapshot of a single `entrenamientos` row for public marketing purposes. The table MUST include `tenant_id`, `entrenamiento_id` (unique, foreign key to `entrenamientos` with `on delete cascade`), `nombre`, `descripcion`, `disciplina_id`, `escenario_id`, `entrenador_id`, `fecha_hora`, `duracion_minutos`, `cupo_maximo`, `punto_encuentro`, `estado`, `reserva_antelacion_horas`, `cancelacion_antelacion_horas`, `precio`, `banner_url`, `activo` (default `true`), and `publicado_por`. The table MUST NOT duplicate `entrenamiento_grupo_id`, `origen_creacion`, `es_excepcion_serie`, `bloquear_sync_grupo`, `visibilidad`, `visible_para`, `formulario_id`, `formulario_externo`, or `formulario_obligatorio`.

#### Scenario: One publication per training instance
- **WHEN** an insert into `entrenamientos_publicos` is attempted for an `entrenamiento_id` that already has a publication row
- **THEN** the unique constraint on `entrenamiento_id` SHALL reject the insert

#### Scenario: Deleting the source training removes its publication
- **WHEN** the `entrenamientos` row referenced by a publication's `entrenamiento_id` is deleted
- **THEN** the corresponding `entrenamientos_publicos` row SHALL be deleted automatically (cascade)

---

### Requirement: Publish action is admin-only and scoped to a single instance
The system SHALL expose a "Publicar" action in the training options modal, visible only when the acting user's role is `administrador` for the training's tenant. Publishing (or updating an existing publication) SHALL only ever create or modify the `entrenamientos_publicos` row for the selected `entrenamiento_id`; it MUST NOT modify the source `entrenamientos` row, its `entrenamientos_grupo` parent, or any sibling instance in the same recurring series.

#### Scenario: Entrenador and usuario cannot see the publish action
- **WHEN** a user with role `entrenador` or `usuario` opens the training options modal
- **THEN** no "Publicar" or "Gestionar publicación" entry SHALL be shown

#### Scenario: Publishing one instance of a series does not affect siblings
- **WHEN** an administrador publishes one instance that belongs to a recurring `entrenamiento_grupo`
- **THEN** no other instance in that series receives a publication row, and the `entrenamientos_grupo` row is unchanged

#### Scenario: Historical trainings cannot be published
- **WHEN** an administrador opens the training options modal for an instance whose `fecha_hora` is in the past
- **THEN** the "Publicar"/"Gestionar publicación" action SHALL be disabled

---

### Requirement: Publish action label reflects existing publication state
The system SHALL label the action "Publicar" when the selected training has no existing `entrenamientos_publicos` row, and "Gestionar publicación" when one already exists. Opening the action on an already-published training SHALL prefill the publish form with the existing publication's values.

#### Scenario: First-time publish shows prefilled defaults from the training
- **WHEN** an administrador opens "Publicar" on a training with no publication row
- **THEN** the form SHALL default `nombre`/`descripcion` from the training's own values and leave `precio`/`banner_url` empty

#### Scenario: Re-opening shows existing publication values
- **WHEN** an administrador opens "Gestionar publicación" on an already-published training
- **THEN** the form SHALL be prefilled with the stored publication's `nombre`, `descripcion`, `precio`, and `banner_url`

---

### Requirement: Pre-publish validation blocks servicio-based restrictions
The system SHALL prevent publishing (insert or update of `entrenamientos_publicos`) for any `entrenamiento_id` that has at least one `entrenamiento_restricciones` row with `servicio_1_id`, `servicio_2_id`, `servicio_3_id`, or `servicio_4_id` set. This rule MUST be enforced at three layers: the "Publicar"/"Gestionar publicación" UI action SHALL be disabled with an explanatory reason; the publish service function SHALL reject the operation before attempting the write; and a database trigger on `entrenamientos_publicos` SHALL raise an exception on `before insert or update` if the referenced training has such a restriction row. A training whose only restriction is `reserva_antelacion_horas` and/or `cancelacion_antelacion_horas` (columns on `entrenamientos`, not rows in `entrenamiento_restricciones`) SHALL remain publishable.

#### Scenario: Publish action disabled for servicio-restricted training
- **WHEN** an administrador opens the training options modal for a training with an `entrenamiento_restricciones` row where `servicio_1_id` is not null
- **THEN** the "Publicar" action SHALL be disabled and show the reason that servicio restrictions prevent publishing

#### Scenario: Advance-notice-only training remains publishable
- **WHEN** an administrador opens the training options modal for a training that has `reserva_antelacion_horas` set but zero `entrenamiento_restricciones` rows
- **THEN** the "Publicar" action SHALL be enabled

#### Scenario: Direct write bypassing the UI is still rejected
- **WHEN** an insert or update into `entrenamientos_publicos` is attempted (bypassing the application service) for an `entrenamiento_id` that has a servicio-restricted row
- **THEN** the database trigger SHALL raise an exception and the write SHALL fail

---

### Requirement: Despublicar action soft-unpublishes a listing
The system SHALL expose a "Despublicar" action within the publish/manage modal when a publication already exists. Triggering it SHALL set `activo = false` on the publication row without deleting it, making the listing disappear from the marketplace while preserving its data for later re-publication.

#### Scenario: Despublicar hides the listing
- **WHEN** an administrador clicks "Despublicar" on a published training
- **THEN** the publication's `activo` SHALL become `false` and the training SHALL no longer appear on the marketplace page

#### Scenario: Re-publishing after despublicar reactivates the same row
- **WHEN** an administrador reopens "Gestionar publicación" for a training that was previously despublicado and saves again
- **THEN** the existing `entrenamientos_publicos` row SHALL be updated with `activo = true` rather than creating a second row

---

### Requirement: Cross-tenant read access to active publications
The system SHALL allow any authenticated user — regardless of tenant membership — to read `entrenamientos_publicos` rows where `activo = true`, via Row Level Security. Tenant admins SHALL additionally be able to read their own tenant's publications regardless of `activo` state (for management purposes).

#### Scenario: Non-member reads an active publication
- **WHEN** an authenticated user with no membership in tenant A queries `entrenamientos_publicos` rows belonging to tenant A
- **THEN** they SHALL be able to read rows where `activo = true`

#### Scenario: Non-member cannot read a despublicado listing
- **WHEN** an authenticated user with no membership in tenant A queries `entrenamientos_publicos` rows belonging to tenant A
- **THEN** they SHALL NOT be able to read rows where `activo = false`

#### Scenario: Owning admin can read their own inactive publication
- **WHEN** an administrador of tenant A queries a publication belonging to tenant A with `activo = false`
- **THEN** the row SHALL be returned

---

### Requirement: Public Training Marketplace page
The system SHALL render a marketplace page at `/portal/entrenamientos-publicos` — outside any tenant-scoped route segment — showing all active (`activo = true`), non-past (`fecha_hora >= now()`) publications across every tenant. The page file itself SHALL only render a component; all data fetching SHALL occur in hooks/services.

#### Scenario: Non-member visitor loads the marketplace
- **WHEN** an authenticated user who is not a member of any publishing tenant visits `/portal/entrenamientos-publicos`
- **THEN** the page SHALL successfully load and display active publications from every tenant

#### Scenario: Past trainings are excluded
- **WHEN** a published training's `fecha_hora` is before the current time
- **THEN** it SHALL NOT appear in the marketplace listing

#### Scenario: Empty state
- **WHEN** there are zero active, non-past publications
- **THEN** the page SHALL show an explanatory empty state instead of an empty grid

---

### Requirement: Marketplace filtering by date, search, and organization
The marketplace page SHALL provide date chips (Hoy, Mañana, Esta semana, Fin de semana) filtering by `fecha_hora`, a search field filtering by case-insensitive substring match on `nombre`/`descripcion`, and an "Organización" dropdown filtering by the publishing tenant. All three filters SHALL apply client-side to the fetched list and SHALL be combinable.

#### Scenario: Date chip filters the list
- **WHEN** a visitor selects the "Esta semana" date chip
- **THEN** only publications with `fecha_hora` within the current week SHALL remain visible

#### Scenario: Search filters by name or description
- **WHEN** a visitor types a substring into the search field that matches a listing's `nombre`
- **THEN** only matching listings SHALL remain visible

#### Scenario: Organization dropdown filters by tenant
- **WHEN** a visitor selects a specific organization from the dropdown
- **THEN** only that organization's published listings SHALL remain visible

---

### Requirement: Featured card treatment and available-sessions widget
The marketplace grid SHALL render the most recently published active listing with a visually distinct "Featured" treatment (larger card, badge). A floating widget SHALL display an accurate count of listed trainings occurring within the current week.

#### Scenario: Most recent publication is featured
- **WHEN** the marketplace loads multiple active publications
- **THEN** the one with the most recent `created_at` (publish time) SHALL render with the Featured treatment and the rest SHALL render as standard cards

#### Scenario: Widget count reflects the current week
- **WHEN** the marketplace page loads
- **THEN** the floating widget SHALL display the count of active, non-past listings whose `fecha_hora` falls within the current week

---

### Requirement: Booking from the marketplace reuses the existing reservation pipeline
Booking a published training SHALL use the same reservation creation path used for same-tenant bookings (`reservasService.create()`, restriction validation against `entrenamiento_restricciones`, and formulario attachment handling), targeting the publication's `entrenamiento_id`. No new or duplicated booking, restriction, or formulario logic SHALL be introduced for the marketplace flow. Advance-notice enforcement (`reserva_antelacion_horas`/`cancelacion_antelacion_horas`) SHALL always be evaluated against the live value on the source `entrenamientos` row, never against the value snapshotted on `entrenamientos_publicos`.

#### Scenario: Booking creates a reservation against the source training
- **WHEN** an authenticated visitor clicks "Reservar" on a published listing and completes the booking form
- **THEN** a `reservas` row SHALL be created against the publication's `entrenamiento_id`, using the same creation path as a same-tenant booking

#### Scenario: Internal formulario still applies
- **WHEN** the published training's source `entrenamientos` row has `formulario_id` set
- **THEN** the visitor SHALL be routed through the same form-fill step used for same-tenant bookings before the reservation is created

#### Scenario: Advance-notice cutoff uses the live value
- **WHEN** a visitor attempts to book less than `reserva_antelacion_horas` (read from the source `entrenamientos` row) before the training's start time
- **THEN** the booking SHALL be rejected with the same validation message used for same-tenant bookings

#### Scenario: Booking UI never exposes tenant-admin affordances
- **WHEN** a visitor with no role in the owning tenant opens the booking modal from the marketplace
- **THEN** no tenant-admin-only controls (reservations list, export, attendance management) SHALL be rendered
