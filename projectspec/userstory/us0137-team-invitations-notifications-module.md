# US-0137 — Team Invitations Delivered Through the Notifications Module

## ID
US-0137

## Name
Migrate the delivery of tenant team invitations from the Supabase Auth invite email to the notifications module (branded email through Resend + in-app notification)

## As a
- **Organization administrator** who invites people to the team
- **Invited person**, with or without a GRIT Arena account

## I Want
- As an administrator: every invitation I send or resend to reach its recipient by email, whether or not they already have an account, with retries when the email provider fails.
- As an invited person: to receive a clear, branded email saying which organization invited me and with which role, and — if I already use GRIT Arena — to also see the invitation in the portal's notification bell.

## So That
Invitations stop depending on the Supabase Auth mailer, people who already have an account are actually told about the invitation (today they receive no email at all), and invitation delivery gets the same queue, retries, logging and local testing (Mailpit) as the rest of the application's notifications.

---

## Description

### Current State

- An administrator creates an invitation from "Gestión de equipo" → `POST /api/portal/orgs/[tenant_id]/invitaciones` → RPC `crear_invitacion_tenant` → `deliverInvitation()` (`src/lib/portal/invitaciones-delivery.ts`). "Reenviar" does the same through `.../invitaciones/[invitacion_id]/reenviar` and `reenviar_invitacion_tenant` (limit: 3 sends per hour per invitation).
- `deliverInvitation()` calls `auth.admin.inviteUserByEmail(email, { redirectTo, data })`:
  - **Email without an account**: Supabase Auth creates the user and sends its own email (template `supabase/templates/invite.html`, configured in `[auth.email.template.invite]`). The link is `/auth/confirm?token_hash=…&type=invite&redirect_to=…`; `src/app/auth/confirm/route.ts` verifies the token, sets the session and sends the person to `/auth/update-password?next=/portal/invitaciones/{id}`.
  - **Email already registered**: Auth rejects the invite, **no email is sent**, and the invitation is only visible in `InvitacionesPendientesSection` when that person happens to open the organizations page. The same happens when an invitation is resent to someone who was invited before but never set a password: the second send silently becomes "in-app" for an account that cannot log in.
- The result is recorded with `registrar_envio_invitacion(id, 'email' | 'in_app')` or `registrar_fallo_invitacion`. Both branches answer the same `202` so the response never reveals whether the email has an account.
- The notifications module (US-0125) is in place: `_notificar_email`, `_notificar_in_app`, the dispatcher, the handler registry (`src/lib/notificaciones/registro.ts`), the header bell, and the development transport to Mailpit (`EMAIL_DEV_MAILPIT_URL`). Invitations do not use it.
- Table: `invitaciones_tenant` (`email`, `rol_id`, `nombre`, `nota_admin`, `estado` `pendiente | enviada | aceptada | cancelada | expirada | fallida`, `canal_entrega`, `expires_at`, `last_sent_at`, …).

### Proposed Changes

#### Delivery flow

```
POST invitaciones / reenviar
  └─ crear_invitacion_tenant / reenviar_invitacion_tenant      (unchanged)
  └─ deliverInvitation()
       └─ rpc encolar_invitacion_tenant(id)                    (service role)
            ├─ _notificar_email('invitaciones', 'invitacion_equipo', …)      always
            └─ _notificar_in_app(…)                             only for an established account
notificaciones_outbox ──> dispatcher ──> handler invitaciones.invitacion_equipo
       ├─ no account            → auth.admin.generateLink(invite)   → link /auth/confirm … type=invite
       ├─ account never used    → auth.admin.generateLink(recovery) → link /auth/confirm … type=recovery
       └─ established account   → link /auth/login?next=/portal/invitaciones/{id}
```

