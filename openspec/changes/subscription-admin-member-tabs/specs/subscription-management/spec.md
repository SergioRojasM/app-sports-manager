## MODIFIED Requirements

### Requirement: Subscription list with joined athlete, plan, and payment data
The system SHALL fetch all subscriptions belonging to the active tenant in a single joined query that includes the athlete's name and email (from `usuarios`), the plan name (from `planes`), the plan_tipo name, `vigencia_dias`, and `clases_incluidas` (from `plan_tipos`), and the latest payment record (from `pagos`) for each subscription. The join on `planes` SHALL NOT select `vigencia_meses` or `clases_incluidas` — these fields no longer exist on the `planes` table. In the same load, the system SHALL fetch the tenant's `miembros_tenant.usuario_id` set and, for each subscription row, set `es_miembro = true` when the row's `atleta_id` is present in that set and `es_miembro = false` otherwise. The result SHALL be displayed in a tabular layout.

#### Scenario: Subscriptions are loaded on page mount
- **WHEN** an administrator lands on the subscription management page
- **THEN** the system SHALL display all tenant subscriptions with the following columns: athlete name, athlete email, plan name, subscription status badge, start date, end date, classes remaining, payment status badge, payment method, payment amount, request date, and a membership badge ("Miembro" / "No miembro")

#### Scenario: Membership flag is computed via a tenant-scoped lookup, not a stored column
- **WHEN** the subscriptions query executes
- **THEN** the system SHALL also query `miembros_tenant` filtered by the active `tenant_id` (a single query, not one per row) and use row existence — independent of `miembros_tenant.estado` — to determine each subscription row's `es_miembro` value

#### Scenario: Page shows loading state while fetching
- **WHEN** the initial data fetch is in progress
- **THEN** the system SHALL display a loading indicator and MUST NOT render stale or partial rows

#### Scenario: Empty state when no subscriptions exist
- **WHEN** the tenant has no subscription records at all
- **THEN** the system SHALL display an empty state message and SHALL NOT show the table

#### Scenario: Error state on fetch failure
- **WHEN** the data fetch fails (e.g., network error or RLS denial on either the `suscripciones` or the `miembros_tenant` query)
- **THEN** the system SHALL display an error message with a retry action

---

### Requirement: Subscription statistics cards
The system SHALL display three summary cards derived from the in-memory subscription list, scoped to the currently active membership tab (Miembros / No miembros), without issuing additional database queries.

#### Scenario: Active subscriptions count
- **WHEN** subscription data is loaded and a tab is active
- **THEN** the system SHALL display a card showing the count of subscriptions where `estado = 'activa'` among the active tab's rows only

#### Scenario: Pending subscriptions count
- **WHEN** subscription data is loaded and a tab is active
- **THEN** the system SHALL display a card showing the count of subscriptions where `estado = 'pendiente'` among the active tab's rows only

#### Scenario: Subscriptions with pending payment count
- **WHEN** subscription data is loaded and a tab is active
- **THEN** the system SHALL display a card showing the count of subscriptions whose linked payment has `estado = 'pendiente'` among the active tab's rows only

---

### Requirement: Search and quick-filter controls
The system SHALL provide a free-text search input and quick-filter chips that filter the displayed rows client-side without additional database queries, applied within the currently active membership tab (Miembros / No miembros).

#### Scenario: Free-text search filters by athlete name, plan name, or subscription ID
- **WHEN** an administrator types in the search input
- **THEN** the system SHALL filter rows, within the active tab, to those where the athlete's full name, plan name, or subscription ID (partial UUID match) contains the search term (case-insensitive)

#### Scenario: Subscription status chip filters rows
- **WHEN** an administrator selects a subscription status chip (All / Pending / Active / Expired / Cancelled)
- **THEN** the system SHALL display only rows, within the active tab, matching the selected `suscripciones.estado` value

#### Scenario: Payment status chip filters rows
- **WHEN** an administrator selects a payment status chip (All / Pending / Validated / Rejected)
- **THEN** the system SHALL display only rows, within the active tab, matching the linked `pagos.estado` value

