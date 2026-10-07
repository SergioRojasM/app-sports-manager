## Context

US-0137 (`projectspec/userstory/us0137-team-invitations-notifications-module.md`) moves the delivery of tenant team invitations (US-0114) onto the notifications module (US-0125).

Current state, verified against the code:
- `POST /api/portal/orgs/[tenant_id]/invitaciones` and `.../[invitacion_id]/reenviar` call `crear_invitacion_tenant` / `reenviar_invitacion_tenant` with the user's session, then `deliverInvitation()` (`src/lib/portal/invitaciones-delivery.ts`) with the service-role client.
- `deliverInvitation()` calls `auth.admin.inviteUserByEmail`. Success → Supabase Auth creates the user and sends its own email (`supabase/templates/invite.html`) → `registrar_envio_invitacion(id, 'email')`. "Already registered" → no email → `registrar_envio_invitacion(id, 'in_app')`. Other errors → `registrar_fallo_invitacion`. Both success branches answer the same `202`.
- `/auth/confirm` accepts only `type=invite`, verifies the token hash, sets the session and redirects to `/auth/update-password?next=…`.
- Table `invitaciones_tenant`: `estado` in `pendiente | enviada | aceptada | cancelada | expirada | fallida`, `canal_entrega`, `expires_at` (7 days), `last_sent_at`, `nombre`, `nota_admin`. The UI shows `pendiente` and `enviada` both as "Pendiente".
- The notifications module provides `_notificar_email`, `_notificar_in_app`, the dispatcher (service role, retries 1 min / 5 min / 30 min / 2 h), the registry, the bell and the Mailpit transport for development.
- Invitations have no spec in `openspec/specs`: the change `admin-invite-tenant-members` is still active and was never archived.

Verified on the local Supabase Auth (2026-10-07) with a throwaway user:
- `generateLink` of type `invite` creates the user and returns a `hashed_token`; **no email is sent**.
- `generateLink` of type `recovery` works for that never-used, unconfirmed user; verifying its token returns a session and confirms the email.
- Calling `generateLink` of type `invite` again for the still-unconfirmed user also succeeds.

Constraints: migrations are local only; type-check and lint must pass; `build` is never run; no test runner.

## Goals / Non-Goals

**Goals:**
- Every invitation produces an email, whatever the recipient's account situation.
- Established users also see the invitation in the bell.
- Delivery gets the module's queue, retries, logging and local testing.
- No secret is stored; the route's response keeps hiding whether an account exists.
- No visible change for administrators or in the invitee's journey.

**Non-Goals:**
- Notifications to administrators about acceptance or expiry; delivery status in the UI; provisioned-account emails; other Auth emails.

## Decisions

### Flow

```
POST invitaciones / reenviar          (user session; authorization and rate limit unchanged)
  └─ deliverInvitation()              (service role)
       └─ encolar_invitacion_tenant(id)
            ├─ _notificar_email('invitaciones', 'invitacion_equipo')         always
            ├─ _notificar_in_app(...)                                        established account only
            └─ invitation → enviada / canal 'email' / last_sent_at
       └─ 202 { invitacion_id }

notificaciones_outbox ──> dispatcher ──> modulos/invitaciones.ts
       ├─ invitation gone / not pending / expired  → null (skipped)
       ├─ no account          → generateLink(invite)    → /auth/confirm?…type=invite
       ├─ account never used  → generateLink(recovery)  → /auth/confirm?…type=recovery
       └─ established account → /auth/login?next=/portal/invitaciones/{id}
```

### D1. The route only enqueues
The Auth call leaves the request path. The route does one RPC and answers; the email is sent seconds later by the dispatcher (the outbox insert trigger calls it at once). This gives retries for free and, because the route no longer branches on the account, the "same 202 for every email" guarantee holds by construction instead of by care.

### D2. Enqueueing happens in one SQL function
`encolar_invitacion_tenant` validates the state, enqueues the email, decides the in-app notification and updates the invitation in one transaction. Doing the three steps from TypeScript would allow partial results. It is service-role only: who may invite is still decided by `crear_invitacion_tenant` / `reenviar_invitacion_tenant` under the administrator's session.

