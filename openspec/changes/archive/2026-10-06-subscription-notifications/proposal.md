## Why

The subscriptions module tells nobody anything: an athlete who buys a plan only sees an on-screen message, and administrators discover payments waiting for validation by opening "Gestión de suscripciones". The notifications module of US-0125 already delivers email and in-app notifications, but events are its only consumer.

Wiring subscriptions into it exposes a second problem. A purchase is three separate client calls (subscription, payment, proof path): it is not atomic, the client chooses the amount, and the proof arrives as a later update that cannot be told apart from a re-upload. This change (US-0134, `projectspec/userstory/us0134-subscription-notifications.md`) fixes both.

## What Changes

- New RPC `comprar_suscripcion`: creates the subscription, its service units and the payment (with the proof path already set) in one transaction, takes the amount from `plan_tipos.precio`, validates plan, subtype, duplicate pending request, payment method and proof path on the server, and enqueues the purchase notifications.
- The proof file is uploaded **before** the RPC, to a path built from a payment id generated in the browser.
- **BREAKING** The athlete insert policies `suscripciones_insert_own` and `pagos_insert_own` are dropped: athletes create subscriptions and payments only through the RPC. `suscripcionesService.createSuscripcion` and `pagosService.createPago` are removed.
- New `AFTER` row triggers on `suscripciones` and `pagos` enqueue notifications for the events that stay direct table writes: payment approved / rejected, subscription approved / rejected, proof uploaded again, subscription assigned by an administrator.
- New helper `_encolar_notificacion_suscripcion` that addresses the athlete or the tenant administrators through the US-0125 helpers.
- Eight new email handlers under the module key `suscripciones`, registered in the handler registry.
- The partial state "subscription created but the payment failed" disappears, together with its message.

### Notification matrix

| Event | Athlete | Tenant administrators |
|---|---|---|
| Purchase (`comprar_suscripcion`) | `suscripcion_recibida` | `suscripcion_nueva_admin` (says whether it needs validation) |
| Payment `pendiente → validado` | `pago_validado` | — |
| Payment `pendiente → rechazado` | `pago_rechazado` (with reason) | — |
| Subscription `pendiente → activa` | `suscripcion_aprobada` | — |
| Subscription `pendiente → cancelada` by staff | `suscripcion_rechazada` | — |
| Proof path changed by the athlete | — | `pago_comprobante_admin` |
| Subscription inserted by someone else | `suscripcion_asignada` | — |

Every notification is sent by email and in-app.

### Implementation plan (page → component → hook → service → types)

1. Page and component: no change (`SuscripcionModal` keeps its props and renders the hook's error string).
2. Hook: rewrite `useSuscripcion.submit` (payment id, upload first, one RPC call, error mapping).
3. Service: add `suscripcionesService.comprarSuscripcion`; remove `createSuscripcion` and `createPago`.
4. Types: `ComprarSuscripcionPayload`, new `SuscripcionServiceError` codes, drop unused insert types.
5. Server library: `src/lib/notificaciones/modulos/suscripciones.ts` and its registration.
6. Database: one migration with the RPC, the policy drops, the helper and the triggers (local only).
7. Verification with Mailpit, documentation, commit message and PR description.

### Files to create or modify

| Area | File | Change |
|------|------|--------|
| Hook | `src/hooks/portal/planes/useSuscripcion.ts` | `submit`: client payment id, upload first, one RPC call, new error mapping |
| Service | `src/services/supabase/portal/suscripciones.service.ts` | Add `comprarSuscripcion`; remove `createSuscripcion` |
| Service | `src/services/supabase/portal/pagos.service.ts` | Remove `createPago` |
| Types | `src/types/portal/suscripciones.types.ts` | `ComprarSuscripcionPayload`; new error codes; drop `SuscripcionInsert` if unused |
| Types | `src/types/portal/pagos.types.ts` | Drop `PagoInsert` if unused |
| Lib (server) | `src/lib/notificaciones/modulos/suscripciones.ts` | New: 8 email handlers |
| Lib (server) | `src/lib/notificaciones/registro.ts` | Register `suscripcionesHandlers` |
| Migration | `supabase/migrations/20261011120000_notificaciones_suscripciones.sql` | RPC, policy drops, helper, 3 trigger functions + 3 triggers |
| Docs | `projectspec/03-project-structure.md` | Document the RPC, the triggers, the matrix and the new module file |

## Non-goals

- Expiry reminders and tenant notification rules (US-0135).
- Per-user or per-tenant switches for these notifications.
- Notifications to trainers, and notifications for bookings.
- Converting the remaining subscription writes (administrator screens, proof re-upload) to RPCs.
- Any visual change to the purchase modal, "Mis suscripciones" or "Gestión de suscripciones".
- Cleaning up proof files orphaned by a purchase that failed and was never retried.
- Applying the migration to the remote Supabase project.

## Capabilities

### New Capabilities
- `subscription-purchase-rpc`: the atomic `comprar_suscripcion` RPC, its validations and error codes, the upload-first proof flow, the removal of direct athlete inserts and the browser service function.
- `subscription-notifications`: which subscription and payment events notify whom, the enqueue helper and triggers, the in-app texts and links, and the emails.

### Modified Capabilities
- `subscription-management`: "Subscription request submission" now goes through the RPC and is atomic.
- `plan-management`: its "Subscription request submission" requirement changes in the same way.
- `payment-proof-upload`: the purchase uploads the proof before creating the payment instead of patching it afterwards.
- `subscription-payment-method`: the selected method is persisted and validated by the RPC.

## Impact

- **Database**: one new RPC callable by `authenticated`; two RLS policies dropped; three triggers on `suscripciones` / `pagos`; no table or column added.
- **Client**: the purchase is one round trip; two service functions removed.
- **Server**: one new handlers file; no new route.
- **Behaviour**: athletes and administrators start receiving emails and in-app notifications for subscriptions. Tenants with many administrators receive one email per administrator per purchase.
- **Depends on** US-0125 (notifications module) being present.
