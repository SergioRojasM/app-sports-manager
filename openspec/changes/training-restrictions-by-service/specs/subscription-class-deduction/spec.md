## MODIFIED Requirements

### Requirement: Service unit deduction on service-restricted booking
The system SHALL automatically decrement `suscripcion_servicios.unidades_restantes` by exactly 1 for **each** required service in the matched restriction row when a booking is confirmed and all of the following conditions are true: (1) the training has at least one `entrenamiento_restricciones` row and a restriction row passes, (2) that row has one or more non-null `servicio_X_id` slots, (3) the athlete has an active subscription (`estado = 'activa'`) with an available unit for each required service. If `unidades_restantes IS NULL` (unlimited service), the booking MUST proceed without any deduction for that service. All deductions and the reservation INSERT MUST execute atomically inside the `book_and_deduct_service_units` Postgres function via a JSONB deductions array.

#### Scenario: Service-based subscription is decremented on booking
- **WHEN** an athlete books a training whose matched restriction row requires service S and their active subscription for S has `unidades_restantes = N` where N > 0
- **THEN** the booking is created with `estado = 'confirmada'` and `suscripcion_servicios.unidades_restantes` for S is decremented to `N − 1` in the same database transaction

#### Scenario: Multiple services all decremented on booking
- **WHEN** the matched restriction row requires services A and B, both with available units
- **THEN** both `suscripcion_servicios.unidades_restantes` for A and for B are decremented by 1 in the same transaction

#### Scenario: Unlimited service books without deduction
- **WHEN** an athlete books a service-restricted training and their matching active subscription for a required service has `unidades_restantes IS NULL`
- **THEN** the booking is created successfully and `suscripcion_servicios.unidades_restantes` remains NULL (unchanged) for that service

#### Scenario: No restriction rows — no deduction occurs
- **WHEN** an athlete books a training with no `entrenamiento_restricciones` rows
- **THEN** the booking is created successfully and no `suscripcion_servicios` row is modified

#### Scenario: Deduction atomicity — booking and all decrements are one unit
- **WHEN** the `book_and_deduct_service_units` RPC executes
- **THEN** all `UPDATE suscripcion_servicios` decrements and the `INSERT reservas` succeed or all are rolled back; no intermediate state is persisted

---

### Requirement: Booking rejection when service unit balance is zero
The system SHALL reject a booking attempt with rejection code `UNIDADES_AGOTADAS` when the athlete's active subscription for any required service has `unidades_restantes = 0`. No reservation record SHALL be created and no `suscripcion_servicios.unidades_restantes` SHALL be modified.

#### Scenario: Zero-balance service subscription blocks booking
- **WHEN** an athlete attempts to book a service-restricted training and their active subscription for the required service has `unidades_restantes = 0`
- **THEN** the booking is rejected, no `reservas` row is inserted, and a `BookingResult` with `code = 'UNIDADES_AGOTADAS'` is returned to the caller

#### Scenario: Concurrent booking race is resolved safely
- **WHEN** two athletes simultaneously attempt to book the same training requiring service S and one subscription entry has `unidades_restantes = 1`
- **THEN** exactly one booking succeeds and `unidades_restantes` is decremented to 0; the second caller's transaction is rolled back and an `UNIDADES_AGOTADAS` rejection is returned

#### Scenario: UNIDADES_AGOTADAS message is displayed in the booking form
- **WHEN** the `ReservaFormModal` receives a `BookingResult` with `code = 'UNIDADES_AGOTADAS'`
- **THEN** the modal displays a human-readable inline error: `"No te quedan unidades disponibles de uno o más servicios requeridos para este entrenamiento."`

---

### Requirement: Service deductions tracked on reservation via reserva_servicios
The system SHALL store each `(suscripcion_id, servicio_id)` pair deducted for a booking in the `reserva_servicios` table. `suscripcion_id` is nullable to accommodate unlimited-service rows. When no service was deducted, no `reserva_servicios` rows are created. The `reserva_servicios` table has `ON DELETE CASCADE` on `reserva_id`. The legacy `suscripcion_id` column on `reservas` remains but deductions are now tracked per-service in `reserva_servicios`.

#### Scenario: reserva_servicios rows created per deducted service
- **WHEN** a booking deducts units from services A and B
- **THEN** two rows exist in `reserva_servicios` for that `reserva_id`, one per service, each with the corresponding `suscripcion_id`

#### Scenario: reserva_servicios row created with null suscripcion_id for unlimited service
- **WHEN** a booking includes an unlimited-service slot
- **THEN** a `reserva_servicios` row is inserted with `suscripcion_id = NULL` and the correct `servicio_id`

#### Scenario: No reserva_servicios rows when no deduction
- **WHEN** a booking is created for a training with no restriction rows
- **THEN** no `reserva_servicios` rows are created for that `reserva_id`

---

