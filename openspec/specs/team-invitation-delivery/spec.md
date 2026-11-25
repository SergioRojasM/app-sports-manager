# team-invitation-delivery Specification

## Purpose
TBD - created by archiving change team-invitations-notifications-module. Update Purpose after archive.
## Requirements
### Requirement: Account lookup helper
`public._auth_usuario_por_email(p_email text) returns table (usuario_id uuid, ha_iniciado_sesion boolean)` SHALL be SECURITY DEFINER with `search_path = public`, return at most one row for the `auth.users` row whose email equals `p_email` ignoring case and surrounding spaces, with `ha_iniciado_sesion = (last_sign_in_at is not null)`, and return no row when there is no such user. It SHALL be executable only by `service_role`.

An email is therefore in one of three situations: **no account** (no row), **account never used** (`ha_iniciado_sesion = false`) or **established account** (`ha_iniciado_sesion = true`).

#### Scenario: Unknown email
- **WHEN** the helper is called with an email that has no Auth user
- **THEN** it SHALL return no row

#### Scenario: Never-used account
- **WHEN** the helper is called with the email of a user created by an invitation who never signed in
- **THEN** it SHALL return that user's id with `ha_iniciado_sesion = false`

#### Scenario: Not callable by clients
- **WHEN** `anon` or an authenticated user calls the helper through the API
- **THEN** the call SHALL fail with a permission error

### Requirement: Enqueue invitation RPC
`public.encolar_invitacion_tenant(p_invitacion_id uuid) returns void` SHALL be SECURITY DEFINER with `search_path = public`, executable only by `service_role`. It SHALL:
- lock the invitation and raise `INVALID_STATE` (SQLSTATE `22023`) when it does not exist or its `estado` is not `pendiente` or `enviada`;
- enqueue one email with `_notificar_email` using `modulo = 'invitaciones'`, `tipo = 'invitacion_equipo'`, `entidad_tipo = 'invitacion_tenant'`, `entidad_id` = the invitation id, the invitation's email, and the payload `{ invitacion_id, tenant_id, tenant_nombre, rol, nombre }`;
- when the email belongs to an established account that has a `usuarios` row, also create one in-app notification with `_notificar_in_app` (see "Invitation in-app notification");
- set the invitation to `canal_entrega = 'email'`, `estado = 'enviada'`, `last_sent_at = now()` and `codigo_error = null`.

The payload SHALL NOT contain a token, a token hash or a link.

#### Scenario: Email without an account
- **WHEN** the RPC runs for an invitation whose email has no account
- **THEN** one outbox row SHALL exist for that email and no in-app notification SHALL be created

#### Scenario: Established account
- **WHEN** the RPC runs for an invitation whose email belongs to a user who has signed in before
- **THEN** one outbox row and one in-app notification for that user SHALL exist

#### Scenario: Never-used account
- **WHEN** the RPC runs for an invitation whose email belongs to a user who never signed in
- **THEN** one outbox row SHALL exist and no in-app notification SHALL be created

#### Scenario: Invitation state after enqueueing
- **WHEN** the RPC succeeds
- **THEN** the invitation SHALL have `estado = 'enviada'`, `canal_entrega = 'email'`, `last_sent_at` set and `codigo_error` null

#### Scenario: Invitation not sendable
- **WHEN** the RPC runs for an invitation that is `aceptada`, `cancelada`, `expirada`, `fallida` or does not exist
- **THEN** it SHALL raise `INVALID_STATE` and enqueue nothing

#### Scenario: No secrets in the queue
- **WHEN** an invitation outbox row is inspected
- **THEN** its payload SHALL contain no token, hash or URL

#### Scenario: Not callable by clients
- **WHEN** `anon` or an authenticated user calls the RPC through the API
- **THEN** the call SHALL fail with a permission error

