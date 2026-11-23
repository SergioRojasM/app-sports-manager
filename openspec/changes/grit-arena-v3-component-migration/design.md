# Design

## Context

See `proposal.md` (Why) and the user story `projectspec/userstory/us0141-grit-arena-v3-component-migration.md` for the full v3 measurements per component.

The current state affects how far a component-only change can reach:

- **Token reach is large.** 223 files outside the kit use `grit-*` tokens directly: `rounded-grit-md` ×539, `rounded-grit-2xl` ×174, `rounded-grit-lg` ×96, `font-grit-title` ×160, `text-grit-bg` ×87 (mostly text on cyan). Changing token *values* restyles all of them without touching their source.
- **Kit reach is narrower.** 103 files import the kit: `GritButton` (39 files, 59 `size="sm"`), `GritPageHeader` (19), `GritEmptyState` (10), `gritInputClass` (9). Nothing uses `GritPageHeader italic`, and no `<textarea>` uses `gritInputClass`.
- **The shell already has the right structure** (sidebar + drawer + header + breadcrumb, US-0138). Only its visuals and the breadcrumb's placement change.
- **There is no unit-test runner** (`package.json` only has `lint`). Verification is `npx tsc --noEmit`, `npm run lint`, and screenshot/keyboard checks through the Playwright MCP. Per project rules, the build is not run as part of the tasks.
- **v3 is Lucide-based and has only 8 variables.** Every other value (white/cyan alpha steps, gradients, shadows) is read from the component board `ljQp3` and documented in the story.

Methodology (page → component → hook → service → types): this change lives entirely in the **component** layer: tokens, the kit and the shell components. The page, hook, service and types layers have no work, which is a requirement of the change, not an omission.

## Architecture

```
            grit-arena-v3.pen  (variables + component board ljQp3)
                     │  values copied by hand, documented in DESIGN.md
                     ▼
 ┌───────────────── TOKENS (changed) ─────────────────────────────────┐
 │ globals.css  --grit-* values, .grit-shell, .grit-scrollbar         │
 │ tailwind.config.ts  colors.grit.*, radius 2xl=22/3xl=28, fonts     │
 │ app/layout.tsx  next/font: Exo 2, JetBrains Mono (+Rajdhani kept)  │
 └──────────────┬──────────────────────────────┬──────────────────────┘
                ▼                              ▼
 ┌──── KIT ui/grit (changed + new) ─┐   ┌─── raw token users (UNCHANGED source) ─┐
 │ GritCard/Button/Tag/... restyled │   │ 223 feature files: inherit new values   │
 │ + IconButton, SearchField,       │   │ (colours, hairlines, 22px cards, Exo 2) │
 │   Segmented, Chip, KpiCard,      │   │ keep v2 geometry where hand-rolled      │
 │   Avatar, Progress, Pagination   │   └─────────────────────────────────────────┘
 └──────────────┬───────────────────┘
                ▼
 ┌──── SHELL (changed) ─────────────────────────────────────────────────┐
 │ portal/layout.tsx → PortalSidebar ─ PortalNavContent ─ SidebarUser   │
 │                   → PortalHeader ─ Breadcrumb(topbar) ─ Bell ─ Avatar│
 │                   → <main> Breadcrumb(inline, <lg) + PageContainer   │
 └──────────────┬───────────────────────────────────────────────────────┘
                ▼
        PAGES / FEATURES / HOOKS / SERVICES / TYPES — not modified
```

## Goals / Non-Goals

**Goals:**
- Every Portal page looks recognisably v3 (canvas, ink scale, neutral hairlines, Exo 2, 22px cards, v3 shell) after one PR, with zero edits outside the allowed file list.
- Every existing kit call site compiles and behaves identically.
- Every v3 primitive that future page stories need exists in the kit and is documented, so page stories only *compose* components.

**Non-Goals:**
- Pixel parity on pages that hand-roll controls. They keep v2 geometry until their page story.
- A generated token pipeline from the `.pen` file. Values are copied by hand, and `DESIGN.md` maps them.

## Decisions

### D1. Retune existing token values instead of adding a parallel v3 token family
Keep `grit-bg`, `grit-text`, `grit-glass-border`, etc. and change their values. Add only the tokens v3 needs that v2 lacked (`on-brand`, `line`, `surface*`, `warning`, `violet`, `avatar`).
- *Why*: 223 files reach v3 for free, which is the only way a component-only change can move pages.
- *Alternative*: a `v3-*` family plus a codemod over the 223 files. Rejected because it touches feature code (out of scope) and leaves two systems alive during the transition, the problem US-0116 was created to remove.
- *Consequence*: `grit-glass-border` stops being cyan. Its name becomes historical, so `DESIGN.md` documents that it now means "neutral hairline".

### D2. Change only the card radius in the scale, put pill shapes in components
`grit-2xl` goes 16 → 22 (174 usages, almost all cards/panels/modals) and `grit-3xl` = 28 is added. `grit-md` stays 10px even though v3 controls are pills.
- *Why*: `rounded-grit-md` (539 usages) covers buttons, inputs, menu items, tiles and dropdown rows alike, so turning it into a pill would round inputs and tiles that must not be round. Pills belong to the kit components (`GritButton`, `GritChip`, `GritSegmented`, …) that know they are controls.
- *Alternative*: a new `grit-pill` alias. Rejected because Tailwind's `rounded-full` already exists.