### Requirement: Service unit restoration on booking cancellation
The system SHALL atomically restore 1 unit to `suscripcion_servicios.unidades_restantes` for each finite-unit ledger entry in `reserva_servicios` when a booking is cancelled via the `cancel_and_restore_service_units(p_reserva_id, p_tenant_id)` SECURITY DEFINER function. The function requires only `reserva_id` and `tenant_id` — it reads `reserva_servicios` internally to determine what to restore. If `reserva_servicios` is empty for the booking, cancellation still succeeds with no restoration.

#### Scenario: Units restored on athlete self-cancellation
- **WHEN** an athlete cancels their own booking and `reserva_servicios` contains rows for services A and B
- **THEN** `suscripcion_servicios.unidades_restantes` for both A and B is incremented by 1 and the reservation is marked cancelled in the same transaction

#### Scenario: Units restored on admin/coach cancellation
- **WHEN** an administrator or entrenador cancels a booking that has `reserva_servicios` entries
- **THEN** `suscripcion_servicios.unidades_restantes` is incremented for each finite-unit service and the reservation is marked cancelled atomically

#### Scenario: No restoration when reserva_servicios is empty
- **WHEN** a booking with no `reserva_servicios` rows is cancelled
- **THEN** the reservation is marked cancelled and no `suscripcion_servicios` row is modified

#### Scenario: Cancellation succeeds even if subscription was deleted
- **WHEN** a booking's `reserva_servicios` entry references a `suscripcion_id` that no longer exists (`ON DELETE SET NULL`)
- **THEN** the reservation is marked cancelled successfully; the restoration UPDATE finds no row and silently skips (no error raised)

#### Scenario: Cancellation and unit restoration are atomic
- **WHEN** `cancel_and_restore_service_units` executes
- **THEN** the `UPDATE reservas`, all `UPDATE suscripcion_servicios` increments, and `DELETE FROM reserva_servicios` all succeed or all are rolled back

---

### Requirement: Subscription selection strategy — lowest balance first
When finding the subscription to charge for a given service, the system SHALL select the active subscription with available units for that service with the lowest `unidades_restantes > 0`, ordered `ASC LIMIT 1`. This maximises utilisation of subscriptions already partially consumed.

#### Scenario: Multiple active subscriptions for same service — lowest balance charged first
- **WHEN** an athlete has two active subscriptions that both cover service S with `unidades_restantes = 2` and `unidades_restantes = 5`
- **THEN** the subscription with `unidades_restantes = 2` is charged and its entry appears in `reserva_servicios`

---

### Requirement: SECURITY DEFINER RPCs for service unit management
The service unit deduction and restoration operations MUST be implemented as `SECURITY DEFINER` Postgres functions (`book_and_deduct_service_units` and `cancel_and_restore_service_units`). No `UPDATE` privilege on `suscripcion_servicios` or direct write privilege on `reserva_servicios` SHALL be granted to the `authenticated` role solely for this feature. Both functions MUST be granted `EXECUTE` to `authenticated` and MUST use `SET search_path = public`.

#### Scenario: RLS surface for suscripcion_servicios is unchanged
- **WHEN** the migration for this feature is applied
- **THEN** no new `UPDATE` or `INSERT` RLS policy is added to `public.suscripcion_servicios` for the `authenticated` role; all modifications go through the RPC functions

#### Scenario: Unauthenticated caller cannot invoke the RPCs
- **WHEN** an unauthenticated request calls `book_and_deduct_service_units` or `cancel_and_restore_service_units`
- **THEN** the RPC is not executed and the caller receives an authorization error

## REMOVED Requirements

### Requirement: Class deduction on plan-restricted booking
**Reason**: Replaced by service unit deduction (`book_and_deduct_service_units`). The `book_and_deduct_class` RPC remains in the DB schema for now but is no longer called by the application layer. It will be dropped in a future clean-up US.
**Migration**: No data migration needed. `suscripciones.clases_restantes` remains in the schema but is no longer decremented by the booking flow.

### Requirement: Booking rejection when class balance is zero
**Reason**: Replaced by `UNIDADES_AGOTADAS` rejection based on `suscripcion_servicios.unidades_restantes`.
**Migration**: The rejection code changes from `CLASES_AGOTADAS` to `UNIDADES_AGOTADAS`. UI error message is updated accordingly.

### Requirement: Subscription ID tracked on reservation
**Reason**: Replaced by the `reserva_servicios` ledger which tracks `(reserva_id, suscripcion_id, servicio_id)` per deducted service. The `reservas.suscripcion_id` column remains but is no longer written by the new booking RPC.
**Migration**: Existing rows with `suscripcion_id` populated are unaffected. New bookings will have `suscripcion_id = NULL`; deduction tracking moves to `reserva_servicios`.

### Requirement: Class restoration on booking cancellation
**Reason**: Replaced by multi-service restoration via `cancel_and_restore_service_units`. The `cancel_and_restore_class` RPC remains in the DB schema but is no longer called.
**Migration**: Historical bookings created before this change had their class deduction tracked via `reservas.suscripcion_id`. Those bookings' cancellation will call `cancel_and_restore_service_units` which will find an empty `reserva_servicios` and skip restoration — the old `clases_restantes` balance will not be restored for historical bookings. This is an acceptable trade-off.
