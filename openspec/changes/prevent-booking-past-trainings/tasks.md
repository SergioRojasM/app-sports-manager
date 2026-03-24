## 1. Branch Setup

- [x] 1.1 Create a new branch: `git checkout -b feat/prevent-booking-past-trainings`
- [x] 1.2 Validate that working branch is NOT `main`, `master`, or `develop`

## 2. Types

- [x] 2.1 Open `src/types/portal/entrenamiento-restricciones.types.ts` and add `'ENTRENAMIENTO_PASADO'` to the `BookingResult` error code union type

## 3. Service Layer

- [x] 3.1 Add private helper `isEntrenamientoPast(entrenamientoId: string, tenantId: string): Promise<boolean>` in `src/services/supabase/portal/reservas.service.ts` — fetch `fecha_hora` from `entrenamientos` by PK; return `true` only if `fecha_hora` is not null and `new Date(fecha_hora) < new Date()`
- [x] 3.2 Guard `create()`: at the very top of the function (before `validateBookingRestrictions`), call `isEntrenamientoPast`; if true, return `{ ok: false, code: 'ENTRENAMIENTO_PASADO', message: 'No puedes reservar un entrenamiento que ya ha finalizado.' }`
- [x] 3.3 Guard `cancel()`: at the very top (before `validateCancellationRestriction`), if `!isAdminOrCoach && entrenamientoId` call `isEntrenamientoPast`; if true, return `{ ok: false, code: 'ENTRENAMIENTO_PASADO', message: 'No puedes cancelar la reserva de un entrenamiento que ya ha finalizado.' }`

## 4. UI Component

- [x] 4.1 In `src/components/portal/entrenamientos/reservas/ReservasPanel.tsx`, derive `const isPast = !!instance.fecha_hora && new Date(instance.fecha_hora) < new Date()` from the instance prop (no extra network request)
- [x] 4.2 Disable the self-book ("Reservar") button when `isPast` is true; set the `disabled` HTML attribute and show the label "Entrenamiento finalizado"
- [x] 4.3 Disable the per-row cancel button for the **atleta** role when `isPast` is true; set the `disabled` HTML attribute (admin/coach cancel buttons are unaffected)

## 5. Manual Verification

- [ ] 5.1 As an athlete, attempt to book a training whose `fecha_hora` is in the past → blocked with "No puedes reservar un entrenamiento que ya ha finalizado."
- [ ] 5.2 As an athlete, attempt to cancel an existing booking on a past training → blocked with "No puedes cancelar la reserva de un entrenamiento que ya ha finalizado."
- [ ] 5.3 As an admin, cancel a booking on a past training → succeeds normally
- [ ] 5.4 As an athlete, book a future training → succeeds normally
- [ ] 5.5 Confirm that `book_and_deduct_class` and `cancel_and_restore_class` RPCs are NOT called for the blocked scenarios (check Supabase logs / network tab)
- [ ] 5.6 Confirm that a training with `fecha_hora = null` is not blocked

## 6. Documentation

- [x] 6.1 Update `projectspec/03-project-structure.md` — add note to reservas service entry that `create()` and `cancel()` include a past-date guard (`isEntrenamientoPast`)

## 7. Commit & PR

- [ ] 7.1 Stage and commit all changes with message: `feat: prevent athletes from booking or cancelling past training sessions`
- [ ] 7.2 Write pull request description:
  - **What**: Adds a past-date guard to `reservas.service.ts` `create()` and `cancel()`, and disables book/cancel buttons for athletes in `ReservasPanel` when the training's `fecha_hora` is in the past.
  - **Why**: Athletes were able to book and cancel reservations for sessions that already occurred, incorrectly triggering class deduction/restoration RPCs.
  - **Files changed**: `entrenamiento-restricciones.types.ts`, `reservas.service.ts`, `ReservasPanel.tsx`
  - **Testing**: Manual steps in task 5.x above.
