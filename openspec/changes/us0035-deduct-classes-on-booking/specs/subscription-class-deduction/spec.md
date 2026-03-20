## ADDED Requirements

### Requirement: Class deduction on plan-restricted booking
The system SHALL automatically decrement `suscripciones.clases_restantes` by exactly 1 when a booking is confirmed and all of the following conditions are true: (1) the training has at least one `entrenamiento_restricciones` row with a non-null `plan_id`, (2) the athlete has an active subscription (`estado = 'activa'`) to that plan, and (3) that subscription has `clases_restantes IS NOT NULL AND clases_restantes > 0`. If `clases_restantes IS NULL` (unlimited plan), the booking MUST proceed without any deduction. The deduction and the reservation INSERT MUST execute atomically inside the `book_and_deduct_class` Postgres function.

#### Scenario: Class-based subscription is decremented on booking
- **WHEN** an athlete books a training that requires plan P and their active subscription to plan P has `clases_restantes = N` where N > 0
- **THEN** the booking is created with `estado = 'confirmada'` and `suscripciones.clases_restantes` is decremented to `N − 1` in the same database transaction

#### Scenario: Unlimited subscription books without deduction
- **WHEN** an athlete books a plan-restricted training and their matching active subscription has `clases_restantes IS NULL`
- **THEN** the booking is created successfully and `suscripciones.clases_restantes` remains NULL (unchanged)

#### Scenario: No plan restriction — no deduction occurs
- **WHEN** an athlete books a training with no `entrenamiento_restricciones` rows specifying a `plan_id`
- **THEN** the booking is created successfully and no subscription's `clases_restantes` is modified

#### Scenario: Deduction atomicity — booking and decrement are one unit
- **WHEN** the `book_and_deduct_class` RPC executes
- **THEN** both the `UPDATE suscripciones` decrement and the `INSERT reservas` succeed or both are rolled back; no intermediate state (class deducted without booking, or booking without deduction) is persisted

---

### Requirement: Booking rejection when class balance is zero
The system SHALL reject a booking attempt with rejection code `CLASES_AGOTADAS` when the athlete's active subscription to the required plan has `clases_restantes = 0`. No reservation record SHALL be created and `clases_restantes` SHALL NOT be modified.

#### Scenario: Zero-balance subscription blocks booking
- **WHEN** an athlete attempts to book a plan-restricted training and their active subscription to the required plan has `clases_restantes = 0`
- **THEN** the booking is rejected, no `reservas` row is inserted, and a `BookingResult` with `code = 'CLASES_AGOTADAS'` is returned to the caller

#### Scenario: Concurrent booking race is resolved safely
- **WHEN** two athletes simultaneously attempt to book the same training that requires plan P and one subscription has `clases_restantes = 1`
- **THEN** exactly one booking succeeds and `clases_restantes` is decremented to 0; the second caller's `book_and_deduct_class` transaction is rolled back and a `CLASES_AGOTADAS` rejection is returned

#### Scenario: CLASES_AGOTADAS message is displayed in the booking form
- **WHEN** the `ReservaFormModal` receives a `BookingResult` with `code = 'CLASES_AGOTADAS'`
- **THEN** the modal displays a human-readable inline error: `"No te quedan clases disponibles en tu suscripción al plan requerido. Contacta al administrador para renovar o ampliar tu plan."`

---

### Requirement: Subscription ID tracked on reservation
The system SHALL store the ID of the subscription that was charged in `reservas.suscripcion_id` at booking creation time. When no class was deducted, `reservas.suscripcion_id` MUST remain `NULL`. The column SHALL be a nullable FK to `suscripciones(id)` with `ON DELETE SET NULL`.

#### Scenario: suscripcion_id populated on class-based booking
- **WHEN** a booking is created and a class is deducted from subscription S
- **THEN** `reservas.suscripcion_id = S.id` on the new reservation row

#### Scenario: suscripcion_id is NULL when no deduction
- **WHEN** a booking is created without class deduction (no plan restriction or unlimited plan)
- **THEN** `reservas.suscripcion_id IS NULL` on the new reservation row

#### Scenario: Subscription deletion does not cascade-delete reservations
- **WHEN** a subscription that has associated reservation rows is deleted
- **THEN** `ON DELETE SET NULL` sets `reservas.suscripcion_id = NULL` on affected rows; the reservations are NOT deleted

---

### Requirement: Class restoration on booking cancellation
The system SHALL atomically restore 1 class to the subscription identified by `reservas.suscripcion_id` when a booking is cancelled. Both the reservation status update and the class restoration MUST execute inside the `cancel_and_restore_class` Postgres function as a single transaction. If `suscripcion_id IS NULL`, no restoration is performed. If the linked subscription no longer exists, the cancellation MUST still succeed and the restoration is silently skipped.

#### Scenario: Class is restored on athlete self-cancellation
- **WHEN** an athlete cancels their own booking and `reservas.suscripcion_id` is set to subscription S
- **THEN** `suscripciones.clases_restantes` for S is incremented by 1 and `reservas.estado` is set to `'cancelada'` in the same transaction

#### Scenario: Class is restored on admin/coach cancellation
- **WHEN** an administrator or entrenador cancels a booking that has `suscripcion_id` set
- **THEN** `suscripciones.clases_restantes` is incremented by 1 and the reservation is marked cancelled atomically

#### Scenario: No restoration when suscripcion_id is NULL
- **WHEN** a booking with `suscripcion_id IS NULL` is cancelled
- **THEN** the reservation is marked cancelled and no subscription is modified

#### Scenario: Cancellation succeeds even if subscription was deleted
- **WHEN** a booking's linked subscription has been deleted (suscripcion_id points to a non-existent row)
- **THEN** the reservation is marked cancelled successfully and the class restoration is silently skipped (no error raised)

#### Scenario: Cancellation and class restoration are atomic
- **WHEN** `cancel_and_restore_class` RPC executes
- **THEN** both the `UPDATE reservas` (estado = 'cancelada') and the `UPDATE suscripciones` (clases_restantes + 1) succeed or both are rolled back; no reservation is left cancelled without a corresponding class restoration

---

### Requirement: Subscription selection strategy — lowest balance first
When finding the subscription to charge, the system SHALL select the active subscription matching the required plan with the lowest `clases_restantes > 0`, ordered `ASC LIMIT 1`. This maximises utilisation of subscriptions already partially consumed.

#### Scenario: Multiple active subscriptions — lowest balance charged first
- **WHEN** an athlete has two active subscriptions to the required plan with `clases_restantes = 2` and `clases_restantes = 5`
- **THEN** the subscription with `clases_restantes = 2` is charged and `reservas.suscripcion_id` references that subscription

---

### Requirement: SECURITY DEFINER RPCs for class management
The class deduction and restoration operations MUST be implemented as `SECURITY DEFINER` Postgres functions (`book_and_deduct_class` and `cancel_and_restore_class`). No `UPDATE` privilege on `suscripciones` SHALL be granted to the `authenticated` role solely for this feature. Both functions MUST be granted `EXECUTE` to `authenticated`.

#### Scenario: RLS surface for suscripciones is unchanged
- **WHEN** the migration for this feature is applied
- **THEN** no new `UPDATE` RLS policy is added to `public.suscripciones` for the `authenticated` role; all class modifications go through the RPC functions

#### Scenario: Unauthenticated caller cannot invoke the RPCs
- **WHEN** an unauthenticated request calls `book_and_deduct_class` or `cancel_and_restore_class`
- **THEN** the RPC is not executed and the caller receives an authorization error
