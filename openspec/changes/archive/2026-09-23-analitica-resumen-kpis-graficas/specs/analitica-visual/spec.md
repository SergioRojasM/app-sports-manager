## MODIFIED Requirements

### Requirement: Charts use the grit palette
`src/components/portal/analitica/chart-theme.ts` SHALL export `analiticaChartTheme` (nivo theme) and `ANALITICA_CHART_COLORS`, both derived from the `grit-*` palette: axis/legend text `#BAC7D5`, muted text `#8A9AAB`, grid and axis lines `rgba(255,255,255,0.07)`, tooltip on `#0B1826` with a `rgba(20,219,196,0.25)` border and 10 px radius. The theme SHALL also style line-chart crosshairs and bar/pie labels with the same tokens. The categorical series order SHALL be `#14DBC4` (cyan), `#B98AFF`, `#F2B84B`, `#6BCB77`, `#0FA3AB` (teal), `#FF6B6B` — neighbouring entries must differ clearly in hue, so teal sits away from cyan. Every `ResponsiveBar`/`ResponsivePie`/`ResponsiveLine` in the module SHALL use them instead of inline hex values.

#### Scenario: No inline chart colours
- **WHEN** the analytics components are inspected
- **THEN** no chart SHALL pass a hardcoded hex palette (`#2dd4bf`, `#60a5fa`, `#fbbf24`, `#fb7185`, `#94a3b8` or any other literal); all SHALL reference the shared theme and palette

#### Scenario: Donut slices stay readable
- **WHEN** a Resumen donut renders several slices
- **THEN** each slice SHALL take a distinct colour from `ANALITICA_CHART_COLORS` in order, with legend text in `grit-subtext`

#### Scenario: Line charts share the theme
- **WHEN** a line chart renders
- **THEN** its line and points SHALL use `ANALITICA_CHART_COLORS[0]` and its axes, grid and tooltip SHALL come from `analiticaChartTheme`

### Requirement: Analytics behavior is unchanged
The restyle MUST NOT change data fetching (`useAnalitica`), the analytics service, date presets, Bogotá date handling, tab state, formatting (currency/integer/percent) or the route. The content of the "Resumen" tab and the additive RPC fields that feed it are governed by the `analitica-resumen-dashboard` capability; the `Ingresos`, `Operación` and `Equipo` tabs MUST keep their KPI values, rows and series.

#### Scenario: Same data in detail tabs
- **WHEN** the `Ingresos`, `Operación` or `Equipo` tab renders for a tenant and date range
- **THEN** its KPI values, table rows and chart series SHALL be identical to the pre-change output

#### Scenario: Type-check and lint
- **WHEN** `npx tsc --noEmit` and `npm run lint` run
- **THEN** they SHALL report no new errors versus the base branch
