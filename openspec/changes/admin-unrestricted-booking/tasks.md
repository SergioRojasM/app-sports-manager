## 1. Branch Setup

- [x] 1.1 Create a new git branch: `feat/admin-unrestricted-booking`
- [x] 1.2 Verify working branch is NOT `main`, `master`, or `develop`

## 2. Types

- [x] 2.1 In `src/types/portal/reservas.types.ts`, add `bypass_restrictions?: boolean` to the `CreateReservaInput` type

## 3. Service

- [x] 3.1 In `src/services/supabase/portal/reservas.service.ts → create()`, wrap the past-date guard block (`isEntrenamientoPast` call + early return) in `if (!input.bypass_restrictions) { ... }`
- [x] 3.2 In the same function, wrap the `validateBookingRestrictions` call and its rejection return in `if (!input.bypass_restrictions) { ... }`
- [x] 3.3 Ensure `findSubscriptionToCharge` and the `suscripcionId` resolution block remain **outside** any `bypass_restrictions` conditional (always runs)
- [x] 3.4 Wrap the global capacity check (`getCapacidad` call + `capacity_exceeded` throw) in `if (!input.bypass_restrictions) { ... }`
- [x] 3.5 Wrap the per-category capacity check block (`entrenamiento_categorias` query + count + `capacity_exceeded` throw) in `if (!input.bypass_restrictions) { ... }`
- [x] 3.6 Ensure the duplicate-booking check (`getMyReserva` + `duplicate_booking` throw) remains **outside** any `bypass_restrictions` conditional (always runs)
- [x] 3.7 Verify the `book_and_deduct_class` RPC call remains unchanged and unconditional

## 4. Hook

- [x] 4.1 In `src/hooks/portal/entrenamientos/reservas/useReservas.ts → createReserva` callback, spread `bypass_restrictions: true` into the input before calling `reservasService.create()` when `role === 'administrador'`

## 5. Manual Testing

- [ ] 5.1 Admin creates a booking for a **past** training where athlete has an active subscription → booking succeeds, 1 class deducted
- [ ] 5.2 Admin creates a booking for a past training where athlete has no active subscription → booking succeeds, `suscripcion_id = NULL`
- [ ] 5.3 Admin creates a booking with closed advance-booking window → succeeds
- [ ] 5.4 Admin creates a booking for restricted training where athlete lacks required plan → succeeds
- [ ] 5.5 Admin creates a booking on a training at global capacity (`cupo_maximo` reached) → succeeds
- [ ] 5.6 Admin creates a booking for a full training category → succeeds
- [ ] 5.7 Admin attempts duplicate booking for same athlete + training → rejected with `duplicate_booking` error
- [ ] 5.8 Atleta creates booking for past training → still rejected with `ENTRENAMIENTO_PASADO`
- [ ] 5.9 Atleta creates booking on full training → still rejected with capacity error
- [ ] 5.10 Entrenador creates booking (no bypass) → all standard checks still apply

## 6. Commit & Pull Request

- [x] 6.1 Stage changes: `git add src/types/portal/reservas.types.ts src/services/supabase/portal/reservas.service.ts src/hooks/portal/entrenamientos/reservas/useReservas.ts`
- [x] 6.2 Commit with message: `feat: admin booking bypass — skip guards for past/full/restricted trainings, keep deduction and duplicate check`
- [ ] 6.3 Create pull request with description:
  ```
  ## Summary
  Allows administrators to create bookings without being blocked by past-date guard,
  booking restriction validation (timing, plan, discipline, level), or capacity limits
  (global and per-category).

  ## Changes
  - `CreateReservaInput.bypass_restrictions?: boolean` — new optional flag
  - `reservas.service.ts` — past-date guard, restriction validation, and capacity
    checks wrapped in `if (!input.bypass_restrictions)`; subscription deduction and
    duplicate check remain unconditional
  - `useReservas.ts` — injects `bypass_restrictions: true` for `administrador` role

  ## Testing
  - Manually tested all bypass scenarios (past training, full capacity, restricted training)
  - Verified class deduction still works on admin bookings
  - Verified duplicate-booking check is not bypassed
  - Verified athlete and entrenador flows are unaffected

  Closes US-0061
  ```
