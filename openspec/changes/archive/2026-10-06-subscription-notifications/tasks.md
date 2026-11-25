Tasks are listed page → component → hook → service → types. This change has no page or component work.

## 1. Branch setup

- [x] 1.1 Create the branch `feat/subscription-notifications` from `develop`
- [x] 1.2 Validate that the working branch is not `main`, `master` or `develop`

## 2. Hook

- [x] 2.1 `src/hooks/portal/planes/useSuscripcion.ts`: keep a payment id in a ref, generated with `crypto.randomUUID()` when the modal opens (`openModal`) and reused by every `submit` until the modal closes
- [x] 2.2 `submit`: when a file was chosen, upload it first with `storageService.uploadPaymentProof(supabase, tenantId, user.id, pagoId, file, { upsert: true })`; on upload failure continue with `comprobantePath = null`
- [x] 2.3 `submit`: replace the `createSuscripcion` / `createPago` / `updateComprobantePath` sequence with one `suscripcionesService.comprarSuscripcion({ tenantId, planId, planTipoId, metodoPagoId, comentarios, pagoId, comprobantePath })`
- [x] 2.4 `submit`: map `SuscripcionServiceError` codes to the messages of the spec (`plan_unavailable`, `pending_exists`, `invalid_payment_method`, `invalid_proof`, `unknown`) and remove the "Se creó la suscripción pero hubo un error al registrar el pago" branch
- [x] 2.5 Keep the success ending (message, closing the modal, resetting the selection) and the `hasPendingSuscripcion` pre-check unchanged

## 3. Service

- [x] 3.1 `src/services/supabase/portal/suscripciones.service.ts`: add `comprarSuscripcion(payload)` calling the `comprar_suscripcion` RPC and returning `{ suscripcionId, pagoId }`, with the error mapping by message (`PLAN_NO_DISPONIBLE`, `SUBTIPO_NO_DISPONIBLE`, `SUSCRIPCION_PENDIENTE_EXISTENTE`, `METODO_PAGO_INVALIDO`, `COMPROBANTE_INVALIDO`)
- [x] 3.2 Remove `suscripcionesService.createSuscripcion` and `pagosService.createPago`; keep `pagosService.updateComprobantePath`

## 4. Types

- [x] 4.1 `src/types/portal/suscripciones.types.ts`: add `ComprarSuscripcionPayload` and the `SuscripcionServiceError` codes `pending_exists`, `invalid_payment_method`, `invalid_proof`
- [x] 4.2 Remove `SuscripcionInsert` and `PagoInsert` (`src/types/portal/pagos.types.ts`) if nothing else imports them

## 5. Server library

- [x] 5.1 Create `src/lib/notificaciones/modulos/suscripciones.ts` (`server-only`) with a loader that reads the subscription (`plan:planes(nombre)`, `plan_tipo:plan_tipos(nombre)`, `tenant:tenants(nombre)`, `atleta:usuarios(nombre, apellido)`) and the payment (`payload.pago_id`, else the latest of the subscription) with `createServiceClient()`, returning `null` when the subscription is gone
- [x] 5.2 Add the six athlete handlers (`suscripcion_recibida`, `pago_validado`, `pago_rechazado`, `suscripcion_aprobada`, `suscripcion_rechazada`, `suscripcion_asignada`) with subject "{title} — {plan}", the body rows of the spec and the "Ver mis suscripciones" button
- [x] 5.3 Add the two administrator handlers (`suscripcion_nueva_admin` with the title by `requiere_validacion` and the "Comprobante adjunto" row; `pago_comprobante_admin`) with the button to `{APP_URL}/portal/orgs/{tenant_id}/gestion-suscripciones`
- [x] 5.4 Export `suscripcionesHandlers` and spread it into `HANDLERS` in `src/lib/notificaciones/registro.ts`

## 6. Database migration (local only)

- [x] 6.1 Create `supabase/migrations/20261011120000_notificaciones_suscripciones.sql` wrapped in `begin; ... commit;` (use the next free timestamp if a later migration exists)
- [x] 6.2 Create `_encolar_notificacion_suscripcion(uuid, text, uuid)` with the texts, links and payload of the spec; revoke it from `public`, `anon`, `authenticated`
- [x] 6.3 Create `comprar_suscripcion(...)` with the validations, the advisory lock, the three inserts, the guarded notification block and the result; grant execute to `authenticated` only
- [x] 6.4 Drop the policies `suscripciones_insert_own` and `pagos_insert_own`
- [x] 6.5 Create the trigger functions and triggers `suscripciones_notificar_insert`, `suscripciones_notificar_estado` and `pagos_notificar_update`, each with the catch-all exception handler; revoke the functions from clients
- [x] 6.6 Apply locally with `npx supabase migration up`. Never push the migration to the remote Supabase project

## 7. Verification

- [x] 7.1 Grants: the helper and trigger functions are not executable by `anon` / `authenticated`; `comprar_suscripcion` is executable by `authenticated` and not by `anon`; an athlete's direct insert into `suscripciones` and `pagos` is denied; an administrator's insert still works
- [x] 7.2 Purchase RPC: success with and without subtype; server-side amount; every rejection code; atomic rollback (no rows, no notifications); two simultaneous calls for the same plan
- [x] 7.3 Purchase from the UI, in a tenant's plans and in the public plans modal: with proof (payment created with the path, one administrator notification), without proof, with a failing upload, and a retry in the same modal reusing the payment id (marked as finished by the product owner; only the with-proof purchase in a tenant's plans was exercised in the browser)
- [x] 7.4 Staff decisions: approve payment, reject payment with reason, approve subscription, cancel pending subscription — the athlete gets the right notification and no administrator is notified
- [x] 7.5 Proof uploaded again from "Mis suscripciones": after a rejection, replacing a proof, and first upload of a purchase made without one — administrators notified, athlete not
- [x] 7.6 Administrator-created subscription in each combination (`pendiente` / `activa`, without payment, payment `pendiente` / `validado`): exactly one `suscripcion_asignada`; then approving a pending one adds `suscripcion_aprobada`
- [x] 7.7 Silent cases: athlete cancels the own request, expiry cron, edit, delete, `activa → cancelada`
- [x] 7.8 Recipients: trainers, other athletes and `pendiente_activacion` administrators get nothing; in-app links open "Mis suscripciones" and the tenant's "Gestión de suscripciones"
- [x] 7.9 Emails in Mailpit (`EMAIL_DEV_MAILPIT_URL`): the eight types arrive with subject "{title} — {plan}", the expected rows and button; a row whose subscription was deleted is failed as `skipped`
- [x] 7.10 A forced error inside a trigger does not block the write
- [x] 7.11 Run `npx tsc --noEmit` and `npm run lint`; no new problem in the touched files. Do not run `build`

## 8. Documentation and delivery

- [x] 8.1 Update `projectspec/03-project-structure.md`: the RPC and dropped policies, the triggers and matrix under "Notifications module", `modulos/suscripciones.ts`, and the changed service / hook descriptions
- [x] 8.2 Write the commit message and the pull request description, including the deploy order (application first, then the migration)
