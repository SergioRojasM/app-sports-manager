## ADDED Requirements

### Requirement: Access request table SHALL persist user requests to join a tenant
The system SHALL maintain a `public.miembros_tenant_solicitudes` table with columns: `id`, `tenant_id`, `usuario_id`, `estado` (`pendiente` | `aceptada` | `rechazada`), `mensaje`, `nota_revision`, `rol_solicitado_id`, `revisado_por`, `revisado_at`, `created_at`, `updated_at`. A partial unique index SHALL prevent more than one row with `estado = 'pendiente'` per `(tenant_id, usuario_id)` pair. Rows with terminal states (`aceptada`, `rechazada`) SHALL be retained as history.

#### Scenario: Partial unique index blocks duplicate pending requests
- **WHEN** a user already has a row with `estado = 'pendiente'` for a given tenant
- **THEN** the system SHALL reject a second insert with the same `(tenant_id, usuario_id)` pair

#### Scenario: Terminal state rows do not block new requests
- **WHEN** a user has one or more rows with `estado = 'rechazada'` for a tenant and the rejection count is below 3
- **THEN** the system SHALL allow insertion of a new `pendiente` row for the same `(tenant_id, usuario_id)`

---

### Requirement: RLS SHALL enforce row-level access on solicitudes
Row-Level Security SHALL be enabled on `public.miembros_tenant_solicitudes` with the following policies:
- **INSERT**: authenticated user may only insert rows where `usuario_id = auth.uid()`.
- **SELECT (own)**: authenticated user may read rows where `usuario_id = auth.uid()`.
- **SELECT (admin)**: a user with an `administrador` membership in `miembros_tenant` for the matching `tenant_id` may read all rows for that tenant.
- **UPDATE (admin)**: a user with an `administrador` membership for the matching `tenant_id` may update `estado`, `revisado_por`, `revisado_at`, and `nota_revision`.
- No DELETE policy is granted to users.

#### Scenario: User can only insert their own request
- **WHEN** an authenticated user submits a request
- **THEN** the system SHALL only allow the insert if `usuario_id` matches the authenticated user's `auth.uid()`

#### Scenario: User can read only their own requests
- **WHEN** an authenticated user queries `miembros_tenant_solicitudes`
- **THEN** the system SHALL return only rows where `usuario_id = auth.uid()`

#### Scenario: Admin can read all requests for their tenant
- **WHEN** an administrator queries requests for their tenant
- **THEN** the system SHALL return all solicitud rows for that `tenant_id`

#### Scenario: Admin can update solicitud status
- **WHEN** an administrator updates the `estado` of a request
- **THEN** the system SHALL allow the update if the user holds `administrador` role in that tenant

---

### Requirement: `createSolicitud` SHALL enforce the 3-rejection cap
`solicitudes.service.ts` SHALL expose `createSolicitud(input)` which before inserting SHALL: (1) check for an existing `pendiente` row — if found, throw `SolicitudesServiceError` with code `'duplicate'`; (2) count rows with `estado = 'rechazada'` — if count ≥ 3, throw `SolicitudesServiceError` with code `'max_rejections'`; (3) otherwise insert a new row with `estado = 'pendiente'`.

#### Scenario: Submit when no prior request exists
- **WHEN** a user calls `createSolicitud` for a tenant they have never requested access to
- **THEN** the system SHALL insert a new row with `estado = 'pendiente'` and return without error

#### Scenario: Submit when a pending request already exists
- **WHEN** a user calls `createSolicitud` for a tenant where they already have a `pendiente` row
- **THEN** the system SHALL throw a `SolicitudesServiceError` with code `'duplicate'`

#### Scenario: Submit when rejection cap is reached
- **WHEN** a user calls `createSolicitud` for a tenant where they have 3 or more `rechazada` rows
- **THEN** the system SHALL throw a `SolicitudesServiceError` with code `'max_rejections'`

#### Scenario: Submit after a single rejection succeeds
- **WHEN** a user calls `createSolicitud` for a tenant where they have exactly 1 `rechazada` row and no `pendiente` row
- **THEN** the system SHALL insert a new `pendiente` row successfully

---

### Requirement: `aceptarSolicitud` SHALL update the request and create membership
`solicitudes.service.ts` SHALL expose `aceptarSolicitud(input: AceptarSolicitudInput)` which SHALL: (1) update the solicitud row setting `estado = 'aceptada'`, `revisado_por`, `revisado_at`; (2) insert a new row into `miembros_tenant` with `tenant_id`, `usuario_id`, `rol_id`. If the `miembros_tenant` insert fails due to a unique constraint violation, the service SHALL surface a `SolicitudesServiceError` with code `'already_member'`.

