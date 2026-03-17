## ADDED Requirements

### Requirement: System SHALL persist blocked users in a dedicated table per tenant
The system SHALL maintain a `public.miembros_tenant_bloqueados` table with a unique constraint on `(tenant_id, usuario_id)`. A block record is the authoritative signal that a user is blocked for a specific tenant. The table SHALL store `bloqueado_por` (nullable, admin who triggered the block), `bloqueado_at`, and an optional `motivo` text field.

#### Scenario: Block record is created on auto-block
- **WHEN** a user's rejection count for a tenant reaches the tenant's `max_solicitudes` threshold after a rejection
- **THEN** the system SHALL insert a row into `miembros_tenant_bloqueados` for `(tenant_id, usuario_id)` with `bloqueado_por` set to the reviewing admin

#### Scenario: Block insert is idempotent
- **WHEN** the auto-block logic fires for a user who already has a block record
- **THEN** the system SHALL perform the insert with `ON CONFLICT (tenant_id, usuario_id) DO NOTHING` and SHALL NOT raise an error

#### Scenario: Block record is created by manual admin action
- **WHEN** an administrator clicks "Bloquear" for a user in the Solicitudes tab and confirms
- **THEN** the system SHALL insert a row into `miembros_tenant_bloqueados` for that user and tenant

#### Scenario: Block record is removed on unblock
- **WHEN** an administrator clicks "Desbloquear" for a user in the Bloqueados tab and confirms
- **THEN** the system SHALL delete the corresponding row from `miembros_tenant_bloqueados`

---

### Requirement: Blocked status SHALL be read from the database, not computed locally
The `useSolicitudRequest` hook SHALL determine blocked status by querying `public.miembros_tenant_bloqueados` for the current `(tenant_id, usuario_id)` pair. The hook SHALL return `isBanned: boolean` reflecting the DB lookup, and `isBlocked` SHALL equal `isBanned`.

#### Scenario: User with a block record sees blocked state
- **WHEN** `useSolicitudRequest` loads and a block record exists for the user and tenant
- **THEN** `isBanned` SHALL be `true` and the `SolicitarAccesoButton` SHALL render the blocked message

#### Scenario: User without a block record sees normal state
- **WHEN** `useSolicitudRequest` loads and no block record exists for the user and tenant
- **THEN** `isBanned` SHALL be `false` and request submission SHALL be permitted

#### Scenario: Block status and solicitudes are fetched in parallel
- **WHEN** `loadData` is called in `useSolicitudRequest`
- **THEN** the system SHALL call `getUserBloqueadoForTenant` and `getUserSolicitudesForTenant` concurrently via `Promise.all`

---

### Requirement: `createSolicitud` SHALL guard against blocked users via the block table
`solicitudesService.createSolicitud` SHALL query `miembros_tenant_bloqueados` for the requesting user before inserting. If a block record exists, the service SHALL throw a `SolicitudesServiceError` with code `'blocked'`.

#### Scenario: Blocked user attempts to submit a request
- **WHEN** a user with a block record calls `createSolicitud`
- **THEN** the service SHALL throw `SolicitudesServiceError('blocked', ...)` and SHALL NOT insert into `miembros_tenant_solicitudes`

#### Scenario: Non-blocked user submits a request normally
- **WHEN** a user without a block record calls `createSolicitud`
- **THEN** the service SHALL proceed with existing duplicate-pending and insert logic

---

### Requirement: Auto-block SHALL fire inside `rechazarSolicitud` when threshold is reached
After updating a request to `rechazada`, `solicitudesService.rechazarSolicitud` SHALL count the user's total `rechazada` rows for the tenant and compare them against `tenants.max_solicitudes`. If `count >= max_solicitudes`, the service SHALL insert a block record.

`RechazarSolicitudInput` SHALL include `tenant_id: string` and `usuario_id: string` to support this check without an additional DB lookup.

#### Scenario: Rejection that reaches the threshold auto-blocks the user
- **WHEN** an admin rejects a request and the user's total rejected count for that tenant equals `max_solicitudes`
- **THEN** the service SHALL insert a row into `miembros_tenant_bloqueados` for that user

#### Scenario: Rejection below threshold does not create a block record
- **WHEN** an admin rejects a request and the user's total rejected count is still below `max_solicitudes`
- **THEN** the service SHALL NOT insert into `miembros_tenant_bloqueados`

---

### Requirement: RLS on `miembros_tenant_bloqueados` SHALL enforce tenant isolation
Row-level security SHALL be enabled on `miembros_tenant_bloqueados`. Policies SHALL allow:
- **SELECT (own)**: authenticated user may read rows where `usuario_id = auth.uid()`.
- **SELECT (admin)**: authenticated admin may read all rows for their tenants via `get_admin_tenants_for_authenticated_user()`.
- **INSERT (admin)**: authenticated admin may insert rows for their tenants.
- **DELETE (admin)**: authenticated admin may delete rows for their tenants.
No user-level INSERT, UPDATE, or DELETE policies SHALL exist.

#### Scenario: User can read own block record
- **WHEN** an authenticated user queries `miembros_tenant_bloqueados` filtered by their own `usuario_id`
- **THEN** the query SHALL return their block records (if any)

#### Scenario: User cannot read other users' block records
- **WHEN** an authenticated user queries `miembros_tenant_bloqueados` without filtering by their own `usuario_id`
- **THEN** RLS SHALL prevent returning rows belonging to other users

#### Scenario: Admin can read all block records for their tenant
- **WHEN** an authenticated admin queries `miembros_tenant_bloqueados` filtered by their `tenant_id`
- **THEN** the query SHALL return all block records for that tenant

#### Scenario: Admin can insert a block record for their tenant
- **WHEN** an admin calls `bloquearUsuario` for a user in their tenant
- **THEN** the INSERT SHALL succeed

#### Scenario: Admin can delete a block record for their tenant
- **WHEN** an admin calls `desbloquearUsuario` for a user in their tenant
- **THEN** the DELETE SHALL succeed and the user SHALL no longer be blocked
