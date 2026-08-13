## Why

Training access restrictions are currently tied to `plan_id` and `disciplina_id`, which pre-date the service-unit entitlement model introduced in US-0062/US-0063. This creates an inconsistency: subscriptions now track units per service, but restriction evaluation and unit deduction still run against the old plan/discipline model. Aligning restrictions to services closes the gap and makes the entire booking flow consistent.

## What Changes

- Add `servicio_1_id`, `servicio_2_id`, `servicio_3_id`, `servicio_4_id` (nullable FKs to `servicios`) and `descripcion` columns to `entrenamiento_restricciones` and `entrenamiento_grupo_restricciones`. Legacy `plan_id`/`disciplina_id` columns are kept (unused) — removal is deferred to a future clean-up US.
- Create `reserva_servicios` table to log each `(reserva_id, suscripcion_id, servicio_id)` pair deducted per booking, enabling accurate multi-service restoration on cancellation.
- Replace `book_and_deduct_class` and `cancel_and_restore_class` RPCs with `book_and_deduct_service_units` (accepts a JSONB deductions array) and `cancel_and_restore_service_units` (self-heals from `reserva_servicios`).
- Rewrite `validateBookingRestrictions` to evaluate athlete's active service entitlements (from `suscripcion_servicios`) instead of plan/discipline membership.
- Add `findServiceSubscriptionsToCharge` (replaces `findSubscriptionToCharge`) — resolves one subscription per service ID, returns exhausted flags.
- **BREAKING**: `create()` in `reservas.service.ts` now passes a JSONB deductions array to the RPC instead of a single `suscripcion_id`. Unit deduction hits `suscripcion_servicios.unidades_restantes`, not `suscripciones.clases_restantes`.
- Update `EntrenamientoRestriccionesSection` UI: replace Plan/Discipline dropdowns with up to 4 Service dropdowns per rule row, plus a `descripcion` text field and an AND/OR guide tooltip.
- Update restriction form state in `useEntrenamientoForm` and restriction persistence in `entrenamientos.service.ts`.

## Non-goals

- Removing `plan_id`/`disciplina_id` columns from the DB (deferred to a future clean-up US).
- Migrating existing restriction row data — old rows lose their plan/discipline values but the booking logic simply treats them as unrestricted until the admin reconfigures them.
- Changing `validar_nivel_disciplina` semantics — that flag remains as-is.
- Any changes to the subscription creation or payment flows.

## Capabilities

### New Capabilities
- `training-restrictions-by-service`: Service-based access restriction evaluation and multi-service unit deduction on booking. Covers the new DB columns, `reserva_servicios` table, updated RPCs, and updated `validateBookingRestrictions` logic.
- `booking-service-unit-deduction`: Atomic multi-service unit deduction via JSONB RPC (`book_and_deduct_service_units`) and restoration via `cancel_and_restore_service_units`, backed by the `reserva_servicios` ledger table.

### Modified Capabilities
- `training-booking-restrictions`: Restriction evaluation logic changes from plan/discipline membership to service-entitlement set membership. Rejection code `SERVICIO_REQUERIDO` replaces `PLAN_REQUERIDO`/`DISCIPLINA_REQUERIDA`.
- `subscription-class-deduction`: Deduction target changes from `suscripciones.clases_restantes` to `suscripcion_servicios.unidades_restantes`; deduction is now per-service (multiple per booking) instead of a single class counter.

## Impact

- **Database**: 2 altered tables (`entrenamiento_restricciones`, `entrenamiento_grupo_restricciones`), 1 new table (`reserva_servicios`), 2 new SECURITY DEFINER RPCs, 2 deprecated RPCs.
- **Types**: `entrenamiento-restricciones.types.ts` (new fields, new rejection code), `reservas.types.ts` (new `ReservaServicio` type).
- **Services**: `reservas.service.ts` (core booking/cancellation logic), `entrenamientos.service.ts` (restriction upsert).
- **Hooks**: `useEntrenamientoForm.ts` (restriction row state shape).
- **Components**: `EntrenamientoRestriccionesSection.tsx` (UI redesign of restriction editor).
- **No changes** to pages, layouts, or auth flows.
