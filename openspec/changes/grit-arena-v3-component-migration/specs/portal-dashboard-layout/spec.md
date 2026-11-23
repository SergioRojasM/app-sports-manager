# Spec Delta

## MODIFIED Requirements

### Requirement: Shared portal layout wraps all child routes
`src/app/portal/layout.tsx` SHALL be a Next.js App Router Server Component layout. It SHALL compose:
- a `PortalNavigationProvider` (client) that wraps the shell;
- `PortalSidebar`, the left column, visible at ≥1024px;
- a right column containing `PortalHeader` and a scrollable `<main id="portal-main">`, which renders `PortalBreadcrumb` (inline row, below 1024px only) and `GritPageContainer` around `{children}`.

The shell root SHALL be `grit-shell flex h-screen overflow-hidden`, with a 16px inset at ≥1024px so the sidebar floats 16px from the top, left and bottom edges of the viewport. Every route under `/portal/*` MUST inherit this layout with no duplication or conditional rendering. The admin route `/portal/gestion-organizacion` MUST render functional organization cards aligned with the approved organization design and MUST NOT remain as construction placeholder content.

#### Scenario: Child page renders inside the shared shell
- **WHEN** an authenticated user navigates to any `/portal/*` route at ≥1024px
- **THEN** the page SHALL render with the floating `PortalSidebar` on the left, 16px from the viewport edges, and to its right `PortalHeader` at the top surrounding the page content

#### Scenario: Small viewport shell
- **WHEN** an authenticated user navigates to any `/portal/*` route below 1024px
- **THEN** `PortalSidebar` SHALL NOT be visible and the page SHALL render full width below `PortalHeader`, with no outer inset

#### Scenario: Layout is not duplicated across child pages
- **WHEN** a new child page is added under `/portal/`
- **THEN** it SHALL automatically inherit the sidebar and header without any layout code in the child page file

#### Scenario: Organization management route renders functional content
- **WHEN** an authenticated admin navigates to `/portal/gestion-organizacion`
- **THEN** the route SHALL render organization information cards instead of generic placeholder text

---

### Requirement: Fixed top header
`PortalHeader` SHALL be a Client Component rendered inside `portal/layout.tsx`. It MUST remain fixed at the top of the content column during scroll. It SHALL contain:
1. at ≥1024px, the breadcrumb (`PortalBreadcrumb` topbar variant) on the left; below 1024px, the application logo on the left instead;
2. the notifications button;
3. the user avatar button;
4. below 1024px only, a hamburger button after the avatar.

The hamburger SHALL be a 38px round icon button (white 4% fill, white 12% border) with icon `menu`, `aria-label="Abrir menú"`, `aria-expanded` and `aria-controls`; it opens `PortalMobileDrawer`. The header SHALL NOT contain `PortalNavMenu` or any navigation dropdown.

It SHALL follow the v3 Topbar (`grit-arena-v3.pen` node `vwVLa`):
- 56px tall, transparent, with no bottom border and no backdrop blur;
- horizontal padding 16/24/32px by breakpoint, 14px gap between the right-hand actions;
- a 38px round notifications button with a `grit-line` border;
- a 38px solid-cyan round avatar with `grit-on-brand` initials (or the photo).

#### Scenario: Header is visible during scroll
- **WHEN** the user scrolls down any `/portal/*` page
- **THEN** the header SHALL remain visible at the top of the content column

#### Scenario: Header contains required elements on small screens
- **WHEN** the header is rendered below 1024px
- **THEN** it SHALL display the app logo on the left and the notifications button, the avatar button and the hamburger button on the right, and SHALL NOT display the breadcrumb

#### Scenario: Header on large screens
- **WHEN** the header is rendered at ≥1024px
- **THEN** it SHALL display the breadcrumb on the left and the notifications and avatar buttons on the right, and SHALL NOT display the logo, a navigation dropdown or the hamburger

#### Scenario: Header matches v2 navbar styling
- **WHEN** the header is rendered at 1440px
- **THEN** its height, padding, absence of border, button sizes and typography SHALL match node `vwVLa` within ±2px (superseded by the v3 Topbar; the v2 navbar node `oUFl9` no longer applies)

---

### Requirement: Visual design aligned with dashboard.html
The portal shell (layout, sidebar, drawer, header, menus, breadcrumb) SHALL follow the design reference `projectspec/designs/pencil/grit-arena-v3.pen`:
- `.grit-shell` background (`#080C10` canvas with a bottom-right cyan glow);
- Montserrat body, Exo 2 headings, `#14DBC4` accent;
- `grit-*` tokens only, and Material Symbols Outlined icons through `GritIcon`.

The sidebar SHALL follow nodes `Vl7zI` / `N3E8S`: 240px wide, 28px radius, a `grit-surface`→`grit-sidebar` vertical gradient, a white 10% border and a `0 20px 48px` shadow. Section overlines are 10px/600 uppercase `grit-muted` with 1.3px tracking, dividers use `GritDivider`, and focus uses `gritFocusRing`.

