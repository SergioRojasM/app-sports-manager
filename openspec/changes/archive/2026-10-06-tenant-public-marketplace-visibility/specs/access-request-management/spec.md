## MODIFIED Requirements

### Requirement: RLS SHALL enforce row-level access on solicitudes
Row-Level Security SHALL be enabled on `public.miembros_tenant_solicitudes` with the following policies:
- **INSERT**: authenticated user may only insert rows where `usuario_id = auth.uid()` AND the target `tenant_id` references a tenant with `publico = true`.
- **SELECT (own)**: authenticated user may read rows where `usuario_id = auth.uid()`.
- **SELECT (admin)**: a user with an `administrador` membership in `miembros_tenant` for the matching `tenant_id` may read all rows for that tenant.
- **UPDATE (admin)**: a user with an `administrador` membership for the matching `tenant_id` may update `estado`, `revisado_por`, `revisado_at`, and `nota_revision`.
- No DELETE policy is granted to users.

The SELECT and UPDATE policies SHALL NOT depend on the tenant's `publico` value.

#### Scenario: User can only insert their own request
- **WHEN** an authenticated user submits a request
- **THEN** the system SHALL only allow the insert if `usuario_id` matches the authenticated user's `auth.uid()`

#### Scenario: Insert targeting a private tenant is rejected
- **WHEN** an authenticated user inserts a row with their own `usuario_id` and a `tenant_id` whose tenant has `publico = false`
- **THEN** the system SHALL reject the insert

#### Scenario: Insert targeting a public tenant is allowed
- **WHEN** an authenticated user inserts a row with their own `usuario_id` and a `tenant_id` whose tenant has `publico = true`
- **THEN** the system SHALL allow the insert

#### Scenario: User can read only their own requests
- **WHEN** an authenticated user queries `miembros_tenant_solicitudes`
- **THEN** the system SHALL return only rows where `usuario_id = auth.uid()`

#### Scenario: Admin can read all requests for their tenant
- **WHEN** an administrator queries requests for their tenant
- **THEN** the system SHALL return all solicitud rows for that `tenant_id`

#### Scenario: Admin can update solicitud status
- **WHEN** an administrator updates the `estado` of a request
- **THEN** the system SHALL allow the update if the user holds `administrador` role in that tenant

#### Scenario: Admin manages pending requests of a private tenant
- **WHEN** a tenant has `publico = false` and an administrator of that tenant reads or updates a `pendiente` request created while it was public
- **THEN** the system SHALL allow the read and the update
