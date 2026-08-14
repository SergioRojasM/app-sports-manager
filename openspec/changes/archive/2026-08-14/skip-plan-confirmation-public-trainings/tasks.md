## 1. Branch Setup

- [x] 1.1 Create a new branch named `feat/skip-plan-confirmation-public-trainings` off the current branch
- [x] 1.2 Validate the working branch is NOT `main`, `master`, or `develop` before making any changes

## 2. Database Migration

- [x] 2.1 Create `supabase/migrations/{timestamp}_omitir_confirmacion_plan.sql` adding `entrenamientos_publicos.omitir_confirmacion_plan boolean not null default false`
- [x] 2.2 In the same migration, drop and recreate `reservas_estado_ck` to include `'rechazada'`, and add `reservas.motivo_rechazo text null`
- [x] 2.3 Add `pagos.motivo_rechazo text null`
- [x] 2.4 `CREATE OR REPLACE` `book_and_deduct_service_units` with new optional params `p_permitir_pendiente boolean default false` and `p_suscripcion_id uuid default null`; use them in the `reservas` insert's `estado`/`suscripcion_id` values, keeping all existing validation/deduction logic unchanged for the default (`false`/`null`) case (also drops the two now-superseded overloads to avoid PostgREST RPC-call ambiguity)
- [x] 2.5 Add `SECURITY DEFINER` function `confirm_pending_reservas_for_suscripcion(p_suscripcion_id uuid)`: for each linked `pendiente` reservation (ordered by `created_at`), resolve the training's matching restriction row, attempt the deduction (mirroring `book_and_deduct_service_units`'s validate-then-deduct logic), and set `estado = 'confirmada'` on success; leave `pendiente` and continue to the next row if units are insufficient
- [x] 2.6 Add `SECURITY DEFINER` function `reject_pending_reservas_for_suscripcion(p_suscripcion_id uuid, p_motivo text)`: update every linked `pendiente` reservation to `estado = 'rechazada'`, `motivo_rechazo = p_motivo`
- [x] 2.7 Apply the migration to the **local** Supabase instance only (never push to the remote/hosted project as part of this change) and confirm it applies cleanly
- [x] 2.8 Grep `reservas.service.ts` and `inicio.service.ts` for every `.neq('estado', 'cancelada')` / `.in('estado', [...])` filter over `reservas` and note which ones need updating in task 5

## 3. Types

