## ADDED Requirements

### Requirement: altas_administradas_tenant SHALL audit administrator-provisioned accounts without storing credentials
The system SHALL create `public.altas_administradas_tenant` with columns: `id uuid pk`, `tenant_id uuid not null → tenants`, `email text not null`, `usuario_id uuid null → usuarios`, `rol_id uuid not null → roles`, `creada_por uuid not null → usuarios`, `metodo text not null default 'contrasena_temporal' check in ('contrasena_temporal')`, `estado text not null default 'reservada' check in ('reservada','pendiente_activacion','activada','fallida')`, `codigo_error text null`, `nota_admin text null check (char_length(nota_admin) <= 500)`, `activated_at timestamptz null`, `created_at`, `updated_at`. It SHALL have a partial unique index on `(tenant_id, lower(email)) where estado in ('reservada','pendiente_activacion')`. The table MUST NOT contain any column holding a password, password hash, or password-derived value. RLS SHALL allow SELECT only for administrators of the tenant and SHALL have no INSERT, UPDATE, or DELETE policies.

#### Scenario: No credential column exists
- **WHEN** the table's columns are inspected
- **THEN** no column name SHALL contain `password`, `contrasena`, `hash`, or `secret`

#### Scenario: Duplicate in-flight provisioning is prevented
- **WHEN** tenant T has an alta for an email in estado `reservada`
- **THEN** reserving another alta for the same email in tenant T SHALL be rejected

---

### Requirement: Managed provisioning SHALL be available only when the tenant entitlement is enabled
`reservar_alta_administrada(p_tenant_id uuid, p_email text, p_rol_id uuid, p_nota text default null)` SHALL be a `SECURITY DEFINER` function that:
1. Enforces administrator authorization and role assignability.
2. Reads `public.admin_tenants.aprovisionamiento_administrado_habilitado` for `p_tenant_id` inside the transaction and raises `P0001` with message `FEATURE_DISABLED` when it is not `true`.
3. Enforces the per-tenant provisioning rate limit.
4. Inserts a `reservada` alta and returns its id.

The route SHALL map `FEATURE_DISABLED` to `403` with code `feature_disabled`.

#### Scenario: Provisioning rejected when entitlement is off
- **WHEN** an administrator of a tenant with the flag `false` calls `POST /api/portal/orgs/[tenant_id]/miembros/aprovisionar`
- **THEN** the route SHALL respond `403` with code `feature_disabled` and no Auth user SHALL be created

#### Scenario: UI flag tampering has no effect
- **WHEN** a client forces the temporary-password mode in the UI for a tenant whose flag is `false`
- **THEN** the server SHALL still reject the request with `feature_disabled`

---

### Requirement: Provisioning route SHALL create an auto-confirmed account with a server-generated password
`POST /api/portal/orgs/[tenant_id]/miembros/aprovisionar` SHALL accept `{ email, rol_id, nombre?, nota? }`. It MUST NOT accept a password field. After `reservar_alta_administrada` succeeds, it SHALL:
1. Generate the password with `generateTemporaryPassword()` from `src/lib/portal/password-generator.ts` (`server-only`, `crypto.randomInt`). The password SHALL be 16 characters with at least one lowercase letter, uppercase letter, digit, and symbol.
2. Call `auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { nombre } })`.
3. Call `completar_alta_administrada(alta_id, user_id)` with the service client. That RPC inserts `miembros_tenant (tenant_id, usuario_id, rol_id, estado = 'pendiente_activacion')` and sets the alta `estado = 'pendiente_activacion'` and `usuario_id`.
4. Respond `201` with `{ miembro_id, contrasena_temporal }` and header `Cache-Control: no-store`.

#### Scenario: Successful provisioning returns the password once
- **WHEN** an entitled administrator provisions a new email
- **THEN** the response SHALL be `201` with a 16-character `contrasena_temporal`, the Auth user SHALL have a confirmed email, and a `pendiente_activacion` membership SHALL exist

#### Scenario: Administrator-supplied password is ignored
- **WHEN** the request body includes a `password` field
- **THEN** the route SHALL respond `422` and no Auth user SHALL be created

#### Scenario: Password satisfies complexity
- **WHEN** `generateTemporaryPassword()` is called 1000 times
- **THEN** every result SHALL be 16 characters and contain at least one lowercase, uppercase, digit, and symbol character

#### Scenario: Password is not persisted
- **WHEN** provisioning completes
- **THEN** no database table, audit row, or log line SHALL contain the generated password

---

### Requirement: Provisioning SHALL compensate partial failures
- **Auth creation fails:** the route SHALL call `registrar_fallo_alta(alta_id, codigo)` to set `estado = 'fallida'` with an allow-listed `codigo_error`.
- **Email already has an Auth account:** the route SHALL respond `409` with code `account_exists` and the message "No es posible crear una cuenta con este correo. Usa la invitación por email."
- **`completar_alta_administrada` fails after the Auth user was created:** the route SHALL call `auth.admin.deleteUser(user_id)`, then record `fallida` with `codigo_error = 'compensado'` (or `'compensacion_fallida'` when deletion also fails), and respond `500` with code `unexpected`.

#### Scenario: Membership failure deletes the new Auth user
- **WHEN** `createUser` succeeds but `completar_alta_administrada` fails
- **THEN** the Auth user SHALL be deleted, the alta SHALL be `fallida` with `codigo_error = 'compensado'`, and the response SHALL be `500` without a password

