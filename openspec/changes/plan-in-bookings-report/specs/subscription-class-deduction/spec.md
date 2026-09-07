## ADDED Requirements

### Requirement: Consumption ledger records the subscription for unlimited entitlements
When a booking's required service is covered by an entitlement with unlimited units (`suscripcion_servicios.unidades_restantes IS NULL`), the system SHALL still record the covering subscription's id on the resulting `reserva_servicios` row, where it previously recorded `NULL`. `findServiceSubscriptionsToCharge` SHALL always emit the resolved `suscripcionId` in the deductions payload. Recording the link SHALL NOT cause any unit deduction: `book_and_deduct_service_units` independently re-reads `unidades_restantes IS NULL` from `suscripcion_servicios` and skips the update on that basis. No schema migration is required for this behavior.

#### Scenario: Unlimited-plan booking records the subscription without deducting
- **WHEN** an athlete books a training whose required service is covered by an unlimited entitlement on subscription S
- **THEN** the created `reserva_servicios` row has `suscripcion_id = S.id`, and `suscripcion_servicios.unidades_restantes` for that service remains `NULL`

#### Scenario: Unlimited-plan booking is attributable in the report
- **WHEN** the bookings report is queried for a booking covered by an unlimited plan created after this change
- **THEN** `plan_nombre`, `plan_fecha_inicio` and `plan_fecha_fin` are populated from subscription S

#### Scenario: Finite-plan deduction is unchanged
- **WHEN** an athlete books a training whose required services are covered by finite entitlements
- **THEN** exactly one unit is deducted per required service, with no double or extra deduction

#### Scenario: Historical unlimited bookings are not backfilled
- **WHEN** a booking created against an unlimited entitlement before this change is queried
- **THEN** its `reserva_servicios.suscripcion_id` remains `NULL` and the report shows no plan for it

---

### Requirement: Cancellation still restores units and clears the plan link
Cancelling a booking SHALL continue to restore service units through `cancel_and_restore_service_units`, which deletes the booking's `reserva_servicios` rows. As an accepted consequence, a cancelled booking SHALL report no plan in the bookings report.

#### Scenario: Cancellation restores units
- **WHEN** a booking that deducted finite units is cancelled
- **THEN** the deducted units are restored to the originating subscription exactly as before this change

#### Scenario: Cancelled booking reports no plan
- **WHEN** a cancelled booking is viewed in the bookings report
- **THEN** its plan columns are `NULL` and the table cell renders `—`
