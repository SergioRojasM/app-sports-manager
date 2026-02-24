## MODIFIED Requirements

### Requirement: User profile and role fetched once at login
Immediately after a successful `signInWithPassword`, `useAuth` SHALL call `portalService.getUserProfile(userId)` to fetch the user's profile and tenant-scoped role context from membership relations (`public.miembros_tenant`) joined with `public.roles` and `public.tenants`. This query MUST run exactly once per login event and SHALL NOT be repeated on subsequent portal navigations.

#### Scenario: Profile and membership context are fetched after login
- **WHEN** a user successfully authenticates
- **THEN** `useAuth` SHALL call `portalService.getUserProfile` and obtain `UserProfile` including resolved membership-backed `role` and tenant context

#### Scenario: Profile fetch failure is handled
- **WHEN** `portalService.getUserProfile` returns an error
- **THEN** `useAuth` SHALL expose a `profileError` string and SHALL NOT redirect to `/portal`

### Requirement: Role-based sidebar menu
`PortalSidebar` SHALL receive the resolved role context and render only one navigation option for this change scope: `Organizaciones Disponibles` (`/portal/gestion-organizacion`) for `administrador`, `entrenador`, and `usuario`. Additional menu items for role-specific modules MUST NOT appear until tenant-selection UX is introduced.

#### Scenario: Administrador sees only one navigation option
- **WHEN** the authenticated user role is `administrador`
- **THEN** the sidebar SHALL display exactly one item labeled `Organizaciones Disponibles`

#### Scenario: Entrenador sees only one navigation option
- **WHEN** the authenticated user role is `entrenador`
- **THEN** the sidebar SHALL display exactly one item labeled `Organizaciones Disponibles`

#### Scenario: Usuario sees only one navigation option
- **WHEN** the authenticated user role is `usuario`
- **THEN** the sidebar SHALL display exactly one item labeled `Organizaciones Disponibles`
