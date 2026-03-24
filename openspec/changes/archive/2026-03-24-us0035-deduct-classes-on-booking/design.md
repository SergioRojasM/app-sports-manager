## Context

The application has a `suscripciones.clases_restantes` column that tracks how many classes an athlete has remaining in their subscription. It is set by admins when validating a subscription but has never been automatically managed by the system. US-0034 introduced `entrenamiento_restricciones` with a `plan_id` column, meaning a training can now require a specific plan. This design describes how to atomically deduct a class when a booking is confirmed against such a restriction, and restore it upon cancellation.

Current booking flow (`reservas.service.ts → create()`):
1. `validateBookingRestrictions()` — checks timing + access restrictions (plan, discipline, level).
2. Capacity check.
3. Duplicate check.
4. Per-category capacity check.
5. `INSERT` into `reservas`.

There is no step that touches `suscripciones.clases_restantes`. The `reservas` table has no reference to which subscription, if any, was involved.

## Goals / Non-Goals

**Goals:**
- Atomically decrement `clases_restantes` when a plan-restricted, class-based booking is confirmed.
- Record which subscription was charged in `reservas.suscripcion_id` for deterministic reversal.
- Atomically restore `clases_restantes` on cancellation (athlete self-cancel and admin/coach cancel).
- Reject bookings with code `CLASES_AGOTADAS` when `clases_restantes = 0`.
- Surface `clases_restantes` on the athlete dashboard and the admin subscriptions table.

**Non-Goals:**
- Auto-expiring subscriptions at zero balance.
- Deducting classes for trainings with no plan restriction (`entrenamiento_restricciones` with no `plan_id`).
- Multi-class deductions per booking.
- Low-balance push/email notifications.
- Partial refunds on partial cancellation.

## Decisions

### Decision 1: Atomic operations via `SECURITY DEFINER` RPCs rather than client-side UPDATE

**Chosen:** Two Postgres functions — `deduct_class_for_booking(p_suscripcion_id uuid)` and `restore_class_on_cancel(p_suscripcion_id uuid)` — run as `SECURITY DEFINER`. Called via `supabase.rpc()` from the service layer.

**Rationale:**
- `UPDATE suscripciones SET clases_restantes = clases_restantes - 1 WHERE id = ? AND clases_restantes > 0` with a `NOT FOUND` guard is the only safe pattern for preventing concurrent bookings from racing below zero. PostgREST does not support arithmetic expressions in `update()`, making client-side atomic decrement impossible.
- `SECURITY DEFINER` means the function executes with the privileges of the owner (postgres/service role), bypassing the need to grant broad UPDATE on `suscripciones` to the `authenticated` role. This avoids exposing a column-level update vector.
- Keeps the RLS surface minimal.

**Alternative considered:** Grant `UPDATE` on `suscripciones` to `authenticated` and handle the race with optimistic locking in the service layer. Rejected because it requires retry logic and a broader RLS policy surface.

### Decision 2: Track `suscripcion_id` on the `reservas` row

**Chosen:** Add a nullable `suscripcion_id uuid` FK column to `reservas` (`ON DELETE SET NULL`).

**Rationale:**
- Deterministic restoration: on cancel, we do not need to re-run subscription discovery logic. We simply read `reservas.suscripcion_id` and call `restore_class_on_cancel` if non-null.
- Audit trail: admins can see which subscription funded a booking.
- If no class was charged (no plan restriction, or `clases_restantes IS NULL`), the column remains `NULL` and no restoration is attempted.

**Alternative considered:** Re-derive the subscription at cancel time by re-running the restriction lookup. Rejected because the plan restriction may have changed between booking and cancellation, leading to incorrect subscription selection.

### Decision 3: Deduction and reservation INSERT wrapped in a single `SECURITY DEFINER` RPC

**Chosen:** A single Postgres function `book_and_deduct_class(...)` running as `SECURITY DEFINER` atomically decrements `clases_restantes` and inserts the `reservas` row inside the same transaction. Called via `supabase.rpc()` from the service layer.

**Rationale:**
- PostgREST does not support multi-statement transactions from the JS client. The only way to guarantee that a class is never deducted without a corresponding booking (or vice versa) is to execute both statements inside the same Postgres transaction.
- A `SECURITY DEFINER` function body participates in the caller's implicit transaction if called inside one; when called standalone via `supabase.rpc`, Postgres wraps the entire function body in a single transaction automatically.
- Subscription discovery (which subscription to charge) still runs in the service layer before calling the RPC — the RPC receives `p_suscripcion_id` and `NULL` means "no deduction".

**Alternative considered:** Deduct first (separate RPC), then INSERT `reservas` from the service layer, and compensate on INSERT failure. Rejected because the compensating restore can itself fail (network partition), leaving the athlete without a class and without a booking with no automatic recovery path.

### Decision 4: Subscription selection — lowest `clases_restantes > 0` first

**Chosen:** When multiple active subscriptions match the required plan, select the one with the lowest non-zero `clases_restantes` (ORDER BY `clases_restantes ASC`, LIMIT 1).

**Rationale:** Maximises utilisation of subscriptions already partially consumed before drawing from fuller ones.

### Decision 5: `CLASES_AGOTADAS` as a `BookingResult` rejection, not a `ReservaServiceError`

**Chosen:** Return `{ ok: false, code: 'CLASES_AGOTADAS', message: '...' }` — same shape as other restriction rejections from `validateBookingRestrictions()`.

**Rationale:** The UI at `ReservaFormModal` already has a handler for `BookingResult` being an error. Reusing the same discriminated union avoids adding a new error path to the form logic. `CLASES_AGOTADAS` is a business-rule rejection, not a system error.

