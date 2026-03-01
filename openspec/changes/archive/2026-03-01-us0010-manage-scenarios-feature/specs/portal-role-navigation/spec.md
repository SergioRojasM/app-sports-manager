## MODIFIED Requirements

### Requirement: Role-based sidebar menu
`PortalSidebar` SHALL display a tenant-discovery entry for authenticated users and SHALL adapt tenant-scoped menu items according to the resolved role for the active tenant context. Role-specific tenant items MUST only appear after tenant access is validated. The `gestion-escenarios` tenant route entry SHALL be visible only for `administrador` role in the active tenant.

#### Scenario: Sidebar shows organizations discovery entry
- **WHEN** an authenticated user enters the portal shell
- **THEN** the sidebar SHALL include `Organizaciones Disponibles` linking to `/portal/orgs`

#### Scenario: Tenant-scoped menu is role-aware
- **WHEN** a user has validated access to a tenant route
- **THEN** the sidebar SHALL render only items permitted for the resolved tenant role

#### Scenario: Administrator sees scenario-management route entry
- **WHEN** the resolved role for active tenant is `administrador`
- **THEN** the sidebar SHALL include a tenant-scoped entry for `gestion-escenarios`

#### Scenario: Unauthorized tenant context shows no tenant menu
- **WHEN** tenant membership validation fails for requested tenant
- **THEN** tenant-scoped menu items SHALL NOT be rendered and user SHALL be redirected to `/portal/orgs`