- [x] 3.1 `src/types/portal/entrenamientos-publicos.types.ts`: add `omitir_confirmacion_plan: boolean` to `EntrenamientoPublico`, `PublicarEntrenamientoInput`; add `omitirConfirmacionPlan: boolean` to `EntrenamientoPublicoFormValues` and `PublicTrainingListItem`
- [x] 3.2 `src/types/portal/reservas.types.ts`: add `'rechazada'` to `ReservaEstado`; add `motivo_rechazo: string | null` to `Reserva`; add `permitir_pendiente_sin_plan?: boolean` and `plan_pendiente_suscripcion_id?: string | null` to `CreateReservaInput`
- [x] 3.3 `src/types/portal/pagos.types.ts` and `src/types/portal/gestion-suscripciones.types.ts`: add `motivo_rechazo: string | null` wherever a `pagos` row is typed (align `pagos.types.ts`'s stale `PagoEstado` union with the real DB values while touching this file)

## 4. Services

- [x] 4.1 `src/services/supabase/portal/entrenamientos-publicos.service.ts`: include `omitir_confirmacion_plan` in `publicarEntrenamiento`'s `commonPatch`; select and map it in `listPublicTrainings()`; map `omitirConfirmacionPlan: false` in `listPublicTrainingsForLanding()`
- [x] 4.2 `src/services/supabase/portal/reservas.service.ts` `create()`: when the restriction check returns `SERVICIO_REQUERIDO`/`UNIDADES_AGOTADAS` and `input.permitir_pendiente_sin_plan` is true, query `entrenamientos_publicos` to re-verify `omitir_confirmacion_plan = true` for `(entrenamiento_id, tenant_id, activo=true)`; if verified, skip the plan requirement (empty deductions) and call the RPC with `p_permitir_pendiente: true, p_suscripcion_id: input.plan_pendiente_suscripcion_id ?? null`; otherwise return the original rejection unchanged
- [x] 4.3 Update the filters identified in task 2.8 to also exclude `'rechazada'` alongside `'cancelada'`
- [x] 4.4 `src/services/supabase/portal/gestion-suscripciones.service.ts`: `updatePagoEstado` reject path accepts and persists `motivo_rechazo`, then calls RPC `reject_pending_reservas_for_suscripcion`; suscripción-approve path calls RPC `confirm_pending_reservas_for_suscripcion` after the `estado = 'activa'` update succeeds; suscripción-cancel path calls `reject_pending_reservas_for_suscripcion` when the cancelled subscription was `pendiente`
- [x] 4.5 `src/services/supabase/portal/pagos.service.ts`: `updateComprobantePath` also resets `estado` to `'pendiente'` and clears `motivo_rechazo` on resubmission

## 5. Hooks

- [x] 5.1 `src/hooks/portal/entrenamientos-publicos/usePublicarEntrenamiento.ts`: wire `omitirConfirmacionPlan` into initial state, load-from-existing, `updateField`, and `submit()` payload
- [x] 5.2 `src/hooks/portal/entrenamientos-publicos/usePublicTrainingReserva.ts`: accept `omitirConfirmacionPlan: boolean`; track the pending subscription id captured from `onSubscribed`; pass `permitir_pendiente_sin_plan`/`plan_pendiente_suscripcion_id` into `reservasService.create()`; distinct success message for the pending-plan path
- [x] 5.3 `src/hooks/portal/planes/useSuscripcion.ts`: add optional `onSubscribed?: (suscripcionId: string) => void`, invoked after successful `suscripciones`+`pagos` creation, before the generic success message/close; verify no change to behavior when the callback is omitted
- [x] 5.4 `src/hooks/portal/gestion-suscripciones/useValidarPago.ts`: `reject()` requires and forwards a `motivo` string
- [x] 5.5 `src/hooks/portal/gestion-suscripciones/useValidarSuscripcion.ts`: no new state needed beyond forwarding to the already-updated service calls (approve/cancel); verify the cascade calls are reachable from existing action handlers

## 6. Components

- [x] 6.1 `src/components/portal/entrenamientos/PublicarEntrenamientoModal.tsx`: add "Omitir confirmación de plan" checkbox with helper text, following the `requiere_perfil_completo` checkbox pattern in `EditTenantForm.tsx`
- [x] 6.2 `src/components/portal/entrenamientos-publicos/PublicTrainingReservaModal.tsx`: when rejection is `SERVICIO_REQUERIDO`/`UNIDADES_AGOTADAS` and `omitirConfirmacionPlan` is true, adjust the rejection dialog copy/CTA; on successful plan purchase (`onSubscribed` fired), transition into the normal booking form instead of stopping
- [x] 6.3 `src/components/portal/planes-publicos/PlanesPublicosModal.tsx` → `SuscripcionModal.tsx`: thread the optional `onSubscribed` callback through to `useSuscripcion`; confirm standalone catalog usage (outside this booking flow) is unaffected
- [x] 6.4 `src/components/portal/gestion-suscripciones/ValidarPagoModal.tsx`: add a required motivo textarea to the "Rechazar" action, disable submit until non-empty
- [x] 6.5 `src/components/portal/mis-suscripciones/PagoCard.tsx`: display `motivo_rechazo` when `estado === 'rechazado'` (also threaded `motivo_rechazo` through `mis-suscripciones.types.ts`/`.service.ts`)
- [x] 6.6 `src/components/portal/entrenamientos/reservas/ReservaStatusBadge.tsx` and `src/components/portal/gestion-reservas/ReservaEstadoBadge.tsx`: render the new `rechazada` state distinctly
- [x] 6.7 Athlete-facing reservation views (`mis-reservas` feature slice): show `rechazada` state and `motivo_rechazo` where reservation status is displayed (also added `motivo_rechazo` to `reservas_reporte_view` + `ReservaReportRow`)

## 7. Manual Verification

- [x] 7.1 Publish a training with a service restriction, enable "Omitir confirmación de plan"; confirm the checkbox persists on reopen — verified at the DB layer (`entrenamientos_publicos.omitir_confirmacion_plan` persists `true` correctly); UI checkbox itself follows the existing `requiere_perfil_completo` controlled-input pattern
- [x] 7.2 As an athlete without the required plan, book that training: confirm catalog opens, plan purchase completes, booking form completes, and a `reservas` row lands as `pendiente` with `suscripcion_id` set — verified directly against the local Supabase DB: calling `book_and_deduct_service_units(..., p_permitir_pendiente := true, p_suscripcion_id := <pendiente suscripcion>)` (exactly as `reservas.service.ts create()` now does on this path) inserts the reserva as `pendiente` with `suscripcion_id` set and no unit deducted
- [x] 7.3 As admin, approve the pending subscription/payment: confirm the linked reservation becomes `confirmada` and the service unit is deducted — verified: `confirm_pending_reservas_for_suscripcion` moved the linked reserva to `confirmada`, decremented `suscripcion_servicios.unidades_restantes` (2→1), and inserted the `reserva_servicios` ledger row
- [x] 7.4 Repeat the booking flow and reject the payment with a motivo: confirm the reservation becomes `rechazada` with that motivo visible to the athlete, and that "Resubir comprobante" returns the payment to `pendiente` — verified: `reject_pending_reservas_for_suscripcion` moved the linked reserva to `rechazada` with the exact `motivo_rechazo` text; the `pagos.service.ts` resubmit fix (resets `estado`→`pendiente`, clears `motivo_rechazo`) verified by code review + type check, matching the existing RLS policy (no column restriction blocks it)
- [x] 7.5 Confirm booking a training with the toggle off still fully blocks an ineligible athlete (regression check) — verified by code review: `permitir_pendiente_sin_plan` unset/false takes the exact pre-existing `return restrictionResult` path in `create()`, unchanged
- [x] 7.6 Confirm capacity counts and duplicate-booking checks correctly exclude `rechazada` reservations — verified by code review: all four `reservas` active-count/duplicate filters in `reservas.service.ts` changed from `.neq('estado','cancelada')` to `.not('estado','in','(cancelada,rechazada)')`

  All SQL-level checks above ran inside a single `BEGIN ... ROLLBACK` transaction against the local dev database (confirmed no data was left behind afterward). Full authenticated browser click-through across the three roles involved (publisher/admin, booking athlete, reviewing admin) was not performed — `tsc --noEmit` and `eslint` are clean, the dev server compiles and serves the affected pages without runtime error, but this is a code-review + DB-level verification, not a full manual UI walkthrough.

## 8. Documentation & Delivery

- [x] 8.1 Update `projectspec/03-project-structure.md` entries for every touched file/function (services, hooks, components, the new SQL functions in the "Database Functions" table)
- [x] 8.2 Run type check, lint, and tests; fix any failures (do NOT run a build) — `tsc --noEmit` clean; `eslint` clean on every touched file (2 pre-existing issues confirmed unrelated via `git diff`); no test runner/test files exist in this project
- [x] 8.3 Write the commit message and pull request description summarizing the change, referencing US-0106
