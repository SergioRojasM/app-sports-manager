## MODIFIED Requirements

### Requirement: Atleta self-booking — class deduction integrated into create flow
*Replaces the booking creation flow defined in `openspec/specs/training-booking/spec.md` under "Atleta can book a training session".*

The `create()` function in `reservas.service.ts` SHALL delegate the reservation INSERT to the `book_and_deduct_class` RPC. The service MUST:
1. Run all pre-booking validation checks (`validateBookingRestrictions`) to produce non-database rejections (TIMING_RESERVA, PLAN_REQUERIDO, NIVEL_INSUFICIENTE, etc.) before calling the RPC.
2. Call `book_and_deduct_class(p_tenant_id, p_atleta_id, p_entrenamiento_id, p_entrenamiento_categoria_id, p_notas, p_suscripcion_id)` where `p_suscripcion_id` is the result of the subscription selection strategy (see `subscription-class-deduction/spec.md`) or `NULL` when no class deduction applies.
3. If the RPC raises a Postgres `P0001` exception with message matching `'CLASES_AGOTADAS'`, the service SHALL return `{ ok: false, code: 'CLASES_AGOTADAS', message: '...' }`.
4. The `book_and_deduct_class` RPC is the sole write path for reservation creation — direct INSERT into `reservas` without class management is not a supported flow.

#### Scenario: Booking form delegates to `book_and_deduct_class`
- **WHEN** a user submits the booking form and validation passes
- **THEN** the service calls `book_and_deduct_class` and a reservation row is returned; no direct INSERT into `reservas` is issued by the client

#### Scenario: Validation rejection is returned before RPC call
- **WHEN** `validateBookingRestrictions` returns a rejection (e.g., PLAN_REQUERIDO)
- **THEN** the service returns the rejection immediately and `book_and_deduct_class` is NOT called

---

### Requirement: Atleta self-cancellation — class restoration integrated into cancel flow
*Replaces the cancellation flow defined in `openspec/specs/training-booking/spec.md` under "Atleta can cancel their own booking".*

The `cancel()` function in `reservas.service.ts` SHALL delegate the reservation status update to the `cancel_and_restore_class` RPC. The service MUST:
1. Run `validateCancellationRestriction` to produce timing-based rejections (TIMING_CANCELACION) before calling the RPC.
2. Determine `suscripcion_id` from the fetched reservation row (may be `NULL`).
3. Call `cancel_and_restore_class(p_reserva_id, p_tenant_id, p_suscripcion_id)`.
4. Direct `UPDATE reservas SET estado='cancelada'` without the RPC is not a supported flow.

#### Scenario: Admin/coach cancellation also uses cancel_and_restore_class
- **WHEN** an admin or entrenador cancels a booking
- **THEN** the same `cancel_and_restore_class` RPC is called; timing restriction is bypassed for admin roles but class restoration logic is identical

#### Scenario: Cancellation of booking with no linked subscription
- **WHEN** `reservas.suscripcion_id IS NULL` and a cancellation is requested
- **THEN** `cancel_and_restore_class` is called with `p_suscripcion_id = NULL`; the RPC performs only the status update and the caller receives a success result

---

## ADDED Requirements

### Requirement: CLASES_AGOTADAS rejection code in BookingResult
The `BookingRejectionCode` type in `entrenamiento-restricciones.types.ts` SHALL include the literal `'CLASES_AGOTADAS'` in its union. The booking form component SHALL handle this code by displaying the message: `"No te quedan clases disponibles en tu suscripción al plan requerido. Contacta al administrador para renovar o ampliar tu plan."` No further action (e.g., redirect or retry) is required.

#### Scenario: CLASES_AGOTADAS is type-safe at service boundary
- **WHEN** the RPC raises a P0001 exception with message 'CLASES_AGOTADAS'
- **THEN** the service returns `BookingResult = { ok: false, code: 'CLASES_AGOTADAS', message: <human-readable string> }` and `BookingRejectionCode` includes this literal so TypeScript exhaustive checks compile without cast

#### Scenario: Booking form shows inline error for CLASES_AGOTADAS
- **WHEN** the `ReservaFormModal` (or equivalent booking UI component) receives a `BookingResult` with `code === 'CLASES_AGOTADAS'`
- **THEN** an inline error message is rendered inside the modal without closing it; the submit button is re-enabled so the user can dismiss and seek help
