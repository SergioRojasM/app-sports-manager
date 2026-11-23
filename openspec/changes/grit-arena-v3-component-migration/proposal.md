# Proposal

## Why

The product design moved to `projectspec/designs/pencil/grit-arena-v3.pen`: a floating sidebar, a transparent topbar, pill controls, neutral hairlines, Exo 2 light titles and gradient surfaces. The Portal still renders v2. Migrating ~220 feature files one by one would take months and risk behavior regressions. Because those files already style themselves through `grit-*` tokens and the `ui/grit` kit, changing **only the component layer** (token values, kit components, Portal shell) brings every page most of the way to v3 in one visual-only change. A rewritten `DESIGN.md` then becomes the contract each later page story follows to finish its own migration (US-0141).

## What Changes

- **Tokens** (`globals.css`, `tailwind.config.ts`, font loading in `src/app/layout.tsx`): keep every `grit-*` name and change the values to v3 (`#080C10` canvas, `#F3F7F8`/`#B3BFC5`/`#8593A0` ink scale, neutral `rgba(255,255,255,.12)` hairline instead of the cyan glass border, `#FF8A80` danger, `#2BE3D0` cyan hover). Add `grit-on-brand`, `grit-line`, `grit-surface`, `grit-surface-deep`, `grit-surface-accent`, `grit-warning`, `grit-violet`, `grit-avatar`. **BREAKING (visual)**: `rounded-grit-2xl` goes from 16 → 22px; add `rounded-grit-3xl` (28px). `font-grit-title` switches from Rajdhani to **Exo 2**; add `font-grit-mono` (JetBrains Mono). New `.grit-shell` canvas glow and neutral scrollbar. Rajdhani stays loaded for the landing/auth.
- **Existing kit** (`src/components/ui/grit/`): restyle all 12 components to v3 with backward-compatible props. Pill `GritButton` with a new `lg` size (glow CTA). Gradient `GritCard` recipes plus a new `inset` variant. Light 40px `GritPageHeader`, where `italic` now applies to the accent only. `GritTag` becomes the status/role pill with `warning`/`danger`/`violet` tones and a `dot` prop. Plus v3 `GritIconTile`, `GritBadge`, `GritDivider`, `GritSectionHeading`, `GritEmptyState`, `GritPageContainer`, input classes and Lucide→Material icon mappings.
- **New kit primitives**: `GritIconButton`, `GritSearchField`, `GritSegmented`, `GritChip`, `GritKpiCard`, `GritAvatar`, `GritProgress`, `GritPagination`, and the `gritTable*` / `gritPillSelectClass` class constants.
- **Portal shell**:
  - Sidebar: 240px floating, 28px radius, with a 16px inset. The org header becomes an **Org Switcher** linking to `/portal/orgs`; the "MENÚ" overline is renamed **"MI CUENTA"**; nav, group and sub-item rows get the v3 pill styles.
  - Topbar: transparent 56px, holding the breadcrumb on desktop.
  - Restyled to v3: mobile drawer panel, avatar menu, notifications bell and panel.
  - All existing behavior is preserved.
- **Docs**: rewrite `DESIGN.md` as the v3 contract (frame→route map, tokens and alpha ladders, typography, shape, elevation, shell, kit, patterns, the "migrate a page to v3" checklist with a find→replace table, and the updated grep). Update `projectspec/03-project-structure.md`.

## Capabilities

### New Capabilities
- None. All requirements belong to existing capabilities.

### Modified Capabilities
- `grit-design-system`: tokens now mirror v3; radius scale gains 22/28; title font becomes Exo 2; shell background changes; kit component specs change to v3 and the kit gains 8 primitives; `DESIGN.md` must document the v3 contract.
- `portal-dashboard-layout`: inset floating sidebar, transparent topbar holding the breadcrumb at ≥1024px (inline breadcrumb row only below 1024px), v3 shell visual requirements.
- `portal-role-navigation`: global section label "MENÚ" → "MI CUENTA"; the ORGANIZACIÓN header becomes an Org Switcher link (always-expanded section, tenant initial instead of the shield tile); v3 active styling for top-level items and group children.
- `portal-mobile-navigation-drawer`: drawer panel uses the v3 sidebar surface (gradient, 28px left radius, neutral border).
- `portal-visual-migration`: modal panels use the v3 card radius (22px) instead of 16px.

