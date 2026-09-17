## ADDED Requirements

### Requirement: invitaciones_tenant SHALL persist administrator-initiated invitations
The system SHALL create `public.invitaciones_tenant` with columns: `id uuid pk`, `tenant_id uuid not null → tenants`, `email text not null`, `rol_id uuid not null → roles`, `nombre text null`, `nota_admin text null check (char_length(nota_admin) <= 500)`, `estado text not null default 'pendiente' check in ('pendiente','enviada','aceptada','cancelada','expirada','fallida')`, `canal_entrega text null check in ('email','in_app')`, `codigo_error text null`, `auth_user_id uuid null`, `creada_por uuid not null → usuarios`, `expires_at timestamptz not null default now() + interval '7 days'`, `accepted_at`, `cancelled_at`, `last_sent_at`, `created_at`, `updated_at`, and a check `expires_at > created_at`. The table SHALL have:
- A partial unique index on `(tenant_id, lower(email)) where estado in ('pendiente','enviada')`.
- An index on `(tenant_id, estado, created_at desc)`.
- An index on `(lower(email), estado)`.
- An index on `(auth_user_id, estado)`.

#### Scenario: Duplicate active invitation is prevented
- **WHEN** tenant T already has an invitation for `Ana@Mail.com` in estado `pendiente`
- **THEN** inserting another invitation for `ana@mail.com` in tenant T with estado `pendiente` SHALL be rejected by the unique index

#### Scenario: Terminal invitations do not block a new one
- **WHEN** tenant T has an invitation for an email in estado `cancelada`
- **THEN** a new `pendiente` invitation for the same email in tenant T SHALL be allowed

#### Scenario: Invalid estado is rejected
- **WHEN** an update sets `estado = 'borrador'`
- **THEN** the database SHALL reject it with a check constraint violation

---

### Requirement: Pending invitations SHALL NOT grant tenant access
An invitation in any estado SHALL NOT create a `miembros_tenant` row and SHALL NOT grant portal access, subscriptions, bookings, or role permissions. A membership SHALL be created only by `activar_invitacion_tenant`.

#### Scenario: Creating an invitation creates no membership
- **WHEN** an administrator creates an invitation for a user who already has an account
- **THEN** no new `miembros_tenant` row SHALL exist for that user in the tenant until the invitation is accepted

---

### Requirement: RLS SHALL restrict invitation reads to tenant administrators
RLS SHALL be enabled on `invitaciones_tenant` with a single SELECT policy for rows where `tenant_id` is in `get_admin_tenants_for_authenticated_user()`. There SHALL be no INSERT, UPDATE, or DELETE policy; all writes SHALL go through RPCs. The admin list SHALL read the view `v_invitaciones_tenant_admin`, which excludes `canal_entrega` and `codigo_error` and joins the role name.

#### Scenario: Admin lists only own tenant invitations
- **WHEN** an administrator of tenant T queries `v_invitaciones_tenant_admin`
- **THEN** only invitations with `tenant_id = T` SHALL be returned

#### Scenario: Recipient cannot read the table directly
- **WHEN** a non-admin user whose email matches an invitation selects from `invitaciones_tenant`
- **THEN** no rows SHALL be returned

#### Scenario: Delivery channel is not exposed to admins
- **WHEN** an administrator reads `v_invitaciones_tenant_admin`
- **THEN** the result SHALL NOT include a `canal_entrega` column

---

### Requirement: crear_invitacion_tenant SHALL authorize, rate-limit, and idempotently create an invitation
`crear_invitacion_tenant(p_tenant_id uuid, p_email text, p_rol_id uuid, p_nombre text default null, p_nota text default null)` SHALL be a `SECURITY DEFINER` function that:
1. Enforces administrator authorization and role assignability.
2. Enforces the invitation rate limits.
3. Normalizes the email with `lower(trim(p_email))` and validates its format (`22023` on failure).
4. Returns the existing active invitation id when one exists for `(p_tenant_id, email)`, updating `rol_id`, `nombre`, and `nota_admin`.
5. Otherwise inserts a `pendiente` row with `creada_por = auth.uid()` and returns its id.

#### Scenario: New invitation is created
- **WHEN** an administrator calls the RPC with a new email and valid role
- **THEN** a row SHALL be inserted with `estado = 'pendiente'`, `creada_por = auth.uid()`, and `expires_at` seven days after `created_at`

