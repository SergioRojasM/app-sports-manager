# Commit message

```
feat(ui): migrate tokens, grit kit and portal shell to grit-arena-v3 (US-0141)

Move the Portal to the v3 design (projectspec/designs/pencil/grit-arena-v3.pen)
by changing only the component layer: token values, the ui/grit kit and the
portal shell. No page, feature, hook, service, type or migration is modified.

- Tokens: keep every grit-* name, switch values to v3 (#080C10 canvas, ink
  scale, neutral white hairline, #FF8A80 danger); add on-brand, line,
  surface*, warning, violet, avatar; grit-2xl 16→22px, new grit-3xl 28px;
  font-grit-title → Exo 2, new font-grit-mono (JetBrains Mono).
- Kit: v3 restyle of all existing components with backward-compatible props
  (pill GritButton + lg glow size, GritCard inset variant, light page h1,
  GritTag status/role tones + dot, 38px icon tile).
- New primitives: GritIconButton, GritSearchField, GritSegmented, GritChip,
  GritKpiCard, GritAvatar, GritProgress, GritPagination, gritTable* classes,
  gritPillSelectClass.
- Shell: floating 240px sidebar with Org Switcher and "MI CUENTA", v3 nav
  rows, transparent 56px topbar with the breadcrumb, v3 drawer, avatar menu
  and notifications chrome.
- Docs: DESIGN.md rewritten as the v3 contract (frame→route map, alpha
  ladders, kit, patterns, page-migration checklist, greps);
  03-project-structure.md updated.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

---

# Pull request

**Title:** `feat(ui): migrate tokens, grit kit and portal shell to grit-arena-v3 (US-0141)`

## Summary

Moves the Portal to **grit-arena-v3** by changing only the component layer. About 220 feature files already style themselves through `grit-*` tokens and the `ui/grit` kit, so retuning the token **values**, restyling the kit and rebuilding the shell brings every page most of the way to v3, without editing any page or feature component. Each page then finishes its own migration in a later story, following the new `DESIGN.md`.

- Story: `projectspec/userstory/us0141-grit-arena-v3-component-migration.md`
- OpenSpec change: `openspec/changes/grit-arena-v3-component-migration/`
- Design: `projectspec/designs/pencil/grit-arena-v3.pen`: component board `ljQp3`, topbar `vwVLa`, sidebar `Vl7zI`, active nav item `cUHCL`, reference screens `nIhrL` / `IZudm` / `aYwNn`.

## What changed

### Tokens: same names, v3 values

| Token | v2 | v3 |
|---|---|---|
| `grit-bg` | `#07111F` | `#080C10` |
| `grit-text` / `subtext` / `muted` | `#E6EDF3` / `#BAC7D5` / `#8A9AAB` | `#F3F7F8` / `#B3BFC5` / `#8593A0` |
| `grit-glass-border` | cyan 25% | **neutral white 12%** |
| `grit-cyan-light` | `#49F5E2` | `#2BE3D0` |
| `grit-danger` | `#FF6B6B` | `#FF8A80` |
| `rounded-grit-2xl` | 16px | **22px** (+ new `grit-3xl` 28px) |
| `font-grit-title` | Rajdhani | **Exo 2** (+ new `font-grit-mono`) |

New tokens: `grit-on-brand`, `grit-line`, `grit-surface`, `grit-surface-deep`, `grit-surface-accent`, `grit-warning`, `grit-violet`, `grit-avatar`.

### Kit (`src/components/ui/grit/`)
- All existing components restyled to v3. Every existing prop and default still works, and no call site was edited.
- New: `GritIconButton` (its `label` prop is required), `GritSearchField` (an accessible name is required by its type), `GritSegmented`, `GritChip`, `GritKpiCard`, `GritAvatar`, `GritProgress`, `GritPagination`, plus the `gritTable*` and `gritPillSelectClass` classes.

### Shell
- Floating 240px sidebar inside a 16px inset.
- Org Switcher card linking to `/portal/orgs`; the tenant initial replaces the logo, so the menu still loads no images.
- "MENÚ" renamed **"MI CUENTA"**. The ORGANIZACIÓN section is always expanded; its groups can still be collapsed.
- Active row: gradient pill, cyan icon chip and a live dot.
- Transparent 56px topbar that holds the breadcrumb at ≥1024px. Below 1024px the breadcrumb stays as the first row of the page.
- v3 drawer, avatar menu, bell and notifications panel, with unchanged behaviour.

### Docs
- `DESIGN.md` rewritten as the v3 contract: a frame → route map, tokens and alpha ladders, the kit with "which component for which job", patterns, a **"Migrating a page to v3"** checklist with a find → replace table, and two greps.
- `03-project-structure.md` updated.

## Intended visual changes outside the Portal

The public app home `/` (US-0140) and `/eventos/*` are built on `grit-*` tokens, so they also take the v3 look (decision taken during review of this change). `/auth/login` uses `landing-*` tokens and is **pixel-identical** at 375 / 768 / 1440.

## Verification

- `npx tsc --noEmit` passes, and every changed file lints clean. `npm run lint` still reports 16 errors that were already there, all in files outside this change.
- Kit: every primitive was measured against its design node in a temporary preview page (heights, fonts, ARIA, progress clamping, pager ranges). Type-level checks prove `label` and the accessible name are required.
- Before/after: 13 routes × 3 widths captured on `develop` and on this branch. Every page has exactly one `h1` and one breadcrumb. The only overflow (two feature pages at 375px) and the missing `h1` (`/auth/login` at 375px) are **identical on `develop`**.
- Shell, desktop:
  - sidebar at 16/16, 240px wide, 28px radius; topbar 56px with no border;
  - keyboard toggles and focus rings work;
  - avatar menu and notifications panel close on Escape and return focus;
  - the Org Switcher navigates to `/portal/orgs`;
  - the active row is correct for admin and entrenador.
- **Pending manual checks**: the atleta menu tree, the mobile drawer behaviour, and the bell badge and panel states. The checklist is in `verification.md`; the local machine ran out of memory before they could be automated.

## Follow-ups for page stories (not fixed here, by scope)

1. `AnaliticaTabs`: the active tab leaned on the cyan hairline. It should become `GritSegmented`.
2. 73 `font-grit-title font-bold` usages render heavier than v3. Fix them per page with the `DESIGN.md` §10 table.
3. `ObtenerEntradaModal.tsx` still uses `landing-*` tokens and `rounded-lg`, which existed before this change.
4. `chart-theme.ts` still has v2 hex values (analítica story).
5. The `gestion-equipo` and `gestion-organizacion` pages overflow at 375px (this also happens on `develop`).
6. Not built yet: collapsed sidebar, event cards, Next Event Panel, Live Toast, notification day groups. Their measurements are documented in `DESIGN.md` §9.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
