## MODIFIED Requirements

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
