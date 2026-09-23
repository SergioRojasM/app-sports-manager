## ADDED Requirements

### Requirement: Shared definitions for the detail tabs
The detail tabs SHALL use the same definitions as Resumen, for the applied range `[dateFrom, dateTo]` (Bogotá):
- **Payment in range**: a `validado` payment dated by `fct_pagos.fecha_pago_analitica`, or a `pendiente` payment dated by `fct_pagos.fecha_creacion_analitica`; `rechazado` payments are always excluded. **Total** = validated + pending.
- **Month count** (`monthCount`): the number of calendar months overlapping the range (the length of `revenue.monthlyRevenue`).
- **Per-training averages**: the means over non-cancelled sessions defined in `analitica-resumen-dashboard` (occupancy over sessions with `cupo_maximo > 0`; attendance over past sessions with ≥1 valid booking).
- **Active athlete**: a `bi.fct_miembros` row with `es_atleta` and `miembro_estado = 'activo'`.

Tables SHALL render a header row (`grit-subtext`, uppercase 12 px) with the column names below. Numeric columns SHALL be right-aligned. On narrow screens a table SHALL scroll horizontally inside its panel, never the page. Empty tables SHALL show "No hay datos para el periodo seleccionado.".

#### Scenario: Table headers
- **WHEN** any table in the Ingresos, Operación or Equipo tab renders
- **THEN** it SHALL show a header row with the column names from this spec

#### Scenario: Mobile tables
- **WHEN** a table renders at 375 px width
- **THEN** the page SHALL have no horizontal scroll; the table MAY scroll inside its panel

### Requirement: Ingresos KPI row
The Ingresos tab SHALL start with four KPI cards (`grid-cols-1 sm:grid-cols-2 xl:grid-cols-4`):
1. **Ingresos totales** — `revenue.totalRevenue`, currency, tone `success`, icon `payments`.
2. **Ingreso promedio por mes** — `revenue.averageMonthlyRevenue` = `totalRevenue ÷ monthCount`, currency, icon `calendar_month`.
3. **Acumulado MTD** — `revenue.monthToDateRevenue` = total of the payments dated from the first day of `dateTo`'s month to `dateTo` (not clipped to `dateFrom`), currency, icon `savings`; detail line with the month name, e.g. "septiembre 2026".
4. **Pendiente de validar** — unchanged: `pendingPaymentAmount`, detail "N pagos", tone `warning`, icon `pending`.

The previous "Ingresos validados", "Variación periodo anterior" and "Acumulado anual" cards SHALL NOT be rendered.

#### Scenario: Average per month
- **WHEN** the range is 2026-07-15..2026-09-23 with a total of 9.000.000
- **THEN** "Ingreso promedio por mes" SHALL show $ 3.000.000 (3 months overlap)

#### Scenario: MTD ignores dateFrom
- **WHEN** the range is 2026-09-20..2026-09-23 and there are payments on 2026-09-05
- **THEN** "Acumulado MTD" SHALL include them, while "Ingresos totales" SHALL NOT

### Requirement: Ingresos charts
Row 2 SHALL render "Ingresos mensuales" at full width using the same `MonthlyRevenueBarChart` as Resumen (validated + pending per month, clipped to the range, compact total above each bar).
Row 3 SHALL render "Suscripciones vendidas por mes" at full width as a stacked `@nivo/bar` chart with one bar per month and two keys: "Con pago validado" (`ANALITICA_CHART_COLORS[0]`) and "Sin pago validado" (`ANALITICA_CHART_COLORS[2]`). The integer total SHALL be drawn above each non-empty bar. The tooltip SHALL show the month, both counts and the total, and a legend SHALL name both keys. Data: `subscriptions.monthlySold[]`, where `withValidatedPaymentCount` counts sold subscriptions (per `bi-subscription-facts`) with `pagos_validados_count > 0` at query time and `withoutValidatedPaymentCount` the rest. The two SHALL sum to `subscriptionCount`.

#### Scenario: Stack adds up
- **WHEN** 10 subscriptions were sold in May and 7 of them have a validated payment
- **THEN** the May bar SHALL stack 7 "Con pago validado" and 3 "Sin pago validado", labelled "10"

### Requirement: Ingresos tables
The tab SHALL render "Ingresos por plan" and "Métodos de pago" side by side from `lg`, and "Atletas con mayor ingreso" at full width below them. Each SHALL have the columns **Concepto / Atleta, Suscripciones, Pagos, Total, Validado, Pendiente** computed over the payments in range:
- `subscriptionCount`: distinct `suscripcion_id` of those payments.
- `paymentCount`: validated + pending payments.
- `totalRevenue`, `recognizedRevenue` (validated), `pendingRevenue`.

