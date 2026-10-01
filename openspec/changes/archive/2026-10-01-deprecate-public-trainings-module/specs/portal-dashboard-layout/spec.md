## MODIFIED Requirements

### Requirement: Portal breadcrumb row below the header
`portal/layout.tsx` SHALL render `PortalBreadcrumb` as a standalone row at the top of the scrollable `<main>` (below `PortalHeader`, above the page), styled per `AOIa5`: `home` icon 13px, `›` separators, 13px 500 subtext crumbs, last crumb 700 `grit-text` with `aria-current="page"`, horizontal padding 16/24/48px, top padding 16px, inside `nav[aria-label="Ruta de navegación"] > ol`. It SHALL keep the existing rule of rendering nothing when there is only one segment, SHALL wrap on narrow viewports and truncate the last crumb (`max-w-[60vw]`). `SLUG_LABELS` SHALL add `analitica`, `mis-reservas`, `mis-suscripciones`, `mis-suscripciones-y-pagos`, `landing-org`, `invitaciones` and `gestion-reservas`. `SLUG_LABELS` SHALL NOT contain `entrenamientos-publicos` (US-0123). Segment and href resolution logic SHALL NOT change.

#### Scenario: Breadcrumb visible on mobile
- **WHEN** a user views `/portal/orgs/{tenant}/gestion-equipo` at 375px
- **THEN** the breadcrumb row SHALL be visible, wrap without horizontal scroll, and the header avatar and notifications SHALL remain clickable

#### Scenario: New slug labels
- **WHEN** a user views `/portal/orgs/{tenant}/analitica`
- **THEN** the last crumb SHALL read "Analítica"

#### Scenario: Single-segment path has no breadcrumb
- **WHEN** the pathname resolves to only the root "Inicio" segment
- **THEN** the breadcrumb row SHALL render nothing (existing rule)
