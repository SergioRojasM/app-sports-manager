## MODIFIED Requirements

### Requirement: Organization data is tenant-scoped and read-only
The system SHALL resolve organization tenant context from authenticated membership relations (`public.miembros_tenant`) and SHALL support both discovery and management use cases within tenant constraints. Read operations for organization discovery SHALL return visible tenants from `public.tenants` excluding the canonical public tenant, and tenant management operations SHALL target only the active membership-selected `tenant_id`.

#### Scenario: Tenant discovery list excludes public tenant
- **WHEN** an authenticated user opens organization discovery
- **THEN** the system SHALL fetch visible tenant records from `public.tenants` and SHALL exclude the public tenant

#### Scenario: Tenant management resolves active membership tenant
- **WHEN** an authenticated `administrador` opens tenant organization management
- **THEN** the system SHALL resolve active `tenant_id` from membership context and SHALL fetch tenant data scoped to that tenant

#### Scenario: Tenant update persists only active tenant
- **WHEN** an authorized admin submits valid organization changes for the active tenant
- **THEN** the system SHALL update exactly one `public.tenants` record matching the active `tenant_id`

## ADDED Requirements

### Requirement: Organization cards expose membership-aware actions
The system SHALL render organization discovery cards using `OrganizationIdentityCard` and SHALL expose action states based on membership context: an access action for members with role and a subscribe placeholder action for non-members.

#### Scenario: Member sees access action
- **WHEN** the listed organization matches a tenant where the user has membership and role
- **THEN** the card SHALL present an access action that navigates to tenant-scoped routes

#### Scenario: Non-member sees subscribe action
- **WHEN** the listed organization does not match any tenant membership for the user
- **THEN** the card SHALL present a `Suscribirse` placeholder action with non-persistent feedback