### D3. The sign-in link is generated at send time and never stored
The alternative — generating the link in the route and putting it in the outbox payload — would store a credential in a table and make retries reuse a token that may have expired. Generating in the handler keeps the payload free of secrets and gives every attempt a fresh link. The dispatcher already runs with the service role, which `generateLink` needs.

### D4. Three account situations, decided by `last_sign_in_at`
- No `auth.users` row → invite link (creates the user, as `inviteUserByEmail` did).
- Row with `last_sign_in_at is null` → recovery link. This covers a retry after the user was created, a resend to someone who never completed a previous invitation, and an address that someone registered but never confirmed.
- Row with `last_sign_in_at` set → no token at all; the person logs in normally.

`email_confirmed_at` was rejected as the discriminator: an administrator-provisioned account is confirmed from creation but may never have been used. `last_sign_in_at` is the direct signal of "this person can already get in".

A sign-in link is never generated for an established account: an administrator must not be able to cause sign-in or reset links to be issued for accounts in use.

### D5. `_auth_usuario_por_email` is the only reader of `auth.users`
A small SECURITY DEFINER function returning an id and a boolean, executable only by `service_role`, used by both the enqueue RPC (in-app decision) and the handler (link decision). It avoids paging through `auth.admin.listUsers` and keeps the exposure minimal.

### D6. `/auth/confirm` accepts `recovery`
The route already verifies a token hash and forwards to the password page; allowing the second type is one constant. The redirect target stays validated as same-origin. Other OTP types stay rejected.

### D7. Handler skips invitations that are no longer pending
Between enqueueing and sending, an invitation can be accepted, cancelled or expire. The handler re-reads it and returns `null`, so no email and — importantly — no Auth user is created for a dead invitation.

### D8. "Enviada" means queued
`estado = 'enviada'` and `last_sent_at` are set at enqueue time. Tracking real delivery on the invitation would need a callback from the dispatcher into module-specific tables; the UI does not distinguish the two states, and failures are visible in `notificaciones_outbox`. `registrar_envio_invitacion` is kept in the database, unused, so an older deployment still works while the new one rolls out.

### D9. In-app notification only for established accounts, on every send
Only someone who can log in will ever see the bell. A resend creates a new notification because it is a reminder, mirroring the new email.

### D10. The administrator's note stays internal
`nota_admin` is named and used as a note for the team, so it is excluded from the email and the notification.

### D11. Remove the Auth invite template
With no caller of `inviteUserByEmail`, the local template and its config block are dead configuration and would mislead. On the remote project the dashboard's "Invite user" template simply stops being used; nothing has to change there.

## Risks / Trade-offs

- [Supabase Auth behaviour for recovery links on never-used accounts] → Verified locally (see Context); a task repeats the check through the application's `/auth/confirm` route.
- [The email is no longer sent inside the request; a dispatcher outage delays invitations] → Rows wait in `pendiente` and are retried; the administrator can resend; the failure is visible in the outbox.
- [Sign-in link lifetime] → Same Auth OTP expiry as today's invite link; "Reenviar" issues a new one.
- [A retry may send a second email if the first was accepted but its response was lost] → The module's idempotency key (outbox id) makes Resend drop the duplicate; a manual resend is a deliberate second email.
- [An address registered by someone else but never confirmed receives a recovery link] → The link goes only to that mailbox; using it sets a new password, which takes the account away from whoever squatted it. Acceptable and arguably desirable.
- [Old deployment during rollout still calls `inviteUserByEmail`] → Works until the Auth template is removed remotely; `registrar_envio_invitacion` is kept for it.
- [Local email testing] → With `EMAIL_DEV_MAILPIT_URL`, the invitation appears in Mailpit and its link points to the local app through `APP_URL`.
- [No automated tests] → Manual checklist in the tasks.

## Migration Plan

1. Apply `20261013120000_invitaciones_notificaciones.sql` locally with `npx supabase migration up`.
2. Remote rollout (manual, by the owner): apply the migration first, then deploy the application. The new functions are unused until the deploy; the old code keeps working meanwhile.
3. Rollback: redeploy the previous application version (it still finds `registrar_envio_invitacion` and the Auth mailer); the two new functions can stay or be dropped.

## Open Questions

- Should the "Invitaciones" tab show when the email could not be delivered (outbox row in `error`)? Deferred; today a failed Auth send was also only visible as `fallida` at request time.
