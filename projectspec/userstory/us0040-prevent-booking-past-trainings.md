# US-0040 — Prevent Booking or Cancelling Past Training Sessions

## ID
US-0040

## Name
Prevent users from booking or cancelling reservations for past training sessions

## As a
Athlete (atleta)

## I Want
To be blocked from creating a new booking or cancelling an existing booking for a training session whose scheduled date/time has already passed

## So That
I cannot manipulate reservations for sessions that are already over, keeping booking data accurate and preventing unintended class deductions or restorations from past sessions

---

## Description

### Current State
The booking flow in `reservas.service.ts` validates restrictions (capacity, duplicates, cancellation timing, plan requirements, subscription class balance) but does **not** check whether the training session's `fecha_hora` is in the past. As a result, an athlete can currently:
- Create a new booking (`create()`) for a past training.
- Cancel an existing booking (`cancel()`) for a past training, which triggers the `cancel_and_restore_class` RPC and incorrectly restores a subscription class.

The `ReservasPanel` shows the "Reservar" (book) and "Cancelar" (cancel) action buttons without any past-date guard.

### Proposed Changes

#### 1. Service layer — `reservas.service.ts`
Add a reusable helper `isEntrenamientoPast(entrenamientoId, tenantId): Promise<boolean>` that fetches `fecha_hora` from `entrenamientos` for the given id and compares it to `now()` (UTC).

**`create()` guard:** At the very beginning of the function (before restriction validation), call the helper. If the training is in the past, return a `BookingResult` with `ok: false`, `code: 'ENTRENAMIENTO_PASADO'`, and a user-friendly message.

**`cancel()` guard:** At the very beginning of the function (before cancellation restriction validation), call the helper. If the training is in the past (and the caller is an **athlete** — i.e., `isAdminOrCoach` is `false` or not supplied), return a `BookingResult` with `ok: false`, `code: 'ENTRENAMIENTO_PASADO'`, and a user-friendly message. Admins and coaches retain the ability to cancel bookings on past sessions (e.g., retroactive corrections).

#### 2. Type — `entrenamiento-restricciones.types.ts`
Add `'ENTRENAMIENTO_PASADO'` to the `BookingResult` error code union so the new guard code is type-safe.

#### 3. Hook layer — `useReservas.ts`
The hook already handles `BookingResult` rejections and surfaces errors from `cancelReserva`. No logic change required — the error message returned by the service will surface through the existing error-handling paths in the hook and be shown to the user via toast or inline error.

#### 4. UI layer — `ReservasPanel.tsx`
- Derive a boolean `isPast` from `instance.fecha_hora` (the entrenamiento instance prop already passed to the panel).
- **Book button:** disable the self-book button and show a tooltip / muted label "Entrenamiento finalizado" when `isPast === true`.
- **Cancel button:** disable the cancel action per row for the athlete role when `isPast === true`. Admins/coaches are not affected.

---

## Database Changes

No schema migrations are required. The `fecha_hora timestamptz` column already exists on `public.entrenamientos`. The comparison is done in the application layer.

---

## API / Server Actions

No new server actions or RPC functions are needed. The guard logic is added to two existing service functions.

**Modified:** `src/services/supabase/portal/reservas.service.ts`

| Function | Change |
|----------|--------|
| `create(input)` | Add past-date guard at top; returns `BookingResult { ok: false, code: 'ENTRENAMIENTO_PASADO' }` |
| `cancel(id, tenantId, entrenamientoId?, isAdminOrCoach?)` | Add past-date guard for athletes; admins/coaches bypass guard |
| `isEntrenamientoPast(entrenamientoId, tenantId)` | New private helper; fetches `fecha_hora`, returns boolean |

**Auth / RLS:** No RLS changes. Existing policies remain; the guard fires in application code before any DML reaches the database.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Types | `src/types/portal/entrenamiento-restricciones.types.ts` | Add `'ENTRENAMIENTO_PASADO'` to `BookingResult` error code union |
| Service | `src/services/supabase/portal/reservas.service.ts` | Add `isEntrenamientoPast` helper; guard `create()` and `cancel()` |
| Component | `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx` | Derive `isPast` from `instance.fecha_hora`; disable book/cancel buttons for athletes on past sessions |

---

## Acceptance Criteria

1. When an athlete attempts to book a training session whose `fecha_hora` is in the past, the booking is rejected and a message "No puedes reservar un entrenamiento que ya ha finalizado." is shown to the user.
2. When an athlete attempts to cancel a booking for a training session whose `fecha_hora` is in the past, the cancellation is rejected and a message "No puedes cancelar la reserva de un entrenamiento que ya ha finalizado." is shown.
3. Past-training bookings and cancellations attempted by athletes do **not** trigger the `book_and_deduct_class` or `cancel_and_restore_class` RPCs.
4. An admin or coach **can** still cancel a booking on a past session (retroactive corrections remain possible).
5. The self-book button in `ReservasPanel` is visually disabled (disabled state) for past sessions; a textual indication "Entrenamiento finalizado" is visible to the athlete.
6. The cancel button per booking row in `ReservasPanel` is visually disabled for past sessions when the current user is an athlete.
7. Admin and coach users see no change in the cancel button behavior for past sessions in `ReservasPanel`.
8. The `isPast` check uses the `fecha_hora` from the entrenamiento instance already available in the component; no extra network request is made in the UI.
9. A training with `fecha_hora = null` (not yet scheduled) is treated as **not past** (no block applied).

---

## Implementation Steps

- [ ] Add `'ENTRENAMIENTO_PASADO'` to the `BookingResult` error code union in `src/types/portal/entrenamiento-restricciones.types.ts`
- [ ] Add private helper `isEntrenamientoPast(entrenamientoId, tenantId)` in `reservas.service.ts` that fetches `fecha_hora` and returns `true` if `fecha_hora` is not null and is before `new Date()`
- [ ] Guard `create()` at the top: call `isEntrenamientoPast`; if true, return `{ ok: false, code: 'ENTRENAMIENTO_PASADO', message: 'No puedes reservar un entrenamiento que ya ha finalizado.' }`
- [ ] Guard `cancel()` at the top (before restriction validation): call `isEntrenamientoPast`; if true **and** `!isAdminOrCoach`, return `{ ok: false, code: 'ENTRENAMIENTO_PASADO', message: 'No puedes cancelar la reserva de un entrenamiento que ya ha finalizado.' }`
- [ ] In `ReservasPanel.tsx`, derive `const isPast = !!instance.fecha_hora && new Date(instance.fecha_hora) < new Date()`
- [ ] Disable the self-book button when `isPast` is true; show label/tooltip "Entrenamiento finalizado"
- [ ] Disable per-row cancel buttons for athlete role when `isPast` is true
- [ ] Verify admins/coaches can still cancel on past sessions
- [ ] Test manually: book a past training as athlete (blocked), cancel on past training as athlete (blocked), cancel on past training as admin (allowed), book a future training (works normally)

---

## Non-Functional Requirements

- **Security:** The guard is enforced in the service layer, not only in the UI. A user bypassing the UI (e.g., direct API call) still cannot create or cancel bookings for past sessions because the service rejects it before any mutation.
- **Performance:** `isEntrenamientoPast` performs a single point-query by primary key; it has negligible overhead. No new indexes needed.
- **Accessibility:** Disabled buttons must have `disabled` attribute set (not just visually styled); assistive technologies must announce the disabled state.
- **Error handling:** Errors surface as inline `submitError` messages inside `ReservaFormModal` and `ReservasPanel` (existing error display paths). No new toast infrastructure is needed.
