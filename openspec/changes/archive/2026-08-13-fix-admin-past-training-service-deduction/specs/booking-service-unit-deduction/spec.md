## ADDED Requirements

### Requirement: Date-aware service-unit entitlement eligibility

When resolving which of an athlete's `suscripcion_servicios` rows are eligible to satisfy or be charged for a training's required services, the system SHALL evaluate eligibility **as of the training's date** (`referenceDate`, the local calendar date derived from `entrenamientos.fecha_hora`, or "today" if `fecha_hora IS NULL`), not the subscription's status at the time the booking is created. A `suscripcion_servicios` row, via its parent `suscripciones` row, is eligible if and only if:

- `suscripciones.estado <> 'cancelada'`, **and**
- `suscripciones.fecha_inicio IS NULL OR suscripciones.fecha_inicio <= referenceDate`, **and**
- `suscripciones.fecha_fin IS NULL OR suscripciones.fecha_fin >= referenceDate`

This eligibility rule SHALL be applied consistently by both the admin-bypass matched-restriction-row resolution and `findServiceSubscriptionsToCharge`. A subscription whose `estado` has been automatically transitioned to `'vencida'` by `vencer_suscripciones_expiradas` (because `fecha_fin < CURRENT_DATE`) but whose `[fecha_inicio, fecha_fin]` window covered `referenceDate` at the time of the training SHALL remain eligible.

#### Scenario: Admin booking on a past training deducts from a subscription now expired by the cron
- **WHEN** an administrator creates a booking for an athlete on a past training, and the athlete had a subscription whose `[fecha_inicio, fecha_fin]` window covered the training's date with `unidades_restantes > 0` for the required service, but `suscripciones.estado` is now `'vencida'` (expired by the daily cron since the training occurred)
- **THEN** the booking is created, a `reserva_servicios` row is inserted linking the reservation to that `suscripcion_id` and `servicio_id`, and `suscripcion_servicios.unidades_restantes` for that row is decremented by exactly 1

#### Scenario: Admin is not prompted to confirm a no-units booking when a date-eligible subscription exists
- **WHEN** the scenario above applies (a `'vencida'` subscription whose date window covers the training's date and has available units for the required service)
- **THEN** the matched restriction row resolves on the first pass and the admin is not shown the `ADMIN_CONFIRM_NO_UNITS` prompt

#### Scenario: Exhausted date-eligible subscription still blocks the booking
- **WHEN** the only subscription whose date window covers the training's date for the required service has `suscripcion_servicios.unidades_restantes = 0`
- **THEN** the booking is rejected with `UNIDADES_AGOTADAS` (or surfaces via the existing `ADMIN_CONFIRM_NO_UNITS` confirmation flow as appropriate), and no unit is decremented from any subscription

#### Scenario: No subscription covers the training's date for the required service
- **WHEN** no subscription (active, expired, or otherwise) has a `[fecha_inicio, fecha_fin]` window covering the training's date for a required service
- **THEN** behavior is unchanged from today: the matched restriction row is not found, and if it has service slots, the admin sees `ADMIN_CONFIRM_NO_UNITS`; confirming creates the booking with no deduction

#### Scenario: Cancelled subscription is never eligible regardless of date
- **WHEN** a subscription has `estado = 'cancelada'`, even if its `[fecha_inicio, fecha_fin]` window covers the training's date
- **THEN** that subscription's `suscripcion_servicios` rows are excluded from entitlement resolution, and the booking behaves as if no subscription covers that service for that date

#### Scenario: Present/future booking entitlement resolution is unchanged
- **WHEN** an athlete or administrator books a present or future training
- **THEN** the set of services considered "available" via the date-aware entitlement check is identical to the previous `estado = 'activa'`-based check, for both the athlete and admin booking paths

#### Scenario: Cancellation restores units to the subscription that was charged, even if now expired
- **WHEN** a reservation that was charged against a subscription per the date-aware eligibility rule (and whose `suscripciones.estado` is now `'vencida'`) is cancelled
- **THEN** `cancel_and_restore_service_units` restores 1 unit to that subscription's `suscripcion_servicios.unidades_restantes` and removes the corresponding `reserva_servicios` ledger row, exactly as it does for non-retroactive bookings

#### Scenario: Training with no scheduled date falls back to today
- **WHEN** a training's `entrenamientos.fecha_hora` is `NULL`
- **THEN** `referenceDate` falls back to the current local date for entitlement resolution, and booking creation does not error
