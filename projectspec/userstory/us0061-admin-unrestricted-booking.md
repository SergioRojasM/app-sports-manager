# US-0061 — Admin Unrestricted Booking

## ID
US-0061

## Name
Admin Can Create Bookings Without Restriction Guards

## As a
Tenant administrator (administrador)

## I Want
To create a booking for any athlete at any time, bypassing all access restrictions, timing windows, the past-training guard, and capacity limits — while still deducting classes from the athlete's subscription when applicable.

## So That
I can register an athlete in any training session regardless of whether it has already started or passed, whether the athlete lacks the required plan/discipline/level, whether the advance-booking window has closed, or whether the session is already at capacity — which is essential for walk-ins registered outside the app, retroactive attendance corrections, and manual overrides where the admin assumes responsibility for any over-capacity slots. Class deduction is preserved so that bookings added by the admin for sessions that already took place are correctly accounted for in the athlete's subscription.

---

## Description

### Current State

The `reservasService.create()` function in `src/services/supabase/portal/reservas.service.ts` enforces two validation layers for **all** users, including administrators:

1. **Past-date guard** (`isEntrenamientoPast`): Returns `{ ok: false, code: 'ENTRENAMIENTO_PASADO' }` if the training's `fecha_hora` is in the past.
2. **Booking restriction validation** (`validateBookingRestrictions`): Evaluates every row in `entrenamiento_restricciones` and returns a rejection if:
   - The advance-booking window has passed (`reserva_antelacion_horas`)
   - The athlete has no active subscription for the required plan (`plan_id`)
   - The athlete has no active subscription covering the required discipline (`disciplina_id`)
   - The athlete's level in the training's discipline is below the required minimum (`validar_nivel_disciplina`)

Both guards are unconditional — there is no way for an admin to override them today.

Additionally, the capacity checks (`getCapacidad` global check and per-category capacity check) are also unconditional and block all users, including admins, from booking into full sessions.

### Proposed Changes

#### 1. `CreateReservaInput` — Add `bypass_restrictions` flag

Add an optional boolean field `bypass_restrictions?: boolean` to the `CreateReservaInput` type.

When `true`, the `create()` service function skips:
- The past-date guard
- The full `validateBookingRestrictions` call (timing, plan, discipline, level checks)
- The global capacity check (`getCapacidad`)
- The per-category capacity check

The **duplicate-booking check** and the **subscription class deduction** (`findSubscriptionToCharge` + `book_and_deduct_class`) remain active so that:
- The same athlete cannot be double-booked for the same training.
- If the training has a plan restriction and the athlete has an active subscription with available classes, a class is deducted — mirroring what would have happened had the athlete booked normally. This correctly accounts for sessions that took place outside the app.

#### 2. `reservas.service.ts` — Conditional skip of guards in `create()`

Wrap the past-date guard, restriction validation, global capacity check, and per-category capacity check in `if (!input.bypass_restrictions)` conditionals. The subscription-deduction lookup (`findSubscriptionToCharge`) and the duplicate-booking check remain **outside** the conditional and always run.

```ts
if (!input.bypass_restrictions) {
  // 0. Past-date guard
  const past = await isEntrenamientoPast(input.entrenamiento_id, input.tenant_id);
  if (past) {
    return { ok: false, code: 'ENTRENAMIENTO_PASADO', message: '...' };
  }

  // 1. Booking restriction check
  const restrictionResult = await validateBookingRestrictions(
    input.entrenamiento_id,
    input.atleta_id,
    input.tenant_id,
  );
  if (!restrictionResult.ok) return restrictionResult;
}

// Subscription deduction — always runs (admin and athlete alike)
let suscripcionId: string | null = null;
// ... findSubscriptionToCharge logic ...

// Duplicate check — always runs
const existing = await getMyReserva(...);
if (existing) { throw new ReservaServiceError('duplicate_booking', '...'); }

if (!input.bypass_restrictions) {
  // Global capacity check
  const capacidad = await getCapacidad(input.tenant_id, input.entrenamiento_id);
  if (!capacidad.disponible) {
    throw new ReservaServiceError('capacity_exceeded', '...');
  }

  // Per-category capacity check
  if (input.entrenamiento_categoria_id) {
    // ... existing per-category check ...
  }
}

// 4. Insert via atomic RPC — always runs
await supabase.rpc('book_and_deduct_class', { ..., p_suscripcion_id: suscripcionId });
```

