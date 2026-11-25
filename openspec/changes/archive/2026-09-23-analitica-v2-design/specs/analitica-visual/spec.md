## ADDED Requirements

### Requirement: Analytics page scaffolding matches the Portal
`/portal/orgs/{tenant_id}/analitica` SHALL render its title through `GritPageHeader` (eyebrow "Analítica", single `h1`, subtitle "Indicadores de ingresos, operación y equipo con fechas de Colombia.") with the "Filtros" trigger in the header's `actions` slot as `GritButton variant="secondary" size="sm" icon="tune"`. The page component MUST NOT add outer page padding, because `src/app/portal/layout.tsx` already wraps it in `GritPageContainer`. Section spacing SHALL use 24 px (`gap-6`) between blocks.

#### Scenario: Single page title
- **WHEN** the analytics page renders
- **THEN** it SHALL contain exactly one `h1`, rendered by `GritPageHeader`

#### Scenario: No duplicated page padding
- **WHEN** the page renders inside the Portal layout
- **THEN** its content SHALL align with the breadcrumb row and other Portal pages (no extra left/right padding)

### Requirement: KPI cards match design node zfVKC
`AnaliticaKpiCard` SHALL render as `GritCard variant="card"` with 14 px radius, 18 px padding and 14 px gap, laid out as a 40 px round `GritIconTile` (`tone="accent"`) beside a text column containing: value (28 px Rajdhani 700), label (12 px `grit-subtext`) and optional detail (11 px `grit-muted`). It SHALL accept an optional `icon` prop (Material Symbols name); without it, a neutral default icon is used. `tone` SHALL colour the value: `success` → `grit-success`, `warning` → `grit-discipline-run`, `default` → `grit-text`.

#### Scenario: KPI card renders the design treatment
- **WHEN** a KPI card renders with label, value and icon
- **THEN** it SHALL show the 40 px round cyan-tinted icon tile, the 28 px Rajdhani value and the 12 px subtext label

#### Scenario: Tones
- **WHEN** a KPI card is given `tone="warning"`
- **THEN** its value SHALL use `grit-discipline-run`, and with `tone="success"` it SHALL use `grit-success`

#### Scenario: Summary KPIs stay navigable
- **WHEN** a KPI in the "Resumen" tab is clicked
- **THEN** it SHALL still switch to its related tab, and the button SHALL show a visible `grit-cyan` focus ring on keyboard focus

### Requirement: Panels, tables and lists use the kit
Panels SHALL be `GritCard variant="card"` (radius 14, padding 22) with their heading rendered by `GritSectionHeading size="md"` (title + optional subtitle). Tables SHALL use `grit-subtext` headers, `grit-text` values and `border-white/[.07]` row separators. Rankings, alert rows and mini bars SHALL use `grit-*` tokens, `rounded-grit-*` radii and the `grit-cyan` accent for bar fills. Empty content SHALL render "No hay datos para el periodo seleccionado." in `grit-muted`.

#### Scenario: No legacy tokens remain
- **WHEN** `grep -rE "turquoise|portal-border|navy-(deep|soft|medium)|slate-[0-9]|rounded-(lg|xl)\b" src/components/portal/analitica` runs after the change
- **THEN** it SHALL return no matches

#### Scenario: Panel treatment
- **WHEN** any analytics panel renders
- **THEN** it SHALL use the card surface, 14 px radius and the Rajdhani section heading

### Requirement: Tabs adopt the design's active state without losing behavior
`AnaliticaTabs` SHALL render as a `GritCard`-style container with 10 px radius items; the selected tab SHALL use the design's active treatment (cyan-to-transparent gradient, `grit-glass-border` border, `grit-text` 600) and unselected tabs `grit-subtext` with a cyan hover. The existing `role="tablist"`/`role="tab"`, `aria-selected`, `aria-controls`, roving `tabIndex` and Arrow/Home/End keyboard navigation MUST be preserved exactly.

