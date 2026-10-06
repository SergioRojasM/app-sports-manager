## Context

US-0134 (`projectspec/userstory/us0134-subscription-notifications.md`) adds notifications to the subscriptions module on top of the notifications module of US-0125 (`_notificar_email`, `_notificar_in_app`, `_admins_tenant`, dispatcher, handler registry, header bell).

Current state, verified against the code and the local database:
- Subscription writes do not go through RPCs. The browser inserts and updates `suscripciones` and `pagos` directly under RLS; neither table has triggers.
- A purchase (`useSuscripcion.submit`) is: insert `suscripciones` (`pendiente`) → `populate_suscripcion_servicios` → insert `pagos` (`pendiente`, client-supplied `monto`, no proof) → upload proof → `updateComprobantePath`. A payment failure leaves an orphan subscription.
- `useSuscripcion` is the only caller of `createSuscripcion` and `createPago`. No database function inserts into `suscripciones` or `pagos`.
- Athlete insert is allowed by `suscripciones_insert_own` (`atleta_id = auth.uid() and can_subscribe_to_plan(plan_id, tenant_id)`) and `pagos_insert_own`. Proof re-upload uses `pagos_update_own`.
- Proof files live at `orgs/{tenant}/users/{user}/receipts/{pagoId}.{ext}` in `org-assets`. The upload policy `athlete_upload_own_receipts` checks the folder and membership, not the existence of the payment row.
- Decisions by staff are direct updates: `updatePagoEstado`, `updateSuscripcionEstado`, `crearSuscripcionAdmin`.
- `suscripciones.clases_plan` is not written by the current purchase code (service units live in `suscripcion_servicios`); existing spec text that says it is snapshotted is stale and is not carried into the modified requirements.

Constraints: migrations are local only; type-check and lint must pass; `build` is never run; there is no test runner; emails are checked locally with Mailpit (`EMAIL_DEV_MAILPIT_URL`).

## Goals / Non-Goals

**Goals:**
- Athletes and administrators are notified, by email and in-app, of the seven subscription events of the story.
- The purchase is atomic, priced by the server, and distinguishable from a later proof upload.
- Notification work never fails a subscription or payment write.
- No change to the administrator screens or to the purchase modal's appearance.

**Non-Goals:**
- Expiry reminders (US-0135), preferences, notifications to trainers or for bookings.
- Converting the remaining direct writes to RPCs.
- Cleaning up orphaned proof files.

## Decisions

### Architecture

```
Athlete purchase
  useSuscripcion.submit ── upload proof (optional) ──> storage
                       └─ suscripcionesService.comprarSuscripcion ──> comprar_suscripcion()
                                                                       ├─ suscripciones + suscripcion_servicios + pagos
                                                                       └─ _encolar_notificacion_suscripcion(recibida, nueva_admin)

Direct writes (admin screens, proof re-upload)
  suscripciones  insert / update of estado ──> triggers ─┐
  pagos          update of estado, comprobante_path ─────┴─> _encolar_notificacion_suscripcion(...)

_encolar_notificacion_suscripcion ──> _notificar_email / _notificar_in_app   (US-0125)
notificaciones_outbox ──> dispatcher ──> registro ──> modulos/suscripciones.ts ──> Resend / Mailpit
```

Client layering (page → component → hook → service → types): no page or component change → `useSuscripcion` → `suscripcionesService.comprarSuscripcion` → `ComprarSuscripcionPayload`, `SuscripcionServiceError`.

### D1. The purchase becomes one RPC
Three client calls cannot be atomic and force the proof to arrive as an update right after the insert, which a trigger cannot tell apart from a genuine re-upload without a time-based guess. One SECURITY DEFINER function inserts everything in a transaction and enqueues the purchase notifications itself. It also moves the amount to the server, closing a hole where the client chose `monto`. The alternative — keeping the client flow and ignoring proof updates in the first minutes after the insert — was rejected as fragile.

### D2. Upload first, with a client-generated payment id
The proof path contains the payment id, so the id must exist before the upload. The browser generates it (`crypto.randomUUID()`), uploads, and passes id and path to the RPC, which validates that the path is exactly the caller's receipt path for that id and that the object exists. The storage policy already allows this. The id is kept in a ref while the modal is open and the upload uses `upsert: true`, so a retry overwrites instead of duplicating. A failed upload stays non-blocking, as today.