- `deliverInvitation()` no longer calls `inviteUserByEmail`. It calls the new RPC `encolar_invitacion_tenant` and answers `202 { invitacion_id }`, exactly as today. On RPC failure it calls `registrar_fallo_invitacion(id, 'enqueue_error')`, logs `invitacion_fallida` and answers `500`, as today.
- The three account situations are told apart by the new helper `_auth_usuario_por_email(email)`:
  - **No account**: no `auth.users` row for the email.
  - **Account never used**: a row exists and `last_sign_in_at is null` (created by a previous invitation and never completed).
  - **Established account**: a row exists and `last_sign_in_at is not null`.
- **The sign-in link is generated at send time by the email handler, never stored.** The outbox payload carries no token. A retry simply generates a fresh link.
  - `generateLink({ type: 'invite', email, options: { redirectTo, data: { nombre } } })` creates the Auth user without sending any Supabase email.
  - If the dispatcher retries after the user was created (or the person was invited before), the "account never used" branch applies and `generateLink({ type: 'recovery', email, options: { redirectTo } })` is used, which lets the person set a password. This also fixes resending to someone who never completed a previous invitation.
  - `redirectTo` is `buildInvitacionRedirectTo(invitacionId)` in every case.
  - A recovery or invite link is **never** generated for an established account.
- `src/app/auth/confirm/route.ts`: `ALLOWED_TYPES` becomes `['invite', 'recovery']`. Behaviour after verification is unchanged (redirect to `/auth/update-password?next=…`).
- The handler returns `null` (outbox row resolved as `skipped`, nothing sent) when the invitation no longer exists, its `estado` is not `pendiente` or `enviada`, or `expires_at <= now()`.

#### Email

- Module key `invitaciones`, type `invitacion_equipo`. Spanish copy, shared layout (`renderLayout`, `renderFilas`, `renderParrafo`), no attachment.
- Subject: `Te invitaron a {tenant} en GRIT Arena`.
- Body:
  - Greeting "Hola {nombre}," when the invitation has `nombre`, otherwise "Hola,".
  - "{tenant} te invitó a unirte a su equipo en GRIT Arena como {rol}."
  - Rows: Organización, Rol, Válida hasta (`expires_at`, `DD/MM/YYYY`, America/Bogota).
  - No account / account never used: paragraph "Para aceptar, crea tu contraseña con el siguiente botón." and button **"Crear contraseña y aceptar"** → `{APP_URL}/auth/confirm?token_hash={hashed_token}&type={invite|recovery}&redirect_to={redirectTo}`.
  - Established account: paragraph "Inicia sesión para revisar y aceptar la invitación." and button **"Ver invitación"** → `{APP_URL}/auth/login?next=%2Fportal%2Finvitaciones%2F{id}`.
  - Closing line: "Si no esperabas esta invitación, puedes ignorar este correo."
- `{rol}`: `administrador` → "Administrador", `entrenador` → "Entrenador", `usuario` → "Atleta".
- `nota_admin` is an internal note of the administrator and is **not** included.

#### In-app notification (established accounts only)

| Field | Value |
|---|---|
| `modulo` / `tipo` | `invitaciones` / `invitacion_equipo` |
| `titulo` | Invitación a {tenant} |
| `mensaje` | {tenant} te invitó a unirte a su equipo como {rol}. |
| `url` | `/portal/invitaciones/{id}` |
| `entidad_tipo` / `entidad_id` | `invitacion_tenant` / invitation id |

A resend creates a new in-app notification (it is a reminder). `InvitacionesPendientesSection` is unchanged and keeps listing pending invitations.

#### Invitation state

`encolar_invitacion_tenant` sets `canal_entrega = 'email'`, `estado = 'enviada'`, `last_sent_at = now()` and `codigo_error = null` for an invitation in `pendiente` or `enviada`. "Enviada" now means "handed to the delivery queue". The administrator UI is unchanged: `InvitacionEstadoBadge` already shows `pendiente` and `enviada` as "Pendiente". Delivery failures are tracked in `notificaciones_outbox` (`ultimo_error`, retries), not on the invitation.

#### Removed

