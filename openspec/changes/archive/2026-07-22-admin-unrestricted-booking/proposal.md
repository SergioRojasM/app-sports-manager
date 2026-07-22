## Why

Administrators often register athlete attendance for sessions that already happened (walk-ins, phone bookings, retroactive corrections). Today the `reservas.service.ts` `create()` function enforces the same guards for all roles — past-date guard, timing/access restriction validation, and capacity limits — making it impossible for an admin to register these bookings without manipulating dates or bypassing the UI entirely.

## What Changes

- Add optional `bypass_restrictions?: boolean` field to `CreateReservaInput` type.
- In `reservas.service.ts → create()`, wrap the following checks inside `if (!input.bypass_restrictions)`:
  - Past-date guard (`isEntrenamientoPast`)
  - Full restriction validation (`validateBookingRestrictions`: timing, plan, discipline, level)
  - Global capacity check (`getCapacidad`)
  - Per-category capacity check
- Keep the duplicate-booking check **unconditional** (same athlete cannot be double-booked regardless of role).
- Keep the subscription class deduction logic (`findSubscriptionToCharge` + `book_and_deduct_class`) **unconditional** so that admin-registered bookings correctly charge a class when the athlete has an active eligible subscription.
- In `useReservas.ts → createReserva`, inject `bypass_restrictions: true` automatically when `role === 'administrador'` before forwarding to the service.

## Capabilities

### New Capabilities
<!-- none — this change modifies existing behavior without introducing a new domain capability -->

### Modified Capabilities
- `training-booking`: The past-date guard and restriction validation (timing, plan, discipline, level) SHALL be skipped when `CreateReservaInput.bypass_restrictions` is `true`. Capacity checks (global and per-category) SHALL also be skipped when `bypass_restrictions` is `true`. Duplicate-booking check and class deduction remain unconditional. The flag is injected automatically by `useReservas` for the `administrador` role.

## Impact

- **`src/types/portal/reservas.types.ts`** — `CreateReservaInput` extended with `bypass_restrictions?: boolean`.
- **`src/services/supabase/portal/reservas.service.ts`** — `create()` function modified; three guard blocks become conditional.
- **`src/hooks/portal/entrenamientos/reservas/useReservas.ts`** — `createReserva` callback enriched with flag for admin role.
- No new routes, components, migrations, or RPCs required.
- No breaking changes — the flag defaults to `undefined` (falsy), so all non-admin flows are unaffected.

## Non-goals

- Does not change cancellation, update, or deletion flows.
- Does not add any UI indicator that a booking was created via admin override.
- Does not bypass the duplicate-booking check under any circumstance.
- Does not bypass class deduction — admin bookings still charge the athlete's subscription when applicable.
- Does not grant the `entrenador` role the same bypass (only `administrador`).
