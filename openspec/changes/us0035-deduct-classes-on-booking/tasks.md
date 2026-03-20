## 1. Git Setup

- [x] 1.1 Create branch `feat/us0035-deduct-classes-on-booking` from the current base branch
- [x] 1.2 Validate that the working branch is NOT `main`, `master`, or `develop` before proceeding

## 2. Database Migration

- [x] 2.1 Create migration file `supabase/migrations/20260319000200_deduct_classes_on_booking.sql` — add nullable FK column `suscripcion_id uuid REFERENCES suscripciones(id) ON DELETE SET NULL` to `reservas`, add index `idx_reservas_suscripcion_id`
- [x] 2.2 Add `CREATE OR REPLACE FUNCTION book_and_deduct_class(p_tenant_id uuid, p_atleta_id uuid, p_entrenamiento_id uuid, p_entrenamiento_categoria_id uuid, p_notas text, p_suscripcion_id uuid) RETURNS reservas LANGUAGE plpgsql SECURITY DEFINER` — atomically runs `UPDATE suscripciones SET clases_restantes = clases_restantes - 1 WHERE id = p_suscripcion_id AND clases_restantes > 0` (raises `P0001` code `CLASES_AGOTADAS` if no row updated) then inserts the reserva row and returns it
- [x] 2.3 Add `CREATE OR REPLACE FUNCTION cancel_and_restore_class(p_reserva_id uuid, p_tenant_id uuid, p_suscripcion_id uuid) RETURNS reservas LANGUAGE plpgsql SECURITY DEFINER` — atomically updates `reservas.estado = 'cancelada'` and (if `p_suscripcion_id IS NOT NULL`) increments `suscripciones.clases_restantes + 1` (silent no-op if row not found), returns updated reserva row
- [x] 2.4 Grant `EXECUTE` on both functions to `authenticated` role inside the same migration file
- [x] 2.5 Apply migration locally with `npx supabase db reset` or `npx supabase migration up` and verify both functions exist with `\df` in psql

## 3. Types

- [x] 3.1 In `src/types/portal/reservas.types.ts` — add `suscripcion_id: string | null` to the `Reserva` interface and to `ReservaView` if it extends or re-declares the base fields
- [x] 3.2 In `src/types/portal/entrenamiento-restricciones.types.ts` — add `'CLASES_AGOTADAS'` to the `BookingRejectionCode` union type

## 4. Service Layer

- [x] 4.1 In `src/services/supabase/portal/reservas.service.ts` — add private helper `findSubscriptionToCharge(tenantId, atletaId, planId)`: queries `suscripciones` for the active subscription matching `plan_id`, `estado = 'activa'`, ordered by `clases_restantes ASC NULLS LAST LIMIT 1`; returns `{ suscripcionId: string | null, exhausted: boolean }` — `exhausted: true` when `clases_restantes = 0` (triggers `CLASES_AGOTADAS` before the RPC call)
- [x] 4.2 Modify `create()` in `reservas.service.ts` — after `validateBookingRestrictions()` call `findSubscriptionToCharge()` when the matched restriction has a `plan_id`; if exhausted return `{ ok: false, code: 'CLASES_AGOTADAS', message: 'No te quedan clases disponibles en tu suscripción al plan requerido. Contacta al administrador para renovar o ampliar tu plan.' }`; replace the direct `INSERT reservas` with `supabase.rpc('book_and_deduct_class', {...})`, mapping `P0001` exception to the same `CLASES_AGOTADAS` rejection
- [x] 4.3 Modify `cancel()` in `reservas.service.ts` — fetch `suscripcion_id` from the reservation row before cancelling; replace the direct `UPDATE reservas SET estado='cancelada'` with `supabase.rpc('cancel_and_restore_class', { p_reserva_id, p_tenant_id, p_suscripcion_id })`

## 5. Components

- [x] 5.1 In `src/components/portal/entrenamientos/reservas/ReservaFormModal.tsx` — add a handler for `BookingResult` with `code === 'CLASES_AGOTADAS'`: render inline error message `"No te quedan clases disponibles en tu suscripción al plan requerido. Contacta al administrador para renovar o ampliar tu plan."` inside the modal (same style as existing restriction error messages); re-enable submit button after failure
- [x] 5.2 In `src/components/portal/inicio/InicioSuscripciones.tsx` — display `clases_restantes` on each active class-based subscription card: show `"X clases restantes"` label; apply warning styling (e.g., red text) when `clases_restantes = 0`; hide the counter when `clases_restantes IS NULL` (unlimited plan)
- [x] 5.3 In `src/components/portal/gestion-suscripciones/SuscripcionesTable.tsx` and `EditarSuscripcionModal.tsx` — ensure `clases_restantes` column/field is read-only (display-only label or `disabled` input); verify no form submission writes to `clases_restantes`; show `"Ilimitado"` when the value is `null`

## 6. Documentation

- [x] 6.1 Update `projectspec/03-project-structure.md` — document the two new SECURITY DEFINER RPCs (`book_and_deduct_class`, `cancel_and_restore_class`), the `reservas.suscripcion_id` FK column, and the updated booking and cancellation flows in `reservas.service.ts`

## 7. Commit & Pull Request

- [x] 7.1 Stage all changes and create a commit with message: `feat(reservas): deduct and restore subscription classes on booking/cancellation (US-0035)` — body should reference the two RPCs, the new FK column, and the CLASES_AGOTADAS rejection; write a PR description summarising the problem (clases_restantes was never auto-managed), solution (SECURITY DEFINER atomic RPCs), files changed, and testing steps
