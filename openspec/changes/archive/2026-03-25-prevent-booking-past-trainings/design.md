## Context

The booking service (`reservas.service.ts`) chains several validation checks before calling the `book_and_deduct_class` / `cancel_and_restore_class` atomic RPCs: capacity check, duplicate check, restriction check, and subscription class balance check. None of these checks compare the training's `fecha_hora` against the current time. The result is that an athlete can book a training that already occurred, triggering a class deduction for a past event, or cancel a past booking, triggering a class restoration that should not happen.

The `fecha_hora timestamptz` column already exists on `public.entrenamientos`. No database migration is required.

## Goals / Non-Goals

**Goals:**
- Block athletes from creating bookings for training sessions whose `fecha_hora` is in the past.
- Block athletes from cancelling existing bookings for past training sessions.
- Enforce the guard at the service layer so it cannot be bypassed by direct API calls.
- Reflect the past state in the UI by disabling the book and cancel buttons for athletes.

**Non-Goals:**
- Blocking admins or coaches from cancelling bookings on past sessions.
- Retroactively changing the status of existing bookings on past trainings.
- Adding a database-level constraint or trigger.
- Modifying the attendance (`asistencias`) or reporting flows.

## Decisions

### Decision 1: Guard in service layer, not only in UI

**Choice:** The primary enforcement sits in `reservas.service.ts` inside `create()` and `cancel()`.

**Rationale:** The UI can always be bypassed (direct API calls, curl). A guard that only disables buttons is cosmetic. Placing the logic in the service ensures correctness regardless of call origin.

**Alternative considered:** Client-side only (disable buttons). Rejected because it offers no actual protection.

### Decision 2: Private helper `isEntrenamientoPast(entrenamientoId, tenantId)`

**Choice:** Add a focused helper that performs a single `SELECT fecha_hora` query and returns a boolean.

**Rationale:** Keeps the guard logic isolated and reusable within the service. The overhead of one additional point-query by primary key is negligible compared to the existing capacity and restriction queries.

**Alternative considered:** Inline the comparison inside each function. Rejected because it duplicates logic and harms readability.

### Decision 3: Guard fires before all other checks in `create()`

**Choice:** Call `isEntrenamientoPast` as step 0, before `validateBookingRestrictions`, capacity, duplicate checks, and the RPC.

**Rationale:** Early exit prevents any unnecessary queries. A past training will never be bookable regardless of capacity or restrictions.

### Decision 4: `cancel()` guard applies only when `isAdminOrCoach` is falsy

**Choice:** Skip the past-date check for admin and coach callers.

**Rationale:** Admins and coaches need to retroactively cancel bookings (e.g., to correct data entry errors, process no-shows) on past sessions. Blocking them would prevent legitimate administrative actions.

### Decision 5: `fecha_hora = null` treated as not-past

**Choice:** If `fecha_hora` is null, `isEntrenamientoPast` returns `false` — no block is applied.

**Rationale:** A training with no scheduled date cannot be considered past. Blocking it would incorrectly prevent bookings on unscheduled sessions.

### Decision 6: `BookingResult` error code `'ENTRENAMIENTO_PASADO'`

**Choice:** Add a new code to the existing `BookingResult` discriminated union rather than throwing a `ReservaServiceError`.

**Rationale:** `create()` already returns `Reserva | BookingResult` for soft rejections (PLAN_REQUERIDO, CLASES_AGOTADAS, etc.). Using the same pattern keeps the calling hook's error-handling code uniform — `isBookingResult(result)` pattern works unchanged.

### Decision 7: UI — derive `isPast` from instance prop, no extra fetch

**Choice:** `const isPast = !!instance.fecha_hora && new Date(instance.fecha_hora) < new Date()` directly in `ReservasPanel`.

**Rationale:** `instance` is the entrenamiento row already loaded. No new network request is needed. Disabled buttons are purely cosmetic when the service guard already enforces correctness.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Clock skew between client and server | The service guard uses `new Date()` from the Node.js runtime (server-side or browser). For RPC calls that eventually hit the DB, timing comparisons use server time. Minor skew (seconds) is acceptable for session booking windows measured in hours. |
| `isEntrenamientoPast` adds one DB query to every `create()` and `cancel()` call | The query is a primary-key point lookup (`WHERE id = ? AND tenant_id = ?`) on an indexed column — negligible overhead. |
| Admins could accidentally cancel past bookings via the UI | Intentional: admins retain full cancel capability. The UI does not disable the cancel button for admin/coach roles. |

## Migration Plan

- No database migration needed.
- Deployment is a standard code-only release.
- Rollback: revert the three file changes. No data has been altered.

## Open Questions

_None — all decisions are covered above._