> **Note on class deduction with bypass**: `findSubscriptionToCharge` queries active subscriptions only. For a past training where the athlete's subscription has since expired or been fully consumed, no matching subscription will be found and `suscripcionId` will be `null` — the RPC inserts with no deduction, which is the correct silent fallback. When a valid subscription does exist, one class is deducted, accurately reflecting the session the athlete attended.

#### 3. `useReservas.ts` — Inject `bypass_restrictions: true` for admin role

In the `createReserva` callback inside `useReservas`, automatically enrich the input with `bypass_restrictions: true` when `role === 'administrador'` before forwarding it to `reservasService.create()`:

```ts
const enrichedInput: CreateReservaInput =
  role === 'administrador'
    ? { ...input, bypass_restrictions: true }
    : input;

const result = await reservasService.create(enrichedInput);
```

This is the single call-site change required. No UI changes are needed — the admin already uses the same `ReservaFormModal` / `useReservaForm` flow; the bypass is transparent to the UI layer.

#### 4. No database migration required

No schema changes are needed. The existing RLS INSERT policy `reservas_insert_authenticated` already allows an `administrador` to insert bookings for any `atleta_id` in the tenant (via `get_trainer_or_admin_tenants_for_authenticated_user()`). The `book_and_deduct_class` RPC already handles both cases: `p_suscripcion_id = NULL` (no deduction) and `p_suscripcion_id = <uuid>` (deduct one class).

---

## Database Changes

None. All existing tables, constraints, RLS policies, and RPCs are sufficient.

Relevant existing schema:
- `public.reservas` — `(id, tenant_id, atleta_id, entrenamiento_id, entrenamiento_categoria_id, fecha_reserva, estado, notas, suscripcion_id, created_at, fecha_cancelacion)`
- `public.entrenamientos` — `fecha_hora`, `cupo_maximo`, `reserva_antelacion_horas`, `disciplina_id`
- `public.entrenamiento_restricciones` — access-condition rows evaluated by `validateBookingRestrictions`
- RPC `book_and_deduct_class(p_tenant_id, p_atleta_id, p_entrenamiento_id, p_entrenamiento_categoria_id, p_notas, p_suscripcion_id)` — `p_suscripcion_id = NULL` → no deduction

---

## API / Server Actions

No new API routes or RPCs. Changes are entirely in the application-layer service and hook.

| Layer | File | Change |
|-------|------|--------|
| Type | `src/types/portal/reservas.types.ts` | Add `bypass_restrictions?: boolean` to `CreateReservaInput` |
| Service | `src/services/supabase/portal/reservas.service.ts` | Wrap past-date guard, restriction validation, global capacity check, and per-category capacity check in `if (!input.bypass_restrictions)`. `findSubscriptionToCharge` and duplicate check remain unconditional |
| Hook | `src/hooks/portal/entrenamientos/reservas/useReservas.ts` | Inject `bypass_restrictions: true` in `createReserva` when `role === 'administrador'` |

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Type | `src/types/portal/reservas.types.ts` | Add optional `bypass_restrictions?: boolean` to `CreateReservaInput` |
| Service | `src/services/supabase/portal/reservas.service.ts` | Wrap past-date guard, `validateBookingRestrictions` call, global capacity check, and per-category capacity check in `if (!input.bypass_restrictions)`. Keep `findSubscriptionToCharge` and duplicate-booking check unconditional |
| Hook | `src/hooks/portal/entrenamientos/reservas/useReservas.ts` | In `createReserva` callback, spread `bypass_restrictions: true` into input when `role === 'administrador'` |

No new files need to be created.

---

## Acceptance Criteria