#### Scenario: Failed compensation is recorded for review
- **WHEN** both `completar_alta_administrada` and `deleteUser` fail
- **THEN** the alta SHALL be `fallida` with `codigo_error = 'compensacion_fallida'` and an error-level audit log line SHALL be emitted

#### Scenario: Existing account is reported to the administrator
- **WHEN** an entitled administrator provisions an email that already has an Auth account
- **THEN** the route SHALL respond `409` with code `account_exists` and no membership SHALL be created

---

### Requirement: Provisioned members SHALL activate by changing their password
When `canUserAccessTenant` reports `pendingActivation`, `TenantLayout` SHALL redirect to `/portal/activar-cuenta/[tenant_id]`. `ActivarCuentaPage` SHALL render new-password and confirmation fields. On submit, `useActivarCuenta` SHALL call `authService.updatePassword(password)` and, only on success, the RPC `activar_alta_administrada(p_tenant_id)`.

`activar_alta_administrada` SHALL be `SECURITY DEFINER` and in one transaction SHALL:
- Require a `pendiente_activacion` membership for `auth.uid()` in `p_tenant_id` (`P0002` otherwise).
- Set it to `activo`.
- Set the linked alta to `activada` with `activated_at = now()`.
- Insert a `miembros_tenant_novedades` row with `tipo = 'activacion_cuenta'`, `estado_resultante = 'activo'`, and `registrado_por = auth.uid()`.

On success the page SHALL route to `/portal/orgs/[tenant_id]`.

#### Scenario: Pending member is sent to activation
- **WHEN** a provisioned member signs in and opens `/portal/orgs/[tenant_id]/...`
- **THEN** the system SHALL redirect to `/portal/activar-cuenta/[tenant_id]`

#### Scenario: Password change activates the membership
- **WHEN** the member sets a valid new password
- **THEN** `updatePassword` SHALL succeed, the membership SHALL become `activo`, the alta SHALL be `activada`, and the user SHALL be routed into the tenant

#### Scenario: Activation is not called when password update fails
- **WHEN** `updatePassword` returns an error
- **THEN** `activar_alta_administrada` SHALL NOT be called and the page SHALL show the error inline

#### Scenario: Activation is idempotent for non-pending members
- **WHEN** an already `activo` member calls `activar_alta_administrada`
- **THEN** the RPC SHALL raise `P0002` and SHALL NOT insert a novedad

---

### Requirement: Pending provisioned accounts SHALL NOT expire
A `pendiente_activacion` membership and its `altas_administradas_tenant` row SHALL remain in that state until the member activates it or an administrator changes the membership estado. No scheduled job SHALL change them.

#### Scenario: Long-pending account is unchanged
- **WHEN** a membership has been `pendiente_activacion` for 90 days and all scheduled jobs have run
- **THEN** its estado SHALL still be `pendiente_activacion`

---

### Requirement: AgregarMiembroModal SHALL add members through either mode
`AgregarMiembroModal` SHALL follow the `AceptarSolicitudModal`/`CambiarEstadoModal` modal pattern (`bg-navy-medium`, `border-portal-border`, uppercase labels). It SHALL render these fields:
- Correo (required, email format).
- Rol (required; options from `useEquipo().roles`, with no Supabase call in the component).
- Nombre (optional).
- Nota (optional, max 500).

A **Modo** choice SHALL be rendered only when `useTenantEntitlements` reports the flag enabled, with options "Invitación por email" (default) and "Cuenta con contraseña temporal". Selecting the second SHALL show an amber notice explaining the security impact.

When the typed email matches an `activo` member in `useEquipo().members`, the modal SHALL show a warning line before submission. *Confirmar* SHALL be disabled until required fields are valid. The modal SHALL show a loading state while submitting and an inline error on failure without closing. The "Agregar miembro" button SHALL be rendered in the Equipo tab action row, left of "Configurar Suspensión", and at the top of the Invitaciones tab.

#### Scenario: Mode selector hidden when entitlement is off
- **WHEN** the tenant flag is `false`
- **THEN** the modal SHALL NOT render the Modo choice and SHALL submit as an invitation

#### Scenario: Warning for existing active member
- **WHEN** the administrator types an email that belongs to an active member of the tenant
- **THEN** the modal SHALL display a warning that the person is already a member

#### Scenario: Invitation success refreshes the Invitaciones tab
- **WHEN** an invitation is submitted successfully
- **THEN** the modal SHALL close and the invitations list SHALL refresh

#### Scenario: Server error shown inline
- **WHEN** submission fails with `rate_limited`
- **THEN** the modal SHALL stay open and display a user-friendly rate-limit message

---

### Requirement: ContrasenaTemporalModal SHALL reveal the password exactly once
After a successful provisioning, `ContrasenaTemporalModal` SHALL show the member email and the password in a monospace box with a *Copiar* button. A required checkbox "Compartiré esta contraseña por un canal aprobado" SHALL gate *Cerrar*. Backdrop clicks and the Escape key SHALL NOT close the modal before acknowledgement. On close, the password SHALL be removed from all component and hook state, and there SHALL be no UI action to view it again.

#### Scenario: Close disabled until acknowledged
- **WHEN** the modal opens
- **THEN** *Cerrar* SHALL be disabled until the checkbox is checked

#### Scenario: Escape does not dismiss before acknowledgement
- **WHEN** the administrator presses Escape before checking the box
- **THEN** the modal SHALL remain open

#### Scenario: Password cannot be retrieved after closing
- **WHEN** the administrator closes the modal
- **THEN** no component or hook state SHALL retain the password and no UI SHALL offer to show it again
