## ADDED Requirements

### Requirement: Pending-activation memberships SHALL be denied tenant route access
`tenantService.canUserAccessTenant` SHALL select `estado` together with the role. When the membership's `estado` is `pendiente_activacion`, it SHALL return `{ tenantId, allowed: false, role: null, pendingActivation: true }`. For every other case, `pendingActivation` SHALL be `false`. `TenantAccessDecision` SHALL include `pendingActivation: boolean`. When `allowed` is `false`, `TenantLayout` SHALL redirect to `/portal/activar-cuenta/[tenant_id]` if `pendingActivation` is `true`, otherwise to `/portal/orgs`. The lookup SHALL continue to execute at most once per request through `getCachedTenantAccess`.

#### Scenario: Pending member is redirected to activation
- **WHEN** a user with a `pendiente_activacion` membership in tenant T navigates to any page under `/portal/orgs/T/`
- **THEN** the system SHALL redirect to `/portal/activar-cuenta/T` without rendering the page or any route group layout

#### Scenario: Pending administrator cannot open admin routes
- **WHEN** a user whose membership in tenant T is `administrador` with `estado = 'pendiente_activacion'` navigates to `/portal/orgs/T/gestion-equipo`
- **THEN** the system SHALL redirect to `/portal/activar-cuenta/T`

#### Scenario: Non-member redirect is unchanged
- **WHEN** a user with no membership in tenant T navigates to a tenant route
- **THEN** `canUserAccessTenant` SHALL return `pendingActivation: false` and `TenantLayout` SHALL redirect to `/portal/orgs`

#### Scenario: Active member access is unchanged
- **WHEN** an `activo` member navigates to a route matching their role
- **THEN** `canUserAccessTenant` SHALL return `allowed: true` and `pendingActivation: false` and the page SHALL render

#### Scenario: Client-side tenant access hook denies pending members
- **WHEN** `useTenantAccess(tenantId)` resolves for a `pendiente_activacion` member
- **THEN** it SHALL report `allowed: false`
