## ADDED Requirements

### Requirement: Tenant-scoped portal route scaffolding
The system SHALL expose tenant-scoped portal routes under `/portal/orgs/[tenant_id]` and SHALL locate role and shared modules under route groups `(administrador)`, `(atleta)`, `(entrenador)`, and `(shared)` for that tenant context.

#### Scenario: Tenant-scoped role routes are available
- **WHEN** an authenticated user navigates to a tenant role route under `/portal/orgs/[tenant_id]/...`
- **THEN** the system SHALL resolve the page from the tenant-scoped route scaffold and SHALL preserve the shared portal shell behavior

### Requirement: Organizations index is discoverable for authenticated users
The system SHALL provide `/portal/orgs` as an authenticated organizations index and SHALL list all tenants except the canonical public tenant.

#### Scenario: Authenticated user sees organizations list excluding public
- **WHEN** an authenticated user opens `/portal/orgs`
- **THEN** the system SHALL render organization cards for all visible tenants except the public tenant

### Requirement: Tenant entry is gated by membership and role
The system SHALL allow access to `/portal/orgs/[tenant_id]/*` only when the authenticated user has a valid membership in `miembros_tenant` for that `tenant_id` and a resolved role context.

#### Scenario: Member with role can enter tenant routes
- **WHEN** a user with membership and role for the target `tenant_id` opens a tenant-scoped route
- **THEN** the system SHALL grant access and SHALL resolve tenant role context for downstream navigation

#### Scenario: Non-member is redirected from tenant routes
- **WHEN** a user without membership for the target `tenant_id` opens a tenant-scoped route
- **THEN** the system SHALL deny access and SHALL redirect the user to `/portal/orgs`

### Requirement: Subscribe action is visible and non-persistent
The system SHALL expose a `Suscribirse` action on organization cards for users without tenant membership, and this action MUST provide deterministic placeholder feedback without persisting any request.

#### Scenario: Non-member uses subscribe placeholder action
- **WHEN** a non-member user clicks `Suscribirse` on an organization card
- **THEN** the system SHALL show clear not-yet-available feedback and SHALL NOT write subscription data to persistence