Top-level navigation items SHALL be fully rounded pills (padding 12/14px, 18px `grit-muted` icon, 14px `grit-subtext` label). The active item (node `cUHCL`) SHALL use:
- a cyan 18%→4%→transparent horizontal gradient with a cyan 30% border and a cyan glow;
- a leading 32px round cyan-gradient icon chip with a `grit-on-brand` icon;
- a 14px/600 `grit-text` label and a trailing 6px cyan dot.

`UserAvatarMenu` SHALL use the `glass` surface with an 18px radius and fully rounded items. `<main>` SHALL NOT apply page padding itself; below 1024px it renders the inline breadcrumb row followed by `GritPageContainer` wrapping the page, and at ≥1024px only `GritPageContainer`.

#### Scenario: Design tokens match the reference
- **WHEN** the portal shell is rendered
- **THEN** the background, fonts, and brand colors SHALL match the `grit-arena-v3.pen` variables

#### Scenario: Active menu item is visually distinct
- **WHEN** the user is on a route that matches a top-level menu item
- **THEN** that item SHALL display the cyan gradient pill, the 32px cyan icon chip and the trailing dot

### Requirement: Portal breadcrumb row below the header
`PortalBreadcrumb` SHALL render inside `nav[aria-label="Ruta de navegación"] > ol` with:
- a 13px `home` icon and 12px `chevron_right` separators, both `grit-muted`;
- 12px `grit-muted` crumbs, with the last crumb 12px/500 `grit-subtext` and `aria-current="page"`.

At ≥1024px it SHALL render inside `PortalHeader` (topbar variant). Below 1024px `portal/layout.tsx` SHALL render it as a standalone row at the top of the scrollable `<main>` (inline variant, horizontal padding 16/24px, top padding 12px). Exactly one breadcrumb SHALL be exposed to assistive technology at any viewport width.

It SHALL keep the existing rule of rendering nothing when there is only one segment, SHALL wrap on narrow viewports and truncate the last crumb (`max-w-[60vw]`). `SLUG_LABELS` SHALL add `analitica`, `mis-reservas`, `mis-suscripciones`, `mis-suscripciones-y-pagos`, `landing-org`, `invitaciones` and `gestion-reservas`. `SLUG_LABELS` SHALL NOT contain `entrenamientos-publicos` (US-0123). Segment and href resolution logic SHALL NOT change.

#### Scenario: Breadcrumb visible on mobile
- **WHEN** a user views `/portal/orgs/{tenant}/gestion-equipo` at 375px
- **THEN** the breadcrumb row SHALL be visible at the top of the content, wrap without horizontal scroll, and the header avatar and notifications SHALL remain clickable

#### Scenario: Breadcrumb in the topbar on desktop
- **WHEN** a user views `/portal/orgs/{tenant}/gestion-equipo` at 1440px
- **THEN** the breadcrumb SHALL be rendered inside the topbar on the left, and no breadcrumb row SHALL be rendered inside `<main>`

#### Scenario: New slug labels
- **WHEN** a user views `/portal/orgs/{tenant}/analitica`
- **THEN** the last crumb SHALL read "Analítica"

#### Scenario: Single-segment path has no breadcrumb
- **WHEN** the pathname resolves to only the root "Inicio" segment
- **THEN** the breadcrumb SHALL render nothing (existing rule)

### Requirement: Persistent desktop sidebar
At viewport widths ≥1024px, `PortalSidebar` SHALL render as `<aside aria-label="Navegación principal">`. It is a 240px floating panel spanning the viewport height minus the 16px top and bottom inset, with the v3 sidebar surface (28px radius, gradient fill, white 10% border, shadow) and padding 26/14/16/14px. Content, from top to bottom:
1. the GRIT Arena logo (`/logo-grit-arena-dark.png`, 132×38) linking to `/portal`;
2. a scroll region (`overflow-y-auto overscroll-contain grit-scrollbar`) rendering `PortalNavContent variant="sidebar"`;
3. `PortalSidebarUser`, rendered as the v3 User Card.

Only the middle region SHALL scroll. Below 1024px the sidebar SHALL NOT be visible.

#### Scenario: Sidebar visible on large screens
- **WHEN** the viewport is 1440px wide
- **THEN** the 240px floating sidebar SHALL be visible on the left of every portal page, 16px from the top, left and bottom edges

#### Scenario: Only the navigation scrolls
- **WHEN** the sidebar content is taller than the viewport
- **THEN** the navigation region SHALL scroll while the logo and user card remain visible

#### Scenario: Sidebar hidden on small screens
- **WHEN** the viewport is 1023px wide
- **THEN** the sidebar SHALL NOT be visible