#### Scenario: Repeated invitation is idempotent
- **WHEN** the administrator calls the RPC again for the same tenant and email while the first invitation is `pendiente`
- **THEN** the RPC SHALL return the same invitation id and SHALL NOT insert a second row

#### Scenario: Invalid email is rejected
- **WHEN** the RPC is called with `p_email = 'not-an-email'`
- **THEN** it SHALL raise `SQLSTATE 22023`

---

### Requirement: Invitation route SHALL send an Auth invite without revealing account existence
`POST /api/portal/orgs/[tenant_id]/invitaciones` SHALL accept `{ email, rol_id, nombre?, nota? }` and call `crear_invitacion_tenant`. It SHALL then call `auth.admin.inviteUserByEmail(email, { redirectTo, data: { nombre } })` with `redirectTo = ${APP_URL}/portal/invitaciones/{id}` (the customized invite template routes through `/auth/confirm` and `/auth/update-password`).
- **Invite succeeds:** the route SHALL call `registrar_envio_invitacion(id, 'email')`, which sets `estado = 'enviada'` and `last_sent_at = now()`.
- **Invite fails because the email is already registered:** the route SHALL call `registrar_envio_invitacion(id, 'in_app')`, which leaves `estado = 'pendiente'`.
- **Response:** in both branches the route SHALL respond `202` with body `{ invitacion_id }` only.
- **Any other Auth error:** the route SHALL set `estado = 'fallida'` with an allow-listed `codigo_error` and respond with code `unexpected`.

#### Scenario: New email receives an invite
- **WHEN** an administrator invites an email with no Auth account
- **THEN** Supabase Auth SHALL send an invite email, the invitation SHALL become `enviada` with `canal_entrega = 'email'`, and the route SHALL respond `202 { invitacion_id }`

#### Scenario: Existing account gets an in-app invitation
- **WHEN** an administrator invites an email that already has an Auth account
- **THEN** no email SHALL be sent, the invitation SHALL remain `pendiente` with `canal_entrega = 'in_app'`, and the route SHALL respond `202 { invitacion_id }`

#### Scenario: Responses are indistinguishable
- **WHEN** the same administrator invites one registered and one unregistered email
- **THEN** both responses SHALL have status `202` and bodies containing only `invitacion_id`

#### Scenario: Existing account is never attached automatically
- **WHEN** an administrator invites an email belonging to an existing user
- **THEN** no `miembros_tenant` row SHALL be created for that user until they explicitly accept

---

### Requirement: Administrators SHALL be able to resend and cancel invitations
`POST /api/portal/orgs/[tenant_id]/invitaciones/[invitacion_id]/reenviar` SHALL call `reenviar_invitacion_tenant(p_invitacion_id)`, which:
- Authorizes the administrator of the invitation's tenant.
- Enforces the resend limit.
- Accepts only `pendiente`, `enviada`, or `expirada` (`22023` otherwise).
- Sets `expires_at = now() + interval '7 days'` and moves `expirada` back to `pendiente`.

The route SHALL then repeat the invite and the same indistinguishable `202` response.

`cancelar_invitacion_tenant(p_invitacion_id)` SHALL authorize the administrator and set `estado = 'cancelada'` and `cancelled_at = now()` from `pendiente`, `enviada`, or `expirada`. It SHALL be a no-op on an already `cancelada` invitation and SHALL raise `22023` from `aceptada` or `fallida`.

#### Scenario: Resend renews expiry
- **WHEN** an administrator resends an `expirada` invitation
- **THEN** its `estado` SHALL become `pendiente` or `enviada` and `expires_at` SHALL be seven days from the resend time

#### Scenario: Accepted invitation cannot be resent
- **WHEN** an administrator resends an `aceptada` invitation
- **THEN** the route SHALL respond `422` and no email SHALL be sent

#### Scenario: Cancel invalidates immediately
- **WHEN** an administrator cancels a `enviada` invitation
- **THEN** `estado` SHALL be `cancelada` and a subsequent `activar_invitacion_tenant` call for it SHALL fail

