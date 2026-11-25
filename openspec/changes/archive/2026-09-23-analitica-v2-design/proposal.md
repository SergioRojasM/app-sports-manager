## Why

The `analitica` module (US-0115, tenant BI phase one) was built on `feat/tenant-bi-phase-one` while `portal-v2-design-unification` (US-0116) migrated every other Portal module to the `grit-*` design system. Because the two branches never overlapped, `analitica` is the only Portal screen still using the legacy look: `turquoise`, `portal-border`, `bg-navy-deep/60`, `slate-*` text, `rounded-lg` (which renders at 32 px), plus `@nivo` charts with a teal/blue/slate palette that is not the design's. Its reference frame, `zfVKC` (Operations Dashboard) in `projectspec/designs/pencil/grit-arena-v2.pen`, was never applied.

This change finishes task 6.6 of `portal-v2-design-unification`: it puts `/portal/orgs/{tenant_id}/analitica` on the same tokens, kit and chart palette as the rest of the Portal. **Visual-only**: no routes, data fetching, date-range logic, service, hook, RLS or DB changes.

## What Changes

- **KPI cards** (`AnaliticaKpiCard`) rebuilt per the design's KPI Row (`zfVKC`): `GritCard variant="card"` (radius 14, padding 18, gap 14), a 40 px round icon tile (`bg-grit-cyan/10`), a 28 px Rajdhani value, a 12 px `grit-subtext` label and an 11 px `grit-muted` detail line. Tones map to `grit-success` / `grit-discipline-run` (warning) / `grit-cyan`. A new optional `icon` prop lets each KPI show its design icon.
- **Panels, tables, rankings, alerts, mini bars and state cards** in `AnaliticaPage` move to `GritCard` + `GritSectionHeading` + `GritEmptyState` + `GritButton`, with `grit-*` text and border tokens and `rounded-grit-*` radii.
- **Page header**: `GritPageHeader` (eyebrow "Analítica", single `h1`, subtitle) with the "Filtros" trigger as a `GritButton variant="secondary" icon="tune"`; the applied-period bar becomes a `GritBadge`-style row on a `GritCard`.
- **Tabs** (`AnaliticaTabs`) adopt the design's active-item treatment (cyan-to-transparent gradient, `grit-glass-border`, `grit-text` 600) while keeping their current roving-tabindex keyboard behavior.
- **Date-range drawer** (`AnaliticaDateRangeFilter`) adopts the glass panel, `gritInputClass` inputs and kit buttons, matching `PublicTrainingFiltersDrawer`.
- **Charts**: a shared `analiticaChartTheme` and a categorical palette built from the `grit-*` tokens replace the hardcoded `#2dd4bf` / `#60a5fa` / `#fbbf24` / `#fb7185` / `#94a3b8` values, so axes, grid, legends and tooltips match the Portal.
- **Branch/base**: the work lands on a branch that already contains both US-0115 (`analitica` module) and US-0116 (`grit-*` tokens and `ui/grit` kit).

## Capabilities

### New Capabilities
- `analitica-visual`: the analytics dashboard's visual contract — KPI cards, panels, tabs, filter drawer, states and chart palette per `grit-arena-v2.pen` node `zfVKC`, with the US-0115 behavior unchanged.

### Modified Capabilities
_None._ `portal-visual-migration` (from `portal-v2-design-unification`) already requires every `/portal/*` screen to use only `grit-*` tokens; this change makes `analitica` satisfy that existing requirement rather than changing it.

## Non-goals

- Any change to analytics data, SQL, RPCs, date-range presets, Bogotá timezone handling, tab state, caching or error/retry logic (all US-0115).
- Replacing `@nivo` with another chart library, or adding chart types the module doesn't already render.
- New KPIs, drill-downs or export features.
- The admin left-sidebar layout from `zfVKC` (still owned by a separate follow-up).
- Any change outside `analitica` (the kit, tokens and shell already landed in US-0116).

## Files to Create or Modify

**Page** — `src/app/portal/orgs/[tenant_id]/(administrador)/analitica/page.tsx` (no visual change expected; verify it adds no padding of its own since the Portal layout owns `GritPageContainer`).

**Components**
- `src/components/portal/analitica/AnaliticaPage.tsx` — header, period bar, panels, tables, rankings, alerts, mini bars, state cards, chart theme/colors.
- `src/components/portal/analitica/AnaliticaKpiCard.tsx` — rebuilt on `GritCard` + `GritIconTile`; new optional `icon` prop.
- `src/components/portal/analitica/AnaliticaTabs.tsx` — v2 tab styling, same ARIA and keyboard behavior.
- `src/components/portal/analitica/AnaliticaDateRangeFilter.tsx` — glass drawer, `gritInputClass`, kit buttons.
- `src/components/portal/analitica/index.ts` — only if exports change.

**Hook** — none (`useAnalitica` untouched).

**Service** — none (`analitica.service.ts` untouched).

**Types** — none (`analitica.types.ts` untouched).

**Lib / shared** — `src/components/portal/analitica/chart-theme.ts` (new): `analiticaChartTheme` + `ANALITICA_CHART_COLORS` derived from the `grit-*` palette.

**Docs** — `projectspec/03-project-structure.md` (analitica entries + the new chart-theme file).

## Implementation Plan

1. Branch from a base that contains both US-0115 and US-0116; confirm `@/components/ui` exposes the grit kit and that `grit-*` tokens resolve.
2. Add `chart-theme.ts` with the shared nivo theme and categorical palette.
3. Rebuild `AnaliticaKpiCard` on the kit and give each KPI call site its design icon.
4. Migrate `AnaliticaPage`: page header, period bar, panels/tables/rankings/alerts/states, then wire the charts to the new theme and palette.
5. Migrate `AnaliticaTabs` and `AnaliticaDateRangeFilter`.
6. Verify: legacy-token grep, type-check, lint, and a visual/behaviour pass over the four tabs at 1440/768/375 px (loading, error+retry, empty, refreshing).
7. Update `projectspec/03-project-structure.md`.

## Impact

- **Code**: 5 files in `src/components/portal/analitica` plus one new chart-theme file; about 90 legacy-token occurrences.
- **Visual**: the analytics dashboard changes appearance; every other screen is untouched.
- **APIs / DB / dependencies**: none. No new npm packages (`@nivo/*` already ships with US-0115).
- **Risk**: low and contained to one route. The main risks are chart-legibility regressions (new palette) and losing the tabs' keyboard behavior during the restyle; both are covered by acceptance criteria.
