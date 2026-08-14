## MODIFIED Requirements

### Requirement: Subscription list with joined athlete, plan, and payment data
The system SHALL fetch all subscriptions belonging to the active tenant in a single joined query that includes: the athlete's name and email (from `usuarios`), the plan name (from `planes`), the plan_tipo name and `vigencia_dias` (from `plan_tipos`), the latest payment record (from `pagos`), and per-service unit data (from `suscripcion_servicios` joined to `servicios(nombre)`). The join on `planes` SHALL NOT select `vigencia_meses` or `clases_incluidas`. The result SHALL be displayed in a tabular layout. The mapped row type `SuscripcionAdminRow` SHALL include `servicios: SuscripcionServicioDisplay[]`.

#### Scenario: Subscriptions are loaded on page mount
- **WHEN** an administrator lands on the subscription management page
- **THEN** the system SHALL display all tenant subscriptions with the following columns: athlete name, athlete email, plan name, subscription status badge, start date, end date, **Servicios** (per-service unit list), payment status badge, payment method, payment amount, and request date

#### Scenario: Page shows loading state while fetching
- **WHEN** the initial data fetch is in progress
- **THEN** the system SHALL display a loading indicator and MUST NOT render stale or partial rows

#### Scenario: Empty state when no subscriptions exist
- **WHEN** the tenant has no subscription records
- **THEN** the system SHALL display an empty state message and SHALL NOT show the table

#### Scenario: Error state on fetch failure
- **WHEN** the data fetch fails (e.g., network error or RLS denial)
- **THEN** the system SHALL display an error message with a retry action

---

### Requirement: Servicios column replaces Clases column in the subscription table
The admin subscription table SHALL NOT contain a "Clases" column. In its place, a "Servicios" column SHALL display per-service unit information sourced from `SuscripcionAdminRow.servicios`. When `servicios` is empty, the cell SHALL display `"—"`. When `servicios` has entries, each entry SHALL render as `{servicio_nombre}: {unidades_restantes}/{unidades_incluidas}` (null → `∞`). When more than 3 services exist, only the first 3 SHALL be rendered followed by `+N más`.

#### Scenario: Servicios column shows dash when no services
- **WHEN** a subscription row has no service assignments
- **THEN** the Servicios cell SHALL display `"—"`

#### Scenario: Servicios column shows all services when ≤ 3
- **WHEN** a subscription row has 1–3 service assignments
- **THEN** the Servicios cell SHALL list all services as `{nombre}: {restantes}/{incluidas}` (or `∞`)

#### Scenario: Servicios column truncates beyond 3 services
- **WHEN** a subscription row has more than 3 service assignments
- **THEN** the cell SHALL show the first 3 entries followed by `+N más`

#### Scenario: Clases column does not appear
- **WHEN** the admin subscription table renders
- **THEN** no column labelled "Clases" SHALL be present in the table header or body
