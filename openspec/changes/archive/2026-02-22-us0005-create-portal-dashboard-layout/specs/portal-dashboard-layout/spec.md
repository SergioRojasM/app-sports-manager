## ADDED Requirements

### Requirement: Shared portal layout wraps all child routes
`src/app/portal/layout.tsx` SHALL be a Next.js App Router Server Component layout that composes `PortalSidebar`, `PortalHeader`, and a `{children}` content slot. Every route under `/portal/*` MUST inherit this layout with no duplication or conditional rendering.

#### Scenario: Child page renders inside the shared shell
- **WHEN** an authenticated user navigates to any `/portal/*` route
- **THEN** the page SHALL render with `PortalSidebar` on the left and `PortalHeader` fixed at the top surrounding the page content

#### Scenario: Layout is not duplicated across child pages
- **WHEN** a new child page is added under `/portal/`
- **THEN** it SHALL automatically inherit the sidebar and header without any layout code in the child page file

---

### Requirement: Fixed top header
`PortalHeader` SHALL be a Client Component rendered inside `portal/layout.tsx`. It MUST remain fixed/sticky at the top of the viewport during scroll and SHALL contain: (1) application logo, (2) notifications icon with visual indicator, (3) user avatar button.

#### Scenario: Header is visible during scroll
- **WHEN** the user scrolls down any `/portal/*` page
- **THEN** the header SHALL remain visible at the top of the viewport

#### Scenario: Header contains required elements
- **WHEN** the header is rendered
- **THEN** it SHALL display the app logo, a notifications icon, and a user avatar button

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
The portal shell (layout, sidebar, header) SHALL follow the design reference at `projectspec/designs/dashboard.html`: dark navy background (`#020617`), Lexend font family, electric-blue (`#00d4ff`) and turquoise (`#00f5d4`) brand colors, Material Symbols Outlined icons, and sidebar active state with left-border gradient.

#### Scenario: Design tokens match the reference
- **WHEN** the portal shell is rendered in dark mode
- **THEN** the background, fonts, and brand colors SHALL match `dashboard.html`

#### Scenario: Active sidebar item is visually distinct
- **WHEN** the user is on a route that matches a sidebar menu item
- **THEN** that item SHALL display the active state gradient and left border
