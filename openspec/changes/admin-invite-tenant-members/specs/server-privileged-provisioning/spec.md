## ADDED Requirements

### Requirement: Route handlers SHALL exist only for operations requiring the service role
The system SHALL expose privileged route handlers only for operations that call `auth.admin.*`:
- `POST /api/portal/orgs/[tenant_id]/invitaciones` — create an invitation and send the Auth invite.
- `POST /api/portal/orgs/[tenant_id]/invitaciones/[invitacion_id]/reenviar` — resend an invitation.
- `POST /api/portal/orgs/[tenant_id]/miembros/aprovisionar` — provision an account with a temporary password.

Cancel, list, accept, and activate operations SHALL be implemented as `SECURITY DEFINER` RPCs or RLS-governed selects called from the service layer, and MUST NOT have route handlers.

#### Scenario: Unsupported method is rejected
- **WHEN** a client sends `GET` to `/api/portal/orgs/[tenant_id]/invitaciones`
- **THEN** the system SHALL respond with `405`

#### Scenario: Cancel does not use the service role
- **WHEN** an administrator cancels an invitation
- **THEN** the service layer SHALL call the RPC `cancelar_invitacion_tenant` with the user's session and SHALL NOT call any `/api` route

---

### Requirement: Route handlers SHALL resolve the caller from the server session
Each privileged route handler SHALL create the user-session client with `createClient()` from `src/services/supabase/server.ts` and call `supabase.auth.getUser()`. When no authenticated user exists, the handler SHALL respond `401` without calling any RPC or `auth.admin.*` method. The handler MUST NOT accept a user id from the request body, query, or headers.

#### Scenario: Unauthenticated request is rejected
- **WHEN** a request without a valid session reaches a privileged route
- **THEN** the route SHALL respond `401` and SHALL NOT call `createServiceClient()`

#### Scenario: Body-supplied actor is ignored
- **WHEN** a request body includes a `creada_por` or `usuario_id` field different from the session user
- **THEN** the system SHALL use only the session user as the actor

---

### Requirement: Authorization SHALL be enforced inside database RPCs
Every privileged route SHALL call a reserving RPC with the **user-session** client before any `auth.admin.*` call. The RPC SHALL verify via `auth.uid()` that the caller holds the `administrador` role in `p_tenant_id` (raising `SQLSTATE 42501` otherwise) and that `p_rol_id` maps to one of `administrador`, `entrenador`, or `usuario` (raising `SQLSTATE 22023` otherwise). The route SHALL map `42501` → `403`, `22023` → `422`.

#### Scenario: Non-admin caller is rejected before Auth is touched
- **WHEN** a member with role `usuario` in tenant T calls `POST /api/portal/orgs/T/invitaciones`
- **THEN** the reserving RPC SHALL raise `42501`, the route SHALL respond `403`, and no `auth.admin.*` method SHALL be called

#### Scenario: Crafted tenant id is rejected
- **WHEN** an administrator of tenant T calls the route with `tenant_id = U` where they are not an administrator
- **THEN** the route SHALL respond `403` and no record SHALL be created in U

#### Scenario: Unknown role is rejected
- **WHEN** an administrator submits a `rol_id` that does not exist in `roles`
- **THEN** the route SHALL respond `422`

---

### Requirement: Outcome-recording RPCs SHALL be executable only by the service role
RPCs that record the outcome of an `auth.admin.*` call (`registrar_envio_invitacion`, `completar_alta_administrada`, `registrar_fallo_alta`) SHALL have `execute` revoked from `public`, `anon`, and `authenticated`, and granted only to `service_role`.

#### Scenario: Browser session cannot complete a provisioning
- **WHEN** an authenticated user calls `supabase.rpc('completar_alta_administrada', ...)` from the browser
- **THEN** the call SHALL fail with a permission error and no membership SHALL be created

---

### Requirement: Service-role client SHALL be server-only and fail fast
`src/services/supabase/server.ts` SHALL begin with `import 'server-only'`. `createServiceClient()` SHALL throw when `SUPABASE_SERVICE_ROLE_KEY` is undefined or empty, and SHALL create the client with `auth: { persistSession: false, autoRefreshToken: false }`. `SUPABASE_SERVICE_ROLE_KEY` and `APP_URL` MUST NOT be prefixed `NEXT_PUBLIC_`, and `.env.example` SHALL document both as server-only.

#### Scenario: Missing key fails loudly
- **WHEN** a privileged route runs with `SUPABASE_SERVICE_ROLE_KEY` unset
- **THEN** `createServiceClient()` SHALL throw and the route SHALL respond `500` with a generic body that does not mention the key