#### Scenario: Keyboard navigation preserved
- **WHEN** the user focuses a tab and presses ArrowRight, ArrowLeft, Home or End
- **THEN** the selected tab SHALL change exactly as before and focus SHALL move to the newly selected tab

#### Scenario: Active tab is visually distinct
- **WHEN** a tab is selected
- **THEN** it SHALL show the cyan gradient, border and `grit-text` label

### Requirement: Date-range drawer matches the Portal filter pattern
`AnaliticaDateRangeFilter` SHALL use a `bg-grit-bg/70 backdrop-blur-sm` backdrop, a `GritCard variant="glass"` panel with 16 px radius, `gritInputClass` date inputs, preset chips styled like the marketplace filter chips, and `GritButton` actions. Its open/close behavior, Escape handling, preset computation and `onChange` contract MUST NOT change.

#### Scenario: Drawer styling
- **WHEN** the filter drawer opens
- **THEN** the backdrop SHALL dim and blur the page and the panel SHALL use the glass card treatment

#### Scenario: Range selection unchanged
- **WHEN** the user picks a preset or a custom range and applies it
- **THEN** the emitted `AnaliticaDateRange` SHALL be identical to the pre-change behavior

### Requirement: Charts use the grit palette
`src/components/portal/analitica/chart-theme.ts` SHALL export `analiticaChartTheme` (nivo theme) and `ANALITICA_CHART_COLORS`, both derived from the `grit-*` palette: axis/legend text `#BAC7D5`, muted text `#8A9AAB`, grid and axis lines `rgba(255,255,255,0.07)`, tooltip on `#0B1826` with a `rgba(20,219,196,0.25)` border and 10 px radius. The categorical series order SHALL be `#14DBC4` (cyan), `#B98AFF`, `#F2B84B`, `#6BCB77`, `#0FA3AB` (teal), `#FF6B6B` — neighbouring entries must differ clearly in hue, so teal sits away from cyan. Every `ResponsiveBar`/`ResponsivePie` in the module SHALL use them instead of inline hex values.

#### Scenario: No inline chart colours
- **WHEN** the analytics components are inspected
- **THEN** no chart SHALL pass a hardcoded hex palette (`#2dd4bf`, `#60a5fa`, `#fbbf24`, `#fb7185`, `#94a3b8`); all SHALL reference the shared theme and palette

#### Scenario: Member-status pie stays readable
- **WHEN** the team pie chart renders five states
- **THEN** each slice SHALL take a distinct colour from `ANALITICA_CHART_COLORS` in order, with legend text in `grit-subtext`

### Requirement: States reuse the kit and keep their behavior
Loading, error and empty states SHALL render through `GritEmptyState` (error description in `grit-danger`, retry as `GritButton size="sm"`). The distinction between a first-load error, a refresh error shown above stale data ("Se muestran los últimos datos cargados."), the "Actualizando indicadores..." `role="status"` line and the retry handler MUST be preserved.

#### Scenario: Retry still refetches
- **WHEN** the dashboard fails to load and the user clicks "Reintentar"
- **THEN** `refresh()` SHALL run, exactly as before the change

#### Scenario: Stale-data banner preserved
- **WHEN** a refresh fails while data is already on screen
- **THEN** the compact error banner SHALL appear above the still-rendered dashboard

### Requirement: Analytics behavior is unchanged
The restyle MUST NOT change data fetching (`useAnalitica`), the analytics service, date presets, Bogotá date handling, tab state, KPI values, formatting (currency/integer/percent) or the route. Only presentation changes.

#### Scenario: Same data after restyle
- **WHEN** the dashboard renders for a tenant and date range
- **THEN** the KPI values, table rows and chart series SHALL be identical to the pre-change output

#### Scenario: Type-check and lint
- **WHEN** `npx tsc --noEmit` and `npm run lint` run
- **THEN** they SHALL report no new errors versus the base branch