Rows SHALL be ordered by `totalRevenue` desc, then name. "Atletas con mayor ingreso" SHALL list the top 5 athletes. The Total column of "Ingresos por plan" SHALL add up to `revenue.totalRevenue`, and so SHALL "Métodos de pago".

#### Scenario: Pending-only plan appears
- **WHEN** a plan has only pending payments in range
- **THEN** it SHALL appear with Validado $ 0 and its pending amount under Pendiente

#### Scenario: Subscriptions column
- **WHEN** a plan received 3 payments from 2 subscriptions in range
- **THEN** its row SHALL show Suscripciones 2 and Pagos 3

### Requirement: Operación KPI row
The Operación tab SHALL start with four KPI cards:
1. **Entrenamientos programados** — `scheduledTrainingCount` (unchanged), detail "{averageMonthlyTrainings} promedio por mes" (1 decimal), icon `event_available`.
2. **Reservas válidas** — `validBookingCount` (unchanged), detail "{averageMonthlyBookings} promedio por mes" (1 decimal), icon `event_seat`.
3. **Ocupación promedio / entrenamiento** — `averageOccupancyPercent` ("Sin capacidad" when null), icon `donut_small`.
4. **Asistencia promedio / entrenamiento** — `averageAttendancePercent` ("Sin datos" when null), icon `how_to_reg`.

`averageMonthlyTrainings = scheduledTrainingCount ÷ monthCount` and `averageMonthlyBookings = validBookingCount ÷ monthCount`, rounded to 2 decimals in the RPC.

#### Scenario: Monthly averages
- **WHEN** the range spans 3 months with 30 sessions and 90 valid bookings
- **THEN** the cards SHALL show the details "10,0 promedio por mes" and "30,0 promedio por mes"

### Requirement: Operación charts
- Row 2: "Entrenamientos y reservas por mes" SHALL be a full-width `@nivo/line` chart with two series on one shared left Y axis: "Entrenamientos" (`monthlyBookingAverage[].scheduledTrainingCount`, `ANALITICA_CHART_COLORS[0]`) and "Reservas" (`monthlyBookingAverage[].validBookingCount`, `ANALITICA_CHART_COLORS[1]`). It SHALL have a legend, a slice tooltip showing both values for the month, and integer ticks.
- Row 3: "Ocupación promedio por mes" and "Asistencia promedio por mes" SHALL be two `@nivo/line` charts (side by side from `lg`) over `monthlyBookingAverage[].averageOccupancyPercent` and `.averageAttendancePercent`, with the Y axis fixed at 0–100 and `%` tick labels. Months with a null value SHALL be gaps in the line, not zeros. The tooltip SHALL show the month and "N%" or "Sin datos".

Monthly values SHALL use the same per-training rules as the period KPIs, restricted to each clipped month.

#### Scenario: Null month is a gap
- **WHEN** July has no session with capacity
- **THEN** the occupancy line SHALL break at July instead of dropping to 0

### Requirement: Operación tables
Row 4 SHALL render two tables side by side from `lg`:
- **"Reservas por disciplina"** — columns **Disciplina, Entrenamientos, Reservas, % Ocupación promedio, % Asistencia promedio** from `bookingByDiscipline[]` (`trainingCount`, `validBookingCount`, `averageOccupancyPercent`, `averageAttendancePercent`).
- **"Reservas por tipo de entrenamiento"** — the same columns with the first column **Tipo**, from `bookingByPublicStatus[]`, with exactly two rows labelled **"Público"** (published to the marketplace, `es_publico`) and **"Privado"**, in that order.

Null percentages SHALL render "Sin capacidad" (occupancy) or "Sin datos" (attendance).

Row 5 SHALL render, side by side from `lg`:
- **"Atletas con más reservas"** — top 10 by valid bookings in range, desc (`topAthletesByBookings`).
- **"Atletas con menos reservas"** — 10 active athletes with the fewest valid bookings in range, **including athletes with 0 bookings**, asc then name (`bottomAthletesByBookings`).
Both SHALL have the columns **#, Atleta, Reservas, Asistencias**.

Row 6 SHALL keep "Próximas sesiones con alta ocupación" unchanged, at full width.

#### Scenario: Public/private labels
- **WHEN** the type table renders
- **THEN** it SHALL show the rows "Público" and "Privado" and no English labels

#### Scenario: Athletes without bookings
- **WHEN** 4 active athletes have no bookings in range
- **THEN** they SHALL be the first rows of "Atletas con menos reservas", with Reservas 0

#### Scenario: Top 10
- **WHEN** 30 athletes booked in range
- **THEN** "Atletas con más reservas" SHALL list exactly 10

