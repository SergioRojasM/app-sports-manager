# Capability: portal-dashboard-layout

## Purpose
Defines the authenticated Portal shell: the shared layout under `/portal/*`, its fixed v2 navbar, the breadcrumb row, the avatar/role menus, route protection and post-login redirects, plus the visual system the shell follows (`grit-arena-v2.pen`).

## Requirements
### Requirement: Shared portal layout wraps all child routes
`src/app/portal/layout.tsx` SHALL be a Next.js App Router Server Component layout that composes `PortalSidebar`, `PortalHeader`, and a `{children}` content slot. Every route under `/portal/*` MUST inherit this layout with no duplication or conditional rendering. The admin route `/portal/gestion-organizacion` MUST render functional organization cards aligned with the approved organization design and MUST NOT remain as construction placeholder content.

#### Scenario: Child page renders inside the shared shell
- **WHEN** an authenticated user navigates to any `/portal/*` route
- **THEN** the page SHALL render with `PortalSidebar` on the left and `PortalHeader` fixed at the top surrounding the page content

#### Scenario: Layout is not duplicated across child pages
- **WHEN** a new child page is added under `/portal/`
- **THEN** it SHALL automatically inherit the sidebar and header without any layout code in the child page file

#### Scenario: Organization management route renders functional content
- **WHEN** an authenticated admin navigates to `/portal/gestion-organizacion`
- **THEN** the route SHALL render organization information cards instead of generic placeholder text

---

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

---

### Requirement: User avatar dropdown menu
`UserAvatarMenu` SHALL be a Client Component nested inside `PortalHeader`. Clicking the avatar MUST toggle an accessible dropdown containing exactly two options: "Profile" and "Logout". The dropdown MUST be closeable via keyboard (Escape) and click-outside.

#### Scenario: Avatar dropdown opens on click
- **WHEN** the user clicks the avatar button
- **THEN** a dropdown SHALL appear with "Profile" and "Logout" menu items

#### Scenario: Dropdown closes on Escape
- **WHEN** the dropdown is open and the user presses Escape
- **THEN** the dropdown SHALL close and focus SHALL return to the avatar button

#### Scenario: Dropdown closes on click outside
- **WHEN** the dropdown is open and the user clicks outside of it
- **THEN** the dropdown SHALL close

#### Scenario: Logout terminates session
- **WHEN** the user clicks "Logout" in the dropdown
- **THEN** the system SHALL call `authService.signOut()`, clear the `portal_role` cookie, and redirect to `/auth/login`

---

### Requirement: Route protection for /portal/*
`middleware.ts` SHALL include `/portal` in `protectedPaths`. Any unauthenticated request to a `/portal/*` route MUST be redirected to `/auth/login` with the original path preserved in the `?next=` query parameter.

#### Scenario: Unauthenticated access is blocked
- **WHEN** a user without a valid session navigates to any `/portal/*` URL
- **THEN** the middleware SHALL redirect to `/auth/login?next=<original-path>`

#### Scenario: Authenticated access proceeds
- **WHEN** a user with a valid session navigates to any `/portal/*` URL
- **THEN** the middleware SHALL allow the request to proceed without redirect

---

### Requirement: Post-login redirect to /portal
After a successful login, the application MUST redirect the user to `/portal`. The post-login redirect in `useAuth` (or `LoginForm`) SHALL be updated from `/dashboard` to `/portal`.

#### Scenario: Successful login lands on portal
- **WHEN** a user successfully authenticates via the login form
- **THEN** they SHALL be redirected to `/portal`

#### Scenario: Next parameter is respected after login
- **WHEN** a user is redirected to login with `?next=/portal/perfil` and subsequently authenticates
- **THEN** they SHALL be redirected to `/portal/perfil`

---

### Requirement: /dashboard route redirects to /portal
`src/app/dashboard/page.tsx` SHALL be replaced with a Next.js `redirect('/portal')` call. Any request to `/dashboard` MUST be forwarded to `/portal` with an HTTP redirect.

#### Scenario: /dashboard redirects to /portal
- **WHEN** a user (authenticated or not) navigates to `/dashboard`
- **THEN** they SHALL be redirected to `/portal`

---

### Requirement: Portal loading placeholder
A `src/app/portal/loading.tsx` file SHALL exist as a Next.js loading UI for the portal segment. It MUST display a minimal loading indicator while the portal layout is streaming.

#### Scenario: Loading state displays during layout fetch
- **WHEN** the portal layout is loading (e.g., cookie fallback triggers a DB query)
- **THEN** the loading component SHALL be shown to the user

---

### Requirement: Visual design aligned with dashboard.html
The portal shell (layout, header, menus, breadcrumb) SHALL follow the design reference `projectspec/designs/pencil/grit-arena-v2.pen` instead of `projectspec/designs/dashboard.html`: `.grit-shell` background (`#07111F` with cyan/teal radial glows), Montserrat body and Rajdhani headings, `#14DBC4` accent, `grit-*` tokens only, and Material Symbols Outlined icons through `GritIcon`. Dropdown panels (`PortalNavMenu`, `UserAvatarMenu`, `RoleBasedMenu`) SHALL use `GritCard variant="glass"` with 12px radius; items SHALL use padding 10/14px, 10px radius, gap 14px, 14px/500 subtext, and the active item SHALL use a cyan-to-transparent gradient, a `grit-glass-border` border, `grit-text` 600 and a cyan icon (design "Nav Operación"). `<main>` SHALL NOT apply page padding itself; it renders the breadcrumb row followed by `GritPageContainer` wrapping the page.

#### Scenario: Design tokens match the reference
- **WHEN** the portal shell is rendered
- **THEN** the background, fonts, and brand colors SHALL match the `grit-arena-v2.pen` variables

#### Scenario: Active menu item is visually distinct
- **WHEN** the user is on a route that matches a menu item
- **THEN** that item SHALL display the cyan gradient, border and cyan icon

---
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