#### Scenario: Search, chips, and active tab combine as AND filters
- **WHEN** a search term, a status chip, and an active membership tab are all set simultaneously
- **THEN** the system SHALL display only rows that satisfy all three conditions together

---

## ADDED Requirements

### Requirement: Membership tabs for admin subscription list
The admin subscription management page SHALL present two tabs — "Miembros" and "No miembros" — above the stats cards, styled consistently with the existing `Equipo` / `Solicitudes` / `Bloqueados` tab bar pattern. Each tab button SHALL show a count badge reflecting the total number of subscriptions in that category, computed from the full unfiltered tenant row set (unaffected by search term or status chips). Selecting a tab SHALL scope the stats cards, table, and pagination to subscriptions whose `es_miembro` matches that tab ("Miembros" ⇒ `es_miembro = true`; "No miembros" ⇒ `es_miembro = false`).

#### Scenario: Two membership tabs are rendered
- **WHEN** an administrator lands on the subscription management page
- **THEN** the system SHALL render a "Miembros" tab and a "No miembros" tab, with "Miembros" selected by default

#### Scenario: Tab count badges reflect total per category
- **WHEN** subscription data is loaded
- **THEN** each tab button SHALL display a count badge equal to the number of subscriptions with matching `es_miembro`, regardless of any active search term or status chip

#### Scenario: Selecting a tab scopes the table and stats
- **WHEN** an administrator clicks the "No miembros" tab
- **THEN** the table, pagination, and stats cards SHALL update to show only subscriptions where `es_miembro = false`

#### Scenario: Switching tabs resets pagination
- **WHEN** an administrator switches from one tab to the other
- **THEN** the system SHALL reset the current page to 1

#### Scenario: Empty state is tab-aware
- **WHEN** the active tab's filtered subscription list (after tab, search, and chip filters) is empty but the tenant has subscriptions in the other category
- **THEN** the system SHALL display a distinct empty-state message for the active tab ("No hay suscripciones de miembros para esta organización." for "Miembros"; "No hay suscripciones de no miembros para esta organización." for "No miembros") instead of the tenant-wide empty state

---

### Requirement: Subscription membership reflects current team membership, not membership at request time
Whether a subscription's requester counts as a "member" for tab placement and the membership badge SHALL be determined by the current existence of a `miembros_tenant` row for `(tenant_id, atleta_id)` at read time. This value SHALL NOT be snapshotted or cached at subscription-creation time, so it stays correct as team membership changes after the subscription was created.

#### Scenario: Athlete removed from the team after subscribing
- **WHEN** an athlete held an active `miembros_tenant` row at the time they created a subscription, and an administrator later removes them from the team (deleting the `miembros_tenant` row)
- **THEN** that athlete's existing subscription SHALL subsequently appear under the "No miembros" tab with a "No miembro" badge, without any change to the `suscripciones` row itself

#### Scenario: Non-member subscribes via a public plan and later joins the team
- **WHEN** a non-member subscribes to a public plan (per US-0093) and an administrator later adds them as a tenant member
- **THEN** that subscription SHALL subsequently appear under the "Miembros" tab with a "Miembro" badge

---

### Requirement: Subscription membership badge column
Every row in the admin subscription table SHALL display a "Tipo" column showing a "Miembro" or "No miembro" badge reflecting the row's `es_miembro` value, in both the "Miembros" and "No miembros" tabs.

#### Scenario: Member subscription shows the Miembro badge
- **WHEN** a subscription row has `es_miembro = true`
- **THEN** its "Tipo" column SHALL display a "Miembro" badge

#### Scenario: Non-member subscription shows the No miembro badge
- **WHEN** a subscription row has `es_miembro = false`
- **THEN** its "Tipo" column SHALL display a "No miembro" badge

#### Scenario: Badge is visible regardless of the active tab
- **WHEN** an administrator views either the "Miembros" or the "No miembros" tab
- **THEN** the "Tipo" column and its badge SHALL be rendered on every visible row
