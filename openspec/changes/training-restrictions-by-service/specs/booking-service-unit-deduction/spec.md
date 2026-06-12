## ADDED Requirements

### Requirement: Atomic multi-service unit deduction on booking
The system SHALL deduct exactly 1 unit from `suscripcion_servicios.unidades_restantes` for **every** non-null service slot in the matched restriction row when a booking is confirmed. All deductions and the `reservas` INSERT MUST execute atomically inside the `book_and_deduct_service_units` SECURITY DEFINER function. The function SHALL accept a `p_deductions jsonb` array of `{"suscripcion_id": "…", "servicio_id": "…"}` objects. An empty array means no deductions. The function SHALL pre-validate all services before performing any write; if any service has `unidades_restantes = 0`, it SHALL raise `'UNIDADES_AGOTADAS'` (ERRCODE P0001) without modifying any row.

#### Scenario: All services deducted atomically on booking
- **WHEN** an athlete books a training whose matched restriction row requires Service A and Service B, and both have available units in the athlete's active subscriptions
- **THEN** `suscripcion_servicios.unidades_restantes` is decremented by 1 for Service A and by 1 for Service B in a single database transaction, and the `reservas` row is created

#### Scenario: Pre-validation blocks booking when any service is exhausted
- **WHEN** an athlete attempts to book and the matched restriction row requires Service A (1 unit) and Service B (0 units)
- **THEN** `book_and_deduct_service_units` raises `UNIDADES_AGOTADAS` before writing anything; no `reservas` row is inserted and Service A's `unidades_restantes` is unchanged

#### Scenario: Empty deductions array creates booking without deduction
- **WHEN** `book_and_deduct_service_units` is called with `p_deductions = '[]'`
- **THEN** the `reservas` row is inserted with `estado = 'confirmada'` and no `suscripcion_servicios` row is modified

#### Scenario: Unlimited service (unidades_restantes IS NULL) is logged but not decremented
- **WHEN** the athlete's subscription for a required service has `unidades_restantes IS NULL`
- **THEN** no decrement occurs for that service and the booking proceeds; a `reserva_servicios` row is still inserted with `suscripcion_id = NULL` for traceability

---

### Requirement: `reserva_servicios` ledger table
The system SHALL maintain a `reserva_servicios(id, reserva_id, suscripcion_id, servicio_id, created_at)` table recording every `(suscripcion_id, servicio_id)` pair associated with each booking. `suscripcion_id` is nullable to accommodate unlimited-service rows. A UNIQUE constraint on `(reserva_id, servicio_id)` SHALL prevent duplicate entries. `ON DELETE CASCADE` on `reserva_id` SHALL remove ledger rows when a reservation is hard-deleted. No direct INSERT/UPDATE/DELETE on this table SHALL be granted to the `authenticated` role; all writes go through SECURITY DEFINER RPCs.

#### Scenario: Ledger row inserted per deducted service
- **WHEN** a booking deducts units from services A and B
- **THEN** two rows exist in `reserva_servicios` for that `reserva_id`, one per service

#### Scenario: Ledger row inserted for unlimited service with null suscripcion_id
- **WHEN** a booking includes an unlimited-service slot
- **THEN** a `reserva_servicios` row is inserted with `suscripcion_id = NULL` and the correct `servicio_id`

#### Scenario: Authenticated role cannot directly insert into reserva_servicios
- **WHEN** an authenticated user issues a direct INSERT to `reserva_servicios`
- **THEN** the operation is rejected by RLS; only the SECURITY DEFINER RPCs may write to the table

---

### Requirement: Multi-service unit restoration on cancellation
The system SHALL atomically restore 1 unit to `suscripcion_servicios.unidades_restantes` for each finite-unit ledger entry in `reserva_servicios` when a booking is cancelled, via the `cancel_and_restore_service_units(p_reserva_id, p_tenant_id)` SECURITY DEFINER function. The function SHALL mark the reservation cancelled, iterate `reserva_servicios` for that `reserva_id`, increment `unidades_restantes` for each row where `suscripcion_id IS NOT NULL` and `unidades_restantes IS NOT NULL` (skip unlimited rows), then delete the `reserva_servicios` rows. All operations MUST execute in a single transaction.

#### Scenario: All finite-unit services restored on cancellation
- **WHEN** an athlete cancels a booking that deducted units from services A and B (both finite)
- **THEN** `unidades_restantes` is incremented by 1 for both services and `reserva_servicios` rows for that booking are deleted, in one transaction

#### Scenario: Unlimited service row skipped during restoration
- **WHEN** a booking is cancelled and its `reserva_servicios` ledger contains a row with `suscripcion_id = NULL`
- **THEN** no `suscripcion_servicios` row is modified for that entry; the ledger row is still deleted

#### Scenario: Cancellation succeeds when reserva_servicios is empty
- **WHEN** a booking with no `reserva_servicios` rows (e.g. unrestricted training) is cancelled
- **THEN** the reservation is marked cancelled and no `suscripcion_servicios` rows are touched

#### Scenario: Cancellation and restoration are atomic
- **WHEN** `cancel_and_restore_service_units` executes
- **THEN** the `UPDATE reservas`, all `UPDATE suscripcion_servicios` increments, and `DELETE FROM reserva_servicios` all succeed or all are rolled back; no partial state is persisted

---

### Requirement: Booking rejection when any required service has no available units
The system SHALL reject a booking with rejection code `UNIDADES_AGOTADAS` when `findServiceSubscriptionsToCharge` returns `exhausted: true` for any service in the matched restriction row. No reservation SHALL be created and no units SHALL be deducted.

#### Scenario: Exhausted service blocks booking before RPC call
- **WHEN** `findServiceSubscriptionsToCharge` returns `exhausted: true` for any service
- **THEN** the service layer returns a `BookingResult` with `code = 'UNIDADES_AGOTADAS'` without calling the RPC, and no DB writes occur

#### Scenario: UNIDADES_AGOTADAS message is shown to the athlete
- **WHEN** the booking modal receives `code = 'UNIDADES_AGOTADAS'`
- **THEN** a human-readable error is displayed: `"No te quedan unidades disponibles de uno o más servicios requeridos para este entrenamiento."`

---

### Requirement: SECURITY DEFINER RPCs for service unit management
The service unit deduction and restoration operations MUST be implemented as `SECURITY DEFINER` Postgres functions (`book_and_deduct_service_units` and `cancel_and_restore_service_units`). No direct `UPDATE` privilege on `suscripcion_servicios` or `reserva_servicios` SHALL be granted to the `authenticated` role for this feature. Both functions MUST be granted `EXECUTE` to `authenticated`. Both functions MUST use `SET search_path = public`.

#### Scenario: RLS surface for suscripcion_servicios is unchanged
- **WHEN** the migration for this feature is applied
- **THEN** no new `UPDATE` or `INSERT` RLS policy is added to `public.suscripcion_servicios` for the `authenticated` role

#### Scenario: Unauthenticated caller cannot invoke the RPCs
- **WHEN** an unauthenticated request calls `book_and_deduct_service_units` or `cancel_and_restore_service_units`
- **THEN** the RPC is not executed and the caller receives an authorization error
