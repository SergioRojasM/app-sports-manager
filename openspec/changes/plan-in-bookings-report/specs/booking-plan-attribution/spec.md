## ADDED Requirements

### Requirement: reservas_reporte_view exposes the deducted plan and its validity window
The `public.reservas_reporte_view` PostgreSQL view SHALL expose three additional columns: `plan_nombre`, `plan_fecha_inicio` and `plan_fecha_fin`. `plan_fecha_inicio` and `plan_fecha_fin` SHALL be `date`-typed columns inherited from `suscripciones.fecha_inicio` / `suscripciones.fecha_fin`, NOT pre-formatted text. All three columns SHALL be nullable. The view SHALL retain all 28 pre-existing columns unchanged, SHALL keep `with (security_invoker = true)`, and SHALL keep `grant select on public.reservas_reporte_view to authenticated`.

#### Scenario: New columns are present alongside the existing ones
- **WHEN** the view definition is inspected after the migration is applied
- **THEN** it exposes `plan_nombre`, `plan_fecha_inicio` and `plan_fecha_fin` in addition to all 28 columns it exposed before, and `security_invoker` is still `true`

#### Scenario: Date columns are date-typed
- **WHEN** the view's column types are inspected (e.g. `\d+ reservas_reporte_view`)
- **THEN** `plan_fecha_inicio` and `plan_fecha_fin` report type `date`, not `text`

---

### Requirement: Plan attribution resolves from the consumption ledger for deducted bookings
For a booking whose service units were deducted from a subscription, the view SHALL resolve `plan_nombre`, `plan_fecha_inicio` and `plan_fecha_fin` from `reserva_servicios` → `suscripciones` → `planes`. The lookup SHALL select exactly one subscription row deterministically (a `LEFT JOIN LATERAL` ordered by `reserva_servicios.created_at` then `suscripciones.id`, limited to one row), so that a booking consuming several services never produces repeated or aggregated values.

#### Scenario: Confirmed booking reports the plan it was deducted from
- **WHEN** a `confirmada` booking has `reserva_servicios` rows pointing at subscription S
- **THEN** `plan_nombre` is S's `planes.nombre`, `plan_fecha_inicio` is S's `fecha_inicio` and `plan_fecha_fin` is S's `fecha_fin`

#### Scenario: Booking consuming several services from one subscription yields a single value
- **WHEN** a booking has multiple `reserva_servicios` rows all referencing the same subscription
- **THEN** the report row shows one plan name and one date range, not repeated or comma-joined values

#### Scenario: Booking spanning two subscriptions reports one of them deterministically
- **WHEN** a booking's `reserva_servicios` rows reference two different subscriptions
- **THEN** the row reports exactly one plan, chosen by the defined ordering, and the same row is chosen on every subsequent query of unchanged data

---

### Requirement: Plan attribution falls back to reservas.suscripcion_id for deferred plan purchases
When no `reserva_servicios` row exists for a booking, the view SHALL resolve all three columns from `reservas.suscripcion_id` → `suscripciones` → `planes`. Each column SHALL be expressed as `coalesce(<ledger lookup>, <direct lookup>)` with the ledger taking precedence, and all three SHALL always describe the same subscription.

#### Scenario: Pendiente booking on an unapproved plan purchase reports its plan
- **WHEN** a `pendiente` booking was created through the deferred plan-purchase flow, so `reservas.suscripcion_id` is set and no `reserva_servicios` row exists yet
- **THEN** `plan_nombre`, `plan_fecha_inicio` and `plan_fecha_fin` are taken from that subscription

#### Scenario: Booking with no plan reports NULL
- **WHEN** a booking consumed no plan and has neither `reserva_servicios` rows nor a `reservas.suscripcion_id`
- **THEN** all three columns are `NULL`

#### Scenario: Name and dates never describe different subscriptions
- **WHEN** any report row is returned
- **THEN** `plan_nombre`, `plan_fecha_inicio` and `plan_fecha_fin` all originate from the same `suscripciones` row

#### Scenario: Open-ended subscription reports a NULL date side
- **WHEN** the resolved subscription has a `NULL` `fecha_inicio` or `fecha_fin`
- **THEN** the corresponding column is `NULL` while `plan_nombre` is still populated

---

### Requirement: Plan data is readable by tenant staff and by the owning athlete
Because `reservas_reporte_view` is `security_invoker = true`, the joined tables SHALL be readable by every role that can already read the booking rows. The `SELECT` policy set on `public.suscripciones` SHALL be widened to tenant staff (`entrenador` and `administrador`) by adding a policy scoped through `public.get_trainer_or_admin_tenants_for_authenticated_user()`, alongside — not replacing — the existing owner and administrator policies. The `SELECT` policy on `public.reserva_servicios` SHALL be replaced by one using the same trainer-or-admin helper, keeping its `reservas.atleta_id = auth.uid()` athlete branch. No policy SHALL be replaced by an unconditional `using (true)`, and no write policy SHALL change.