### Requirement: Invitation delivery through the queue
`deliverInvitation()` in `src/lib/portal/invitaciones-delivery.ts` SHALL call `encolar_invitacion_tenant` with the service-role client and SHALL NOT call `auth.admin.inviteUserByEmail`.
- On success it SHALL log the audit event `invitacion_creada` or `invitacion_reenviada` with `codigo = 'encolada'` and answer `202 { invitacion_id }`.
- On failure it SHALL call `registrar_fallo_invitacion(id, 'enqueue_error')`, log `invitacion_fallida` and answer `500` with the existing error body.
- The answer SHALL be identical for emails with and without an account.
- The create and resend routes SHALL keep their inputs, status codes and bodies, including the resend limit of 3 sends per hour.
- No Supabase Auth invite email SHALL be sent.

#### Scenario: Create invitation
- **WHEN** an administrator creates an invitation for any email
- **THEN** the route SHALL answer `202 { invitacion_id }` and an outbox row SHALL exist for it

#### Scenario: Same answer whatever the account
- **WHEN** invitations are created for an email with an account and for one without
- **THEN** both responses SHALL have the same status and body shape

#### Scenario: Resend
- **WHEN** an administrator resends a pending invitation
- **THEN** a new outbox row SHALL be created, and for an established account a new in-app notification

#### Scenario: Resend limit unchanged
- **WHEN** an invitation is resent a fourth time within one hour
- **THEN** the route SHALL answer its existing rate-limit error and enqueue nothing

#### Scenario: Enqueue failure
- **WHEN** the enqueue RPC fails
- **THEN** the invitation SHALL become `fallida` with `codigo_error = 'enqueue_error'` and the route SHALL answer `500`

#### Scenario: No Auth email
- **WHEN** an invitation is created with local Supabase
- **THEN** Mailpit SHALL receive only the application's invitation email

### Requirement: Invitation email handler
`src/lib/notificaciones/modulos/invitaciones.ts` SHALL export `invitacionesHandlers` with the key `invitaciones.invitacion_equipo`, registered in `src/lib/notificaciones/registro.ts`. The handler SHALL load the invitation with its tenant and role with the service-role client at send time.
- It SHALL return `null` (row failed as `skipped`, nothing sent) when the invitation no longer exists, its `estado` is not `pendiente` or `enviada`, or `expires_at <= now()`.
- It SHALL choose the link by the recipient's situation, using `_auth_usuario_por_email`:
  - **no account**: `auth.admin.generateLink({ type: 'invite', email, options: { redirectTo, data: { nombre } } })`, which creates the Auth user without sending an email; link `{APP_URL}/auth/confirm?token_hash={hashed_token}&type=invite&redirect_to={redirectTo}`;
  - **account never used**: `auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo } })`; link `{APP_URL}/auth/confirm?token_hash={hashed_token}&type=recovery&redirect_to={redirectTo}`;
  - **established account**: `{APP_URL}/auth/login?next=%2Fportal%2Finvitaciones%2F{id}`, with no token.
- `redirectTo` SHALL be `buildInvitacionRedirectTo(invitacionId)`. Origins SHALL come from `APP_URL`.
- A sign-in link SHALL never be generated for an established account, and SHALL never be stored or logged.
- When `generateLink` of type `invite` fails because the user already exists, the handler SHALL re-read the account and continue with the matching branch. Any other `generateLink` failure SHALL throw `invite_link_failed` so the row is retried.

#### Scenario: New person
- **WHEN** the email of an invitation to an address without an account is dispatched
- **THEN** an Auth user SHALL be created for that address and the email's button SHALL link to `/auth/confirm` with `type=invite`

#### Scenario: Retry after the user was created
- **WHEN** the first dispatch created the Auth user but the email failed, and the row is retried
- **THEN** the retry SHALL send a working link of type `recovery` and no second Auth user SHALL exist

#### Scenario: Resend to a never-used account
- **WHEN** an invitation is resent to someone invited before who never set a password
- **THEN** the email's button SHALL link to `/auth/confirm` with `type=recovery`

#### Scenario: Established account
- **WHEN** the email of an invitation to an established account is dispatched
- **THEN** its button SHALL link to `/auth/login?next=/portal/invitaciones/{id}` and the email SHALL contain no token

#### Scenario: Invitation no longer pending
- **WHEN** the invitation was accepted, cancelled or expired before dispatch
- **THEN** no email SHALL be sent, no Auth user SHALL be created and the row SHALL be failed as `skipped`

