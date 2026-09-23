## ADDED Requirements

### Requirement: Public detail page keeps the current landing chrome
`/entrenamientos-publicos/[entrenamiento_id]` SHALL keep rendering the current landing `Header` and `Footer` and the `landing-shell` wrapper, including the top padding that clears the fixed header. `src/components/landing/Header.tsx` and `src/components/landing/Footer.tsx` MUST NOT be modified by this change. Only the content between header and footer is restyled.

#### Scenario: Header and footer unchanged
- **WHEN** a visitor opens a public training detail
- **THEN** the same landing `Header` and `Footer` as before this change SHALL render, with the same links and behavior

#### Scenario: Content is not hidden under the fixed header
- **WHEN** the page loads at any viewport width
- **THEN** the breadcrumb row SHALL be fully visible below the fixed header

### Requirement: Breadcrumb row with preserved navigation
The detail page SHALL render a breadcrumb row per `AOIa5`: `home` icon 13px + "Inicio" › "Entrenamientos" › `{nombre}` (13px 500 subtext, last crumb 700 `grit-text`, `aria-current="page"`, wrapped in `nav[aria-label="Ruta de navegación"] > ol`). The existing "Volver" link SHALL be kept, restyled (13px 600 subtext + `arrow_back`) and right-aligned in the same row. All hrefs SHALL be exactly those produced today by `resolveOrigin(from)`.

#### Scenario: Hrefs unchanged
- **WHEN** the page is opened with `?from=/entrenamientos-publicos`
- **THEN** both "Entrenamientos" and "Volver" SHALL link to `/entrenamientos-publicos`

#### Scenario: Unsafe from still falls back
- **WHEN** the page is opened with `?from=//evil.com`
- **THEN** both links SHALL point to `/entrenamientos-publicos`

### Requirement: Detail sections match design node OyIqr
The detail body SHALL be rendered by `PublicTrainingDetalleBody` (props `item`, `onReservar`, `reservarDisabled`) inside the existing landing content wrapper (max width widened to 1440px, vertical gap 32px), in this order: hero banner → title block (tags, title, subtitle, meta, divider, description) → Includes | Schedule (2 columns, gap 48px) → Location | Reserve (2 columns, gap 24px, equal height) → Pricing → CTA banner. At 1440px, padding, gaps, radii and font sizes SHALL match `OyIqr` within ±2px:
- Hero: 340px high, 16px radius, no border, bottom-dark gradient overlay.
- Tags: discipline `GritTag tone="accent"` with the icon from `getDisciplinaVisual`, and "ENTRENAMIENTO PÚBLICO" as `GritTag tone="neutral"`.
- Title 40px Rajdhani 700; subtitle 15px; meta row gap 28px with 15px cyan icons.
- Includes: 22px heading, list gap 14px, 17px `check_circle`.
- Schedule: 20px heading + 12px subtitle, duration `GritBadge` with border, left-aligned 13px/700 cyan times, 8px dots (first cyan, rest `grit-glass-border`), 1.5px rail line, row gap 16px.
- Location: `GritCard glass` padding 28px gap 28px; 340×240 map tile (radius 12, `grit-card`, radial glow, 30px cyan pin), hidden below `sm`; "Ver en Google Maps" as `GritButton outline-accent size sm external`.
- Reserve: `GritCard glass` padding 24px gap 20px; `GritInfoRow`s in a 2-column grid; primary + secondary CTAs side by side, 42px tall, gap 16px (stacked below `sm`); secondary CTA and redirect note only when `paginaEventoUrl` exists.
- Pricing: 3-column grid gap 20px; each option `GritCard card` padding 20px gap 12px radius 16px; subtitle "Elige la tarifa que mejor se ajuste a ti. Podrás confirmarla al reservar."
- CTA banner: `GritCard glass` padding 24/28px, 48px accent icon tile with `event_available`, 20px Rajdhani title, `GritButton primary` with trailing `arrow_forward`.

#### Scenario: No oversized radii
- **WHEN** the detail components are inspected
- **THEN** no element SHALL use `rounded-lg` or `rounded-xl`, and no computed radius SHALL be 32px or 48px

#### Scenario: Discipline-specific icon
- **WHEN** a training of discipline "Natación" is shown
- **THEN** the discipline tag SHALL display the `pool` icon

#### Scenario: Reserve card without event page
- **WHEN** `paginaEventoUrl` is null
- **THEN** only the primary "Reservar mi cupo" button SHALL render, full width, with no redirect note

#### Scenario: Mobile layout
- **WHEN** the viewport is 375px wide
- **THEN** there SHALL be no horizontal scroll in the content, all two-column rows SHALL stack, and the map tile SHALL be hidden

### Requirement: Behavior of the detail page is unchanged
The visual rebuild MUST NOT change data fetching (`usePublicTrainingDetalle`), `resolveOrigin`, the booking handler (anonymous → `RegistrateParaReservarModal`, authenticated → `PublicTrainingReservaModal`, disabled with "Cargando…" while auth initializes), the markdown rendering without raw HTML, the `cuposDisponibles` computation, or the hiding of empty sections and of a missing entrenador row. Loading, error (with "Reintentar") and not-found states SHALL render through `PublicTrainingDetalleStates` (`GritEmptyState`), with the not-found link to `/entrenamientos-publicos`.

#### Scenario: Anonymous booking entry point
- **WHEN** an anonymous visitor clicks "Reservar mi cupo"
- **THEN** `RegistrateParaReservarModal` SHALL open

#### Scenario: Authenticated booking entry point
- **WHEN** a logged-in visitor clicks "Reservar mi cupo" in the CTA banner
- **THEN** `PublicTrainingReservaModal` SHALL open

#### Scenario: Fetch error is retryable
- **WHEN** the detail fetch fails
- **THEN** a `GritEmptyState` with "Reintentar" SHALL render, and clicking it SHALL refetch
