# US-0035 — Deduct Subscription Classes on Booking

## ID
US-0035

## Name
Deduct and Restore Subscription Classes on Training Booking and Cancellation

## As a
Athlete

## I Want
My active subscription's remaining class count to be automatically decremented when I book a training that requires a class-based plan, and restored when I cancel that booking.

## So That
My subscription balance stays accurate without requiring manual administrator intervention, and I always know how many classes I still have available.

---

## Description

Currently, `suscripciones.clases_restantes` exists in the database but is never automatically updated when a booking is created or cancelled. US-0034 introduced access restrictions that can require a specific `plan_id` in order to book a training (via `entrenamiento_restricciones.plan_id`). This story builds on that by closing the loop: if the athlete's matched active subscription is class-based (`clases_restantes IS NOT NULL`), booking the training debits one class and cancelling refunds it.

### Trigger Condition

A class deduction happens **only when all of the following are true** at booking time:

1. The training has at least one `entrenamiento_restricciones` row with a non-null `plan_id`.
2. The athlete has an active subscription (`estado = 'activa'`) to the required plan (i.e., the `plan_id` restriction is satisfied).
3. That matched subscription has `clases_restantes IS NOT NULL` (the subscription is class-based).
4. `clases_restantes > 0` at the time of booking (the subscription still has available classes).

If the plan restriction is satisfied but `clases_restantes IS NULL`, the booking proceeds without any deduction (unlimited or payment-based plans).

If `clases_restantes = 0`, the booking is **rejected** with a clear error message informing the athlete that they have no remaining classes on the required plan.

### Matching Subscription

When multiple active subscriptions satisfy the required plan (unlikely but possible), select the one with the **lowest `clases_restantes`** that is still > 0. This maximises plan utilisation before falling back to subscriptions with more classes.

If no matching subscription has `clases_restantes > 0`:
- If at least one matching subscription has `clases_restantes = 0`, **reject** with code `CLASES_AGOTADAS`.
- If all matching subscriptions have `clases_restantes IS NULL`, proceed without deduction.

### Tracking the Charged Subscription

A new column `suscripcion_id` is added to `reservas` (nullable FK → `suscripciones`). When a class is debited, this column is populated with the subscription that was charged. It remains `NULL` when no deduction was made. This enables deterministic class restoration on cancellation.

### Restoration on Cancellation

When a reservation is cancelled (via `cancel()` or `update({ estado: 'cancelada' })`):
- If `reservas.suscripcion_id IS NOT NULL`, increment `suscripciones.clases_restantes` by 1 on the linked subscription (regardless of its current `estado`).
- The restoration applies to athlete self-cancellation and admin/coach cancellation alike.
- If the subscription row no longer exists (was deleted), skip the restoration silently and log a warning.

### Admin Override

Admin/coach users who override a booking on behalf of an athlete are subject to the same deduction logic (the athlete's plan restricts the training, so the athlete's subscription is charged). The admin/coach themselves do not have classes deducted from their own account.

---

## Database Changes

### 1. Add `suscripcion_id` to `reservas`

```sql
alter table public.reservas
  add column suscripcion_id uuid,
  add constraint reservas_suscripcion_id_fkey
    foreign key (suscripcion_id)
    references public.suscripciones(id)
    on delete set null;

create index idx_reservas_suscripcion_id on public.reservas (suscripcion_id);
```

`ON DELETE SET NULL` ensures that if a subscription is deleted, existing reservation records are not lost — the deduction link is simply cleared.

### 2. RLS update for `suscripciones` (UPDATE for class deduction)

The existing `suscripciones_select_own` and admin UPDATE policies may need a targeted adjustment to allow the service-layer logic (running as `authenticated`) to decrement `clases_restantes` for the athlete's own subscription. Verify that the current admin-scoped UPDATE policy in `20260305000100_gestion_suscripciones_admin_rls.sql` covers this path, or add a limited athlete UPDATE policy:

```sql
-- Allow athlete to decrement/increment their own clases_restantes
drop policy if exists suscripciones_update_clases_own on public.suscripciones;
create policy suscripciones_update_clases_own on public.suscripciones
  for update to authenticated
  using (atleta_id = auth.uid())
  with check (atleta_id = auth.uid());

grant update on public.suscripciones to authenticated;
```

> **Security note:** This policy allows an authenticated user to UPDATE any column on their own subscription row. Confirm application-layer code never passes unintended columns. If column-level security is needed, implement the deduction/restoration via a Postgres RPC (`security definer` function) instead, which is the preferred approach for production (see Non-Functional Requirements).

