## ADDED Requirements

### Requirement: Resumen layout has two KPI rows and three chart rows
The "Resumen" tab of `/portal/orgs/{tenant_id}/analitica` SHALL render, in this order, with 24 px (`gap-6`) between rows:
1. Row 1 — four KPI cards: "Ingresos totales", "Ingresos pendientes por validar", "Entrenamientos programados", "Promedio de reservas / entrenamiento".
2. Row 2 — four KPI cards: "Ocupación promedio / entrenamiento", "Asistencia promedio / entrenamiento", "Atletas activos", "Atletas activos sin suscripción".
3. Row 3 — "Ingresos mensuales" (vertical bar) and "Ingresos por estado de validación" (donut).
4. Row 4 — "Suscripciones vendidas por mes" (line) and "Suscripciones vendidas por plan" (horizontal bar).
5. Row 5 — "Promedio de reservas por entrenamiento" (line) and "Reservas por disciplina" (donut).

KPI rows SHALL use a 1 / 2 / 4 column grid (`grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`). Chart rows SHALL use one column below `lg` and two columns from `lg`, the first chart wider than the second (`lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]`). Every chart SHALL be rendered inside the existing `Panel` (GritCard + GritSectionHeading) with a fixed chart height of 288 px (`h-72`). The previous Resumen content (publication donut, member-status donut, capacity-alerts panel) SHALL NOT be rendered in Resumen.

#### Scenario: Desktop layout
- **WHEN** an administrator opens the Resumen tab at ≥1280 px width with data
- **THEN** the page SHALL show two rows of four KPI cards followed by three rows of two charts, in the order listed

#### Scenario: Mobile layout
- **WHEN** the Resumen tab renders at 375 px width
- **THEN** KPI cards and charts SHALL stack in a single column with no horizontal page scroll

#### Scenario: Old Resumen charts removed
- **WHEN** the Resumen tab renders
- **THEN** it SHALL NOT show "Reservas por publicación", "Estado actual del equipo" or "Alertas de capacidad"

### Requirement: Row 1 KPI definitions
The first KPI row SHALL compute its values as follows. For the applied date range `[dateFrom, dateTo]` (Bogotá dates):
- **Ingresos totales** SHALL equal `revenue.totalRevenue` = validated payments dated by `coalesce(fecha_validacion, fecha_pago, created_at)` within the range + pending payments dated by `created_at` within the range. Rejected payments MUST be excluded. Formatted as COP currency without decimals, tone `success`, icon `payments`.
- **Ingresos pendientes por validar** SHALL show `revenue.pendingPaymentAmount` as value (currency, tone `warning`, icon `pending`) and, as the small detail line, "{pendingPaymentCount} pagos pendientes por validar" (singular "pago pendiente por validar" when the count is 1).
- **Entrenamientos programados** SHALL show `operations.scheduledTrainingCount` (non-cancelled sessions in range), icon `event_available`.
- **Promedio de reservas / entrenamiento** SHALL show `operations.averageBookingsPerTraining` = valid (non-cancelled) bookings on non-cancelled sessions in range ÷ non-cancelled sessions in range, formatted with one decimal (`es-CO`), icon `event_seat`; "0,0" when there are no sessions.

#### Scenario: Total includes pending but not rejected
- **WHEN** the range contains validated payments of 300.000, pending of 100.000 and rejected of 50.000
- **THEN** "Ingresos totales" SHALL show $ 400.000 and "Ingresos pendientes por validar" SHALL show $ 100.000

#### Scenario: Pending count as detail
- **WHEN** there are 3 pending payments in range
- **THEN** the pending card SHALL show the detail "3 pagos pendientes por validar" in the 11 px muted style

#### Scenario: Average bookings
- **WHEN** the range has 4 non-cancelled sessions with 10 valid bookings in total
- **THEN** "Promedio de reservas / entrenamiento" SHALL show "2,5"