#### Scenario: Admin of another tenant cannot cancel
- **WHEN** an administrator of tenant U calls `cancelar_invitacion_tenant` for an invitation of tenant T
- **THEN** the RPC SHALL raise `42501` and the invitation SHALL be unchanged

---

### Requirement: Invitations SHALL expire after seven days
A pg_cron job `expirar-invitaciones-tenant` SHALL run daily and set `estado = 'expirada'` for rows in `pendiente` or `enviada` whose `expires_at <= now()`. Every RPC that reads an invitation for acceptance SHALL independently check `expires_at > now()`, so correctness SHALL NOT depend on the job.

#### Scenario: Job marks stale invitations
- **WHEN** the job runs and an `enviada` invitation has `expires_at` in the past
- **THEN** its `estado` SHALL become `expirada`

#### Scenario: Expiry enforced without the job
- **WHEN** an invitation is still `enviada` but `expires_at` is in the past and the recipient tries to accept
- **THEN** `activar_invitacion_tenant` SHALL reject it with code `expired`

---

### Requirement: Recipients SHALL read only invitations addressed to their verified email
`get_mis_invitaciones_pendientes()` SHALL return, for the caller, invitations in `pendiente` or `enviada` with `expires_at > now()` whose `lower(email)` equals the caller's `auth.users.email`, only when `email_confirmed_at is not null`. Each row SHALL include `id`, `tenant_id`, tenant name, role name, and `expires_at`.

`get_invitacion_para_aceptar(p_invitacion_id)` SHALL return the same shape for a single invitation. When the invitation does not exist or the email does not match, it SHALL raise `P0002`. It SHALL return the invitation's `estado` so the page can explain cancelled or expired states.

#### Scenario: Recipient sees own pending invitations
- **WHEN** a user with confirmed email `ana@mail.com` calls `get_mis_invitaciones_pendientes`
- **THEN** the result SHALL list only active, unexpired invitations for `ana@mail.com`

#### Scenario: Other user cannot read the invitation
- **WHEN** a user with email `bob@mail.com` calls `get_invitacion_para_aceptar` for an invitation to `ana@mail.com`
- **THEN** the RPC SHALL raise `P0002`

---

### Requirement: activar_invitacion_tenant SHALL atomically and idempotently accept an invitation
`activar_invitacion_tenant(p_invitacion_id uuid)` SHALL be `SECURITY DEFINER`, callable by authenticated users, and in one transaction SHALL:
1. Lock the invitation `FOR UPDATE`.
2. Require `estado in ('pendiente','enviada')` (`cancelled`/`expired` codes otherwise) and `expires_at > now()`.
3. Require the caller's `auth.users.email_confirmed_at is not null` and `lower(auth.users.email) = lower(invitation.email)` (`email_mismatch` otherwise).
4. Ensure a `usuarios` row exists for `auth.uid()`.
5. Insert `miembros_tenant (tenant_id, usuario_id, rol_id, estado = 'activo')` with `on conflict (tenant_id, usuario_id) do nothing`.
6. Set `estado = 'aceptada'`, `auth_user_id = auth.uid()`, `accepted_at = now()`, and `updated_at = now()`.
7. Return `tenant_id` and the membership id.

When the caller is already a member, the existing membership's `rol_id` MUST NOT change.

#### Scenario: Recipient accepts and becomes a member
- **WHEN** the invited user with a matching confirmed email calls the RPC
- **THEN** exactly one `miembros_tenant` row SHALL exist with the invitation's role and `estado = 'activo'`, and the invitation SHALL be `aceptada`

#### Scenario: Concurrent acceptance creates one membership
- **WHEN** two acceptance calls for the same invitation run concurrently
- **THEN** exactly one membership SHALL exist and both calls SHALL return the same membership id or one SHALL receive a non-pending state error

#### Scenario: Retry after success is safe
- **WHEN** the recipient reloads the acceptance page and calls the RPC again after acceptance
- **THEN** no additional membership SHALL be created

#### Scenario: Email mismatch is rejected
- **WHEN** a user whose email differs from the invitation email calls the RPC
- **THEN** the RPC SHALL fail with `email_mismatch` and no membership SHALL be created

#### Scenario: Existing member's role is not escalated
- **WHEN** a user who is already `usuario` in tenant T accepts an invitation to T with role `administrador`
- **THEN** their membership role SHALL remain `usuario` and the invitation SHALL become `aceptada`

