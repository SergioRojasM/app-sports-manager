## Context

- **Source**: task 6.6 of `portal-v2-design-unification` (US-0116), deferred because `analitica` did not exist on that branch. Design reference: `projectspec/designs/pencil/grit-arena-v2.pen`, frame `zfVKC` (Operations Dashboard).
- **Current state** (`feat/tenant-bi-phase-one`, US-0115): `src/components/portal/analitica/` holds 5 files — `AnaliticaPage.tsx` (header, period bar, 4 tab panels, tables, rankings, alerts, 3 `@nivo` charts), `AnaliticaKpiCard.tsx`, `AnaliticaTabs.tsx`, `AnaliticaDateRangeFilter.tsx`, `index.ts`. They use `turquoise`, `portal-border`, `bg-navy-deep/60`, `slate-*`, `rounded-lg` (32 px here) and an inline nivo theme with `#94a3b8`/`#314158`/`#26354a`/`#101b2d` plus the palettes `['#2dd4bf']`, `['#2dd4bf','#60a5fa']` and `['#2dd4bf','#fbbf24','#fb7185','#94a3b8','#60a5fa']`.
- **Constraints**: visual-only; no new dependencies; `@nivo/{bar,pie,line}` already present; the Portal shell, `grit-*` tokens and the `ui/grit` kit already exist from US-0116.

## Goals / Non-Goals

**Goals:**
- `analitica` looks like the rest of the Portal and like `zfVKC`.
- Chart colours come from one shared, reusable source.
- US-0115 behavior (data, dates, tabs, states) is untouched.

**Non-Goals:**
- Data, SQL, RPC, caching or date-logic changes.
- Swapping the chart library or adding chart types.
- New KPIs or exports.
- The admin sidebar layout.

## Decisions

### Architecture (page → component → hook → service → types)

```
page      src/app/portal/orgs/[tenant_id]/(administrador)/analitica/page.tsx   (unchanged; layout owns GritPageContainer)
               │
component      └─ AnaliticaPage ─► GritPageHeader + period bar (GritCard)
                      ├─ AnaliticaTabs            (v2 active state, same ARIA/keyboard)
                      ├─ AnaliticaDateRangeFilter (glass drawer, gritInputClass, GritButton)
                      ├─ AnaliticaKpiCard         (GritCard card + GritIconTile 40 + Rajdhani 28)
                      ├─ Panel/Table/Ranking/Alerts/MiniBars/StateCard → GritCard · GritSectionHeading · GritEmptyState
                      └─ RevenueChart · BookingStatusChart · MemberStatusChart
                                 └─► analitica/chart-theme.ts (analiticaChartTheme, ANALITICA_CHART_COLORS)
hook      useAnalitica                    (unchanged)
service   analitica.service.ts            (unchanged)
types     analitica.types.ts              (unchanged)
```

### D1. Base branch must carry both US-0115 and US-0116
- **Choice**: branch `feat/analitica-v2-design` from a base where `feat/tenant-bi-phase-one` and `feat/portal-v2-design-unification` are both merged (merge US-0116 into the BI branch, or both into `develop` first).
- **Why**: the restyle imports `@/components/ui` (grit kit) and uses `grit-*` tokens, which only exist after US-0116; the files to restyle only exist after US-0115.
- **Consequence**: if US-0116 lands in `develop` first, the BI branch should merge `develop` before this change starts, so the analytics module is migrated in the same style pass.

### D2. Shared `chart-theme.ts` instead of inline nivo props
- **Choice**: one module exporting the nivo theme object and an ordered categorical palette; every chart imports both.
- **Why**: three charts already repeat the theme, and the palette must match the tokens. A single file is also the swap point if the chart library changes later.
- **Alternative**: read CSS variables at runtime with `getComputedStyle`. Rejected — nivo needs plain values during SSR, and the palette is static.
- **Detail**: hex literals are intentional here (nivo cannot consume Tailwind classes); a comment ties each value to its `grit-*` token so drift is visible in review.

### D3. Categorical order: cyan → purple → amber → green → teal → red
- **Why**: it starts with the brand accent (the design's primary series colour) and reuses the design's discipline palette rather than inventing colours. `grit-danger` is last so a red slice reads as an exception.
- **Revised during implementation**: the first draft put teal second, and the two-slice "Reservas por publicación" donut then read as a single colour. Teal moved to fifth so neighbouring series differ clearly in hue.
- **Trade-off**: the member-status pie loses its old semantic mapping (amber = mora, rose = suspendido). The legend still labels each slice, and the KPI cards carry the semantic tones.

### D4. `AnaliticaKpiCard` gains an optional `icon` prop
- **Why**: `zfVKC`'s KPI cards are icon-led. Making the prop optional keeps every existing call site valid; call sites add icons incrementally (e.g. `payments`, `event_available`, `group`, `trending_up`).
- **Alternative**: derive the icon from the label. Rejected — brittle string matching for a presentational detail.

### D5. Restyle `AnaliticaTabs` without touching its logic
- **Why**: it already implements roving tabindex and Arrow/Home/End handling (US-0115). The diff should be limited to `className` strings so the accessibility behavior is provably unchanged.
- **Check**: the same normalized-diff technique used in US-0116 (compare code with string literals stripped) proves logic equality.

## Risks / Trade-offs

- [New palette hurts chart legibility] → Verify each of the three charts with real seed data at 1440/768/375 px before finishing; adjacent slices must differ in hue and lightness.
- [Losing tab keyboard behavior during the restyle] → Limit `AnaliticaTabs` edits to class strings and re-test Arrow/Home/End.
- [`AnaliticaPage` is written with very long single-line JSX] → Reformat only where a line is touched; avoid gratuitous rewrites that hide the visual diff.
- [Branch order confusion (D1)] → The first task validates that both `@/components/ui` grit exports and the `analitica` folder exist before any edit.
- [Semantic colour loss in the member-status pie (D3)] → Legend labels remain, and status semantics stay on the KPI cards.

## Migration Plan

Single PR on top of the combined base: tokens/kit already exist, so the change is self-contained and revertible on its own. No DB migrations (nothing is pushed to Supabase).

## Open Questions

- None blocking. If product later wants semantic colours for member status (`grit-success` activo / `grit-discipline-run` mora / `grit-danger` suspendido), that is a small follow-up on `ANALITICA_CHART_COLORS` usage in `MemberStatusChart`.