#### Scenario: Accept creates membership and marks request accepted
- **WHEN** an administrator calls `aceptarSolicitud` with a valid role
- **THEN** the system SHALL update the solicitud `estado` to `aceptada` AND insert a new record into `miembros_tenant`

#### Scenario: Accept on already-member user is handled gracefully
- **WHEN** an administrator calls `aceptarSolicitud` for a user who is already a member
- **THEN** the system SHALL throw a `SolicitudesServiceError` with code `'already_member'`

---

### Requirement: `rechazarSolicitud` SHALL update the request with an optional rejection note
`solicitudes.service.ts` SHALL expose `rechazarSolicitud(input: RechazarSolicitudInput)` which SHALL update the solicitud row setting `estado = 'rechazada'`, `revisado_por`, `revisado_at`, and optionally `nota_revision` when provided. No membership record SHALL be created.

#### Scenario: Reject updates estado and records reviewer
- **WHEN** an administrator calls `rechazarSolicitud`
- **THEN** the system SHALL update `estado` to `rechazada` and set `revisado_por` and `revisado_at`

#### Scenario: Rejection note is stored when provided
- **WHEN** an administrator calls `rechazarSolicitud` with a `nota_revision` value
- **THEN** the system SHALL persist the `nota_revision` text in the solicitud row

---

### Requirement: Admin Solicitudes tab SHALL display pending requests with accept and reject actions
The `gestion-equipo` page SHALL render a "Solicitudes" tab that is only visible to administrators. The tab SHALL use `useSolicitudesAdmin` to load all requests with `estado = 'pendiente'` for the tenant. The tab SHALL render a `SolicitudesTable` with columns: user avatar, full name, email, request date, `SolicitudEstadoBadge`, and action buttons Aceptar / Rechazar.

#### Scenario: Solicitudes tab loads pending requests on mount
- **WHEN** an administrator opens the Solicitudes tab
- **THEN** the system SHALL fetch and display all pending requests for that tenant

#### Scenario: Empty state is shown when no pending requests
- **WHEN** there are no rows with `estado = 'pendiente'` for the tenant
- **THEN** the system SHALL render an empty state message instead of the table

#### Scenario: Aceptar button opens role-selection modal
- **WHEN** the administrator clicks Aceptar on a solicitud row
- **THEN** the system SHALL open `AceptarSolicitudModal` populated with available roles from the `roles` table

#### Scenario: Rechazar button shows inline confirmation
- **WHEN** the administrator clicks Rechazar on a solicitud row
- **THEN** the system SHALL display an inline confirmation or modal asking for an optional rejection note before proceeding

#### Scenario: After accept the request disappears from the pending list
- **WHEN** the administrator confirms acceptance
- **THEN** the system SHALL call `aceptarSolicitud`, close the modal, and refresh the solicitudes list removing the accepted row

#### Scenario: After reject the request disappears from the pending list
- **WHEN** the administrator confirms rejection
- **THEN** the system SHALL call `rechazarSolicitud` and refresh the list removing the rejected row

---

### Requirement: Solicitudes tab badge SHALL show the count of pending requests
The "Solicitudes" tab label in `EquipoPage` SHALL render a numeric badge displaying the count of pending requests. The count SHALL be derived from the `solicitudes` array exposed by `useSolicitudesAdmin`.

#### Scenario: Badge shows correct pending count
- **WHEN** the administrator views the gestion-equipo page with pending requests
- **THEN** the system SHALL render a badge next to the "Solicitudes" tab label with the correct count

#### Scenario: Badge is hidden when count is zero
- **WHEN** there are no pending requests
- **THEN** the system SHALL NOT render the numeric badge on the tab label

---

### Requirement: `SolicitudEstadoBadge` SHALL render a colour-coded badge per estado
`SolicitudEstadoBadge` SHALL render a `<span>` with colour classes mapping each `estado` value: `pendiente` → amber, `aceptada` → emerald, `rechazada` → rose.

#### Scenario: Pendiente badge is amber
- **WHEN** `estado` is `pendiente`
- **THEN** the system SHALL render the badge with amber colour classes

#### Scenario: Aceptada badge is emerald
- **WHEN** `estado` is `aceptada`
- **THEN** the system SHALL render the badge with emerald colour classes

#### Scenario: Rechazada badge is rose
- **WHEN** `estado` is `rechazada`
- **THEN** the system SHALL render the badge with rose colour classes
