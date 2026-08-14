## ADDED Requirements

### Requirement: Landing Header Uses Branded Navigation And Login CTA
The system SHALL render the public landing header with the GRIT Arena branded logo asset, the desktop navigation labels `Plataforma`, `Funciones`, `Para equipos`, `Precios`, and `Recursos`, and a right-aligned `Iniciar sesión` CTA that navigates to `/auth/login`.

#### Scenario: Desktop header shows branded navigation
- **WHEN** an anonymous visitor opens `/` on a desktop viewport
- **THEN** the system SHALL display the branded landing logo, the five navigation labels in the specified order, and the `Iniciar sesión` CTA

#### Scenario: Responsive header avoids overflow on smaller viewports
- **WHEN** an anonymous visitor opens `/` below the desktop breakpoint
- **THEN** the system SHALL render a usable header without horizontal overflow, even if the full navigation label set is reduced

### Requirement: Landing Navigation Targets Existing Sections
The system SHALL wire landing header navigation and hero secondary CTA to working in-page destinations using the anchors `#hero`, `#features`, `#trusted-by`, `#pricing`, and `#footer`.

#### Scenario: Header anchors resolve to live sections
- **WHEN** an anonymous visitor activates any landing navigation item except `Iniciar sesión`
- **THEN** the system SHALL move the viewport to the corresponding landing section identified by its target anchor

#### Scenario: Login CTA preserves auth entry point
- **WHEN** an anonymous visitor activates the `Iniciar sesión` CTA or the hero primary CTA
- **THEN** the system SHALL navigate to `/auth/login`

### Requirement: Landing Hero Uses Approved Copy And Visual Hierarchy
The system SHALL render the landing hero with the heading `Donde el deporte evoluciona`, the supporting body copy `La plataforma que impulsa a atletas y equipos a alcanzar su máximo potencial a través de tecnología, comunidad y conocimiento.`, a turquoise-accent treatment on the word `deporte`, a primary CTA `Comenzar ahora`, and a secondary CTA `Conocer más`.

#### Scenario: Hero content matches approved copy
- **WHEN** an anonymous visitor views the landing hero
- **THEN** the system SHALL display the approved heading, supporting copy, turquoise highlight, divider accent, and both CTAs in the expected hierarchy

#### Scenario: Secondary CTA scrolls to features section
- **WHEN** an anonymous visitor activates `Conocer más`
- **THEN** the system SHALL move the viewport to the `#features` section

### Requirement: Landing Hero Displays Product Differentiators
The system SHALL display a value proposition row beneath the hero containing five items with icon, short title, and single-line description: `Procesos` / `Operación deportiva más ágil.`, `Seguimiento` / `Visibilidad total del progreso.`, `Comunidad` / `Todos alineados en una sola plataforma.`, `Enfoque` / `Menos fricción, más rendimiento.`, and `Analítica` / `Decisiones basadas en datos.`.

#### Scenario: Differentiator row is fully rendered
- **WHEN** an anonymous visitor views the landing hero
- **THEN** the system SHALL display the five differentiator items with their defined titles and descriptions

#### Scenario: Differentiator row remains usable on small screens
- **WHEN** an anonymous visitor views the landing hero on mobile or tablet
- **THEN** the system SHALL wrap the differentiator items without clipped text, overlapping elements, or horizontal scrolling

### Requirement: Landing Hero Uses Runtime-Safe Assets And Landing-Scoped Styling
The system SHALL render the landing hero and header using runtime assets served from `public/landing/` and landing-scoped typography/tokens that apply Rajdhani to hero/display text and Montserrat to supporting text without regressing authenticated portal screens.

#### Scenario: Runtime assets are served from public paths
- **WHEN** the landing page is rendered in the browser
- **THEN** the system SHALL load the landing logo and hero background from runtime-safe public asset paths rather than from `projectspec/designs/...`

#### Scenario: Portal typography remains unaffected
- **WHEN** an authenticated user navigates to portal pages after the landing refactor
- **THEN** the system SHALL preserve existing portal typography and layout behavior outside the landing-specific components