---

### Requirement: Admin Invitaciones tab SHALL list, resend, and cancel invitations
`EquipoPage` SHALL render an **Invitaciones** tab after **Bloqueados**, styled like the existing tab buttons, with a turquoise count badge of invitations in `pendiente` or `enviada` that is hidden when zero.

`InvitacionesTab` SHALL follow the `SolicitudesTab` pattern with `glass` loading, error-with-*Reintentar*, and empty ("No hay invitaciones.") states, and an estado `<select>` defaulting to active invitations.

`InvitacionesTable` SHALL follow the `SolicitudesTable` pattern with columns Correo, Rol, Estado, Expira, Creada, Acciones:
- *Reenviar* SHALL be shown for `pendiente`, `enviada`, and `expirada`.
- *Cancelar*, with an inline confirmation like *Rechazar*, SHALL be shown for the same states.
- No action SHALL be shown for terminal states.

`useInvitacionesAdmin({ tenantId })` SHALL expose `invitaciones`, `loading`, `error`, `activeCount`, `reenviar`, `cancelar`, and `refresh`, and SHALL refresh after each action.

#### Scenario: Tab badge shows active count
- **WHEN** a tenant has 2 `enviada` and 1 `pendiente` invitation
- **THEN** the Invitaciones tab badge SHALL display `3`

#### Scenario: Terminal invitations have no actions
- **WHEN** an invitation row is `aceptada`
- **THEN** neither *Reenviar* nor *Cancelar* SHALL be rendered

#### Scenario: Cancel refreshes the list
- **WHEN** the administrator confirms *Cancelar* on a row
- **THEN** `cancelar` SHALL be called and the list SHALL reload showing the row as `cancelada` or hiding it under the active filter

---

### Requirement: InvitacionEstadoBadge SHALL render a colour-coded badge without revealing delivery channel
`InvitacionEstadoBadge` SHALL render:
- `pendiente` and `enviada` → amber, both labelled "Pendiente".
- `aceptada` → emerald "Aceptada".
- `expirada` → orange "Expirada".
- `cancelada` → slate "Cancelada".
- `fallida` → rose "Fallida".

#### Scenario: Enviada and pendiente look identical
- **WHEN** one row is `pendiente` and another is `enviada`
- **THEN** both badges SHALL display the label "Pendiente" with the same amber classes

---

### Requirement: Recipients SHALL accept invitations from the portal
- **Orgs page:** `PortalTenantsPage` SHALL render an `InvitacionesPendientesSection` above the organization grid when `useMisInvitaciones` returns at least one invitation. Each item SHALL show tenant name, role, expiry, and an *Aceptar* link to `/portal/invitaciones/[invitacion_id]`.
- **Acceptance page:** `/portal/invitaciones/[invitacion_id]` SHALL render `AceptarInvitacionPage`, which shows tenant, role, and expiry and an *Aceptar invitación* button. On success it SHALL route to `/portal/orgs/[tenant_id]`. It SHALL show explicit messages for expired, cancelled, already accepted, and email-mismatch states.
- **Password step:** `/auth/update-password` SHALL honor a `next` query parameter only when it starts with `/` and does not start with `//`, redirecting there after a successful password update.

#### Scenario: Existing user discovers invitation in the portal
- **WHEN** a user with a pending in-app invitation opens `/portal/orgs`
- **THEN** the "Invitaciones pendientes" section SHALL list the invitation with an *Aceptar* link

#### Scenario: New user completes onboarding from the email
- **WHEN** a new user opens the invite email link, passes through `/auth/confirm`, sets a password on `/auth/update-password`, and is redirected to `/portal/invitaciones/[id]`
- **THEN** clicking *Aceptar invitación* SHALL create the membership and route to `/portal/orgs/[tenant_id]`

#### Scenario: Expired invitation shows explanation
- **WHEN** the recipient opens the acceptance page for an expired invitation
- **THEN** the page SHALL state that the invitation expired and that the organization must resend it, and SHALL NOT render the accept button

#### Scenario: Unsafe next parameter is ignored
- **WHEN** `/auth/update-password?next=//evil.example` completes a password update
- **THEN** the user SHALL NOT be redirected to `evil.example`
