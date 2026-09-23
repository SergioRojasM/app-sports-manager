## MODIFIED Requirements

### Requirement: Fixed top header
`PortalHeader` SHALL be a Client Component rendered inside `portal/layout.tsx`. It MUST remain fixed/sticky at the top of the viewport during scroll and SHALL contain: (1) application logo, (2) notifications icon with visual indicator, (3) user avatar button. It SHALL follow the v2 Navbar design (`grit-arena-v2.pen` nodes `oUFl9` / `d41rX5`): vertical padding 18px, horizontal padding 16/24/48px by breakpoint, `grit-glass-border` bottom border, `bg-grit-bg/80` with backdrop blur, the `PortalNavMenu` trigger in 14px Montserrat 600 subtext (cyan on hover/active, 10px radius), a 36px round notifications button (`grit-glass` fill, `grit-glass-border` border) and a 36px round avatar with a 1px cyan ring. The header SHALL NOT contain the breadcrumb.

#### Scenario: Header is visible during scroll
- **WHEN** the user scrolls down any `/portal/*` page
- **THEN** the header SHALL remain visible at the top of the viewport

#### Scenario: Header contains required elements
- **WHEN** the header is rendered
- **THEN** it SHALL display the app logo, a notifications icon, and a user avatar button

#### Scenario: Header matches v2 navbar styling
- **WHEN** the header is rendered at 1440px
- **THEN** its padding, border, button sizes and typography SHALL match node `oUFl9` within ±2px

### Requirement: Visual design aligned with dashboard.html
The portal shell (layout, header, menus, breadcrumb) SHALL follow the design reference `projectspec/designs/pencil/grit-arena-v2.pen` instead of `projectspec/designs/dashboard.html`: `.grit-shell` background (`#07111F` with cyan/teal radial glows), Montserrat body and Rajdhani headings, `#14DBC4` accent, `grit-*` tokens only, and Material Symbols Outlined icons through `GritIcon`. Dropdown panels (`PortalNavMenu`, `UserAvatarMenu`, `RoleBasedMenu`) SHALL use `GritCard variant="glass"` with 12px radius; items SHALL use padding 10/14px, 10px radius, gap 14px, 14px/500 subtext, and the active item SHALL use a cyan-to-transparent gradient, a `grit-glass-border` border, `grit-text` 600 and a cyan icon (design "Nav Operación"). `<main>` SHALL NOT apply page padding itself; it renders the breadcrumb row followed by `GritPageContainer` wrapping the page.

#### Scenario: Design tokens match the reference
- **WHEN** the portal shell is rendered
- **THEN** the background, fonts, and brand colors SHALL match the `grit-arena-v2.pen` variables

#### Scenario: Active menu item is visually distinct
- **WHEN** the user is on a route that matches a menu item
- **THEN** that item SHALL display the cyan gradient, border and cyan icon

## REMOVED Requirements

### Requirement: Portal header breadcrumb is hidden on mobile viewports
**Reason**: The breadcrumb moves out of the header into its own row (design `AOIa5`), so hiding it inside the header no longer applies, and the requirement not to modify `PortalBreadcrumb` conflicts with the restyle.
**Migration**: See the ADDED requirement "Portal breadcrumb row below the header". The breadcrumb now shows on mobile and wraps.

## ADDED Requirements

### Requirement: Portal breadcrumb row below the header
`portal/layout.tsx` SHALL render `PortalBreadcrumb` as a standalone row at the top of the scrollable `<main>` (below `PortalHeader`, above the page), styled per `AOIa5`: `home` icon 13px, `›` separators, 13px 500 subtext crumbs, last crumb 700 `grit-text` with `aria-current="page"`, horizontal padding 16/24/48px, top padding 16px, inside `nav[aria-label="Ruta de navegación"] > ol`. It SHALL keep the existing rule of rendering nothing when there is only one segment, SHALL wrap on narrow viewports and truncate the last crumb (`max-w-[60vw]`). `SLUG_LABELS` SHALL add `entrenamientos-publicos`, `analitica`, `mis-reservas`, `mis-suscripciones`, `mis-suscripciones-y-pagos`, `landing-org`, `invitaciones` and `gestion-reservas`. Segment and href resolution logic SHALL NOT change.

#### Scenario: Breadcrumb visible on mobile
- **WHEN** a user views `/portal/orgs/{tenant}/gestion-equipo` at 375px
- **THEN** the breadcrumb row SHALL be visible, wrap without horizontal scroll, and the header avatar and notifications SHALL remain clickable

#### Scenario: New slug labels
- **WHEN** a user views `/portal/orgs/{tenant}/analitica`
- **THEN** the last crumb SHALL read "Analítica"

#### Scenario: Single-segment path has no breadcrumb
- **WHEN** the pathname resolves to only the root "Inicio" segment
- **THEN** the breadcrumb row SHALL render nothing (existing rule)