- `[auth.email.template.invite]` in `supabase/config.toml` and `supabase/templates/invite.html`: no code sends Supabase Auth invites any more. (Administrator-provisioned accounts use `createUser`, not invites.)
- `isEmailAlreadyRegistered` in `src/lib/portal/privileged-route.ts`, if nothing else uses it.

---

## Database Changes

One migration, `supabase/migrations/20261013120000_invitaciones_notificaciones.sql`, wrapped in `begin; ... commit;`. Local only; never pushed to the remote project. No table or column is added.

### 1. `_auth_usuario_por_email`

```sql
create or replace function public._auth_usuario_por_email(p_email text)
returns table (usuario_id uuid, ha_iniciado_sesion boolean)
language sql stable security definer set search_path = public as $$
  select u.id, u.last_sign_in_at is not null
    from auth.users u
   where lower(u.email) = lower(btrim(p_email))
   limit 1;
$$;
revoke all on function public._auth_usuario_por_email(text) from public, anon, authenticated;
grant execute on function public._auth_usuario_por_email(text) to service_role;
```

### 2. `encolar_invitacion_tenant`

```sql
create or replace function public.encolar_invitacion_tenant(p_invitacion_id uuid)
returns void
language plpgsql security definer set search_path = public as $$ ... $$;
revoke all on function public.encolar_invitacion_tenant(uuid) from public, anon, authenticated;
grant execute on function public.encolar_invitacion_tenant(uuid) to service_role;
```

Behaviour:
1. Lock the invitation (`for update`). Not found, or `estado not in ('pendiente', 'enviada')` → `raise exception 'INVALID_STATE' using errcode = '22023'`.
2. Load `tenants.nombre` and `roles.nombre`.
3. `perform _notificar_email(tenant_id, 'invitaciones', 'invitacion_equipo', email, <usuario_id or null>, 'invitacion_tenant', id, payload)` with payload `{ invitacion_id, tenant_id, tenant_nombre, rol, nombre }`. No token and no link in the payload.
4. When `_auth_usuario_por_email(email)` returns a row with `ha_iniciado_sesion` and a `usuarios` row with that id exists: `perform _notificar_in_app(usuario_id, tenant_id, 'invitaciones', 'invitacion_equipo', titulo, mensaje, '/portal/invitaciones/' || id, 'invitacion_tenant', id)`.
5. Update the invitation: `canal_entrega = 'email'`, `estado = 'enviada'`, `last_sent_at = now()`, `codigo_error = null`.

### 3. Unchanged

`registrar_envio_invitacion` stays (no longer called by the application; kept so older deployments keep working during rollout). `registrar_fallo_invitacion`, the rate limit of `reenviar_invitacion_tenant` and every RLS policy are unchanged.

### RLS

No new table. Both new functions are SECURITY DEFINER, revoked from `public`, `anon` and `authenticated`, and executable only by `service_role`. `_auth_usuario_por_email` is the only new reader of `auth.users` and returns just an id and a boolean.

---

## API / Server Actions

No new route. The contracts of the two existing routes (inputs, `202 { invitacion_id }`, error codes) do not change.

### `src/lib/portal/invitaciones-delivery.ts`
- **Function**: `deliverInvitation(input)` — same signature. `email` and `nombre` are no longer needed by the function and are removed from `DeliverInvitationInput`; both route callers are updated.
- **Behaviour**: `service.rpc('encolar_invitacion_tenant', { p_invitacion_id })`; on error → `registrar_fallo_invitacion(id, 'enqueue_error')`, audit `invitacion_fallida` and `errorResponse('unexpected', 500)`; on success → audit `invitacion_creada` / `invitacion_reenviada` with `codigo: 'encolada'` and `jsonNoStore({ invitacion_id }, 202)`.
- **Auth**: service-role client, server only (unchanged).