A proof uploaded for a purchase that the RPC then rejects and the user abandons remains in storage: athletes have no delete policy on receipts. This is accepted; the file is in the user's own folder and unreferenced.

### D3. Direct athlete inserts are removed
With `suscripciones_insert_own` and `pagos_insert_own` in place, a client could still bypass the RPC, its validations and its notifications. Dropping them makes the RPC the only path for athletes. The RPC re-applies `can_subscribe_to_plan`, so no rule is lost. Administrator policies and `pagos_update_own` are untouched.

### D4. Duplicate pending requests are prevented under an advisory lock
The existing client pre-check (`hasPendingSuscripcion`) is racy. The RPC checks again after `pg_advisory_xact_lock(hashtext(uid || plan))`, which serialises only the same athlete and plan. A unique partial index was rejected because existing data may already contain duplicates and the migration must not fail on it.

### D5. Triggers for the writes that stay direct
Staff decisions and proof re-uploads are still table writes from several services. `AFTER` row triggers catch them regardless of the caller, with no service changes. The alternative of calling a "notify" RPC from each service would be bypassable and easy to forget.

### D6. The actor is derived from `auth.uid()`
Triggers need to know whether the athlete or staff acted: an assignment is an insert not made by the athlete; a rejection is a cancellation not made by the athlete; a re-upload is an update by the athlete that sets a proof path. The path is not compared with the old one, because a re-upload with the same extension overwrites the same storage path. `auth.uid()` is available in triggers fired from API calls and is null for the service role and cron, which are treated as staff. Rows written by the RPC do not fire these rules by construction: its subscription insert is by the athlete, and the `pagos` trigger is update-only.

### D7. Triggers and the RPC never fail because of a notification
Every trigger body, and the notification block of the RPC, is wrapped in `exception when others then raise warning`. A broken notification must not block a purchase or a validation.

### D8. Handlers read current data at send time
As in US-0125, the outbox payload carries ids and the rejection reason; the handler loads subscription, plan, tenant, athlete and payment with the service-role client. This is what lets the administrator email of a purchase state "Comprobante adjunto: Sí / No" correctly, and it returns `null` when the subscription was deleted.

### D9. "Requires validation" is computed, not assumed
A purchase by an athlete is always `pendiente` today, so the administrator title is always "Nueva suscripción por validar". The flag is still derived from the subscription and payment states so a future auto-approved purchase reads "Nueva suscripción" without touching the notification code.

### D10. Payment and subscription decisions notify separately
They are two independent actions in the administrator UI and can happen at different times, so each produces its own notification. Merging them would require guessing whether the second action is coming.

## Risks / Trade-offs

- [Dropping the insert policies breaks a caller that was missed] → `grep` shows `useSuscripcion` as the only athlete caller and no database function inserts into these tables; the verification tasks cover both purchase entry points (tenant plans and the public plans modal).
- [An older client bundle still open in a browser tries the direct insert after deploy] → It fails with a permission error and the existing inline error; a reload fixes it. Accepted.
- [Administrators receive two notifications for one purchase flow (purchase, then a late proof)] → Intended: the second one tells them the proof is now there.
- [Athlete receives two notifications when payment and subscription are approved back to back] → Accepted (D10).
- [Several administrators → one email each per purchase, no opt-out] → Accepted for this story; preferences are a non-goal.
- [`auth.uid()` null for writes made with the service role] → Treated as staff; such an insert notifies the athlete as "assigned", which is the correct reading.
- [Orphan proof files] → Accepted (D2).
- [Stale spec text about `clases_plan`] → Not carried into the modified requirements; no behaviour change.
- [No automated tests] → Manual verification checklist with Mailpit in the tasks.

## Migration Plan

1. Apply `20261011120000_notificaciones_suscripciones.sql` locally with `npx supabase migration up` (not `db reset`, to keep local data).
2. Deploy order for the remote project (manual, by the owner): deploy the application first, then apply the migration. Between the two, purchases from the new client fail because the RPC does not exist yet, so apply the migration right after the deploy, in a quiet moment. The reverse order would break purchases from the old client (policies dropped) for longer.
3. Rollback: recreate the two insert policies from their previous definitions, drop the three triggers, the helper and the RPC, and redeploy the previous client.

## Open Questions

- None blocking. Whether administrators should be able to mute these notifications is deferred to a preferences story.
