## Why

The booking service (`reservas.service.ts`) has no guard against the scheduled date of a training session. Athletes can currently create new bookings or cancel existing ones for sessions that have already taken place, which corrupts booking history and incorrectly triggers class deduction/restoration RPCs on past subscriptions.

## What Changes

- Add a private helper `isEntrenamientoPast(entrenamientoId, tenantId)` to `reservas.service.ts` that fetches `fecha_hora` and returns `true` if the session is in the past.
- Guard `create()`: reject with `BookingResult { ok: false, code: 'ENTRENAMIENTO_PASADO' }` before any capacity or restriction checks when the training is past.
- Guard `cancel()`: same rejection for athlete callers (`isAdminOrCoach` falsy) — admins and coaches retain the ability to cancel past bookings for retroactive corrections.
- Add `'ENTRENAMIENTO_PASADO'` to the `BookingResult` error code union in `entrenamiento-restricciones.types.ts`.
- In `ReservasPanel.tsx`, derive `isPast` from the entrenamiento instance prop and disable the book button and per-row cancel buttons for athlete users when `isPast` is true.

## Capabilities

### New Capabilities

_None — no new standalone capability is introduced._

### Modified Capabilities

- `training-booking`: Adds a past-date guard to both the booking creation and athlete cancellation flows. The requirement that "athletes can only book active future trainings" is now enforced at the service layer; the UI also reflects this with disabled action buttons.

## Impact

- **Files modified**: `src/types/portal/entrenamiento-restricciones.types.ts`, `src/services/supabase/portal/reservas.service.ts`, `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx`
- **No database migrations**: `fecha_hora timestamptz` already exists on `public.entrenamientos`.
- **No RLS changes**: guard runs in application code before any DML.
- **RPCs unaffected**: `book_and_deduct_class` and `cancel_and_restore_class` are never called for past trainings.
- **Admin/coach flows unaffected**: retroactive cancellation of past bookings remains fully functional.

## Non-goals

- Does not block admins or coaches from cancelling bookings on past sessions.
- Does not retroactively clean up or change status of existing bookings on past trainings.
- Does not add any database-level constraint or trigger enforcing this rule.
- Does not affect the attendance management flow (`asistencias`).

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Types | `src/types/portal/entrenamiento-restricciones.types.ts` | Add `'ENTRENAMIENTO_PASADO'` to `BookingResult` error code union |
| Service | `src/services/supabase/portal/reservas.service.ts` | Add `isEntrenamientoPast` helper; guard `create()` and `cancel()` |
| Component | `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx` | Derive `isPast`; disable book/cancel buttons for athletes on past sessions |

## Step-by-Step Implementation Plan

1. Add `'ENTRENAMIENTO_PASADO'` to type union in `entrenamiento-restricciones.types.ts`
2. Implement `isEntrenamientoPast` helper in `reservas.service.ts`
3. Add past-date guard at top of `create()`
4. Add past-date guard at top of `cancel()` (athlete-only)
5. Update `ReservasPanel.tsx`: derive `isPast`, disable book & cancel buttons for athletes
