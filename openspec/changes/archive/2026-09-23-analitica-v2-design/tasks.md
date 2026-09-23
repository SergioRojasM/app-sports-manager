## 1. Branch setup

- [x] 1.1 Create a new branch `feat/analitica-v2-design` from a base that already contains BOTH `feat/tenant-bi-phase-one` (the `analitica` module) and `feat/portal-v2-design-unification` (the `grit-*` tokens + `ui/grit` kit); merge them first if needed
- [x] 1.2 Validate that the working branch is not `main`, `master`, or `develop` (`git branch --show-current`)
- [x] 1.3 Sanity-check the base: `src/components/portal/analitica/*` exists, `@/components/ui` exports `GritCard`/`GritPageHeader`/`gritInputClass`, and `grit-*` tokens resolve in `tailwind.config.ts`

## 2. Chart theme (shared source)

- [x] 2.1 Create `src/components/portal/analitica/chart-theme.ts` exporting `analiticaChartTheme` (text `#BAC7D5`, muted `#8A9AAB`, grid/axis lines `rgba(255,255,255,0.07)`, tooltip `#0B1826` + `rgba(20,219,196,0.25)` border, 10 px radius) and `ANALITICA_CHART_COLORS` = `['#14DBC4','#0FA3AB','#F2B84B','#B98AFF','#6BCB77','#FF6B6B']`, each value commented with its `grit-*` token

## 3. KPI cards (component layer)

- [x] 3.1 Rebuild `AnaliticaKpiCard.tsx` on `GritCard variant="card"` + `GritIconTile` (40 px, round, accent): 28 px Rajdhani value, 12 px `grit-subtext` label, 11 px `grit-muted` detail; add the optional `icon` prop; map `tone` to `grit-success` / `grit-discipline-run` / `grit-text`
- [x] 3.2 Pass design icons at the call sites in `AnaliticaPage` (e.g. ingresos → `payments`, pagos pendientes → `pending`, entrenamientos → `event_available`, ocupación → `donut_small`, atletas → `group`, sin suscripción → `person_off`), keeping the summary KPI buttons and their tab navigation intact

## 4. Page shell and panels (page → component)

- [x] 4.1 Replace the `AnaliticaPage` header block with `GritPageHeader` (eyebrow "Analítica", subtitle, `actions` = `GritButton variant="secondary" size="sm" icon="tune"` "Filtros"); ensure a single `h1`
- [x] 4.2 Restyle the applied-period bar as a `GritCard variant="card" padding="sm"` row (`grit-subtext` label + `grit-text` value)
- [x] 4.3 Migrate `Panel` to `GritCard variant="card"` (radius 14, padding 22) + `GritSectionHeading size="md"`
- [x] 4.4 Migrate `RevenueTable`, `OperationsTable`, `Ranking`, `Alerts`, `MiniBars` and `Empty` to `grit-*` tokens, `rounded-grit-*` radii, `border-white/[.07]` separators and `grit-cyan` bar fills
- [x] 4.5 Replace `StateCard` with `GritEmptyState` (+ `GritButton size="sm"` retry), keeping the three distinct states: first-load error, compact stale-data error banner, loading; keep the `role="status"` "Actualizando indicadores..." line
- [x] 4.6 Confirm `src/app/portal/orgs/[tenant_id]/(administrador)/analitica/page.tsx` adds no page padding of its own (the Portal layout owns `GritPageContainer`)

## 5. Tabs and filter drawer

- [x] 5.1 Restyle `AnaliticaTabs.tsx`: container + 10 px radius items, active = cyan-to-transparent gradient + `grit-glass-border` + `grit-text` 600, inactive = `grit-subtext` with cyan hover — change class strings only
- [x] 5.2 Verify the tab logic is untouched: compare the file against the base with string literals stripped; re-test Arrow/Home/End and `aria-selected`/`aria-controls`
- [x] 5.3 Restyle `AnaliticaDateRangeFilter.tsx`: `bg-grit-bg/70 backdrop-blur-sm` backdrop, `GritCard variant="glass"` panel, `gritInputClass` date inputs, marketplace-style preset chips, `GritButton` actions; keep open/close, Escape and `onChange` behavior

## 6. Charts

- [x] 6.1 Wire `RevenueChart`, `BookingStatusChart` and `MemberStatusChart` to `analiticaChartTheme` + `ANALITICA_CHART_COLORS`; remove every inline hex palette and the local `chartTheme`
- [x] 6.2 Restyle chart tooltips/legends to `grit-*` text tokens; verify each chart with seed data at 1440 / 768 / 375 px (adjacent series must be distinguishable)

## 7. Verification

- [x] 7.1 Run `grep -rE "turquoise|portal-border|navy-(deep|soft|medium)|slate-[0-9]|rounded-(lg|xl)\b|#2dd4bf|#60a5fa|#fbbf24|#fb7185|#94a3b8" src/components/portal/analitica` and fix every match
- [x] 7.2 Behaviour diff: confirm only string literals changed outside the KPI card/page-header/state refactors (normalized-diff check)
- [x] 7.3 Manual pass over the four tabs (Resumen, Ingresos, Operación, Equipo) at 1440 / 768 / 375 px: KPI values, tables, rankings, alerts, charts, empty periods, filter drawer apply/reset, retry after a forced error
- [x] 7.4 Run type-check (`npx tsc --noEmit`) and fix errors — 0 errors
- [x] 7.5 Run `npm run lint` and fix new errors — 0 errors and 0 warnings in `src/components/portal/analitica`; no test script exists, no build run

## 8. Documentation

- [x] 8.1 Update `projectspec/03-project-structure.md`: analitica component entries (kit-based KPI card, panels, tabs, drawer) and the new `chart-theme.ts`

## 9. Delivery

- [x] 9.1 Write the commit message (e.g. `feat(analitica-v2-design): apply the grit-arena-v2 design to the analytics dashboard`) and the pull request description (summary, per-area changes, before/after screenshots of the four tabs, test plan, links to US-0115 and US-0116)
