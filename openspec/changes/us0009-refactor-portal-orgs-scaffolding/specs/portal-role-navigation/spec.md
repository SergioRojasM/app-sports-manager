## MODIFIED Requirements

### Requirement: User profile and role fetched once at login
Immediately after successful `signInWithPassword`, `useAuth` SHALL call `portalService.getUserProfile(userId)` exactly once per login event to fetch identity and membership context. This fetch MUST include tenant memberships from `public.miembros_tenant` and related role data from `public.roles`, and tenant-specific role resolution for protected tenant routes SHALL occur against the requested `tenant_id` at tenant entry time.

#### Scenario: Login fetch returns membership context once
- **WHEN** a user successfully authenticates
- **THEN** `useAuth` SHALL fetch profile and membership context exactly once for that login event

#### Scenario: Tenant entry resolves role against target tenant
- **WHEN** an authenticated user navigates to `/portal/orgs/[tenant_id]/*`
- **THEN** the system SHALL resolve role context for the requested `tenant_id` before rendering tenant-scoped protected content

#### Scenario: Profile fetch failure blocks portal redirect
- **WHEN** profile and membership fetch fails after authentication
- **THEN** the system SHALL expose a profile error state and SHALL NOT redirect to protected portal routes

### Requirement: Role-based sidebar menu
`PortalSidebar` SHALL display a tenant-discovery entry for authenticated users and SHALL adapt tenant-scoped menu items according to the resolved role for the active tenant context. Role-specific tenant items MUST only appear after tenant access is validated.

#### Scenario: Sidebar shows organizations discovery entry
- **WHEN** an authenticated user enters the portal shell
- **THEN** the sidebar SHALL include `Organizaciones Disponibles` linking to `/portal/orgs`

#### Scenario: Tenant-scoped menu is role-aware
- **WHEN** a user has validated access to a tenant route
- **THEN** the sidebar SHALL render only items permitted for the resolved tenant role

#### Scenario: Unauthorized tenant context shows no tenant menu
- **WHEN** tenant membership validation fails for requested tenant
- **THEN** tenant-scoped menu items SHALL NOT be rendered and user SHALL be redirected to `/portal/orgs`
