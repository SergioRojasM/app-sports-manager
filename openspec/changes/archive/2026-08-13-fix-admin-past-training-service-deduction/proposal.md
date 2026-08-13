## Why

Admin-created bookings for athletes on **past** training sessions are saved successfully but silently fail to deduct the required service units: `reservasService.create()` resolves the athlete's eligible `suscripcion_servicios` rows by filtering on `suscripciones.estado = 'activa'` (current status), but a subscription that legitimately covered the training's date may have since been auto-expired to `'vencida'` by the daily `vencer_suscripciones_expiradas` cron. This leaves `suscripcion_servicios.unidades_restantes` balances inaccurate for retroactive bookings (walk-ins, missed-booking corrections) registered by an administrator.

## What Changes

- Add a date-aware service-entitlement lookup (`getServicioEntitlements`) that determines eligibility based on whether the subscription's `[fecha_inicio, fecha_fin]` window covers the **training's date** (`entrenamientos.fecha_hora`), combined with `estado <> 'cancelada'` — instead of the current snapshot check `estado = 'activa'`.
- Add `getEntrenamientoFechaHora` + `toLocalDateString` helpers to compute a single `referenceDate` (`YYYY-MM-DD`, local calendar date) per `create()` call, defaulting to "today" if `fecha_hora` is `null`.
- Update `findServiceSubscriptionsToCharge` to accept `referenceDate` and resolve charge entries from `getServicioEntitlements` instead of issuing per-`servicio_id` queries filtered by `estado = 'activa'`.
- Update `validateBookingRestrictions` (athlete path, step 4b) to build its `activeServicioIds` set from the same `getServicioEntitlements` helper, for consistency (no behavior change for athletes, since past-training bookings are already blocked for them per US-0040).
- Update `create()` (admin bypass path, step 1b) to derive `activeServicioIds` from `getServicioEntitlements`, so the matched restriction row correctly reflects subscriptions valid as of the training's date.
- No database migrations, RPC changes, or UI changes — this is a pure application-layer (service) fix confined to `src/services/supabase/portal/reservas.service.ts`.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `booking-service-unit-deduction`: the rule for determining which of an athlete's `suscripcion_servicios` rows are eligible to be matched/charged for a booking changes from "subscription currently has `estado = 'activa'`" to "subscription has `estado <> 'cancelada'` AND its `[fecha_inicio, fecha_fin]` window covers the training's date (`referenceDate`)". This affects both the admin bypass matching step and `findServiceSubscriptionsToCharge`.

## Impact

- **Code**: `src/services/supabase/portal/reservas.service.ts` — new private helpers (`getServicioEntitlements`, `getEntrenamientoFechaHora`, `toLocalDateString`, `ServicioEntitlement` type), modified `findServiceSubscriptionsToCharge` signature, modified `validateBookingRestrictions` step 4b, modified `create()` (both bypass and non-bypass paths).
- **Database**: none. `suscripciones`, `suscripcion_servicios`, `reserva_servicios`, `book_and_deduct_service_units`, `cancel_and_restore_service_units`, and `vencer_suscripciones_expiradas` are all unchanged.
- **API/RPCs**: none.
- **UI**: none — `CreateReservaInput`, `BookingResult`, and `useReservas.ts` are unaffected.
- **Affected flows**: admin retroactive booking creation (US-0061 bypass path) and, as a consistency side-effect, the athlete booking-restriction evaluation (`validateBookingRestrictions`), with no observable behavior change for athletes.
