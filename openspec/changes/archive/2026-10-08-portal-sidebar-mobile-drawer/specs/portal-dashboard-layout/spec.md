## MODIFIED Requirements

### Requirement: Shared portal layout wraps all child routes
`src/app/portal/layout.tsx` SHALL be a Next.js App Router Server Component layout. It SHALL compose:
- a `PortalNavigationProvider` (client) that wraps the shell;
- `PortalSidebar`, the left column, visible at ≥1024px;
- a right column containing `PortalHeader` and a scrollable `<main id="portal-main">`, which renders `PortalBreadcrumb` and `GritPageContainer` around `{children}`.

The shell root SHALL be `grit-shell flex h-screen overflow-hidden`. Every route under `/portal/*` MUST inherit this layout with no duplication or conditional rendering. The admin route `/portal/gestion-organizacion` MUST render functional organization cards aligned with the approved organization design and MUST NOT remain as construction placeholder content.

#### Scenario: Child page renders inside the shared shell
- **WHEN** an authenticated user navigates to any `/portal/*` route at ≥1024px
- **THEN** the page SHALL render with `PortalSidebar` on the left and, to its right, `PortalHeader` at the top surrounding the page content

#### Scenario: Small viewport shell
- **WHEN** an authenticated user navigates to any `/portal/*` route below 1024px
- **THEN** `PortalSidebar` SHALL NOT be visible and the page SHALL render full width below `PortalHeader`

#### Scenario: Layout is not duplicated across child pages
- **WHEN** a new child page is added under `/portal/`
- **THEN** it SHALL automatically inherit the sidebar and header without any layout code in the child page file

#### Scenario: Organization management route renders functional content
- **WHEN** an authenticated admin navigates to `/portal/gestion-organizacion`
- **THEN** the route SHALL render organization information cards instead of generic placeholder text

---

### Requirement: Fixed top header
`PortalHeader` SHALL be a Client Component rendered inside `portal/layout.tsx`. It MUST remain fixed at the top of the content column during scroll. It SHALL contain:
1. the application logo, hidden at ≥1024px where the logo lives in `PortalSidebar`;
2. the notifications button;
3. the user avatar button;
4. below 1024px only, a hamburger button after the avatar.

The hamburger SHALL be a 38px, 10px-radius button with `grit-glass` fill and `grit-glass-border` border, icon `menu`, `aria-label="Abrir menú"`, `aria-expanded` and `aria-controls`. It opens `PortalMobileDrawer`. The header SHALL NOT contain `PortalNavMenu`, any navigation dropdown, or the breadcrumb.

It SHALL keep the v2 Navbar styling (`grit-arena-v2.pen` nodes `oUFl9` / `d41rX5`): vertical padding 18px, horizontal padding 16/24/48px by breakpoint, `grit-glass-border` bottom border, `bg-grit-bg/80` with backdrop blur, a 36px round notifications button (`grit-glass` fill, `grit-glass-border` border) and a 36px round avatar with a 1px cyan ring.

#### Scenario: Header is visible during scroll
- **WHEN** the user scrolls down any `/portal/*` page
- **THEN** the header SHALL remain visible at the top of the content column

#### Scenario: Header contains required elements on small screens
- **WHEN** the header is rendered below 1024px
- **THEN** it SHALL display the app logo on the left and the notifications button, the avatar button and the hamburger button on the right

#### Scenario: Header on large screens
- **WHEN** the header is rendered at ≥1024px
- **THEN** it SHALL NOT display the logo, a navigation dropdown or the hamburger, and SHALL display the notifications and avatar buttons

#### Scenario: Header matches v2 navbar styling
- **WHEN** the header is rendered at 1440px
- **THEN** its padding, border, button sizes and typography SHALL match node `oUFl9` within ±2px

---

### Requirement: Visual design aligned with dashboard.html
The portal shell (layout, sidebar, drawer, header, menus, breadcrumb) SHALL follow the design reference `projectspec/designs/pencil/grit-arena-v2.pen`:
- `.grit-shell` background (`#07111F` with cyan/teal radial glows);
- Montserrat body and Rajdhani headings, `#14DBC4` accent;
- `grit-*` tokens only, and Material Symbols Outlined icons through `GritIcon`.

The sidebar and drawer SHALL follow nodes `E73seM` and `AGzMs`:
- sidebar fill `bg-grit-sidebar`; drawer panel `bg-grit-bg`;
- org dropdown `bg-grit-glass` with `grit-glass-border` and 12px radius;
- section overlines in `text-grit-muted`, dividers via `GritDivider`, focus via `gritFocusRing`.

Top-level navigation items SHALL use padding 10/12px, 10px radius, gap 12px, 14px/500 subtext. The active item SHALL use a cyan-to-transparent gradient, a `grit-glass-border` border, `grit-text` 600 and a cyan icon (design "Nav Operación"). `UserAvatarMenu` SHALL use `GritCard variant="glass"` with 12px radius. `<main>` SHALL NOT apply page padding itself; it renders the breadcrumb row followed by `GritPageContainer` wrapping the page.

#### Scenario: Design tokens match the reference
- **WHEN** the portal shell is rendered
- **THEN** the background, fonts, and brand colors SHALL match the `grit-arena-v2.pen` variables

#### Scenario: Active menu item is visually distinct
- **WHEN** the user is on a route that matches a top-level menu item
- **THEN** that item SHALL display the cyan gradient, border and cyan icon

## ADDED Requirements

### Requirement: Persistent desktop sidebar
At viewport widths ≥1024px, `PortalSidebar` SHALL render as `<aside aria-label="Navegación principal">`. It is 280px wide, full height, with `bg-grit-sidebar` fill and a `grit-glass-border` right border. Content, from top to bottom:
1. the GRIT Arena logo (`/logo-navbar.png`) linking to `/portal`;
2. a scroll region (`overflow-y-auto overscroll-contain grit-scrollbar`) rendering `PortalNavContent variant="sidebar"`;
3. a `GritDivider` and `PortalSidebarUser`.

Only the middle region SHALL scroll. Below 1024px the sidebar SHALL NOT be visible.

#### Scenario: Sidebar visible on large screens
- **WHEN** the viewport is 1440px wide
- **THEN** the 280px sidebar SHALL be visible on the left of every portal page

#### Scenario: Only the navigation scrolls
- **WHEN** the sidebar content is taller than the viewport
- **THEN** the navigation region SHALL scroll while the logo and user footer remain visible

#### Scenario: Sidebar hidden on small screens
- **WHEN** the viewport is 1023px wide
- **THEN** the sidebar SHALL NOT be visible

### Requirement: Navigation user footer
`PortalSidebarUser`, rendered in both the sidebar and the drawer, SHALL show:
- the user's avatar (`foto_url`) or initials;
- the full name, truncated;
- below the name: inside a tenant, the per-tenant role label (`Administrador`, `Entrenador`, `Atleta` for `usuario`); outside a tenant, the email.

The name block SHALL link to `/portal/perfil`. A logout icon button (`aria-label="Cerrar sesión"`) SHALL sign the user out using the same flow as `UserAvatarMenu`.

#### Scenario: Footer inside a tenant
- **WHEN** an administrator views the sidebar inside a tenant
- **THEN** the footer SHALL show their name and "Administrador"

#### Scenario: Footer outside a tenant
- **WHEN** a user views the sidebar on `/portal/inicio`
- **THEN** the footer SHALL show their name and email

#### Scenario: Logout from footer
- **WHEN** the user clicks the logout icon in the footer
- **THEN** the session SHALL be terminated as with the avatar menu's "Logout"