---

## Service Layer Changes

### `src/services/supabase/portal/reservas.service.ts`

#### New helper: `deductClassFromSubscription(atletaId, tenantId, restricciones): Promise<string | null>`

Responsible for finding the matched subscription and performing the decrement. Returns the `suscripcion_id` that was charged, or `null` if no deduction was made.

```
1. From restricciones, collect all non-null plan_id values that appear in the restriction rows that PASSED the OR evaluation (the winning row).
2. If no plan_id was required, return null — no deduction.
3. Query suscripciones where:
     atleta_id = atletaId
     AND tenant_id = tenantId
     AND plan_id IN (winning plan_ids)
     AND estado = 'activa'
     AND clases_restantes IS NOT NULL
     AND clases_restantes > 0
   ORDER BY clases_restantes ASC
   LIMIT 1
4. If no row found:
     Check if any subscription exists with clases_restantes = 0 → return BookingResult { ok: false, code: 'CLASES_AGOTADAS' }
     If all have clases_restantes IS NULL → return null (no deduction)
5. Decrement: UPDATE suscripciones SET clases_restantes = clases_restantes - 1 WHERE id = matched.id
6. Return matched.id
```

#### Modify: `create(input: CreateReservaInput)`

After `validateBookingRestrictions` passes (step 0), and before OR after the INSERT:

```
// Step 0b — deduce class if applicable
const winningPlanId = extractWinningPlanId(restricciones, activePlanIds);
// If winningPlanId is non-null, call deductClassFromSubscription
const suscripcionId = await deductClassFromSubscription(
  input.atleta_id,
  input.tenant_id,
  winningPlanId,
);
if (suscripcionId === CLASES_AGOTADAS_SENTINEL) {
  return { ok: false, code: 'CLASES_AGOTADAS', message: 'No te quedan clases disponibles en el plan requerido.' };
}

// Include suscripcion_id in INSERT
.insert({
  ...
  suscripcion_id: suscripcionId ?? null,
})
```

> **Atomicity note:** Deducting the class and inserting the reservation are two separate DB operations. In the rare case that the reservation INSERT fails after a successful deduction, the service must roll back the deduction (increment back). Implement this via a compensating UPDATE on error, or preferably wrap both operations in a Postgres RPC function with transaction semantics (recommended for production).

#### Modify: `cancel(id, tenantId, entrenamientoId?, isAdminOrCoach?)`

Before or after the status update, restore the class if applicable:

```
// Fetch reservation to get suscripcion_id
const { data: reserva } = await supabase
  .from('reservas')
  .select('suscripcion_id, estado')
  .eq('id', id)
  .eq('tenant_id', tenantId)
  .single();

const suscripcionId = reserva?.suscripcion_id as string | null;

// Update estado = 'cancelada'
await update(id, tenantId, { estado: 'cancelada' });

// Restore class
if (suscripcionId) {
  const { error: restoreError } = await supabase
    .from('suscripciones')
    .update({ clases_restantes: supabase.rpc('...') }) // see note
    .eq('id', suscripcionId);
  // On error, log warning but do not fail the cancellation
}
```

For safe increment use a raw expression: `.update({ clases_restantes: /* raw */ })`. Since PostgREST does not support arithmetic updates directly, use an RPC function or `supabase.rpc('increment_clases_restantes', { p_suscripcion_id: suscripcionId })`.

#### New RPC (recommended): `deduct_and_book` / `cancel_and_restore`

To guarantee atomicity, implement two Postgres functions:

**`public.deduct_class_for_booking(p_suscripcion_id uuid) returns void`**
```sql
create or replace function public.deduct_class_for_booking(p_suscripcion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update suscripciones
  set clases_restantes = clases_restantes - 1
  where id = p_suscripcion_id
    and clases_restantes > 0;

  if not found then
    raise exception 'CLASES_AGOTADAS' using errcode = 'P0001';
  end if;
end;
$$;
```

**`public.restore_class_on_cancel(p_suscripcion_id uuid) returns void`**
```sql
create or replace function public.restore_class_on_cancel(p_suscripcion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update suscripciones
  set clases_restantes = clases_restantes + 1
  where id = p_suscripcion_id;
  -- No-op if subscription was deleted (row not found); do not raise
end;
$$;
```

---

## Type Definitions

### `src/types/portal/reservas.types.ts`

Add `suscripcion_id` to the `Reserva` and `CreateReservaInput` types:

