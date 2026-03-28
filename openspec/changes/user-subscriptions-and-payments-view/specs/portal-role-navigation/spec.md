## MODIFIED Requirements

### Requirement: Role-based sidebar menu
`PortalSidebar` SHALL display an "Inicio" entry as the first menu item for all authenticated users, followed by a tenant-discovery entry. The sidebar SHALL adapt tenant-scoped menu items according to the resolved role for the active tenant context. Role-specific tenant items MUST only appear after tenant access is validated. The `gestion-escenarios` tenant route entry SHALL be visible only for `administrador` role in the active tenant. The `gestion-planes` tenant route entry SHALL be visible for `administrador`, `usuario`, and `entrenador` roles. The `gestion-suscripciones` tenant route entry SHALL be visible only for `administrador` role in the active tenant. The `mis-suscripciones-y-pagos` tenant route entry SHALL be visible only for the `usuario` role in the active tenant. The "Inicio" entry SHALL always be present regardless of tenant context, enabling users to return to their personal dashboard.

#### Scenario: Sidebar shows Inicio as first menu item
- **WHEN** an authenticated user enters the portal shell
- **THEN** the sidebar SHALL include `Inicio` with `home` icon linking to `/portal/inicio` as the first menu item

#### Scenario: Sidebar shows organizations discovery entry after Inicio
- **WHEN** an authenticated user enters the portal shell
- **THEN** the sidebar SHALL include `Organizaciones Disponibles` linking to `/portal/orgs` after the `Inicio` entry

#### Scenario: Inicio visible inside tenant context
- **WHEN** a user is navigating within a tenant context (`/portal/orgs/[tenant_id]/...`)
- **THEN** the sidebar SHALL still display the `Inicio` item as the first entry, before any tenant-scoped items

#### Scenario: Tenant-scoped menu is role-aware
- **WHEN** a user has validated access to a tenant route
- **THEN** the sidebar SHALL render only items permitted for the resolved tenant role

#### Scenario: Administrator sees scenario-management route entry
- **WHEN** the resolved role for active tenant is `administrador`
- **THEN** the sidebar SHALL include a tenant-scoped entry for `gestion-escenarios`

#### Scenario: Administrator sees planes route entry
- **WHEN** the resolved role for active tenant is `administrador`
- **THEN** the sidebar SHALL include a tenant-scoped entry for `gestion-planes`

#### Scenario: Usuario sees planes route entry
- **WHEN** the resolved role for active tenant is `usuario`
- **THEN** the sidebar SHALL include a tenant-scoped entry for `gestion-planes`

#### Scenario: Entrenador sees planes route entry
- **WHEN** the resolved role for active tenant is `entrenador`
- **THEN** the sidebar SHALL include a tenant-scoped entry for `gestion-planes`

#### Scenario: Administrator sees subscription-management route entry
- **WHEN** the resolved role for active tenant is `administrador`
- **THEN** the sidebar SHALL include a tenant-scoped entry for `gestion-suscripciones`

#### Scenario: Non-administrator does not see subscription-management route entry
- **WHEN** the resolved role for active tenant is `usuario` or `entrenador`
- **THEN** the sidebar SHALL NOT include an entry for `gestion-suscripciones`

#### Scenario: Usuario sees mis-suscripciones-y-pagos route entry
- **WHEN** the resolved role for active tenant is `usuario`
- **THEN** the sidebar SHALL include a tenant-scoped entry for `mis-suscripciones-y-pagos` with icon `receipt_long` positioned after `gestion-planes`

#### Scenario: Non-usuario does not see mis-suscripciones-y-pagos route entry
- **WHEN** the resolved role for active tenant is `administrador` or `entrenador`
- **THEN** the sidebar SHALL NOT include an entry for `mis-suscripciones-y-pagos`

#### Scenario: Unauthorized tenant context shows no tenant menu
- **WHEN** tenant membership validation fails for requested tenant
- **THEN** tenant-scoped menu items SHALL NOT be rendered and user SHALL be redirected to `/portal/orgs`
