## MODIFIED Requirements

### Requirement: Role-based sidebar menu
The portal navigation (rendered by `PortalNavContent` in both `PortalSidebar` and `PortalMobileDrawer`) SHALL be composed of two sections.

**1. "MENÚ" (global)**: this section SHALL be present for every authenticated user in every context (inside and outside a tenant). It SHALL contain exactly these items, in this order:
- Inicio (`home`) → `/portal/inicio`
- Organizaciones (`corporate_fare`) → `/portal/orgs`
- Eventos (`emoji_events`) → `/portal/eventos`
- Mis Suscripciones (`credit_card`) → `/portal/mis-suscripciones`
- Mis Reservas (`event_available`) → `/portal/mis-reservas`
- Mis Entradas (`confirmation_number`) → `/portal/mis-entradas`

**2. "ORGANIZACIÓN" (tenant)**: this section SHALL be rendered only when the pathname is under `/portal/orgs/{tenantId}` AND tenant access has been validated with a non-null per-tenant role. Its items SHALL be resolved from `TENANT_NAV_TREE` for that role. Hrefs SHALL be `/portal/orgs/{tenantId}/{path}`. Groups with no visible child SHALL be omitted.

| Group | Item | Path | Roles |
|---|---|---|---|
| Administración (`tune`) | Configuración | `gestion-organizacion` | administrador |
| | Escenarios | `gestion-escenarios` | administrador |
| | Disciplinas | `gestion-disciplinas` | administrador |
| | Servicios | `gestion-servicios` | administrador |
| | Planes | `gestion-planes` | administrador, entrenador |
| Equipo (`group`) | Miembros | `gestion-equipo` | administrador |
| | Atletas | `atletas` | entrenador |
| | Suscripciones | `gestion-suscripciones` | administrador |
| Entrenamientos (`fitness_center`) | Calendario (label "Entrenamientos disponibles" for usuario) | `gestion-entrenamientos` | administrador, entrenador, usuario |
| | Reservas | `gestion-reservas` | administrador, entrenador |
| | Formularios | `gestion-formularios` | administrador |
| Eventos (`emoji_events`) | Calendario | `gestion-eventos` | administrador |
| | Check-in | `control-ingreso` | administrador, entrenador |
| (top-level leaf) Planes (`card_membership`) | | `gestion-planes` | usuario |
| (top-level leaf) Analítica (`bar_chart`) | | `analitica` | administrador |

- The tenant section SHALL NOT include a "Reservas" item under Equipo.
- The tenant section SHALL NOT include a `mis-suscripciones-y-pagos` entry; "Mis Suscripciones" in MENÚ covers it.
- The navigation SHALL NOT include an "Entrenamientos Públicos" entry in any context (US-0123).
- Hiding an entry SHALL NOT replace the server route guards.

#### Scenario: Global menu outside a tenant
- **WHEN** an authenticated user is on `/portal/inicio`
- **THEN** the navigation SHALL show exactly Inicio, Organizaciones, Eventos, Mis Suscripciones, Mis Reservas, Mis Entradas in that order
- **AND** no "ORGANIZACIÓN" section SHALL be rendered

#### Scenario: Global menu remains inside a tenant
- **WHEN** a user with validated access is on `/portal/orgs/{tenantId}/gestion-equipo`
- **THEN** the same six global items SHALL be shown under "MENÚ", followed by the "ORGANIZACIÓN" section

#### Scenario: Administrator tenant tree
- **WHEN** the resolved role for the active tenant is `administrador`
- **THEN** the ORGANIZACIÓN section SHALL contain: Administración (Configuración, Escenarios, Disciplinas, Servicios, Planes), Equipo (Miembros, Suscripciones), Entrenamientos (Calendario, Reservas, Formularios), Eventos (Calendario, Check-in), and the leaf Analítica, in that order

#### Scenario: Trainer tenant tree
- **WHEN** the resolved role for the active tenant is `entrenador`
- **THEN** the ORGANIZACIÓN section SHALL contain exactly: Administración (Planes), Equipo (Atletas), Entrenamientos (Calendario, Reservas), Eventos (Check-in)

#### Scenario: Member tenant tree
- **WHEN** the resolved role for the active tenant is `usuario`
- **THEN** the ORGANIZACIÓN section SHALL contain exactly: Entrenamientos (Entrenamientos disponibles) and the leaf Planes

#### Scenario: No Reservas under Equipo
- **WHEN** the ORGANIZACIÓN section is rendered for any role
- **THEN** the Equipo group SHALL NOT contain a "Reservas" item

#### Scenario: Item links resolve to tenant routes
- **WHEN** the administrator clicks Administración › Configuración in tenant `T`
- **THEN** the app SHALL navigate to `/portal/orgs/T/gestion-organizacion`

#### Scenario: Unauthorized tenant context shows no tenant section
- **WHEN** tenant membership validation fails or the membership is pending activation
- **THEN** the ORGANIZACIÓN section SHALL NOT be rendered, and the existing server redirects SHALL apply unchanged

