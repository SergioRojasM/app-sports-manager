# Spec Delta

## MODIFIED Requirements

### Requirement: Role-based sidebar menu
The portal navigation (rendered by `PortalNavContent` in both `PortalSidebar` and `PortalMobileDrawer`) SHALL be composed of two sections.

**1. "MI CUENTA" (global; labelled "MENÚ" before v3)**: this section SHALL be present for every authenticated user in every context (inside and outside a tenant). It SHALL contain exactly these items, in this order:
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
- The tenant section SHALL NOT include a `mis-suscripciones-y-pagos` entry; "Mis Suscripciones" in MI CUENTA covers it.
- The navigation SHALL NOT include an "Entrenamientos Públicos" entry in any context (US-0123).
- Hiding an entry SHALL NOT replace the server route guards.

#### Scenario: Global menu outside a tenant
- **WHEN** an authenticated user is on `/portal/inicio`
- **THEN** the navigation SHALL show exactly Inicio, Organizaciones, Eventos, Mis Suscripciones, Mis Reservas, Mis Entradas in that order
- **AND** no "ORGANIZACIÓN" section SHALL be rendered

#### Scenario: Global menu remains inside a tenant
- **WHEN** a user with validated access is on `/portal/orgs/{tenantId}/gestion-equipo`
- **THEN** the same six global items SHALL be shown under "MI CUENTA", followed by the "ORGANIZACIÓN" section

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

### Requirement: Organization section header shows the tenant name without a logo
When the ORGANIZACIÓN section is rendered, the navigation SHALL start with an **Org Switcher** card (v3 node `weLbQ`), placed above the "MI CUENTA" section. The card SHALL be a link to `/portal/orgs` and SHALL show:
- a 34px tile with the first letter of the active tenant's name (Exo 2 bold italic, cyan, on a `grit-bg` tile with a cyan border), or a neutral glyph if the name is unavailable;
- the tenant's name, read via `useTenantName` (`tenants.nombre`), truncated with an ellipsis and with the full name in `title`;
- the caption "Organización" below the name;
- an `unfold_more` icon.

Its accessible name SHALL include "Cambiar de organización" and, when loaded, the tenant name. It SHALL NOT read `tenants.logo_url` or render any tenant image. While the name loads, a skeleton bar SHALL replace it. If the name cannot be loaded, only "Organización" SHALL be shown. The ORGANIZACIÓN section itself SHALL always be expanded; it has no collapse toggle.

#### Scenario: Tenant name rendered
- **WHEN** the user is inside tenant "Club Elite" with validated access
- **THEN** the Org Switcher SHALL display the initial "C", the name "Club Elite" and the caption "Organización"

#### Scenario: No logo request
- **WHEN** the ORGANIZACIÓN section is rendered
- **THEN** no network request for the tenant's `logo_url` SHALL be issued by the navigation

#### Scenario: Long name truncated
- **WHEN** the tenant name is wider than the available space
- **THEN** it SHALL be truncated with an ellipsis and the full name SHALL be exposed through the `title` attribute

#### Scenario: Switch organization
- **WHEN** the user activates the Org Switcher
- **THEN** the app SHALL navigate to `/portal/orgs`

#### Scenario: Collapse section
- **WHEN** the ORGANIZACIÓN section is rendered
- **THEN** it SHALL NOT offer a section-level collapse toggle, its groups and leaves SHALL be visible, and group-level toggles SHALL keep working

### Requirement: Collapsible global menu section
The "MI CUENTA" overline (formerly "MENÚ") SHALL be a toggle button (`aria-expanded`, `aria-controls`, chevron `expand_less` when open and `expand_more` when closed) that collapses or expands the six global links. The overline SHALL be styled as the v3 section label (10px/600 uppercase, 1.3px tracking, `grit-muted`). The section SHALL be expanded by default. Collapsing it SHALL NOT affect the ORGANIZACIÓN section.

#### Scenario: Collapse the global menu
- **WHEN** the user clicks the "MI CUENTA" header while it is expanded
- **THEN** the six global links SHALL be hidden, `aria-expanded` SHALL be `false`, and the ORGANIZACIÓN section SHALL remain as it was

#### Scenario: Expand the global menu
- **WHEN** the user clicks the "MI CUENTA" header while it is collapsed
- **THEN** the six global links SHALL be shown again

### Requirement: Single active link by longest prefix
The navigation SHALL compute the active href over all global and tenant leaf hrefs as the **longest** href where `pathname === href` or `pathname` starts with `href + '/'`. Exactly that link SHALL have `aria-current="page"` and the v3 active styling:
- top-level items and top-level org leaves (node `cUHCL`): a fully rounded pill with a cyan 18%→4%→transparent gradient, a cyan 30% border, a cyan glow, a 32px cyan-gradient icon chip with a `grit-on-brand` icon, a `grit-text` 600 label and a trailing 6px cyan dot;
- group children (node `LTtTI`): the same gradient pill, border and trailing dot, with a 12px `grit-text` 600 label (and a cyan icon when the leaf defines one).

#### Scenario: Nested route activates the deepest match
- **WHEN** the pathname is `/portal/orgs/T/gestion-eventos/nuevo`
- **THEN** Eventos › Calendario SHALL be the only active link and "Organizaciones" SHALL NOT be active

#### Scenario: Global route active
- **WHEN** the pathname is `/portal/mis-entradas`
- **THEN** "Mis Entradas" SHALL be the only link with `aria-current="page"`

#### Scenario: Single active treatment
- **WHEN** any portal route is active
- **THEN** exactly one navigation row SHALL show the trailing cyan dot
