# Delivery — analitica-v2-design

## Commit message

```
feat(analitica-v2-design): apply the grit-arena-v2 design to the analytics dashboard

- Add analitica/chart-theme.ts: shared @nivo theme + ANALITICA_CHART_COLORS
  derived from the grit-* palette (hue-separated series order)
- Rebuild AnaliticaKpiCard per design node zfVKC (GritCard + 40px round icon
  tile, 28px Rajdhani value, optional `icon` prop, grit tones)
- Migrate AnaliticaPage: GritPageHeader, period bar, GritCard panels with
  GritSectionHeading, grit-* tables/rankings/alerts/mini bars, GritEmptyState
  states, charts wired to the shared theme
- Restyle AnaliticaTabs (v2 active state, class-only diff) and
  AnaliticaDateRangeFilter (glass drawer, gritInputClass, GritButton)
- Document the module and the chart-theme file in 03-project-structure.md

Completes task 6.6 of portal-v2-design-unification. Visual-only: no data,
date logic, routes, hooks, services or DB changes.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

## Pull request description

**Title:** feat(analitica): apply the grit-arena-v2 design to the analytics dashboard

### Summary
`analitica` (US-0115) was built while the rest of the Portal moved to the `grit-*` design system (US-0116), so it was the last screen still using `turquoise`, `portal-border`, `bg-navy-deep/60`, `slate-*` text and `rounded-lg` (32 px), with charts on a teal/blue/slate palette. This PR finishes task 6.6 of `portal-v2-design-unification` and aligns the dashboard with design node `zfVKC`.

**Visual-only**: no changes to analytics data, SQL/RPC, date presets, Bogotá handling, tab state, routes, hooks or services.

### Changes
- **New** `src/components/portal/analitica/chart-theme.ts`: `analiticaChartTheme` and `ANALITICA_CHART_COLORS`, the only place chart colours live. Series order is cyan → purple → amber → green → teal → red.
- **KPI cards**: `GritCard` + 40 px round icon tile, 28 px Rajdhani value, 12 px label, optional `icon` prop; tones map to `grit-success` / `grit-discipline-run`.
- **Page**: `GritPageHeader` (single `h1`) with the "Filtros" `GritButton`; period bar on a `GritCard`; panels use `GritCard` + `GritSectionHeading`; tables, rankings, alerts and mini bars on `grit-*` tokens with `border-white/[.07]` separators; loading/error states on `GritEmptyState`, keeping the compact stale-data banner and the `role="status"` refresh line.
- **Tabs**: v2 active treatment; class-only diff, so the ARIA roles and Arrow/Home/End navigation are provably untouched.
- **Filter drawer**: blurred `grit-bg/70` backdrop, glass panel, `gritInputClass` date inputs, kit buttons.

### Screenshots
_Attach before/after for:_ Resumen (KPIs + both charts), Ingresos, Operación, Equipo, the filter drawer, and Resumen at 375 px.

### Test plan
- [x] `npx tsc --noEmit`: 0 errors.
- [x] `npm run lint` on `src/components/portal/analitica`: 0 errors, 0 warnings.
- [x] Legacy-token/inline-hex grep over the module: 0 matches.
- [x] Normalized diff: `AnaliticaTabs` changed only inside string literals; the other files changed code only where the plan called for it.
- [x] Visual pass as an administrator on local Supabase: the four tabs at 1440 px, Resumen at 375 px (no horizontal scroll), the filter drawer, and the charts with real seed data.
- [ ] Reviewer: apply a custom range and a preset, then force a refresh error to confirm the stale-data banner and "Reintentar".

### Notes
- **Palette fix during implementation**: the first draft put teal second in the series order, which made the two-slice "Reservas por publicación" donut read as one colour. Teal moved to fifth; `design.md` and the spec record this.
- The member-status pie no longer colours states semantically (amber = mora, rose = suspendido). The legend still labels each slice and the KPI cards keep the semantic tones. `design.md` notes the follow-up if product wants the semantics back.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
