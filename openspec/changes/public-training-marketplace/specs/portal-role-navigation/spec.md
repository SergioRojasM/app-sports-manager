## ADDED Requirements

### Requirement: Non-tenant menu includes Entrenamientos Públicos entry
`resolvePortalMenu` SHALL include an "Entrenamientos Públicos" entry (linking to `/portal/entrenamientos-publicos`) when the user has not entered a tenant (`!tenantId`), positioned after the `Organizaciones Disponibles` entry. This entry SHALL be visible to every authenticated role (`administrador`, `entrenador`, `usuario`) and SHALL NOT appear in the tenant-scoped menu (inside `/portal/orgs/[tenant_id]/...`).

#### Scenario: Entrenamientos Públicos appears outside tenant context
- **WHEN** an authenticated user with any role views the dropdown/sidebar menu while not inside a tenant context
- **THEN** the menu SHALL include an "Entrenamientos Públicos" entry linking to `/portal/entrenamientos-publicos`

#### Scenario: Entry is not injected into the tenant-scoped menu
- **WHEN** an authenticated user has validated access to a tenant route and views the tenant-scoped menu
- **THEN** the menu SHALL NOT include an "Entrenamientos Públicos" entry

#### Scenario: Entry is role-agnostic
- **WHEN** the non-tenant menu is resolved for `administrador`, `entrenador`, or `usuario`
- **THEN** the "Entrenamientos Públicos" entry SHALL be present in all three cases