### D3. Exo 2 replaces Rajdhani behind `font-grit-title`; Rajdhani stays loaded
Point `fontFamily['grit-title']` at a new `--font-exo2` variable. Landing/auth use `landing-display` → `--font-rajdhani`, so they are untouched.
- *Weights*: 300 (h1, KPIs), 400, 500 (section/card titles), 600, 700 (existing `font-bold` usages and the org mark); italic for the accent and the org mark. JetBrains Mono 400/500 for tabular numbers.
- *Trade-off*: the 160 feature usages with `font-bold` render Exo 2 Bold, heavier than v3's light numerals. This is accepted and listed in the `DESIGN.md` find→replace table for page stories.

### D4. Approximate gradient strokes with a solid hairline plus an inset highlight
v3 strokes cards and the sidebar with vertical gradients (white 18%→4%, cyan 45%→8%). CSS borders cannot take gradients without `border-image` (which breaks `border-radius`) or a masked pseudo-element.
- *Choice*: a solid `white/[0.10]` border plus `inset 0 1px 0 rgba(255,255,255,.06)`, which reads the same at 1px.
- *Alternative*: a `::before` mask-composite border. Rejected because it adds complexity to every card and breaks `overflow-hidden` tables.

### D5. Icons stay on Material Symbols through `icon-map.ts`
- *Why*: `GritIcon name` takes Material ligatures in 100+ feature files, so switching to `lucide-react` changes every call site (out of scope) and adds a dependency.
- *Choice*: extend the map with every Lucide name drawn on the v3 board and keep weight 300 to match Lucide's thin stroke.

### D6. One breadcrumb component, two placements, chosen by CSS
`PortalBreadcrumb` gets `variant: 'topbar' | 'inline'` (default `inline`). The header renders `topbar` inside `hidden lg:flex`; the layout renders `inline` inside `lg:hidden`.
- *Why*: `display: none` removes the hidden copy from the accessibility tree, so exactly one landmark is exposed. A CSS breakpoint avoids the hydration flash a `matchMedia` hook would cause.
- *Cost*: the slug and tenant-name logic runs twice. It is memoised and the hooks dedupe their fetches, so the cost is negligible.

### D7. Org Switcher is a link to `/portal/orgs`, not an inline dropdown
v3 draws a switcher card with `chevrons-up-down`.
- *Why*: an inline org picker would need the user's tenant list in the shell, which means a new hook/service call, out of scope.
- *Choice*: the existing `/portal/orgs` page already lists them, so the card links there. The ORGANIZACIÓN section loses its collapse toggle, since the header is now the switcher and v3 has no org collapse. The "MI CUENTA" toggle is kept to preserve US-0138's space saving in the drawer.
- *Follow-up*: an in-place dropdown can come later without changing the specs' link contract.

### D8. Build the new primitives now, even though no page uses them yet
- *Why*: `DESIGN.md` must reference real components so page stories compose instead of inventing. A story that hand-builds a segmented control "because the kit lacks one" is how parallel design systems appeared before.
- *Mitigation for dead code*: each primitive is small, presentational, typed and verified against its node in a temporary scratch page that is not committed.

### D9. Form inputs get a derived style
v3 has no form-field frame (Configuración is read-only). `gritInputClass` uses the v3 control language (white 4% fill, white 12% stroke, 13px) with a 12px radius, not a pill, because multi-field forms and selects read poorly as pills. Only search fields are pills (`GritSearchField`). `DESIGN.md` marks this as "derived, to be revisited when a form frame exists".

### D10. Notifications chrome: restyle only
Only presentation classes in `NotificacionesBell`, `NotificacionesPanel` and `NotificacionItem` change. Badge semantics (hidden/1–9/9+), Realtime, `aria-live`, mark-read and focus return stay as specified in `notifications-inbox`. Grouping by day and tabs need data shaping and are out of scope.

## Risks / Trade-offs

- [A feature relied on the cyan `grit-glass-border` to signal emphasis or selection; with a neutral hairline the state becomes invisible] → During the "after" screenshot pass, grep `border-grit-glass-border` in selected/active class branches (`isActive ?`, `selected ?`) and list affected files in the PR. Fix them in the kit if the element is a kit component; otherwise log them for the page story. Do not edit feature files.
- [`rounded-grit-2xl` = 22px on a small element (<56px) looks almost circular] → Review the 174 usages with `grep -rn "rounded-grit-2xl"` for small boxes, then report them, as above.
- [Exo 2 metrics differ from Rajdhani (wider glyphs), so long titles may wrap or truncate differently] → Check the 11 routes at 375px. `GritPageHeader` already wraps, and truncation issues in features get logged.
- [Removing the header's blurred background makes content scroll under a transparent topbar] → The topbar sits outside `<main>` (the scroll container), so content never passes under it. Verify on a long page.
- [Two more font families add download weight] → `next/font` self-hosts and subsets them; weights are limited to the list in D3, with `display: swap`.
- [The public app home `/` (US-0140) and `/eventos/*` also use `grit-*` tokens and change appearance] → Intended (same design system; confirmed with the user 2026-11-23). Only `/auth/*`, which uses `landing-*` tokens, must stay pixel-identical. Include `/`, `/eventos` and `/auth/login` in the screenshot pass.
- [Danger colour lightens (`#FF6B6B` → `#FF8A80`)] → Contrast on the canvas improves (≈8:1). Inline error text is still identifiable, but check that destructive `GritButton secondary text-grit-danger` stays distinguishable.
- [A scratch page accidentally gets committed] → The scope task checks `git diff --name-only` against the allowed list before the commit.

## Migration Plan

1. Ship as a single PR from a `feat/` branch. There is no data migration and nothing to deploy to Supabase.
2. Rollback means reverting the PR. Tokens, kit and shell are self-contained, and no persisted data or API contract depends on them.
3. After merge, page stories adopt the new primitives one at a time following `DESIGN.md` §"Migrating a page to v3". Each page story extends the deprecated-class grep to its folder.