## Non-goals

- No change to any page (`page.tsx`) or feature component under `src/components/portal/<feature>/`, except the three notificaciones header chrome files.
- No hook, service, type, `lib`, migration, RLS or route change; no new npm dependency; icons stay on Material Symbols.
- Pages are not refactored to use the new primitives. That happens later, in per-page stories that follow `DESIGN.md`.
- Not built: collapsed 80px sidebar, event cards, Next Event Panel, Live Toast, notification day grouping/tabs, sub-item icons, `chart-theme.ts` colours.
- `/auth/*` and the `landing-*` tokens stay untouched. The public app home `/` (US-0140) is built on `grit-*` tokens, so it takes the v3 look through the token change, like `/eventos` (decided 2026-11-23).

## Files to Create or Modify

| Area | File | Change |
|---|---|---|
| Tokens | `src/app/globals.css` | v3 values, 8 new variables, `.grit-shell`, `.grit-scrollbar` |
| Tokens | `tailwind.config.ts` | new colours, `grit-2xl` 22, `grit-3xl` 28, `grit-title` Exo 2, `grit-mono` |
| Fonts | `src/app/layout.tsx` | load `Exo_2` + `JetBrains_Mono` |
| Asset | `public/logo-grit-arena-dark.png` | copy from `projectspec/designs/pencil/images/` |
| Kit | `src/components/ui/grit/{GritCard,GritButton,GritPageHeader,GritSectionHeading,GritTag,GritBadge,GritIconTile,GritEmptyState,GritDivider,GritPageContainer}.tsx`, `styles.ts`, `icon-map.ts`, `index.ts` | v3 restyle, additive props, exports |
| Kit (new) | `src/components/ui/grit/{GritIconButton,GritSearchField,GritSegmented,GritChip,GritKpiCard,GritAvatar,GritProgress,GritPagination}.tsx` | new primitives |
| Shell | `src/app/portal/layout.tsx` | inset shell, inline breadcrumb `lg:hidden` |
| Shell | `src/components/portal/{PortalSidebar,PortalNavContent,PortalSidebarUser,PortalHeader,PortalBreadcrumb,PortalMobileDrawer,UserAvatarMenu}.tsx` | v3 shell |
| Shell | `src/components/portal/notificaciones/{NotificacionesBell,NotificacionesPanel,NotificacionItem}.tsx` | v3 header chrome |
| Docs | `DESIGN.md`, `projectspec/03-project-structure.md` | v3 contract |

## Implementation Plan

Order follows page → component → hook → service → types. Only the component layer is involved, so no hook, service or type steps apply.

1. Capture "before" screenshots (10 Portal routes at 375/768/1440, plus `/eventos`, `/` and `/auth/login`).
2. Tokens and fonts.
3. Restyle the existing kit components.
4. Add the new kit primitives and verify them against their design nodes in a temporary, uncommitted scratch page.
5. Shell: layout, sidebar, nav content, user card, topbar and breadcrumb, drawer, avatar menu, notifications chrome.
6. Run `npm run lint` and `npx tsc --noEmit` (no build, per project rules), take "after" screenshots, do a keyboard and role pass (admin, entrenador, atleta), and check that `git diff --name-only` contains only allowed files.
7. Rewrite `DESIGN.md` and update `03-project-structure.md`.

## Impact

- **Visual**: every Portal page and the public `/eventos/*` pages (which use `grit-*` tokens) change appearance; behavior does not. Hand-rolled controls in features keep their v2 geometry until their page story.
- **Code**: ~35 files in tokens, kit, shell and docs. No API, database or dependency changes. Fonts add two self-hosted `next/font` families.
- **Specs**: deltas to the five capabilities above.
- **Design source**: `projectspec/designs/pencil/grit-arena-v3.pen` (component board `ljQp3`; reference screens `nIhrL`, `IZudm`, `aYwNn`, `lhbhK`).
