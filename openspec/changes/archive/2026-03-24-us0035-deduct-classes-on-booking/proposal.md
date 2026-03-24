## Why

`suscripciones.clases_restantes` has existed in the database since the initial schema but is never decremented when an athlete books a training or restored when they cancel. Now that US-0034 introduced plan-based access restrictions on trainings (`entrenamiento_restricciones.plan_id`), the gate to enforce class-based limits is in place. This story closes the loop: bookings consume classes, cancellations return them.

## What Changes

- **New**: `reservas.suscripcion_id` nullable FK column to record which subscription was charged for each booking (enables deterministic restoration on cancel).
- **New**: Two `SECURITY DEFINER` Postgres RPC functions — `deduct_class_for_booking` (atomic decrement with guard against going below zero) and `restore_class_on_cancel` (safe increment, no-op if subscription deleted).
- **New**: RLS UPDATE policy on `suscripciones` scoped to the athlete's own rows (or delegation to RPC-only pattern for tighter security).
- **Modified**: `reservas.service.ts` → `create()` deducts a class after restriction validation passes; `cancel()` restores the class if `suscripcion_id` is set on the reservation.
- **Modified**: `BookingRejectionCode` type union — adds `'CLASES_AGOTADAS'` code.
- **Modified**: `Reserva` type — adds `suscripcion_id: string | null`.
- **Modified**: `ReservaFormModal` — renders a user-friendly inline error when `CLASES_AGOTADAS` is returned.
- **Verified / Modified**: `InicioSuscripciones` — ensures `clases_restantes` balance is surfaced to the athlete on their home dashboard.
- **Verified / Modified**: `SuscripcionesTable` — ensures `clases_restantes` is visible to admins in the subscription management table.

## Capabilities

### New Capabilities

- `subscription-class-deduction`: Automatic deduction and restoration of `clases_restantes` when a plan-restricted training is booked or cancelled. Covers DB changes (column + RPCs), service layer logic, type updates, and UI error feedback.

### Modified Capabilities

- `training-booking`: Booking creation and cancellation flows now carry class-deduction side-effects when the matched restriction row has a `plan_id` and the subscription is class-based. The booking rejection surface gains a new `CLASES_AGOTADAS` code.
- `subscription-management`: `clases_restantes` transitions from a static admin-managed field to a system-managed counter; it must be clearly displayed to athletes (dashboard) and admins (subscriptions table).

## Non-goals

- Automatically expiring or deactivating a subscription when `clases_restantes` reaches zero — that remains a manual admin action.
- Deducting classes for trainings with no plan restriction.
- Deducting more than 1 class per booking (multi-class packs are out of scope).
- Notifying the athlete by email/push when their class balance is low.
- Partial class refunds for any reason other than a full booking cancellation.

## Impact

**Code**
- `supabase/migrations/` — new migration file with `ALTER TABLE reservas`, two RPC functions, and RLS update.
- `src/services/supabase/portal/reservas.service.ts` — `create()` and `cancel()` modified.
- `src/types/portal/reservas.types.ts` — `Reserva` interface extended.
- `src/types/portal/entrenamiento-restricciones.types.ts` — `BookingRejectionCode` union extended.
- `src/components/portal/entrenamientos/reservas/ReservaFormModal.tsx` — error display for `CLASES_AGOTADAS`.
- `src/components/portal/inicio/InicioSuscripciones.tsx` — verify/add `clases_restantes` display.
- `src/components/portal/gestion-suscripciones/SuscripcionesTable.tsx` — verify/add `clases_restantes` column.

**Database**
- New column: `reservas.suscripcion_id uuid` (nullable FK → `suscripciones`, ON DELETE SET NULL).
- New index: `idx_reservas_suscripcion_id`.
- New RPCs: `deduct_class_for_booking(uuid)`, `restore_class_on_cancel(uuid)`.
- New/updated RLS policy on `suscripciones`.

**Dependencies**
- Requires US-0034 migration (`entrenamiento_restricciones` table + `validateBookingRestrictions` in `reservas.service.ts`) to already be applied — which it is (merged to main).

## Step-by-Step Implementation Plan

1. **Migration** — Create `supabase/migrations/{timestamp}_deduct_classes_on_booking.sql`:
   - `ALTER TABLE reservas ADD COLUMN suscripcion_id uuid ...`
   - `CREATE INDEX idx_reservas_suscripcion_id`
   - `CREATE OR REPLACE FUNCTION deduct_class_for_booking`
   - `CREATE OR REPLACE FUNCTION restore_class_on_cancel`
   - `GRANT EXECUTE` on both functions
   - RLS UPDATE policy on `suscripciones`

2. **Types** — Update `reservas.types.ts` (`suscripcion_id` on `Reserva`) and `entrenamiento-restricciones.types.ts` (`CLASES_AGOTADAS` code).

3. **Service** — Modify `reservas.service.ts`:
   - Extract winning plan ID from restriction validation result.
   - Find and deduct class from matched subscription via `supabase.rpc('deduct_class_for_booking', ...)`.
   - Populate `suscripcion_id` in `INSERT`.
   - On `cancel()`, read `suscripcion_id` from the reservation then call `supabase.rpc('restore_class_on_cancel', ...)`.

4. **Component — error feedback** — Update `ReservaFormModal.tsx` to display a human-readable message for `CLASES_AGOTADAS`.

5. **Component — balance display** — Verify `InicioSuscripciones.tsx` renders `clases_restantes`; add if missing.

6. **Component — admin table** — Verify `SuscripcionesTable.tsx` shows `clases_restantes`; add column if missing.

## Files to Create / Modify

| File | Action |
|---|---|
| `supabase/migrations/{timestamp}_deduct_classes_on_booking.sql` | **Create** |
| `src/types/portal/reservas.types.ts` | **Modify** |
| `src/types/portal/entrenamiento-restricciones.types.ts` | **Modify** |
| `src/services/supabase/portal/reservas.service.ts` | **Modify** |
| `src/components/portal/entrenamientos/reservas/ReservaFormModal.tsx` | **Modify** |
| `src/components/portal/inicio/InicioSuscripciones.tsx` | **Verify / Modify** |
| `src/components/portal/gestion-suscripciones/SuscripcionesTable.tsx` | **Verify / Modify** |