1. When an admin opens the booking panel for a **past** training and creates a booking for an athlete, the booking is created successfully (no `ENTRENAMIENTO_PASADO` rejection).
2. When an admin creates a booking for a training whose advance-booking window (`reserva_antelacion_horas`) has already closed, the booking is created successfully (no `TIMING_RESERVA` rejection).
3. When an admin creates a booking for a training that requires a plan the athlete does not have, the booking is created successfully (no `PLAN_REQUERIDO` rejection).
4. When an admin creates a booking for a training that requires a discipline the athlete is not subscribed to, the booking is created successfully (no `DISCIPLINA_REQUERIDA` rejection).
5. When an admin creates a booking for a training that requires a higher discipline level than the athlete holds, the booking is created successfully (no `NIVEL_INSUFICIENTE` rejection).
6. When an admin creates a booking and the athlete has an active subscription with available classes for the training's required plan, **one class is deducted** from that subscription (`suscripcion_id` on the created `reservas` row is set to the subscription ID).
7. When an admin creates a booking and no active subscription with available classes is found (e.g., the training is in the past and the subscription has since expired), the booking is created with `suscripcion_id = NULL` — no deduction, no error.
8. When an admin creates a booking for a training that is **at capacity** (`reservas_activas >= cupo_maximo`), the booking is **created successfully** — capacity limits are bypassed.
9. When an admin creates a booking for a training category that is at its per-category capacity (`cupos_asignados`), the booking is **created successfully** — per-category limits are bypassed.
10. When an admin attempts to create a **duplicate booking** (athlete already has an active non-cancelled booking for the same training), the booking is **rejected** with a duplicate error — duplicate checks are never bypassed.
11. A non-admin user (atleta, entrenador) is **not** affected: past-date guard, restriction validation, and capacity checks continue to apply for them exactly as before.
12. No UI changes are visible to the admin — the existing `ReservaFormModal` flow works as before; the bypass is transparent.

---

## Implementation Steps

- [ ] Add `bypass_restrictions?: boolean` to `CreateReservaInput` in `src/types/portal/reservas.types.ts`
- [ ] In `src/services/supabase/portal/reservas.service.ts`, wrap the past-date guard block in `if (!input.bypass_restrictions) { ... }`
- [ ] In the same function, wrap the `validateBookingRestrictions` call block in `if (!input.bypass_restrictions) { ... }`
- [ ] In the same function, wrap the global capacity check (`getCapacidad` + guard) in `if (!input.bypass_restrictions) { ... }`
- [ ] In the same function, wrap the per-category capacity check block in `if (!input.bypass_restrictions) { ... }`
- [ ] Keep `findSubscriptionToCharge` and the duplicate-booking check **outside** any `bypass_restrictions` conditional
- [ ] In `src/hooks/portal/entrenamientos/reservas/useReservas.ts`, update the `createReserva` callback to spread `bypass_restrictions: true` when `role === 'administrador'`
- [ ] Manually test: admin creates booking for a past training where athlete has active subscription → succeeds and deducts 1 class
- [ ] Manually test: admin creates booking for a past training where athlete has no active subscription → succeeds with `suscripcion_id = NULL`
- [ ] Manually test: admin creates booking with closed advance window → succeeds
- [ ] Manually test: admin creates booking for restricted training where athlete lacks plan/discipline/level → succeeds
- [ ] Manually test: admin creates booking on a full training (at global capacity) → succeeds (over-capacity allowed)
- [ ] Manually test: admin creates booking for a full training category → succeeds (per-category over-capacity allowed)
- [ ] Manually test: admin tries to create a duplicate booking → rejected with duplicate error
- [ ] Manually test: athlete role creates booking for past training → still rejected
- [ ] Manually test: athlete role creates booking on a full training → still rejected with capacity error

---

## Non-Functional Requirements

- **Security**: The `bypass_restrictions` flag is only injected by `useReservas` when `role === 'administrador'`. The role is determined server-side via the tenant membership record (`miembros_tenant.rol_id`). The RLS INSERT policy `reservas_insert_authenticated` independently verifies that only `administrador` / `entrenador` members can insert bookings for other athletes — the flag cannot be spoofed by a client to gain permissions not already granted by RLS.
- **Performance**: No new database queries are introduced; bypassing restriction validation and capacity checks removes up to 7 existing queries per admin booking creation. The `findSubscriptionToCharge` query is still executed but is a single lightweight indexed lookup.
- **Accessibility**: No UI changes — no accessibility impact.
- **Error handling**: Only the duplicate-booking error surfaces to the admin (toast/inline message). All other rejection codes (`ENTRENAMIENTO_PASADO`, `TIMING_RESERVA`, `PLAN_REQUERIDO`, `DISCIPLINA_REQUERIDA`, `NIVEL_INSUFICIENTE`, `capacity_exceeded`) are silently bypassed for admins and never shown.