```typescript
// Extend Reserva
export interface Reserva {
  // ...existing fields...
  suscripcion_id: string | null;  // populated when a class was deducted
}

// Extend CreateReservaInput (no change needed at call site — service computes it)
```

### `src/types/portal/suscripciones.types.ts`

No type changes required. `clases_restantes` is already present.

### `src/types/portal/entrenamiento-restricciones.types.ts`

Add new error code to `BookingResult`:

```typescript
export type BookingRejectionCode =
  | 'TIMING_RESERVA'
  | 'TIMING_CANCELACION'
  | 'USUARIO_INACTIVO'
  | 'PLAN_REQUERIDO'
  | 'DISCIPLINA_REQUERIDA'
  | 'NIVEL_INSUFICIENTE'
  | 'CLASES_AGOTADAS';    // NEW
```

---

## UI Changes

### `src/components/portal/planes/SuscripcionModal.tsx` (display only, no form changes)

No changes required in the subscription creation flow. The class balance is server-managed.

### `src/components/portal/entrenamientos/reservas/ReservaFormModal.tsx`

When a booking attempt fails with code `CLASES_AGOTADAS`, display a clear inline error message:

> _"No te quedan clases disponibles en tu suscripción al plan [nombre del plan]. Contacta al administrador para renovar o ampliar tu plan."_

### `src/components/portal/inicio/InicioSuscripciones.tsx`

The athlete's home dashboard already renders a subscription card. Ensure `clases_restantes` is shown (if not null) clearly as:

> _"X clase(s) restante(s)"_ or _"Sin clases disponibles"_ when `= 0`.

Verify this card already displays `clases_restantes` from the subscription data. If it does not, add the field to the rendered subscription summary.

### `src/components/portal/gestion-suscripciones/SuscripcionesTable.tsx`

The admin subscriptions table should already display `clases_restantes`. Verify and add it as a read-only column if missing.

---

## Hooks Changes

### `src/hooks/portal/reservas/useReservaForm.ts`

No hook changes needed. The class deduction is fully server-side. The hook already handles `BookingResult` error codes from the service. Extend the error display map with `CLASES_AGOTADAS`.

### `src/hooks/portal/planes/useSuscripcion.ts`

No changes required.

---

## Migration File

Create: `supabase/migrations/{timestamp}_deduct_classes_on_booking.sql`

```sql
-- US-0035: Deduct subscription classes on booking / restore on cancel

-- 1. Add suscripcion_id to reservas
ALTER TABLE public.reservas
  ADD COLUMN suscripcion_id uuid,
  ADD CONSTRAINT reservas_suscripcion_id_fkey
    FOREIGN KEY (suscripcion_id)
    REFERENCES public.suscripciones(id)
    ON DELETE SET NULL;

CREATE INDEX idx_reservas_suscripcion_id ON public.reservas (suscripcion_id);

-- 2. Allow athletes to update clases_restantes on their own subscriptions
GRANT UPDATE ON public.suscripciones TO authenticated;

DROP POLICY IF EXISTS suscripciones_update_clases_own ON public.suscripciones;
CREATE POLICY suscripciones_update_clases_own ON public.suscripciones
  FOR UPDATE TO authenticated
  USING (atleta_id = auth.uid())
  WITH CHECK (atleta_id = auth.uid());

-- 3. RPC: atomic class deduction
CREATE OR REPLACE FUNCTION public.deduct_class_for_booking(p_suscripcion_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE suscripciones
  SET clases_restantes = clases_restantes - 1
  WHERE id = p_suscripcion_id
    AND clases_restantes > 0;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CLASES_AGOTADAS' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deduct_class_for_booking(uuid) TO authenticated;

-- 4. RPC: atomic class restoration on cancel
CREATE OR REPLACE FUNCTION public.restore_class_on_cancel(p_suscripcion_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE suscripciones
  SET clases_restantes = clases_restantes + 1
  WHERE id = p_suscripcion_id;
  -- Silently no-op if subscription was deleted
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_class_on_cancel(uuid) TO authenticated;
```

---

## Files to Create / Modify

