## 1. Setup

- [x] 1.1 Create a new branch named `fix/admin-past-training-service-deduction` from the current branch.
- [x] 1.2 Verify the working branch is not `main`, `master`, or `develop` before making any changes.

## 2. Service Layer — Date-aware entitlement helpers

- [x] 2.1 Add `toLocalDateString(iso: string | null): string` helper near `formatFechaHora` in `src/services/supabase/portal/reservas.service.ts`, returning the local `YYYY-MM-DD` date (or today's date if `iso` is `null`).
- [x] 2.2 Add `getEntrenamientoFechaHora(entrenamientoId: string, tenantId: string): Promise<string | null>` helper, mirroring the existing `isEntrenamientoPast` query shape (point lookup of `entrenamientos.fecha_hora` by id + `tenant_id`).
- [x] 2.3 Add `ServicioEntitlement` type (`{ suscripcionId: string; unidadesRestantes: number | null }`) and `getServicioEntitlements(tenantId: string, atletaId: string, referenceDate: string): Promise<Map<string, ServicioEntitlement[]>>` helper: query `suscripcion_servicios` joined to `suscripciones!inner(tenant_id, atleta_id, estado, fecha_inicio, fecha_fin)` filtered by `tenant_id`, `atleta_id`, and `estado <> 'cancelada'`; filter rows in JS where the subscription's `[fecha_inicio, fecha_fin]` window covers `referenceDate`; group surviving rows by `servicio_id` into a `Map`, each list sorted ascending by `unidades_restantes` (nulls last).

## 3. Service Layer — Wire entitlements into booking flow

- [x] 3.1 Update `findServiceSubscriptionsToCharge` to accept a new `referenceDate: string` parameter and resolve each `servicioId` via `getServicioEntitlements` (available → exhausted → none), removing the previous per-`servicioId` Supabase queries filtered on `estado = 'activa'`.
- [x] 3.2 Update `validateBookingRestrictions`: compute `referenceDate = toLocalDateString(ent.fecha_hora)` from the `fecha_hora` already loaded in the function, and replace the inline step-4b `activeServicioIds` query with `getServicioEntitlements(tenantId, atletaId, referenceDate)`.
- [x] 3.3 In `create()`, fetch `fecha_hora` once via `getEntrenamientoFechaHora(input.entrenamiento_id, input.tenant_id)` near the top of the function (before the `bypass_restrictions` branch) and compute `referenceDate = toLocalDateString(fechaHora)` for use by both the bypass and non-bypass paths.
- [x] 3.4 In `create()` step 1b (admin matched-restriction-row resolution): replace the inline `suscripcion_servicios` query with `getServicioEntitlements(input.tenant_id, input.atleta_id, referenceDate)` and derive `activeServicioIds` from entries whose entitlement list has `unidadesRestantes === null || unidadesRestantes > 0`.
- [x] 3.5 In `create()` step 2: pass `referenceDate` to `findServiceSubscriptionsToCharge`.

## 4. Manual Testing

- [x] 4.1 AC1/AC2 — Set up a subscription with `fecha_inicio`/`fecha_fin` covering an existing past training's date, `unidades_restantes = 1` for the training's required service, then transition it to `estado = 'vencida'` (via the cron function or manually). As admin, create a booking for that athlete on that past training. Verify the booking is created without an `ADMIN_CONFIRM_NO_UNITS` prompt, a `reserva_servicios` row is created, and `unidades_restantes` is decremented to `0`.
- [x] 4.2 AC3 — Repeat with `unidades_restantes = 0` on the matched (date-eligible, `'vencida'`) subscription. Verify the booking is rejected with `UNIDADES_AGOTADAS`, no reservation is created, and no further decrement occurs.
- [x] 4.3 AC4 — Repeat with no subscription covering the training's date for the required service at all. Verify `ADMIN_CONFIRM_NO_UNITS` is shown, and confirming creates the booking with no `reserva_servicios` row (unchanged from current behavior).
- [x] 4.4 AC5 — Repeat the AC1 scenario but with the matched subscription's `estado = 'cancelada'` instead of `'vencida'`. Verify it is excluded and the booking behaves like AC4.
- [x] 4.5 AC6 — Regression: athlete self-booking on a future training with an active subscription and available units still deducts correctly; admin booking on a future training behaves the same as before this change.
- [x] 4.6 AC7 — Cancel the booking created in 4.1 (AC1). Verify `unidades_restantes` is restored to `1` and the `reserva_servicios` row is removed.
- [x] 4.7 AC8 — Create or use a training with `fecha_hora = NULL` and confirm booking creation does not error and `referenceDate` falls back to today.

## 5. Documentation & Delivery

- [x] 5.1 Review `projectspec/03-project-structure.md` for references to `findServiceSubscriptionsToCharge` / service-entitlement lookups; update if the documented behavior no longer matches (otherwise skip — no new functions/services are exposed outside `reservas.service.ts`). Skipped: the existing entry for `reservas.service.ts` (line 236) describes responsibilities at a function-name level (`findServiceSubscriptionsToCharge`, `validateBookingRestrictions`) without documenting the internal `estado = 'activa'` eligibility rule, so it remains accurate.
- [x] 5.2 Write the commit message and pull request description summarizing the date-aware entitlement fix, referencing US-0068 and the acceptance criteria covered.