### Requirement: Equipo counts athletes only
Every figure in the Equipo tab SHALL consider only athletes (`bi.fct_miembros.es_atleta`):
- The status cards SHALL show `team.membersByStatus` (keys `activo`, `mora`, `suspendido`, `inactivo`, `pendiente_activacion`), counting athlete memberships only, with the Spanish labels Activos, En mora, Suspendidos, Inactivos, Pendientes de activación.
- **"Atletas activos por plan"** SHALL list `team.activeAthletesByPlan[]` (`planName`, `athleteCount`): active athletes with an active subscription (`bi.fct_suscripciones.es_activa`), grouped by plan name, ordered by count desc then name, with columns **Plan, Atletas**. An athlete with active subscriptions in two plans counts in both.
- **"Cobertura de suscripciones"**: unchanged.
- **"Atletas activos sin suscripción"** SHALL list `team.membersWithoutSubscription[]` (max 25) with columns **Atleta, Estado, Última reserva, Última suscripción**:
  - `latestBookingDate`: the latest `fct_reservas.fecha_sesion_analitica` of the athlete's non-cancelled bookings in the tenant (any date); "Sin reservas" when none.
  - `latestSubscriptionDate`: the latest `fct_suscripciones.fecha_venta_analitica` of the athlete in the tenant (any state); "Sin suscripciones" when none.
  - Dates SHALL render as "d mmm yyyy" (es-CO).
  - Ordering stays: `latestBookingDate` asc with nulls first, then name.

#### Scenario: Staff excluded
- **WHEN** a tenant has 3 active administrators, 4 active trainers and 73 active athletes
- **THEN** the "Activos" card SHALL show 73

#### Scenario: Grouped by plan
- **WHEN** active athletes hold active subscriptions to "Mensual" (5) and "Trimestral" (2), both of plan type "Básico"
- **THEN** the table SHALL show two rows, "Mensual 5" and "Trimestral 2", not one "Básico 7" row

#### Scenario: Last subscription shown
- **WHEN** an active athlete without an active subscription had a subscription sold on 2026-05-10 that is now `vencida`
- **THEN** their row SHALL show Última suscripción "10 may 2026"

### Requirement: Detail-tab RPC fields
`get_tenant_bi_dashboard` SHALL provide, in addition to the fields defined by `analitica-resumen-dashboard`:
- `revenue.averageMonthlyRevenue`, `revenue.monthToDateRevenue`; `revenueByPlan[]`, `revenueByPaymentMethod[]` and `topAthletesByRevenue[]` with `subscriptionCount`, `paymentCount`, `totalRevenue`, `recognizedRevenue` and `pendingRevenue` over validated + pending payments in range.
- `subscriptions.monthlySold[].withValidatedPaymentCount` and `.withoutValidatedPaymentCount`.
- `operations.averageMonthlyTrainings`, `operations.averageMonthlyBookings`; `monthlyBookingAverage[].averageOccupancyPercent` and `.averageAttendancePercent` (nullable); `bookingByDiscipline[]` and `bookingByPublicStatus[]` with `trainingCount`, `averageOccupancyPercent` and `averageAttendancePercent`; `bookingByPublicStatus[].label` "Público" / "Privado"; `topAthletesByBookings` with up to 10 rows; `bottomAthletesByBookings[]` (`athleteId`, `athleteName`, `validBookingCount`, `attendanceCount`), up to 10 rows.
- `team.membersByStatus` over athletes only; `team.activeAthletesByPlan[]`; `team.membersWithoutSubscription[].latestSubscriptionDate`, and `latestBookingDate` as defined above.

Fields used by Resumen (`totalRevenue`, `recognizedRevenue`, `pendingPaymentAmount`, `pendingPaymentCount`, `monthlyRevenue`, `scheduledTrainingCount`, `averageBookingsPerTraining`, `averageOccupancyPercent`, `averageAttendancePercent`, `monthlyBookingAverage[].averageBookingsPerTraining`, `bookingByDiscipline[].validBookingCount`, `activeAthleteCount`, `activeAthletesWithoutSubscriptionCount`, `subscriptions.soldCount/monthlySold[].subscriptionCount/soldByPlan`) MUST keep their values.

#### Scenario: Resumen values preserved
- **WHEN** the RPC is called for the same tenant and range before and after the migration
- **THEN** every Resumen field listed above SHALL be equal

#### Scenario: Revenue tables add up
- **WHEN** the RPC returns for any range
- **THEN** `Σ revenueByPlan.totalRevenue = Σ revenueByPaymentMethod.totalRevenue = revenue.totalRevenue`