## Data Model

```
reservas
  + suscripcion_id  uuid  nullable  FK → suscripciones(id)  ON DELETE SET NULL
  + INDEX idx_reservas_suscripcion_id

RPCs (SECURITY DEFINER):
  book_and_deduct_class(
    p_tenant_id                  uuid,
    p_atleta_id                  uuid,
    p_entrenamiento_id           uuid,
    p_entrenamiento_categoria_id uuid,   -- nullable
    p_notas                      text,   -- nullable
    p_suscripcion_id             uuid    -- nullable; NULL = no deduction
  ) → reservas (full row)
    BEGIN TRANSACTION:
      IF p_suscripcion_id IS NOT NULL:
        UPDATE suscripciones SET clases_restantes = clases_restantes - 1
        WHERE id = p_suscripcion_id AND clases_restantes > 0
        RAISE 'CLASES_AGOTADAS' P0001 if NOT FOUND  → rolls back INSERT
      INSERT INTO reservas (..., suscripcion_id) VALUES (..., p_suscripcion_id)
      RETURN new reserva row
    END TRANSACTION  -- atomic: both ops succeed or both roll back

  cancel_and_restore_class(
    p_reserva_id    uuid,
    p_tenant_id     uuid,
    p_suscripcion_id uuid    -- nullable; NULL = no restoration
  ) → reservas (full row)
    BEGIN TRANSACTION:
      UPDATE reservas SET estado = 'cancelada', fecha_cancelacion = now()
      WHERE id = p_reserva_id AND tenant_id = p_tenant_id
      IF p_suscripcion_id IS NOT NULL:
        UPDATE suscripciones SET clases_restantes = clases_restantes + 1
        WHERE id = p_suscripcion_id
        -- silent no-op if subscription was deleted
      RETURN updated reserva row
    END TRANSACTION  -- atomic: status update and class restoration are one unit
```

## Service Layer Flow (modified `create()`)

```
create(input):
  0a. validateBookingRestrictions()      → if !ok: return rejection
  0b. findSubscriptionToCharge()         → query suscripciones for winning row
        if clases_restantes = 0          → return CLASES_AGOTADAS rejection
        if clases_restantes IS NULL      → suscripcionId = null (no deduction)
        else                             → suscripcionId = matched.id
  1.  Capacity check
  2.  Duplicate check
  3.  Per-category capacity check
  4.  rpc('book_and_deduct_class', {
        p_tenant_id, p_atleta_id, p_entrenamiento_id,
        p_entrenamiento_categoria_id, p_notas,
        p_suscripcion_id: suscripcionId  -- null = no deduction
      })
      → on P0001: return CLASES_AGOTADAS (concurrent race lost)
      → on other error: throw ReservaServiceError
  5.  return Reserva  (returned directly from RPC)
```

```
cancel(id, tenantId, entrenamientoId?, isAdminOrCoach?):
  1. validateCancellationRestriction()   → if !ok: return rejection
  2. SELECT suscripcion_id FROM reservas WHERE id = id
  3. rpc('cancel_and_restore_class', {
       p_reserva_id:     id,
       p_tenant_id:      tenantId,
       p_suscripcion_id: suscripcion_id   -- null = no restoration
     })
     → on error: throw ReservaServiceError
  4. return updated Reserva  (returned directly from RPC)
```

## Risks / Trade-offs

- **Concurrent booking race** → Two simultaneous bookings both pass the service-layer `> 0` check, but both call `book_and_deduct_class`. Inside Postgres, the `UPDATE … WHERE clases_restantes > 0` acquires a row-level lock; the second caller waits and then raises `P0001` (row not updated), causing its transaction to roll back — the INSERT never happens. The service catches `P0001` and returns `CLASES_AGOTADAS`. No manual recovery needed.
- **Mid-cancel partial failure** → Resolved by `cancel_and_restore_class` RPC: the reservation status update and class restoration are inside the same Postgres transaction, so a failure in either leaves both unchanged.
- **Broad RLS on `suscripciones`** → With `SECURITY DEFINER` RPCs, we do NOT need to add a new UPDATE policy to `suscripciones`. The RPCs run as the service role. Net: zero RLS surface change. If a broad UPDATE policy was added previously, it should be reviewed and potentially removed.

## Migration Plan

1. Apply migration `{timestamp}_deduct_classes_on_booking.sql`:
   - `ALTER TABLE reservas ADD COLUMN suscripcion_id ...`
   - `CREATE INDEX idx_reservas_suscripcion_id`
   - `CREATE OR REPLACE FUNCTION book_and_deduct_class(...)` — atomic deduct + insert
   - `CREATE OR REPLACE FUNCTION cancel_and_restore_class(...)` — atomic status update + class restoration
   - `GRANT EXECUTE` on both functions to `authenticated`
2. Deploy application code (types → service → components).
3. Existing reservations have `suscripcion_id = NULL` — treated as "no class charged"; cancellations skip restoration silently.

**Rollback:** Drop the two RPC functions (`book_and_deduct_class`, `cancel_and_restore_class`) and the `suscripcion_id` column. Revert service + type files. No data loss since the column is nullable and existing rows default to NULL.

## Resolved Questions

- **When `clases_restantes` reaches 0, should `estado` be set to `'vencida'`?** No. `estado = 'vencida'` is set only when the subscription's date period expires (`fecha_fin` reached). Reaching zero classes does not expire the subscription — an admin may top it up. Not in scope for this story.
- **Should cancellation be wrapped in a single RPC?** Yes — resolved above. `cancel_and_restore_class` atomically updates the reservation status and restores the class in one transaction.