| File | Action | Description |
|---|---|---|
| `supabase/migrations/{timestamp}_deduct_classes_on_booking.sql` | **Create** | DDL: `suscripcion_id` column on `reservas`, RLS update, two RPC functions |
| `src/services/supabase/portal/reservas.service.ts` | **Modify** | `create()` — deduct class after restriction check; `cancel()` — restore class on cancellation |
| `src/types/portal/reservas.types.ts` | **Modify** | Add `suscripcion_id: string \| null` to `Reserva` |
| `src/types/portal/entrenamiento-restricciones.types.ts` | **Modify** | Add `'CLASES_AGOTADAS'` to `BookingRejectionCode` union |
| `src/components/portal/entrenamientos/reservas/ReservaFormModal.tsx` | **Modify** | Add error display for `CLASES_AGOTADAS` code |
| `src/components/portal/inicio/InicioSuscripciones.tsx` | **Verify / Modify** | Ensure `clases_restantes` is displayed on the subscription card |
| `src/components/portal/gestion-suscripciones/SuscripcionesTable.tsx` | **Verify / Modify** | Ensure `clases_restantes` column is visible to admin |

---

## Expected Results

1. When an athlete books a training whose restriction requires plan P and the athlete's active subscription to plan P has `clases_restantes = N > 0`:
   - The booking is created successfully.
   - `suscripciones.clases_restantes` is decremented to `N − 1`.
   - `reservas.suscripcion_id` is populated with the charged subscription's ID.
2. When the athlete cancels the booking:
   - `suscripciones.clases_restantes` is restored to `N`.
   - `reservas.suscripcion_id` remains populated (for audit trail).
3. When the athlete attempts to book with `clases_restantes = 0`:
   - The booking is **rejected** with code `CLASES_AGOTADAS` and a human-readable message.
4. When the training has no plan restriction, or the matched plan has `clases_restantes IS NULL`, the booking proceeds without any deduction.
5. The athlete's subscription card on the home dashboard and the admin subscriptions table accurately reflect the current `clases_restantes` balance.
6. Admin or coach cancellation of a reservation also triggers class restoration.

---

## Acceptance Criteria

- [ ] Migration applies cleanly with no errors on a fresh or existing database.
- [ ] Booking a plan-restricted training with `clases_restantes = 5` → subscription shows `4`.
- [ ] Cancelling that reservation → subscription shows `5` again.
- [ ] Booking attempt with `clases_restantes = 0` → rejected with `CLASES_AGOTADAS` and no reservation created.
- [ ] Booking a training with no plan restriction → `clases_restantes` unchanged, `reservas.suscripcion_id = null`.
- [ ] Booking a training whose plan has `clases_restantes IS NULL` → booking succeeds, no deduction.
- [ ] Admin/coach cancellation restores classes exactly as athlete self-cancellation does.
- [ ] `reservas.suscripcion_id` is `NULL` when no class was deducted (no FK violation).
- [ ] If the subscription is deleted after booking but before cancellation, cancellation still succeeds (restoration is silently skipped).
- [ ] RLS prevents a user from directly calling the RPC with another user's `suscripcion_id` (the RPC must validate ownership or rely on the application layer to call it only with the authenticated athlete's own subscription).

---

## Non-Functional Requirements

### Security
- Class deduction and restoration must execute via Postgres RPC functions (`SECURITY DEFINER`) to prevent race conditions and direct RLS bypasses if the update policy is broader than intended.
- The `deduct_class_for_booking` function uses an atomic `UPDATE … WHERE clases_restantes > 0` with a `NOT FOUND` guard to prevent concurrent bookings from going below zero (optimistic locking at the DB level).
- RLS policies on `suscripciones` should be reviewed: the new `suscripciones_update_clases_own` policy grants broad UPDATE to the athlete. If only `clases_restantes` should be modifiable by athletes, migrate the deduction/restoration fully to `SECURITY DEFINER` RPCs and remove the broad UPDATE policy.

### Performance
- The subscription lookup query in `deductClassFromSubscription` must be covered by `idx_suscripciones_atleta_id` and `idx_suscripciones_plan_id` (both exist from the initial migration). Use a compound query filtering on `atleta_id`, `tenant_id`, `plan_id`, and `estado` to keep it a single indexed scan.
- The class deduction and reservation INSERT should be wrapped in a single RPC to avoid the two-round-trip window (see atomicity note above). For MVP, compensating logic on error is acceptable.

### Data Integrity
- `ON DELETE SET NULL` on `reservas.suscripcion_id` ensures that deleting a subscription does not cascade-delete reservations.
- The `clases_restantes` column must never go below zero. The RPC guard (`WHERE clases_restantes > 0`) and the `CHECK (clases_restantes IS NULL OR clases_restantes >= 0)` constraint (already present from the initial migration) together enforce this invariant.

### Backward Compatibility
- All existing trainings with no plan restriction, and all existing subscriptions with `clases_restantes IS NULL`, continue to work exactly as before.
- Existing reservations with no `suscripcion_id` (prior to this migration) are unaffected and treated as "no class charged".
