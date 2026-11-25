## Why

Team invitations are delivered by the Supabase Auth mailer through `inviteUserByEmail`. That leaves two gaps: a person who already has an account receives no email at all (the invitation only shows if they happen to open the organizations page), and resending to someone who was invited before but never set a password silently sends nothing. The notifications module (US-0125) already provides a queue with retries, a branded layout, the header bell and local testing with Mailpit, but invitations do not use it.

This change implements US-0137 (`projectspec/userstory/us0137-team-invitations-notifications-module.md`).

## What Changes

- `deliverInvitation()` stops calling `auth.admin.inviteUserByEmail`. It calls a new service-role RPC, `encolar_invitacion_tenant`, which enqueues the invitation email through the notifications module and, for an established account, an in-app notification.
- New email handler `invitaciones.invitacion_equipo`. It generates the sign-in link **at send time** with `auth.admin.generateLink` and never stores it:
  - no account → invite link;
  - account that never signed in → recovery link (fixes resends to people who never completed a previous invitation);
  - established account → plain link to log in and open the invitation, no token.
- New helper `_auth_usuario_por_email` (service role only) to tell the three situations apart.
- `/auth/confirm` accepts `type=recovery` in addition to `type=invite`.
- **BREAKING** The Supabase Auth invite template (`supabase/templates/invite.html`) and its `[auth.email.template.invite]` block are removed; no code sends Auth invites any more.
- An invitation's `estado = 'enviada'` now means "handed to the delivery queue". Delivery failures are tracked in `notificaciones_outbox`.

The contracts of the two invitation routes (inputs, `202 { invitacion_id }`, error codes) and every screen are unchanged.

### Implementation plan (page → component → hook → service → types)

1. Page, component, hook, browser service, types: no change.
2. Server library: `modulos/invitaciones.ts` (new handler) and its registration; rewrite `invitaciones-delivery.ts`.
3. Routes: pass the trimmed input to `deliverInvitation`; `/auth/confirm` accepts `recovery`.
4. Database: one migration with the two functions (local only).
5. Cleanup: remove the Auth invite template, its config block and `isEmailAlreadyRegistered`.
6. Verification with Mailpit, documentation, commit message and PR description.

### Files to create or modify

| Area | File | Change |
|------|------|--------|
| API route | `src/app/api/portal/orgs/[tenant_id]/invitaciones/route.ts` | Pass the trimmed input to `deliverInvitation` |
| API route | `src/app/api/portal/orgs/[tenant_id]/invitaciones/[invitacion_id]/reenviar/route.ts` | Same |
| Auth route | `src/app/auth/confirm/route.ts` | Accept `recovery` |
| Lib (server) | `src/lib/portal/invitaciones-delivery.ts` | Replace `inviteUserByEmail` with the enqueue RPC; trim the input type |
| Lib (server) | `src/lib/notificaciones/modulos/invitaciones.ts` | New: `invitaciones.invitacion_equipo` handler |
| Lib (server) | `src/lib/notificaciones/registro.ts` | Register `invitacionesHandlers` |
| Lib (server) | `src/lib/portal/privileged-route.ts` | Remove `isEmailAlreadyRegistered` if unused |
| Migration | `supabase/migrations/20261013120000_invitaciones_notificaciones.sql` | `_auth_usuario_por_email`, `encolar_invitacion_tenant` |
| Config | `supabase/config.toml` | Remove `[auth.email.template.invite]` |
| Template | `supabase/templates/invite.html` | Delete |
| Docs | `projectspec/03-project-structure.md` | Update the invitation routes, `invitaciones-delivery.ts`, `auth/confirm`, the notifications section and the new handler file |

## Non-goals

- Notifying the administrator when an invitation is accepted, cancelled or expires.
- Showing delivery status or errors in the "Invitaciones" tab.
- Emails for administrator-provisioned accounts (temporary password flow).
- Changing the invitation expiry, the resend limit, or who may invite.
- Other Supabase Auth emails (signup confirmation, password reset).
- Any change to pages, components, hooks, browser services or types.
- Applying the migration or the Auth configuration change to the remote Supabase project.

## Capabilities

### New Capabilities
- `team-invitation-delivery`: how a tenant team invitation reaches its recipient — the enqueue RPC, the account lookup helper, the email handler with send-time link generation, the in-app notification, the accepted link types of `/auth/confirm`, and the invitation state after enqueueing.

### Modified Capabilities

None in `openspec/specs`. Invitations were specified by the change `admin-invite-tenant-members`, which is still active and not archived; its delivery requirements (Auth invite email, "in-app" channel for registered emails) are superseded by `team-invitation-delivery`.

## Impact

- **Server**: the invitation routes no longer call the Auth mailer; one extra RPC per send. One new handlers file. The dispatcher now calls `auth.admin.generateLink`.
- **Database**: two new functions executable only by `service_role`; `_auth_usuario_por_email` reads `auth.users`. No table, column or policy change.
- **Auth configuration**: the invite template is removed locally; on the remote project the "Invite user" template simply stops being used.
- **Behaviour**: people with an account start receiving invitation emails and bell notifications; resends to never-used accounts start working. Emails are sent a few seconds after the request instead of during it.
- **Depends on** US-0125 (notifications module) and US-0114 (tenant invitations).
