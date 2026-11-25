## Why

Today, when an athlete tries to book a public training that requires a plan/service they don't hold, the booking is fully blocked: they must open the plan catalog, buy a plan (creating a `pendiente` subscription + payment), and wait for an admin to approve it before they can come back and book again — if the training still has room. This dead-ends the booking flow and loses interested athletes who would have been happy to reserve a spot while their plan request is reviewed. Trainers/admins need a way to opt in, per publication, to let the booking and the plan request move forward together instead of forcing a blocking wait.

## What Changes

- Add a publish-time toggle "Omitir confirmación de plan" (`entrenamientos_publicos.omitir_confirmacion_plan`, default `false`) so a trainer/admin can allow this behavior per public training publication.
- When the toggle is on and a booking is rejected only because of a missing/exhausted plan-linked service (`SERVICIO_REQUERIDO`/`UNIDADES_AGOTADAS`), let the athlete continue: they purchase a plan through the existing catalog flow (still creates a `pendiente` subscription + payment) and then complete the normal booking form, creating a `reservas` row in `pendiente` linked to that subscription — instead of being blocked. All other restriction checks (timing, membership status, discipline level), capacity, and duplicate-booking checks still apply unchanged.
- The server independently re-verifies the training's `omitir_confirmacion_plan` flag before allowing this path — never trusts a client-supplied bypass flag alone.
- When an admin approves the pending subscription/payment, any linked `pendiente` reservation is automatically confirmed and its service unit deducted.
- When an admin rejects the pending payment, they must now provide a reason (`motivo_rechazo`, new column on `pagos`) visible to the athlete; any linked `pendiente` reservation moves to a new `rechazada` state carrying the same reason. Cancelling a still-`pendiente` subscription cascades the same way. **BREAKING** (data model): `reservas.estado` gains a new allowed value `rechazada` (constraint change), and `reservas`/`pagos` gain new nullable columns — additive, no existing data affected.
- Fix an existing gap: resubmitting a payment proof on a rejected payment (`PagoCard` "Resubir comprobante") did not reset `pagos.estado` back to `pendiente`, silently leaving it stuck as rejected forever — this change fixes it so resubmission re-enters the review queue, since the new rejection flow depends on this working correctly.
- A `rechazada` reservation is never automatically reactivated; if the plan is eventually approved, the athlete must submit a new booking.
- With the toggle off (the default, and today's only behavior), nothing changes for existing published trainings.

## Capabilities

### New Capabilities
- `plan-skip-confirmation-booking`: the end-to-end "book now, plan pending" behavior — the publish-time toggle, the pending-booking-with-pending-plan creation path, and the admin approve/reject cascade (auto-confirm, or reject-with-visible-reason into the new `rechazada` reservation state).

### Modified Capabilities
- `training-booking-restrictions`: a `SERVICIO_REQUERIDO`/`UNIDADES_AGOTADAS` rejection can now be bypassed (server-reverified) when the target public training opts in, instead of always being a hard block.
- `subscription-management`: rejecting a pending payment now requires an admin-entered reason stored and shown to the athlete; resubmitting a proof on a rejected payment now resets it to `pendiente` for re-review.

## Impact

- **Database**: new migration — `entrenamientos_publicos.omitir_confirmacion_plan`, `reservas.motivo_rechazo` + widened `reservas_estado_ck` (adds `rechazada`), `pagos.motivo_rechazo`, `CREATE OR REPLACE` of `book_and_deduct_service_units` (new optional params), two new `SECURITY DEFINER` functions (`confirm_pending_reservas_for_suscripcion`, `reject_pending_reservas_for_suscripcion`).
- **Services**: `entrenamientos-publicos.service.ts`, `reservas.service.ts`, `gestion-suscripciones.service.ts`, `pagos.service.ts`.
- **Hooks**: `usePublicarEntrenamiento.ts`, `usePublicTrainingReserva.ts`, `useSuscripcion.ts`, `useValidarPago.ts`, `useValidarSuscripcion.ts`.
- **Components**: `PublicarEntrenamientoModal.tsx`, `PublicTrainingReservaModal.tsx`, `PlanesPublicosModal.tsx`/`SuscripcionModal.tsx`, `ValidarPagoModal.tsx`, `PagoCard.tsx`, reservation status badges (`ReservaStatusBadge.tsx`, `ReservaEstadoBadge.tsx`) and athlete-facing reservation views.
- **Types**: `entrenamientos-publicos.types.ts`, `reservas.types.ts`, `pagos.types.ts`/`gestion-suscripciones.types.ts`.
- No new pages/routes; no new API routes (this codebase has no `/api` layer for portal features — all data access goes through the Supabase service layer per `projectspec/03-project-structure.md`).