### Requirement: Row 2 KPI definitions
The second KPI row SHALL compute its values as follows.
- **Ocupación promedio / entrenamiento** SHALL show `operations.averageOccupancyPercent` = arithmetic mean, over non-cancelled sessions in range with `cupo_maximo > 0`, of `valid bookings ÷ cupo_maximo × 100`, rounded to 1 decimal and suffixed "%", icon `donut_small`. When no session has capacity it SHALL show "Sin capacidad".
- **Asistencia promedio / entrenamiento** SHALL show `operations.averageAttendancePercent` = arithmetic mean, over non-cancelled sessions in range whose session time is before now and with ≥1 valid booking, of `bookings with asistio = true ÷ valid bookings × 100`, 1 decimal + "%", icon `how_to_reg`. When no session qualifies it SHALL show "Sin datos".
- **Atletas activos** and **Atletas activos sin suscripción** SHALL keep their current values (`team.activeAthleteCount`, `team.activeAthletesWithoutSubscriptionCount`), icons `group` / `person_off`; the latter with tone `warning`.

#### Scenario: Occupancy is averaged per session
- **WHEN** the range has session A (cupo 10, 10 bookings) and session B (cupo 20, 5 bookings)
- **THEN** "Ocupación promedio / entrenamiento" SHALL show "62.5%" (mean of 100 % and 25 %), not the pooled 50 %

#### Scenario: Future sessions excluded from attendance
- **WHEN** a session in range has not happened yet
- **THEN** it SHALL NOT be part of the attendance average

#### Scenario: No attendance data
- **WHEN** no past session in range has valid bookings
- **THEN** the attendance card SHALL show "Sin datos"

### Requirement: KPI cards navigate to their detail tab
Each Resumen KPI card SHALL remain a button that switches the active tab: both revenue cards → `ingresos`; trainings, bookings average, occupancy and attendance → `operacion`; both athlete cards → `equipo`. The button SHALL keep the visible `grit-cyan` focus ring.

#### Scenario: Navigate from occupancy
- **WHEN** the user clicks "Ocupación promedio / entrenamiento"
- **THEN** the `Operación` tab SHALL become active

### Requirement: Monthly revenue bar chart
"Ingresos mensuales" SHALL be a `@nivo/bar` vertical bar chart with one bar per calendar month overlapping the range (month buckets clipped to `[dateFrom, dateTo]`), bar value = `monthlyRevenue[].totalRevenue` (validated + pending in that month, same dating rules as the KPI). Each bar SHALL display its total above the bar in compact COP format (e.g. "$ 1,2 M", "$ 850 mil"); months with 0 SHALL show no label. X axis: short Spanish month ("ene", "feb"…) plus the 2-digit year when the range spans more than one year. The tooltip SHALL show the month, total, validated and pending amounts in full currency. The sum of all bars SHALL equal "Ingresos totales".

#### Scenario: Labels show totals
- **WHEN** March has 500.000 validated and 200.000 pending
- **THEN** the March bar SHALL be 700.000 high and labelled "$ 700 mil"

#### Scenario: Bars add up to the KPI
- **WHEN** the chart renders for any range
- **THEN** the sum of the bar values SHALL equal `revenue.totalRevenue`

### Requirement: Revenue validation donut
"Ingresos por estado de validación" SHALL be a `@nivo/pie` donut with two slices: "Validados" (`recognizedRevenue`, color `ANALITICA_CHART_COLORS[0]`) and "Pendientes" (`pendingPaymentAmount`, color `ANALITICA_CHART_COLORS[2]`). Arc labels SHALL show each slice's percentage of the total; the tooltip SHALL show the label, amount in currency and percentage; a bottom legend SHALL list both slices. Zero-value slices SHALL be omitted.

#### Scenario: Percentages
- **WHEN** validated is 300.000 and pending 100.000
- **THEN** the donut SHALL show "75%" on "Validados" and "25%" on "Pendientes"

### Requirement: Subscriptions sold per month line chart
"Suscripciones vendidas por mes" SHALL be a `@nivo/line` chart with one point per month in range, value = `subscriptions.monthlySold[].subscriptionCount` = subscriptions of the tenant with `created_at` (Bogotá date) inside the clipped month bucket and `estado <> 'cancelada'`, regardless of payment status. Points SHALL be visible, the Y axis SHALL use integer ticks, and the tooltip SHALL show month and "N suscripciones".

#### Scenario: Cancelled subscriptions excluded
- **WHEN** 5 subscriptions were created in April and 1 of them is `cancelada`
- **THEN** the April point SHALL be 4

