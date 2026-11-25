## ADDED Requirements

### Requirement: Administrator-scoped BI data contract
The system SHALL expose tenant business-intelligence data only through `get_tenant_bi_dashboard(p_tenant_id, p_date_from, p_date_to)`. The function SHALL validate that the range is inclusive and ordered, SHALL authorize the authenticated caller as an administrator of the requested tenant, and SHALL return `42501` when authorization fails. The browser role SHALL not receive direct access to the private BI schema or its fact views.

#### Scenario: Administrator requests own tenant dashboard
- **WHEN** an authenticated administrator requests a valid inclusive date range for a tenant they administer
- **THEN** the system SHALL return one JSON object containing `revenue`, `operations`, and `team` data for that tenant only

#### Scenario: Non-administrator requests dashboard data
- **WHEN** an athlete, coach, unauthenticated caller, or administrator of another tenant requests the dashboard for a tenant they do not administer
- **THEN** the system SHALL reject the request with PostgreSQL error code `42501` and SHALL not return a zero-data payload

#### Scenario: Invalid range is submitted
- **WHEN** either date is null or the start date is later than the end date
- **THEN** the system SHALL reject the request with PostgreSQL error code `22007`

#### Scenario: Browser attempts direct BI fact access
- **WHEN** an authenticated browser client attempts to select from the `bi` schema or a `bi.fct_*` view
- **THEN** the database SHALL deny the direct access

### Requirement: Consistent Phase One business metrics
The system SHALL calculate dashboard metrics from one-payment, one-booking, and one-attendance facts scoped by tenant. Recognized revenue SHALL include only validated payments. Valid booking counts SHALL exclude only cancelled bookings and SHALL not duplicate bookings due to multi-service consumption rows. Occupancy SHALL divide aggregate valid bookings by aggregate defined capacity and SHALL be null when defined capacity is zero. Membership status metrics SHALL represent the current membership state only.

#### Scenario: Validated payment contributes revenue
- **WHEN** a payment has state `validado` and its analytical payment date falls in the selected range
- **THEN** its amount SHALL contribute to recognized revenue, revenue breakdowns, and athlete revenue rankings

#### Scenario: Pending payment remains pipeline
- **WHEN** a payment has state `pendiente` and is created in the selected range
- **THEN** its amount SHALL contribute to pending-payment metrics and SHALL NOT contribute to recognized revenue

#### Scenario: Booking uses multiple services
- **WHEN** a non-cancelled reservation has multiple linked service-consumption rows
- **THEN** the reservation SHALL contribute exactly once to valid booking and occupancy calculations

#### Scenario: Capacity is undefined
- **WHEN** all qualifying sessions have null capacity
- **THEN** occupancy SHALL be null and the dashboard SHALL report the sessions as trainings without capacity

#### Scenario: Tenant has no qualifying facts
- **WHEN** a valid administrator requests a range with no qualifying payment, booking, attendance, or membership rows
- **THEN** the system SHALL return zero numeric totals and empty arrays instead of null collections or an error

### Requirement: Tenant analytics dashboard interaction
The administrator analytics page SHALL provide one `America/Bogota` date-range filter and four accessible client-side tabs in this order: `Resumen`, `Ingresos`, `Operación`, and `Equipo`. `Resumen` SHALL be selected initially and show cross-domain KPIs. The detailed tabs SHALL share one loaded dashboard response, retain the active range when switching tabs, and not request data solely because the selected tab changes. Browser-local time SHALL NOT alter Phase One totals or date boundaries.

#### Scenario: Administrator opens analytics
- **WHEN** an authorized administrator opens `/portal/orgs/[tenant_id]/analitica`
- **THEN** the page SHALL default to the current `America/Bogota` month through the current `America/Bogota` date and select the `Resumen` tab

#### Scenario: Administrator selects a detailed tab
- **WHEN** the administrator selects `Ingresos`, `Operación`, or `Equipo`
- **THEN** the page SHALL render only that tab's detailed content, preserve the active date range, and not send another dashboard request for the unchanged range

#### Scenario: Administrator applies a date range
- **WHEN** the administrator applies a valid preset or custom `America/Bogota` date range
- **THEN** the page SHALL load one replacement dashboard response and SHALL retain the last successful response while the replacement loads

#### Scenario: Keyboard user changes dashboard tab
- **WHEN** focus is on a dashboard tab and the user presses Arrow Left, Arrow Right, Home, or End
- **THEN** the tab list SHALL select and focus the corresponding tab and expose its associated tab panel according to the WAI-ARIA tabs pattern

#### Scenario: No data is available for selected range
- **WHEN** the dashboard returns zero totals and empty arrays
- **THEN** the selected tab SHALL show a valid empty state rather than an error state