#### Scenario: Tenant section while access is resolving
- **WHEN** the per-tenant role is still loading
- **THEN** a skeleton block SHALL be rendered in place of the ORGANIZACIÓN section, and no tenant links SHALL be rendered

## ADDED Requirements

### Requirement: Organization section header shows the tenant name without a logo
The ORGANIZACIÓN section SHALL start with a toggle button (`aria-expanded`, `aria-controls`) that shows:
- the label "Organización";
- below it, the active tenant's name read via `useTenantName` (`tenants.nombre`), truncated with an ellipsis and with the full name in `title`;
- a static `shield` icon tile.

It SHALL NOT read `tenants.logo_url` or render any tenant image. While the name loads, a skeleton bar SHALL replace it. If the name cannot be loaded, only "Organización" SHALL be shown. Clicking the header SHALL collapse or expand the whole section. The section SHALL be expanded by default.

#### Scenario: Tenant name rendered
- **WHEN** the user is inside tenant "Club Elite" with validated access
- **THEN** the org header SHALL display "Organización" and "Club Elite"

#### Scenario: No logo request
- **WHEN** the ORGANIZACIÓN section is rendered
- **THEN** no network request for the tenant's `logo_url` SHALL be issued by the navigation

#### Scenario: Long name truncated
- **WHEN** the tenant name is wider than the available space
- **THEN** it SHALL be truncated with an ellipsis and the full name SHALL be exposed through the `title` attribute

#### Scenario: Collapse section
- **WHEN** the user clicks the org header while it is expanded
- **THEN** all groups and leaves of the section SHALL be hidden and `aria-expanded` SHALL be `false`

### Requirement: Collapsible groups
Each group header SHALL be a button with `aria-expanded` / `aria-controls` and a chevron (`expand_more` when open, `chevron_right` when closed) that toggles its children.
- In both the desktop sidebar and the mobile drawer, only the group containing the active link SHALL start expanded; every other group SHALL start collapsed.
- When navigation changes the active group, that group SHALL be force-expanded. Other groups SHALL keep their state.
- The group containing the active link SHALL render its icon in `grit-cyan`.

#### Scenario: Desktop default expansion
- **WHEN** an administrator opens `/portal/orgs/T/gestion-equipo` at ≥1024px
- **THEN** only the Equipo group SHALL be expanded, and Administración, Entrenamientos and Eventos SHALL be collapsed

#### Scenario: Drawer default expansion
- **WHEN** an administrator on `/portal/orgs/T/gestion-equipo` opens the mobile drawer
- **THEN** only the Equipo group SHALL be expanded

#### Scenario: Toggle group
- **WHEN** the user clicks the Entrenamientos header while it is expanded
- **THEN** its children SHALL be hidden and its chevron SHALL switch to `chevron_right`

### Requirement: Collapsible global menu section
The "MENÚ" overline SHALL be a toggle button (`aria-expanded`, `aria-controls`, chevron `expand_less` when open and `expand_more` when closed) that collapses or expands the six global links. The section SHALL be expanded by default. Collapsing it SHALL NOT affect the ORGANIZACIÓN section.

#### Scenario: Collapse the global menu
- **WHEN** the user clicks the "MENÚ" header while it is expanded
- **THEN** the six global links SHALL be hidden, `aria-expanded` SHALL be `false`, and the ORGANIZACIÓN section SHALL remain as it was

#### Scenario: Expand the global menu
- **WHEN** the user clicks the "MENÚ" header while it is collapsed
- **THEN** the six global links SHALL be shown again

### Requirement: Single active link by longest prefix
The navigation SHALL compute the active href over all global and tenant leaf hrefs as the **longest** href where `pathname === href` or `pathname` starts with `href + '/'`. Exactly that link SHALL have `aria-current="page"` and the active styling:
- top-level items: cyan-to-transparent gradient, `grit-glass-border` border, `grit-text` 600, cyan icon;
- group children: `bg-grit-cyan/10`, `text-grit-cyan`, 600.

#### Scenario: Nested route activates the deepest match
- **WHEN** the pathname is `/portal/orgs/T/gestion-eventos/nuevo`
- **THEN** Eventos › Calendario SHALL be the only active link and "Organizaciones" SHALL NOT be active

#### Scenario: Global route active
- **WHEN** the pathname is `/portal/mis-entradas`
- **THEN** "Mis Entradas" SHALL be the only link with `aria-current="page"`

## REMOVED Requirements

### Requirement: Eventos Check-in menu entry
**Reason**: The flat "Eventos Check-in" entry is replaced by the grouped tree. Check-in now lives under the Eventos group as "Check-in", for administrador and entrenador.
**Migration**: The `control-ingreso` route is unchanged. Access it through ORGANIZACIÓN › Eventos › Check-in, as defined in the "Role-based sidebar menu" requirement.