### Requirement: Subscriptions sold per plan horizontal bar chart
"Suscripciones vendidas por plan" SHALL be a `@nivo/bar` chart with `layout="horizontal"`, one bar per plan from `subscriptions.soldByPlan` (same subscription filter as the monthly line, whole range), sorted with the highest count at the top, each bar labelled with its count. When there are more than 9 plans, the top 9 SHALL be shown and the remaining ones grouped into a single "Otros planes (N)" bar at the bottom, so the chart stays legible at 288 px and the total is preserved. Plan names longer than 18 characters SHALL be truncated with "…" on the axis and shown in full in the tooltip.

#### Scenario: Ordering
- **WHEN** plan "Mensual" has 12 sales and "Trimestral" 4
- **THEN** "Mensual" SHALL be the top bar

#### Scenario: Many plans grouped
- **WHEN** 18 plans have sales in the range
- **THEN** the chart SHALL show 9 plan bars plus "Otros planes (9)" whose value is the sum of the other 9 plans

#### Scenario: Plan totals match monthly line
- **WHEN** the charts render for the same range
- **THEN** the sum of the plan bars SHALL equal the sum of the monthly line points and `subscriptions.soldCount`

### Requirement: Average bookings per training line chart
"Promedio de reservas por entrenamiento" SHALL be a `@nivo/line` chart with one point per month in range, value = `operations.monthlyBookingAverage[].averageBookingsPerTraining` (valid bookings on non-cancelled sessions of that month ÷ non-cancelled sessions of that month, 0 when the month has no sessions), Y values with one decimal. The tooltip SHALL show the month, the average, and "N reservas / M entrenamientos".

#### Scenario: Month without sessions
- **WHEN** a month in range has no sessions
- **THEN** its point SHALL be 0 and the tooltip SHALL show "0 reservas / 0 entrenamientos"

### Requirement: Bookings by discipline donut
"Reservas por disciplina" SHALL be a `@nivo/pie` donut built from `operations.bookingByDiscipline` (valid bookings), omitting disciplines with 0 bookings, colored in `ANALITICA_CHART_COLORS` order. Arc labels SHALL show each discipline's share of all valid bookings as a percentage (slices under 10° hide the label); the tooltip SHALL show discipline, count and percentage; a bottom legend SHALL list the disciplines. When there are more than 6 disciplines the smallest ones beyond the 5th SHALL be grouped into "Otras".

#### Scenario: Shares add to 100
- **WHEN** Crossfit has 30 bookings and Yoga 10
- **THEN** the donut SHALL show 75% and 25%

#### Scenario: Grouping
- **WHEN** there are 8 disciplines with bookings
- **THEN** the donut SHALL show the top 5 plus one "Otras" slice

### Requirement: Empty and loading states per chart
Each chart SHALL render the existing empty message "No hay datos para el periodo seleccionado." when its series is empty or all values are 0. The page-level loading, error, stale-data and refreshing states SHALL be unchanged.

#### Scenario: Tenant without data
- **WHEN** the tenant has no payments, sessions or subscriptions in range
- **THEN** all KPI cards SHALL render with zero/"Sin capacidad"/"Sin datos" values and every chart panel SHALL show the empty message

### Requirement: RPC exposes Resumen metrics additively
`public.get_tenant_bi_dashboard(p_tenant_id, p_date_from, p_date_to)` SHALL keep its signature, `security definer`, tenant-admin check (`42501`) and range validation (`22007`), and all existing JSON fields with unchanged meaning. It SHALL add:
- `revenue.totalRevenue`, and on each `revenue.monthlyRevenue[]` item `pendingRevenue` and `totalRevenue`;
- `operations.averageBookingsPerTraining` (numeric, 2 decimals), `operations.averageOccupancyPercent` (numeric or null), `operations.averageAttendancePercent` (numeric or null), `operations.monthlyBookingAverage[]` with `monthStart`, `monthKey`, `scheduledTrainingCount`, `validBookingCount`, `averageBookingsPerTraining`;
- top-level `subscriptions` with `soldCount`, `monthlySold[]` (`monthStart`, `monthKey`, `subscriptionCount`) and `soldByPlan[]` (`planName`, `subscriptionCount`, ordered by count desc, name asc).
All date bucketing SHALL use `America/Bogota`. The migration MUST be applied only to the local Supabase instance.

#### Scenario: Backward compatible
- **WHEN** the `Ingresos`, `Operación` and `Equipo` tabs render after the migration
- **THEN** they SHALL show the same values as before

#### Scenario: Non-admin still rejected
- **WHEN** a non-admin member calls the RPC
- **THEN** it SHALL raise `42501`
