## MODIFIED Requirements

### Requirement: Detail-tab RPC fields
`get_tenant_bi_dashboard` SHALL provide, in addition to the fields defined by `analitica-resumen-dashboard`:
- `revenue.averageMonthlyRevenue`, `revenue.monthToDateRevenue`; `revenueByPlan[]`, `revenueByPaymentMethod[]` and `topAthletesByRevenue[]` with `subscriptionCount`, `paymentCount`, `totalRevenue`, `recognizedRevenue` and `pendingRevenue` over validated + pending payments in range.
- `subscriptions.monthlySold[].withValidatedPaymentCount` and `.withoutValidatedPaymentCount`.
- `operations.averageMonthlyTrainings`, `operations.averageMonthlyBookings`; `monthlyBookingAverage[].averageOccupancyPercent` and `.averageAttendancePercent` (nullable); `bookingByDiscipline[]` with `trainingCount`, `averageOccupancyPercent` and `averageAttendancePercent`; `topAthletesByBookings` with up to 10 rows; `bottomAthletesByBookings[]` (`athleteId`, `athleteName`, `validBookingCount`, `attendanceCount`), up to 10 rows.
- `team.membersByStatus` over athletes only; `team.activeAthletesByPlan[]`; `team.membersWithoutSubscription[].latestSubscriptionDate`, and `latestBookingDate` as defined above.

The RPC result SHALL NOT contain `bookingByPublicStatus`, and the `bi` schema SHALL NOT expose an `es_publico` column (US-0124).

Fields used by Resumen (`totalRevenue`, `recognizedRevenue`, `pendingPaymentAmount`, `pendingPaymentCount`, `monthlyRevenue`, `scheduledTrainingCount`, `averageBookingsPerTraining`, `averageOccupancyPercent`, `averageAttendancePercent`, `monthlyBookingAverage[].averageBookingsPerTraining`, `bookingByDiscipline[].validBookingCount`, `activeAthleteCount`, `activeAthletesWithoutSubscriptionCount`, `subscriptions.soldCount/monthlySold[].subscriptionCount/soldByPlan`) MUST keep their values.

#### Scenario: Resumen values preserved
- **WHEN** the RPC is called for the same tenant and range before and after the migration
- **THEN** every Resumen field listed above SHALL be equal

#### Scenario: Revenue tables add up
- **WHEN** the RPC returns for any range
- **THEN** `Σ revenueByPlan.totalRevenue = Σ revenueByPaymentMethod.totalRevenue = revenue.totalRevenue`

#### Scenario: No public/private breakdown
- **WHEN** the RPC returns for any tenant and range
- **THEN** `operations` SHALL NOT contain a `bookingByPublicStatus` key

### Requirement: Operación tables
Row 4 SHALL render one table at full width:
- **"Reservas por disciplina"** — columns **Disciplina, Entrenamientos, Reservas, % Ocupación promedio, % Asistencia promedio** from `bookingByDiscipline[]` (`trainingCount`, `validBookingCount`, `averageOccupancyPercent`, `averageAttendancePercent`).
The "Reservas por tipo de entrenamiento" table SHALL NOT be rendered (US-0124), and the row SHALL NOT leave an empty grid cell.

Null percentages SHALL render "Sin capacidad" (occupancy) or "Sin datos" (attendance).

Row 5 SHALL render, side by side from `lg`:
- **"Atletas con más reservas"** — top 10 by valid bookings in range, desc (`topAthletesByBookings`).
- **"Atletas con menos reservas"** — 10 active athletes with the fewest valid bookings in range, **including athletes with 0 bookings**, asc then name (`bottomAthletesByBookings`).
Both SHALL have the columns **#, Atleta, Reservas, Asistencias**.

Row 6 SHALL keep "Próximas sesiones con alta ocupación" unchanged, at full width.

#### Scenario: No training-type table
- **WHEN** the Operación tab renders
- **THEN** no "Reservas por tipo de entrenamiento" panel SHALL be shown and "Reservas por disciplina" SHALL span the full row

#### Scenario: Athletes without bookings
- **WHEN** 4 active athletes have no bookings in range
- **THEN** they SHALL be the first rows of "Atletas con menos reservas", with Reservas 0

#### Scenario: Top 10
- **WHEN** 30 athletes booked in range
- **THEN** "Atletas con más reservas" SHALL list exactly 10