#### Scenario: Service key is referenced only by server modules
- **WHEN** the source tree is searched for `SUPABASE_SERVICE_ROLE_KEY` and for imports of `@/services/supabase/server`
- **THEN** no match SHALL be in a file marked `'use client'` or in any file under `src/components` or `src/hooks`

#### Scenario: Client component cannot import the server module
- **WHEN** a module marked `'use client'` imports `src/services/supabase/server.ts`
- **THEN** the build SHALL fail due to the `server-only` import

---

### Requirement: Invitation redirect URLs SHALL be built from APP_URL
Privileged routes SHALL build `redirectTo` for `auth.admin.inviteUserByEmail` from the server env var `APP_URL` and MUST NOT derive it from `Host`, `X-Forwarded-Host`, `Origin`, or any other request header. `APP_URL` SHALL be `http://localhost:3000` locally and `https://www.grit-arena.com` in production.

#### Scenario: Spoofed host header does not change the email link
- **WHEN** a request arrives with `X-Forwarded-Host: evil.example`
- **THEN** the invite `redirectTo` SHALL still start with the value of `APP_URL`

---

### Requirement: Invite email links SHALL be verified server-side without exposing tokens in URLs
The Invite email template SHALL link to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&redirect_to={{ .RedirectTo }}`. The template SHALL live in `supabase/templates/invite.html`, be enabled in `supabase/config.toml`, and be applied to the production project. `GET /auth/confirm` SHALL accept only `type=invite` and call `supabase.auth.verifyOtp({ token_hash, type })` with the cookie-based server client. It SHALL take only the path and query from `redirect_to`, and only when its origin equals the request origin or `APP_URL`'s origin; otherwise it SHALL use `/portal/orgs`. On success it SHALL redirect to `/auth/update-password?next=<path>`; on failure it SHALL redirect to `/auth/login`.

#### Scenario: Valid invite link creates a session and asks for a password
- **WHEN** an invitee opens a valid invite link whose `redirect_to` is `${APP_URL}/portal/invitaciones/{id}`
- **THEN** a session cookie SHALL be set and the invitee SHALL be redirected to `/auth/update-password?next=%2Fportal%2Finvitaciones%2F{id}`

#### Scenario: Foreign redirect target is ignored
- **WHEN** the link's `redirect_to` is `https://evil.example/steal`
- **THEN** the invitee SHALL be redirected to `/auth/update-password?next=%2Fportal%2Forgs`

#### Scenario: Invalid or reused token is rejected
- **WHEN** `verifyOtp` fails
- **THEN** the route SHALL redirect to `/auth/login` without setting a session

---

### Requirement: Privileged routes SHALL enforce per-admin and per-tenant rate limits in the database
Reserving RPCs SHALL count recent rows inside the same transaction and raise `SQLSTATE P0001` with message `RATE_LIMIT` when a limit is exceeded. Routes SHALL map it to `429`. Defaults:
- 30 invitations created per administrator per rolling hour.
- 200 invitations created per tenant per rolling day.
- 3 resends per invitation per rolling hour.
- 20 temporary-password accounts per tenant per rolling day.

No IP-based limit SHALL be applied in this version.

#### Scenario: Admin exceeds hourly invitation limit
- **WHEN** an administrator has created 30 invitations in the last hour and submits another
- **THEN** the route SHALL respond `429` and no invitation SHALL be created

#### Scenario: Resend limit is per invitation
- **WHEN** an invitation has been resent 3 times in the last hour and the admin resends it again
- **THEN** the route SHALL respond `429` and no invite email SHALL be sent

---

### Requirement: Responses and logs SHALL never expose secrets or raw Auth errors
Route responses SHALL contain only allow-listed fields and error codes defined in `InvitacionesServiceError` (`forbidden`, `unauthenticated`, `invalid_request`, `rate_limited`, `not_found`, `expired`, `cancelled`, `already_accepted`, `email_mismatch`, `feature_disabled`, `account_exists`, `unexpected`). Raw Supabase/Auth error messages MUST NOT be returned. `src/lib/portal/audit-log.ts` (`server-only`) SHALL emit one JSON line per event with only the fields `evento`, `tenant_id`, `actor_id`, `objetivo_id`, `resultado`, and `codigo`; it MUST NOT accept passwords, tokens, email addresses, or error objects.

#### Scenario: Auth failure returns a generic code
- **WHEN** `auth.admin.inviteUserByEmail` fails with an unexpected Auth error
- **THEN** the route SHALL respond with code `unexpected` and SHALL NOT include the Auth error message

#### Scenario: Audit log line excludes the email
- **WHEN** an invitation is created
- **THEN** the emitted audit line SHALL contain `evento: 'invitacion_creada'` and the invitation id, and SHALL NOT contain the recipient email

#### Scenario: Password never appears in logs
- **WHEN** a temporary-password account is provisioned
- **THEN** no server log line SHALL contain the generated password