#### Scenario: Link generation fails
- **WHEN** `generateLink` fails for a reason other than an existing user
- **THEN** the row SHALL be failed with `invite_link_failed` and retried by the module's schedule

### Requirement: Invitation email content
The invitation email SHALL be written in Spanish on the shared layout, without attachments:
- subject `Te invitaron a {tenant} en GRIT Arena`;
- greeting "Hola {nombre}," when the invitation has a name, otherwise "Hola,";
- the sentence "{tenant} te invitó a unirte a su equipo en GRIT Arena como {rol}.";
- rows Organización, Rol and Válida hasta (`expires_at` as `DD/MM/YYYY` in America/Bogota);
- for no account or a never-used account: "Para aceptar, crea tu contraseña con el siguiente botón." and the button "Crear contraseña y aceptar";
- for an established account: "Inicia sesión para revisar y aceptar la invitación." and the button "Ver invitación";
- the closing line "Si no esperabas esta invitación, puedes ignorar este correo."

`{rol}` SHALL read "Administrador", "Entrenador" or "Atleta" for the roles `administrador`, `entrenador` and `usuario`. The administrator's internal note (`nota_admin`) SHALL NOT appear.

#### Scenario: Subject and role
- **WHEN** "Wolfpack" invites someone as `usuario`
- **THEN** the subject SHALL be "Te invitaron a Wolfpack en GRIT Arena" and the body SHALL say "como Atleta"

#### Scenario: Greeting without a name
- **WHEN** the invitation has no `nombre`
- **THEN** the email SHALL start with "Hola,"

#### Scenario: Internal note hidden
- **WHEN** the invitation has a `nota_admin`
- **THEN** its text SHALL NOT appear in the email

### Requirement: Invitation in-app notification
For an established account, enqueueing an invitation SHALL create an in-app notification with `modulo = 'invitaciones'`, `tipo = 'invitacion_equipo'`, `titulo = 'Invitación a {tenant}'`, `mensaje = '{tenant} te invitó a unirte a su equipo como {rol}.'`, `url = '/portal/invitaciones/{id}'`, `entidad_tipo = 'invitacion_tenant'` and `entidad_id` = the invitation id. `InvitacionesPendientesSection` SHALL keep listing pending invitations as before.

#### Scenario: Bell notification
- **WHEN** an established user is invited to "Wolfpack" as `entrenador`
- **THEN** their bell SHALL show "Invitación a Wolfpack" with the message "Wolfpack te invitó a unirte a su equipo como Entrenador." linking to `/portal/invitaciones/{id}`

#### Scenario: Internal note hidden
- **WHEN** the invitation has a `nota_admin`
- **THEN** its text SHALL NOT appear in the notification

### Requirement: Confirm route accepts recovery links
`src/app/auth/confirm/route.ts` SHALL accept the types `invite` and `recovery`. After a successful verification it SHALL redirect to `/auth/update-password?next={same-origin path from redirect_to}`, as before. Any other type, or a missing token, SHALL redirect to `/auth/login`; a failed verification SHALL redirect to `/auth/login?error=invitacion_invalida`.

#### Scenario: Invite link
- **WHEN** a valid link with `type=invite` is opened
- **THEN** the person SHALL be signed in and sent to choose a password, then to the invitation page

#### Scenario: Recovery link
- **WHEN** a valid link with `type=recovery` generated for a never-used account is opened
- **THEN** the person SHALL be signed in, their email SHALL be confirmed, and they SHALL be sent to choose a password, then to the invitation page

#### Scenario: Other types rejected
- **WHEN** a link with `type=magiclink` or without `token_hash` is opened
- **THEN** the route SHALL redirect to `/auth/login` without verifying anything

#### Scenario: Expired or used token
- **WHEN** the token is invalid
- **THEN** the route SHALL redirect to `/auth/login?error=invitacion_invalida`

### Requirement: Auth invite template removed
The `[auth.email.template.invite]` block of `supabase/config.toml` and `supabase/templates/invite.html` SHALL be removed, and no application code SHALL call `auth.admin.inviteUserByEmail`.

#### Scenario: No remaining caller
- **WHEN** the codebase is searched for `inviteUserByEmail`
- **THEN** no match SHALL be found under `src/`