### `src/lib/notificaciones/modulos/invitaciones.ts` (new, `import 'server-only'`)
- **Export**: `invitacionesHandlers: Record<string, NotificacionHandler>` with the key `invitaciones.invitacion_equipo`.
- **Input**: `NotificacionOutboxRow` (`entidad_id` = invitation id).
- **Return**: `NotificacionEmail | null`.
- **Steps**: load the invitation with tenant and role (`createServiceClient()`); return `null` when gone, not `pendiente`/`enviada`, or expired; `rpc('_auth_usuario_por_email', { p_email })`; choose the branch; generate the link when needed (`auth.admin.generateLink`); render.
- **Errors**: a `generateLink` failure throws `Error('invite_link_failed')` so the row is retried by the dispatcher's schedule. If `generateLink('invite')` fails because the user already exists (race with another send), re-read the account and continue with the matching branch.

### `src/lib/notificaciones/registro.ts`
Spread `invitacionesHandlers` into `HANDLERS`.

### `src/app/auth/confirm/route.ts`
`ALLOWED_TYPES: EmailOtpType[] = ['invite', 'recovery']`.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Migration | `supabase/migrations/20261013120000_invitaciones_notificaciones.sql` | `_auth_usuario_por_email`, `encolar_invitacion_tenant` |
| Lib (server) | `src/lib/portal/invitaciones-delivery.ts` | Replace `inviteUserByEmail` with the enqueue RPC; trim the input type |
| Lib (server) | `src/lib/notificaciones/modulos/invitaciones.ts` | New: `invitaciones.invitacion_equipo` handler |
| Lib (server) | `src/lib/notificaciones/registro.ts` | Register `invitacionesHandlers` |
| Lib (server) | `src/lib/portal/privileged-route.ts` | Remove `isEmailAlreadyRegistered` if unused |
| API route | `src/app/api/portal/orgs/[tenant_id]/invitaciones/route.ts` | Pass the trimmed input to `deliverInvitation` |
| API route | `src/app/api/portal/orgs/[tenant_id]/invitaciones/[invitacion_id]/reenviar/route.ts` | Same |
| Auth route | `src/app/auth/confirm/route.ts` | Accept `recovery` |
| Config | `supabase/config.toml` | Remove `[auth.email.template.invite]` |
| Template | `supabase/templates/invite.html` | Delete |
| Docs | `projectspec/03-project-structure.md` | Update the invitation routes, `invitaciones-delivery.ts`, `auth/confirm`, the notifications module section and the new handler file |

No page, component, hook, browser service or type file changes.

---

## Acceptance Criteria

1. Inviting an email without an account creates one `notificaciones_outbox` row (`invitaciones` / `invitacion_equipo`) and no in-app notification; the route answers `202 { invitacion_id }`.
2. The email for that invitation arrives with the subject "Te invitaron a {tenant} en GRIT Arena", the organization, the role label and the expiry date, and the button "Crear contraseña y aceptar".
3. Opening that button's link signs the person in, shows the "choose a password" page and then the invitation page `/portal/invitaciones/{id}`, where the invitation can be accepted — the same journey as before the change.
4. Inviting an email that belongs to an established account (has signed in before) creates the outbox row **and** one in-app notification "Invitación a {tenant}" linking to `/portal/invitaciones/{id}`; its email has the button "Ver invitación" pointing to `/auth/login?next=/portal/invitaciones/{id}` and contains no token.
5. Resending an invitation to someone who was invited before and never set a password delivers an email whose button lets them set a password and reach the invitation (recovery link), instead of silently sending nothing.
6. Resending an invitation creates a new outbox row and, for an established account, a new in-app notification; the existing limit of 3 sends per hour still answers its current error.
7. The response of both routes is identical (status and body) for emails with and without an account.
8. No Supabase Auth invite email is sent in any case (with local Supabase, Mailpit shows only the application email).
9. `notificaciones_outbox.payload` of an invitation row contains no token, hash or link.
10. When Resend fails, the row is retried by the module's schedule; each retry produces a working link, and the Auth user is not duplicated.
11. An invitation cancelled, accepted or expired before the email is dispatched produces no email; its outbox row is resolved as failed with `skipped`.
12. After a successful enqueue the invitation has `estado = 'enviada'`, `canal_entrega = 'email'` and `last_sent_at` set; the "Invitaciones" tab shows it as "Pendiente", as today.
13. If the enqueue RPC fails, the invitation becomes `fallida` with `codigo_error = 'enqueue_error'` and the route answers `500` with the existing error body.
14. `/auth/confirm` accepts `type=invite` and `type=recovery`, and still redirects to `/auth/login` for any other type or a missing token.
15. `_auth_usuario_por_email` and `encolar_invitacion_tenant` cannot be executed by `anon` or `authenticated`.
16. The administrator's internal note (`nota_admin`) does not appear in the email or in the in-app notification.
17. With `EMAIL_DEV_MAILPIT_URL` set, the whole flow can be tested locally: the email appears in Mailpit and its link works against the local app.
18. `npx tsc --noEmit` passes and `npm run lint` reports no new problem.

