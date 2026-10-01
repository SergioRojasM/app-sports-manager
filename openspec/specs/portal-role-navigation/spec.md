# portal-role-navigation Specification

## Purpose
Defines the role-aware portal sidebar menu and the default post-login and portal-root redirects to /portal/inicio.
## Requirements
### Requirement: Role-based sidebar menu
`PortalSidebar` SHALL display an "Inicio" entry as the first menu item for all authenticated users, followed by a tenant-discovery entry. The sidebar SHALL adapt tenant-scoped menu items according to the resolved role for the active tenant context. Role-specific tenant items MUST only appear after tenant access is validated.

Visibility of specific tenant route entries:
- `gestion-escenarios`: only the `administrador` role in the active tenant.
- `gestion-planes`: the `administrador`, `usuario`, and `entrenador` roles.
- `gestion-suscripciones`: only the `administrador` role in the active tenant.
- `gestion-eventos`: only the `administrador` role in the active tenant, labelled "Eventos" with icon `event`, positioned immediately after the `gestion-entrenamientos` entry.
- `mis-suscripciones-y-pagos`: only the `usuario` role in the active tenant.

The "Inicio" entry SHALL always be present regardless of tenant context, enabling users to return to their personal dashboard.

Outside a tenant context, the sidebar SHALL include an "Eventos" entry (icon `celebration`) linking to `/portal/eventos` (US-0120). The sidebar SHALL NOT include an "Entrenamientos Públicos" entry in any context (US-0123).

Outside a tenant context, the "Mis Reservas" entry SHALL be followed immediately by a "Mis Entradas" entry (icon `confirmation_number`) linking to `/portal/mis-entradas` (US-0121).

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

#### Scenario: Administrator sees events route entry
- **WHEN** the resolved role for active tenant is `administrador`
- **THEN** the sidebar SHALL include an "Eventos" entry with icon `event` linking to `/portal/orgs/[tenant_id]/gestion-eventos`, positioned immediately after the `gestion-entrenamientos` entry

#### Scenario: Non-administrator does not see events route entry
- **WHEN** the resolved role for active tenant is `usuario` or `entrenador`
- **THEN** the sidebar SHALL NOT include an entry for `gestion-eventos`

#### Scenario: Usuario sees mis-suscripciones-y-pagos route entry
- **WHEN** the resolved role for active tenant is `usuario`
- **THEN** the sidebar SHALL include a tenant-scoped entry for `mis-suscripciones-y-pagos` with icon `receipt_long` positioned after `gestion-planes`

#### Scenario: Non-usuario does not see mis-suscripciones-y-pagos route entry
- **WHEN** the resolved role for active tenant is `administrador` or `entrenador`
- **THEN** the sidebar SHALL NOT include an entry for `mis-suscripciones-y-pagos`

#### Scenario: Unauthorized tenant context shows no tenant menu
- **WHEN** tenant membership validation fails for requested tenant
- **THEN** tenant-scoped menu items SHALL NOT be rendered and user SHALL be redirected to `/portal/orgs`

#### Scenario: Global events entry outside tenant context
- **WHEN** an authenticated user is in the portal without an active tenant context
- **THEN** the sidebar SHALL include "Eventos" with icon `celebration` linking to `/portal/eventos`, and SHALL NOT include "Entrenamientos Públicos"

#### Scenario: Mis Entradas entry after Mis Reservas
- **WHEN** an authenticated user is in the portal without an active tenant context
- **THEN** the sidebar SHALL include "Mis Entradas" with icon `confirmation_number` linking to `/portal/mis-entradas`, immediately after "Mis Reservas"

### Requirement: Default post-login redirect to /portal/inicio
The bootstrap route (`/portal/bootstrap`) SHALL redirect authenticated users to `/portal/inicio` by default when no `next` parameter is provided. The portal layout SHALL use `/portal/inicio` as the default bootstrap target when cookies are missing or invalid.

#### Scenario: Bootstrap redirects to /portal/inicio by default
- **WHEN** an authenticated user hits `/portal/bootstrap` without a `next` parameter
- **THEN** the system SHALL redirect to `/portal/inicio`

#### Scenario: Bootstrap respects explicit next parameter
- **WHEN** an authenticated user hits `/portal/bootstrap?next=/portal/orgs/some-id`
- **THEN** the system SHALL redirect to `/portal/orgs/some-id` (the explicit next value)

#### Scenario: Portal layout uses /portal/inicio as bootstrap target
- **WHEN** the portal layout detects missing or invalid cookies
- **THEN** the system SHALL redirect to `/portal/bootstrap?next=/portal/inicio`

### Requirement: Portal root redirects to /portal/inicio
The portal root page (`/portal/page.tsx`) SHALL redirect to `/portal/inicio` instead of displaying a static placeholder.

#### Scenario: Visiting /portal redirects to /portal/inicio
- **WHEN** a user navigates to `/portal`
- **THEN** the system SHALL redirect to `/portal/inicio`