#### Scenario: Administrator sees plan data for their tenant
- **WHEN** a user with role `administrador` opens Gestión de Reservas for their tenant
- **THEN** the plan name and validity range are populated on rows whose booking consumed a plan

#### Scenario: Coach sees plan data rather than blanks
- **WHEN** a user with role `entrenador` opens Gestión de Reservas or exports the per-training CSV
- **THEN** the plan columns are populated on rows whose booking consumed a plan, not blank

#### Scenario: Athlete sees plan data on their own bookings only
- **WHEN** an athlete opens Mis Reservas
- **THEN** the plan columns are populated on their own booking rows, and no other athlete's reservations are returned

#### Scenario: Plan visibility does not cross tenants
- **WHEN** a coach or administrator of tenant A queries the report
- **THEN** no rows or plan values from tenant B's subscriptions are returned

---

### Requirement: Management tables display a Plan column with the validity window
`ReservasManagementTable` and `MisReservasTable` SHALL each render a single **Plan** column positioned immediately after *Entrenamiento*, with the plan name on the first line and the subscription validity range as a muted secondary line in the same cell. The secondary line SHALL be real text in the DOM, not a `title` tooltip. The header cell SHALL use `scope="col"` like its siblings, and the empty-results row's `colSpan` SHALL be increased from 7 to 8 so it still spans the full table width.

#### Scenario: Booking with a plan renders name and range
- **WHEN** a report row has a non-null `plan_nombre` with both dates present
- **THEN** the Plan cell shows the plan name on the first line and the validity range beneath it

#### Scenario: Booking without a plan renders a placeholder
- **WHEN** a report row has `plan_nombre = NULL`
- **THEN** the Plan cell renders `—` as plain text, consistent with the other nullable cells

#### Scenario: Missing date side renders Sin fecha
- **WHEN** a report row has a plan name but a `NULL` `plan_fecha_inicio` or `plan_fecha_fin`
- **THEN** that side of the range reads `Sin fecha` and the plan name is still displayed

#### Scenario: Empty results row spans the whole table
- **WHEN** a filtered query returns no bookings
- **THEN** the "no results" row spans all 8 columns

---

### Requirement: Plan dates render as the stored calendar day
Because `plan_fecha_inicio` and `plan_fecha_fin` arrive as bare `YYYY-MM-DD` values, the tables SHALL format them with a date-only-safe routine — either splitting the string into year/month/day and constructing a local `Date`, or formatting with `timeZone: 'UTC'`. They SHALL NOT be passed through a formatter that calls `new Date(iso)` on the bare date string and renders in local time.

#### Scenario: No off-by-one shift in a negative-offset locale
- **WHEN** a subscription with `fecha_inicio = 2026-03-01` is rendered in es-CO (UTC−5)
- **THEN** the cell displays 1 Mar 2026, not 28 or 29 February

---

### Requirement: All three CSV exports include the plan fields
The per-training CSV, the Gestión de Reservas CSV and the Mis Reservas CSV SHALL each include the plan name and both validity dates as three separate columns, never as a merged range string. In the per-training export, where column order is driven by an explicit headers array, the new keys SHALL occupy identical positions in both the headers array and the mapped row object.

#### Scenario: Management CSVs carry the three plan columns
- **WHEN** a CSV is exported from Gestión de Reservas or Mis Reservas
- **THEN** it includes `Plan`, `Plan desde` and `Plan hasta` columns carrying the raw `YYYY-MM-DD` date values

#### Scenario: Per-training CSV header order matches row order
- **WHEN** the per-training CSV is exported
- **THEN** `plan_nombre`, `plan_fecha_inicio` and `plan_fecha_fin` appear in the header row and each row's values align with those headers exactly

#### Scenario: Bookings without a plan export as empty cells
- **WHEN** an exported booking has no plan
- **THEN** the three plan columns are empty for that row, and the export does not fail

---

### Requirement: The form-responses xlsx export is unaffected
The per-training `.xlsx` export produced by `handleExportFormularioRespuestas` SHALL remain unchanged, because it reads `formulario_respuestas` rather than `reservas_reporte_view` and has no plan linkage.

#### Scenario: xlsx export output is unchanged
- **WHEN** the form-responses `.xlsx` export is triggered after this change
- **THEN** its columns and content are identical to before