---

## Implementation Steps

- [ ] Create branch `feat/team-invitations-notifications-module` and verify it is not `main`/`master`/`develop`
- [ ] Write the migration and apply it locally with `npx supabase migration up` (never push it to the remote project)
- [ ] Add `src/lib/notificaciones/modulos/invitaciones.ts` and register it
- [ ] Rewrite `deliverInvitation()` and update the two route callers
- [ ] Allow `recovery` in `src/app/auth/confirm/route.ts`
- [ ] Verify locally that a `recovery` link generated for a never-used account signs the person in and lands on the password page (the one behaviour of Supabase Auth the design depends on; checked directly against the local Auth API on 2026-10-07 — the recovery token returns a session and confirms the email — and to be repeated here through the application route)
- [ ] Remove the Auth invite template and its config block; remove `isEmailAlreadyRegistered` if unused
- [ ] Verify the two new functions are executable only by `service_role`
- [ ] Test manually with Mailpit: new email, established account, resend to a never-used account, resend rate limit, cancelled / expired before dispatch, provider failure and retry
- [ ] Update `projectspec/03-project-structure.md`
- [ ] Run `npx tsc --noEmit` and `npm run lint` (do not run `build`)
- [ ] Write the commit message and PR description

---

## Non-Functional Requirements

- **Security**:
  - Sign-in links are generated only at send time, only by the server with the service-role client, and are never stored or logged.
  - A sign-in link is generated only for an email without an account or with an account that has never signed in; never for an established account.
  - The routes keep answering the same `202` regardless of the account's existence. `_auth_usuario_por_email` is not reachable by clients.
  - Link origins come from `APP_URL` (`getAppUrl()`), never from request headers; `redirect_to` keeps being validated as same-origin by `/auth/confirm`.
  - Authorization of who may invite stays in `crear_invitacion_tenant` / `reenviar_invitacion_tenant`; `encolar_invitacion_tenant` is service-role only.
- **Performance**: the routes no longer wait for the Auth mailer; they do one extra RPC. Email sending happens in the dispatcher, in batches of 20.
- **Accessibility**: no UI change. The in-app notification uses the existing bell and inbox.
- **Error handling**:
  - Enqueue failure → `fallida` + `500`, shown by the existing inline error of "Gestión de equipo".
  - Provider failure → retried by the module (1 min, 5 min, 30 min, 2 h), recorded in `notificaciones_outbox.ultimo_error`; the administrator can also use "Reenviar".
  - The sign-in link expires according to the project's Auth OTP expiry, as the current invite link does; "Reenviar" issues a new one.

---

## Dependencies

US-0125 (notifications module) and US-0114 (tenant invitations).

## Out of Scope

Notifying the administrator when an invitation is accepted or expires, showing delivery status or errors in the "Invitaciones" tab, emails for administrator-provisioned accounts (temporary password flow), changing the invitation expiry or the resend limit, and other Supabase Auth emails (signup confirmation, password reset).
