# US-0116 — Portal v2 Design Unification (grit-arena-v2)

## ID
US-0116

## Name
Unify the Portal's visual system with the `grit-arena-v2.pen` design, using the Public Training Detail page as the reference screen (visual-only; the Portal-scoped detail route is US-0117)

## As a
Portal user (athlete, coach, or administrator) and anonymous visitor

## I Want
Every Portal screen, including the public training detail at `/entrenamientos-publicos/[entrenamiento_id]`, to share one visual language: the same tokens, typography, cards, tags, buttons, headers and breadcrumbs defined in `projectspec/designs/pencil/grit-arena-v2.pen`.

## So That
The product looks like one app instead of two (legacy "turquoise/glass-card/Lexend" Portal vs. the v2 "cyan/glass/Rajdhani+Montserrat" screens), and new screens can be built straight from the design file with a shared kit instead of hand-copied Tailwind classes.

> **Scope: visual only.** No routes, links, data fetching, booking logic or permissions change. Opening the training detail inside the Portal shell (new route, Portal-aware card link, `from` validation, breadcrumb override) is covered by **US-0117**, which depends on this story.

---

## Description

### Current State

**1. Two visual systems coexist in the Portal.**

| Aspect | v2 design (`grit-arena-v2.pen` variables) | `entrenamientos-publicos` (marketplace + detail) | Rest of the Portal (~130 files) |
|---|---|---|---|
| Page background | `$bg-navy` `#07111F` + 2 radial cyan glows | `landing-shell` (#07111F + glows) on the detail page; `bg-navy-deep` on the marketplace (inherited from the Portal layout) | `bg-navy-deep` `#0F172A`, no glows |
| Accent | `$accent-cyan` `#14DBC4`, `$accent-teal` `#0FA3AB` | `landing-primary` `#14DBC4` ✅ | `turquoise` / `portal-primary` `#00E5C4` ❌ |
| Text | `$text-primary` `#E6EDF3`, `$text-subtext` `#BAC7D5` | `landing-text`, `landing-text-secondary` ✅ | `slate-100/300/400/500` ❌ |
| Surfaces | `$glass-fill` `#0F1F30B0`, `$card-fill` `#0B1826CC`, `$glass-border` `#14DBC440` | `landing-surface-card/60`, `border-landing-primary/25` (close, not exact) | `.glass-card` (rgba(22,30,46,.9) + white/7 border + heavy shadow), `portal-card`, `portal-border` (white/6) ❌ |
| Fonts | `$font-title` Rajdhani, `$font-body` Montserrat | `font-landing-display` / `font-landing-body` ✅ | `font-display` (Lexend) set on `<body>` ❌ |
| Radii | 6 / 8 / 10 / 12 / 14 / 16 px | Mixed. `rounded-lg`/`rounded-xl` resolve to **32 px / 48 px** because `tailwind.config.ts` overrides `borderRadius.lg = 2rem` and `xl = 3rem` ❌ | Same override trap ❌ |
| Icons | Lucide (outline, ~1.5 px stroke) | Material Symbols Outlined | Material Symbols Outlined |
| Discipline colors | `$discipline-swim/cycle/run/strength/functional/mobility` | Not used (static `directions_run` icon for every discipline) ❌ | Not used ❌ |

**2. The detail page uses the marketing chrome.** `/entrenamientos-publicos/[id]` renders the landing `Header`/`Footer`, not the v2 Navbar/Footer from `OyIqr`. **Decision: keep the current `Header`/`Footer`.** Only the page content is aligned with the design. (That logged-in users also leave the Portal shell when opening it is addressed in US-0117.)

**3. The detail page deviates from design node `OyIqr` (Public Training Detail).**

| Section (design node) | Design | Current implementation (`src/components/landing/entrenamientos-publicos/detalle/*`) |
|---|---|---|
| Navbar `oUFl9` | `padding 18/48`, bottom border `$glass-border`, logo group (34 px cyan tile + "GRIT / ARENA"), links 14 px Montserrat 600 `$text-subtext` (active 700 `$accent-cyan`), "Iniciar sesión" outlined button + 36 px round user icon | Landing marketing `Header`. **Kept as is (out of scope)** |
| Breadcrumb `AOIa5` | `house` icon 13 px + "Inicio › Entrenamientos › {name}", 13 px 500 `$text-subtext`, last crumb 700 `$text-primary`, row padding `16/48/0/48` | No home icon; also an extra "← Volver" link that is not in the design |
| Body `yDuIt` | vertical, `gap 32`, `padding 24/48/48/48`, content width 1440 | `max-w-[1280px]`, `gap-6` (24 px), top padding 112–144 px to clear the fixed marketing header (the top padding is kept) |
| Hero banner `UBgoO` | 340 px high, radius 16, **no border**, bottom-dark gradient `#07111F05 → #07111FE6` | Has `border-landing-border` |
| Tags row `xtDW1` | Discipline tag: `padding 7/12`, radius 8, fill `#14DBC422`, border `$glass-border`, discipline icon 13 px + label 12 px 700 `letterSpacing .5` cyan. Public tag: same box, transparent fill, `$glass-border`, `$text-subtext` label | Discipline tag has no border and radius 6 px (`rounded-md`), icon is always `directions_run`. "Entrenamiento público" is plain text, not a bordered tag |
| Meta row `d4lCP` | `gap 28`, 15 px cyan icons (`calendar`, `clock-3`, `map-pin`, `users`) | Close match |
| Divider `opnjQ` + Description `Z08z5i` | Divider and description live **inside** the left column, after the meta row | Divider is placed between hero and description (equivalent), OK |
| Includes `osAIG` | heading 22 px Rajdhani 700; list `gap 14`; `circle-check` 17 px cyan; 13 px 500 subtext | list `gap-2.5` (10 px) |
| Schedule `x03t4` | heading **20 px** + 12 px subtitle; duration badge `padding 7/12`, radius 8, fill `$card-fill`, **border `$glass-border`**; timeline time is left-aligned, 13 px 700 cyan; rail dot 8 px (first `$accent-cyan`, rest `$glass-border`), rail line 1.5 px `$glass-border`; row gap 16 | Badge has no border; time column is right-aligned in `w-20`; row gap 12 |
| Location card `A31Ea` | `padding 28`, `gap 28`, radius 16, `$glass-fill` + `$glass-border`; map tile 340×240 radius 12 `$card-fill` with radial cyan glow and centered 30 px `map-pin`; "Ver en Google Maps" is an **outlined cyan button** (`padding 10/16`, radius 10, `arrow-up-right` icon) | `p-4`, `gap-4`; map tile 224–256 px aspect 4:3 with no glow; the Maps action is a plain text link |
| Reserve card `mttfC` | `padding 24`, `gap 20`, radius 16; info rows in a **2×2 grid**, each with a 34 px icon tile (radius 10, `$card-fill`); CTAs **side by side** (row height 42, `gap 16`): primary cyan fill radius 10, secondary transparent with `$glass-border` + `arrow-up-right`; redirect note 11 px | `p-4`, `gap-4`; icon tile uses `rounded-lg` (= 32 px, renders as a circle); CTAs stacked; primary button `rounded-lg` (= 32 px pill) |
| Pricing `H16bLE` | 3-column grid `gap 20`; cards `padding 20`, `gap 12`, radius 16, `$card-fill`, `$glass-border`; label 12 px 700 uppercase subtext; price 28 px Rajdhani 700 + "COP" 13 px 600 | cards use `rounded-xl` (= **48 px**), `p-4`, `gap-2`, `gap-3` grid |
| CTA banner `I6JYGB` | `padding 24/28`, radius 16, `$glass-fill` + `$glass-border`; 48 px icon tile radius 12 fill `#14DBC422` with `calendar-check` 22 px; button `padding 14/22`, radius 10, cyan + `arrow-right` | icon `bolt`, button `rounded-lg` (32 px pill) |
| Footer `iDRcK` | 4 columns (brand 280 px + Navegación / Ayuda / Síguenos), `padding 40/48`, top border `$glass-border`, divider + 12 px copyright | Marketing `Footer`. **Kept as is (out of scope)** |

Design elements that are **deliberately out of scope** because no data source exists (unchanged from US-0109): "Nivel recomendado" info row, amenity tags ("Parqueadero", "Vestieres"), and the "MÁS POPULAR" featured pricing card.

**4. Portal shell vs. design.** The v2 athlete screens (`d41rX5` Athlete Trainings Schedule, `OyIqr`) use a **top navbar**. The admin dashboard (`zfVKC`) uses a 240 px left sidebar. This story keeps the current top-header information architecture (`PortalHeader` + `PortalNavMenu`) and restyles it to the v2 Navbar. Switching admins to a sidebar layout is a follow-up story (see Out of Scope). `PortalSidebar.tsx` exists but is not imported anywhere.

### Proposed Changes

The work is split into five phases that can ship as separate PRs, in order. Each phase must leave the app visually consistent (no half-migrated screen).

#### Phase 1 — Design tokens (single source of truth)

1. In `src/app/globals.css` `:root`, add a `--grit-*` family that mirrors the Pencil variables 1:1:

   ```css
   --grit-bg-navy: #07111f;
   --grit-accent-cyan: #14dbc4;
   --grit-accent-cyan-light: #49f5e2;      /* hover state (existing landing-primary-light) */
   --grit-accent-teal: #0fa3ab;
   --grit-text-primary: #e6edf3;
   --grit-text-subtext: #bac7d5;
   --grit-text-muted: #8a9aab;             /* design "Compare" text in KPI cards */
   --grit-glass-fill: rgba(15, 31, 48, 0.69);   /* #0F1F30B0 */
   --grit-glass-border: rgba(20, 219, 196, 0.25); /* #14DBC440 */
   --grit-card-fill: rgba(11, 24, 38, 0.8);     /* #0B1826CC */
   --grit-sidebar-fill: rgba(6, 14, 26, 0.8);   /* #060E1ACC */
   --grit-success: #3ddc97;
   --grit-danger: #ff6b6b;
   --grit-discipline-swim: #14dbc4;
   --grit-discipline-cycle: #0fa3ab;
   --grit-discipline-run: #f2b84b;
   --grit-discipline-strength: #b98aff;
   --grit-discipline-functional: #ff6b6b;
   --grit-discipline-mobility: #6bcb77;
   ```

2. In `tailwind.config.ts`, expose them under `theme.extend`:
   - `colors.grit`: `{ bg, cyan, 'cyan-light', teal, text, subtext, muted, glass, 'glass-border', card, sidebar, success, danger, discipline: { swim, cycle, run, strength, functional, mobility } }`, each `var(--grit-…)`. For the solid colors, also define them as hex so opacity modifiers (`bg-grit-cyan/15`) work. Tailwind cannot apply `/opacity` to `var()` colors that are already rgba.
   - `fontFamily`: `'grit-title': ['var(--font-rajdhani)', 'sans-serif']`, `'grit-body': ['var(--font-montserrat)', 'sans-serif']`.
   - `borderRadius` (**named, not overriding defaults**): `'grit-xs': '6px'`, `'grit-sm': '8px'`, `'grit-md': '10px'`, `'grit-lg': '12px'`, `'grit-xl': '14px'`, `'grit-2xl': '16px'`.
   - Do **not** change the existing `borderRadius.lg`/`xl` overrides in this story. Auth and landing pages depend on them. Migrated Portal components must use the `rounded-grit-*` names only, never `rounded-lg`/`rounded-xl`.
3. Add a `.grit-shell` class in `globals.css` (Portal and detail background): `background: radial-gradient(circle at 92% 0%, rgba(20,219,196,.14), transparent 35%), radial-gradient(circle at 0% 55%, rgba(15,163,171,.10), transparent 30%), var(--grit-bg-navy); color: var(--grit-text-primary); font-family: var(--font-montserrat), sans-serif;` This reproduces the `BG Glow Top Right` / `BG Glow Mid Left` ellipses.
4. Mark `turquoise`, `accent-teal` (#00e5c4), `portal-*`, `navy-*`, `card-dark`, `.glass`, `.glass-card`, `.sidebar-item-active` as **deprecated for Portal use** with a comment in `tailwind.config.ts`/`globals.css`. Keep the definitions, because landing/auth still use some of them. Keep the existing `landing-*` tokens as they are (same values). New Portal code uses `grit-*`.

#### Phase 2 — Shared UI kit (`src/components/ui/grit/`)

Create presentational, prop-driven components (no data fetching) that encode the design once. Every value below comes from `grit-arena-v2.pen`.

| Component | Design source | Contract |
|---|---|---|
| `GritCard` | Location/Reserve cards, CTA banner (`glass`), pricing & KPI cards (`card`) | `variant: 'glass' \| 'card' \| 'highlight'` (`highlight` = fill `#14DBC414` + border `grit-cyan`); `padding: 'sm'(16) \| 'md'(20) \| 'lg'(24) \| 'xl'(28)`; radius 16 (`rounded-grit-2xl`); `as?: 'section' \| 'div' \| 'li' \| 'article'`; glass variant adds `backdrop-blur-md` |
| `GritTag` | Discipline Tag / Public Tag | `tone: 'accent' \| 'neutral'`; optional `icon`; `padding 7/12`, radius 8, 12 px Montserrat 700 uppercase, `tracking-[0.5px]`; accent = fill `grit-cyan/[.13]` + text cyan; neutral = transparent + subtext; both with `grit-glass-border` border. Optional `color` prop to tint with a discipline color |
| `GritBadge` | Total Duration Badge, Amenity tags | fill `grit-card`, border `grit-glass-border`, radius 8, `padding 7/12`, 12 px 600 `grit-text`, optional icon 13 px cyan |
| `GritButton` | Primary CTA, Secondary CTA, Maps Button, Login Button | `variant: 'primary' \| 'secondary' \| 'outline-accent' \| 'ghost'`; `size: 'sm'(10/16, 12px) \| 'md'(13–14/22, 14px)`; radius 10; primary = `bg-grit-cyan text-grit-bg font-bold hover:bg-grit-cyan-light`; secondary = transparent + `grit-glass-border` + `grit-text`; outline-accent = transparent + `grit-cyan` border and text; optional `icon` + `iconPosition`; renders `<a>` when `href` is passed (with `external` → `target="_blank" rel="noopener noreferrer"`); `loading` state; visible `focus-visible:ring-2 ring-grit-cyan` |
| `GritIconTile` | Icon Wrap (34 px, r10), CTA Icon Wrap (48 px, r12), KPI Icon Wrap (40 px, round) | `size: 34 \| 40 \| 48`; `shape: 'rounded' \| 'circle'`; `tone: 'card' \| 'accent'` |
| `GritInfoRow` | Reserve card Info Row | icon tile 34 + label (11 px 600 subtext) + value (13 px 700 text) |
| `GritSectionHeading` | "Descripción", "Precios y opciones", "¿Cómo será la sesión?" | `title`, optional `subtitle`, optional `action` slot (right side); `size: 'md'(20px) \| 'lg'(22px)`; title Rajdhani 700 `grit-text`, subtitle 12–13 px 500 subtext; renders `h2` by default, with an `as` override |
| `GritPageHeader` | Dashboard "Page Header" (eyebrow 12 px 600 cyan / title 36 px Rajdhani 700 / subtitle 14 px subtext) and Marketplace title block (56 px italic, second word cyan) | `eyebrow?`, `title`, `titleAccent?` (rendered cyan), `italic?`, `subtitle?`, `actions?` slot; title is the page `h1` |
| `GritDivider` | Divider `opnjQ` | 1 px `bg-grit-glass-border` |
| `GritIcon` | all icons | Wraps Material Symbols Outlined with `font-variation-settings: 'wght' 300` to approximate Lucide's stroke; `name`, `size` (px), `className`; always `aria-hidden` unless `label` is passed. Keep the design → Material Symbols mapping in `src/components/ui/grit/icon-map.ts` (see below) |
| `GritEmptyState` | (new; uses card + icon tile) | icon, title, description, optional action. Used for loading error / not found / empty lists |
| `GritPageContainer` | Body `yDuIt` | `max-w-[1440px] mx-auto w-full px-4 sm:px-6 lg:px-12 pt-6 pb-12 flex flex-col gap-8` |

`icon-map.ts`, used by the whole Portal (design Lucide name → Material Symbol):
`house→home`, `calendar→calendar_today`, `calendar-days→calendar_month`, `calendar-check→event_available`, `clock-3→schedule`, `map-pin→location_on`, `users→group`, `user-round→person`, `user-round-cog→manage_accounts`, `trending-up→trending_up`, `circle-check→check_circle`, `arrow-up-right→arrow_outward`, `arrow-right→arrow_forward`, `zap→bolt`, `dumbbell→fitness_center`, `layout-dashboard→dashboard`, `chart-column→bar_chart`, `settings→settings`, `shield→shield`, `car→directions_car`, `shirt→checkroom`, `bell→notifications`, `chevron-down→expand_more`, `waves→pool`.

Discipline → icon/color helper `src/lib/portal/disciplina-visual.ts`: `getDisciplinaVisual(nombre: string): { icon: string; colorClass: string }`. It matches the name case- and accent-insensitively (`natación|nado|swim → pool + swim`, `ciclismo|bici|cycle → directions_bike + cycle`, `running|carrera|trote → directions_run + run`, `fuerza|gym|strength → fitness_center + strength`, `funcional|crossfit → sports_gymnastics + functional`, `movilidad|yoga|stretch → self_improvement + mobility`), with the fallback `sports + cyan`. Pure function, no DB change.

Export everything from `src/components/ui/grit/index.ts` and re-export from `src/components/ui/index.ts`.

#### Phase 3 — Public Training Detail: visual rebuild

1. **Extract the body.** Create `src/components/landing/entrenamientos-publicos/detalle/PublicTrainingDetalleBody.tsx`. It renders everything from the hero to the CTA banner and receives:
   ```ts
   type PublicTrainingDetalleBodyProps = {
     item: PublicTrainingListItem;
     onReservar: () => void;
     reservarDisabled: boolean;
   };
   ```
   Section components stay in `src/components/landing/entrenamientos-publicos/detalle/` (US-0117 moves them when a second route consumes them). Also add `PublicTrainingDetalleCtaBanner.tsx` (extracted from the page) and `PublicTrainingDetalleStates.tsx` (loading / error / not-found built on `GritEmptyState`, with a `listadoHref` prop). The extraction is a pure refactor: same props, same handlers.
2. **Rebuild each section with the kit to match `OyIqr`** (values from the table in Current State):
   - Hero: remove the banner border; keep the 340 px desktop height (224 px mobile, 288 px `sm`) and the gradient overlay `from-grit-bg/90 via-grit-bg/40 to-transparent`. Tags: `GritTag tone="accent"` with `getDisciplinaVisual(item.disciplinaNombre)` icon, and `GritTag tone="neutral"` "ENTRENAMIENTO PÚBLICO". Title 40 px Rajdhani 700 (`text-3xl sm:text-4xl lg:text-[40px]`). Subtitle 15 px 500 subtext. Meta row `gap-x-7 gap-y-3`.
   - Layout order inside `GritPageContainer` (gap 32): Hero banner → left block (tags, title, subtitle, meta, `GritDivider`, Descripción) → 2-col row `gap-12` (Includes | Schedule) → 2-col row `gap-6` (Location | Reserve, equal height via `items-stretch`) → Pricing → CTA banner. Rows collapse to 1 column below `lg`.
   - Includes: `GritSectionHeading size="lg"`, list `gap-3.5`, `check_circle` 17 px.
   - Schedule: `GritSectionHeading size="md"` with the duration `GritBadge` in the `action` slot; time column left-aligned `min-w-[72px]`; row `gap-4`; dot 8 px (first `bg-grit-cyan`, others `bg-grit-glass-border`); line `w-[1.5px] bg-grit-glass-border`; description bottom padding 20 px except the last row.
   - Location: `GritCard variant="glass" padding="xl"`, `gap-7`; map tile `w-[340px] h-[240px]` (hidden below `sm`, full width at `sm`–`md`) radius 12 `bg-grit-card` with a centered radial glow and a 30 px `location_on` cyan icon; "Ver en Google Maps" becomes `GritButton variant="outline-accent" size="sm" external icon="arrow_outward"`.
   - Reserve: `GritCard variant="glass" padding="lg"`, `gap-5`; `GritSectionHeading size="lg"` "Reserva tu cupo"; info rows in `grid grid-cols-1 sm:grid-cols-2 gap-4` using `GritInfoRow`; CTA row `flex flex-col sm:flex-row gap-4`, each button `flex-1 h-[42px]`. The secondary "Ver detalles oficiales" and the redirect note render only when `paginaEventoUrl` is set. Without it, the primary button spans the full width.
   - Pricing: `GritSectionHeading size="lg"` with subtitle "Elige la tarifa que mejor se ajuste a ti. Podrás confirmarla al reservar."; grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5`; each option is `GritCard variant="card" padding="md" as="li"` with `gap-3`.
   - CTA banner: `GritCard variant="glass"` `px-7 py-6`; `GritIconTile size={48} tone="accent"` with `event_available`; title 20 px Rajdhani 700; `GritButton variant="primary" icon="arrow_forward" iconPosition="end"`.
   - The standalone "← Volver" link is restyled (13 px 600 subtext, `arrow_back` icon) and moved into the breadcrumb row, right-aligned, keeping its current `href` (`resolveOrigin(from)`). It is not removed: removing it would be a navigation change.
   - Keep all existing behaviors unchanged: markdown rendering without raw HTML, `cuposDisponibles = max(0, cupoMaximo − reservasActivas)`, hiding empty sections, the entrenador row only when present, and the `initializing` guard.
3. **Public route** (`src/app/entrenamientos-publicos/[entrenamiento_id]/page.tsx` → `src/components/landing/entrenamientos-publicos/detalle/PublicTrainingDetallePage.tsx`):
   - **The landing `Header` and `Footer` are kept exactly as they are today** (same components, same fixed header). The page keeps its current `landing-shell` wrapper and top padding, which clears the fixed header. The design's Navbar `oUFl9` and Footer `iDRcK` are intentionally not implemented.
   - Breadcrumb row (`PublicTrainingDetalleBreadcrumb`): restyle only. `home` icon + "Inicio" (`/`) › "Entrenamientos" (`resolveOrigin(from)`, existing logic, unchanged) › `{item.nombre}` (`aria-current="page"`).
   - `handleReservar`, `resolveOrigin`, modals and `usePublicTrainingDetalle` stay unchanged (anonymous → `RegistrateParaReservarModal`, authenticated → `PublicTrainingReservaModal`).

#### Phase 4 — Portal shell

1. `src/app/portal/layout.tsx`: replace `bg-navy-deep text-slate-100` with `grit-shell font-grit-body` and render the breadcrumb row between header and `<main>`. `<main>` keeps `flex-1 overflow-y-auto` but drops `p-6`: pages now own their padding through `GritPageContainer`.
2. `PortalHeader.tsx` → v2 Navbar (`oUFl9` / `d41rX5` Navbar): `h-auto py-[18px] px-4 sm:px-6 lg:px-12`, `border-b border-grit-glass-border`, `bg-grit-bg/80 backdrop-blur-md`; logo; the `PortalNavMenu` trigger restyled (14 px Montserrat 600 subtext, active/hover cyan, `rounded-grit-md`); notifications button = 36 px circle `bg-grit-glass border-grit-glass-border`; avatar = 36 px circle with a `grit-cyan` 1 px ring. **Remove the breadcrumb from the header.**
3. `PortalNavMenu.tsx`, `UserAvatarMenu.tsx`, `RoleBasedMenu.tsx`: dropdown panels = `GritCard variant="glass"` radius 12; items `px-3.5 py-2.5 rounded-grit-md gap-3.5`, icon + 14 px 500 subtext; the active item uses the design's "Nav Operación" style (`bg-gradient-to-r from-grit-cyan/15 to-transparent border border-grit-glass-border text-grit-text font-semibold`, icon cyan).
4. `PortalBreadcrumb.tsx` → a standalone row rendered by the layout right under the header (`AOIa5` style: `home` icon 13 px, `›` separators, 13 px 500 subtext, last 700 `grit-text`, `px-4 sm:px-6 lg:px-12 pt-4`), hidden when there is only one segment (existing rule). Add:
   - `SLUG_LABELS['entrenamientos-publicos'] = 'Entrenamientos públicos'`, plus `analitica: 'Analítica'`, `'mis-reservas': 'Mis reservas'`, `'mis-suscripciones': 'Mis suscripciones'`, `'mis-suscripciones-y-pagos': 'Suscripciones y pagos'`, `'landing-org': 'Organización'`, `invitaciones: 'Invitaciones'`, `'gestion-reservas': 'Reservas'`.
   - These are label-only additions; segment/href resolution logic is unchanged (the override mechanism is part of US-0117).
   - Wrapped in `<nav aria-label="Ruta de navegación"><ol>…</ol></nav>`.
5. Mobile: header below `md` shows logo + menu + avatar only (as today). The breadcrumb row wraps (`flex-wrap`) and truncates the last crumb with `truncate max-w-[60vw]`.

#### Phase 5 — Module-by-module Portal migration

Migrate every file that uses deprecated tokens to the kit/`grit-*` tokens. Rules:

- `turquoise`, `accent-teal`, `portal-primary`, `portal-secondary` → `grit-cyan`; `gradient-brand`/`bg-brand-gradient` buttons → `GritButton variant="primary"`.
- `glass-card`, `glass`, `portal-card`, `bg-navy-medium`, `bg-card-dark` containers → `GritCard` (`variant="card"` for data tiles, tables and KPI cards; `variant="glass"` for panels, filters and modals).
- `border-portal-border`, `border-white/5…10` → `border-grit-glass-border` on cards, `border-white/[.07]` only for table row separators (`#FFFFFF12`, as in the dashboard Divider).
- `text-slate-100/200` → `text-grit-text`; `text-slate-300/400` → `text-grit-subtext`; `text-slate-500/600` → `text-grit-muted`.
- `bg-navy-deep`, `bg-navy-soft` → `bg-grit-bg` / `bg-grit-card`.
- `font-display` (Lexend) → `font-grit-title` for headings (h1–h3, KPI values, prices) and `font-grit-body` for everything else.
- `rounded-lg`/`rounded-xl` → `rounded-grit-md` (buttons, inputs), `rounded-grit-lg` (tiles, dropdowns), `rounded-grit-xl` (KPI cards), `rounded-grit-2xl` (cards, modals).
- Every page's top title block → `GritPageHeader`; every page wrapper → `GritPageContainer`.
- Modals: overlay `bg-grit-bg/70 backdrop-blur-sm`; panel `GritCard variant="glass"` + `rounded-grit-2xl`; footer actions with `GritButton`.
- Inputs/selects: `bg-grit-card border border-grit-glass-border rounded-grit-md px-3.5 py-2.5 text-sm text-grit-text placeholder:text-grit-muted focus:border-grit-cyan focus:ring-1 focus:ring-grit-cyan` (design Date Picker / Search field). Define the shared class string once as `gritInputClass` in `src/components/ui/grit/styles.ts`.
- Status colors: success `grit-success`, error `grit-danger` (replaces `rose-300/400` for inline errors), warning `grit-discipline-run` (`#F2B84B`).

Migration order (one PR per group, each followed by a visual pass): (a) `inicio`, `perfil`, `invitaciones`, `PortalTenantsPage`; (b) athlete: `mis-reservas`, `mis-suscripciones`, `planes-publicos`, `entrenamientos-publicos` (swap `landing-*` → `grit-*`) — reference frame `d41rX5`; (c) admin/coach management: `entrenamientos`, `gestion-reservas`, `planes`, `disciplines`, `scenarios`, `servicios`; (d) `tenant`, `gestion-equipo`, `gestion-suscripciones`; (e) `formularios` (reference frame `P43Yo`, header already styled by US-0108); (f) `analitica` (reference frame `zfVKC`, KPI card spec above). After (f), delete `PortalSidebar.tsx` only if still unused, and remove the deprecated Portal-only tokens (`portal-*`, `.sidebar-item-active`) that no file references any more.

---

## Database Changes

None. This story is purely presentational. The detail data keeps coming from the existing anon-safe view via `entrenamientosPublicosService.getPublicTrainingDetail`. The discipline icon/color is derived client-side from `disciplinaNombre` (no new column).

---

## API / Server Actions

No new services or server actions.

- **Reused unchanged**: `entrenamientosPublicosService.getPublicTrainingDetail(entrenamientoId: string): Promise<PublicTrainingListItem | null>` in `src/services/supabase/portal/entrenamientos-publicos.service.ts`.
- No routes are added or changed. `/entrenamientos-publicos/[entrenamiento_id]` stays public and must **not** be added to `protectedPaths`.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Tokens | `src/app/globals.css` | Add `--grit-*` variables, `.grit-shell`; deprecation comments on `.glass`, `.glass-card`, `.sidebar-item-active` |
| Tokens | `tailwind.config.ts` | Add `colors.grit.*`, `fontFamily.grit-title/grit-body`, `borderRadius.grit-*`; deprecation comments on `turquoise`, `portal-*`, `navy-*` |
| UI kit | `src/components/ui/grit/GritCard.tsx` | New |
| UI kit | `src/components/ui/grit/GritTag.tsx` | New |
| UI kit | `src/components/ui/grit/GritBadge.tsx` | New |
| UI kit | `src/components/ui/grit/GritButton.tsx` | New |
| UI kit | `src/components/ui/grit/GritIconTile.tsx` | New |
| UI kit | `src/components/ui/grit/GritInfoRow.tsx` | New |
| UI kit | `src/components/ui/grit/GritSectionHeading.tsx` | New |
| UI kit | `src/components/ui/grit/GritPageHeader.tsx` | New |
| UI kit | `src/components/ui/grit/GritPageContainer.tsx` | New |
| UI kit | `src/components/ui/grit/GritDivider.tsx` | New |
| UI kit | `src/components/ui/grit/GritIcon.tsx` | New |
| UI kit | `src/components/ui/grit/GritEmptyState.tsx` | New |
| UI kit | `src/components/ui/grit/icon-map.ts` | New: Lucide → Material Symbols map |
| UI kit | `src/components/ui/grit/styles.ts` | New: `gritInputClass`, `gritSelectClass` |
| UI kit | `src/components/ui/grit/index.ts` | New barrel |
| UI kit | `src/components/ui/index.ts` | Re-export `grit` |
| Lib | `src/lib/portal/disciplina-visual.ts` | New: `getDisciplinaVisual()` |
| Detail | `src/components/landing/entrenamientos-publicos/detalle/PublicTrainingDetalle{Hero,Descripcion,Incluye,Cronograma,Ubicacion,Reserva,Precios}.tsx` | Rebuild with the kit per `OyIqr` (same location, same props) |
| Detail | `src/components/landing/entrenamientos-publicos/detalle/PublicTrainingDetalleBody.tsx` | New: extracted body |
| Detail | `src/components/landing/entrenamientos-publicos/detalle/PublicTrainingDetalleCtaBanner.tsx` | New (extracted) |
| Detail | `src/components/landing/entrenamientos-publicos/detalle/PublicTrainingDetalleStates.tsx` | New: loading / error / not found |
| Detail | `src/components/landing/entrenamientos-publicos/detalle/PublicTrainingDetallePage.tsx` | Keep `Header`/`Footer`/`landing-shell`; restyled breadcrumb row (with "Volver"), `PublicTrainingDetalleStates`, `PublicTrainingDetalleBody` |
| Detail | `src/components/landing/entrenamientos-publicos/detalle/index.ts` | Update exports |
| Card | `src/components/portal/entrenamientos-publicos/PublicTrainingCard.tsx` | Migrate to `grit-*` (link logic unchanged) |
| Shell | `src/app/portal/layout.tsx` | `grit-shell`, breadcrumb row, drop `p-6` |
| Shell | `src/components/portal/PortalHeader.tsx` | v2 Navbar styling; remove breadcrumb |
| Shell | `src/components/portal/PortalNavMenu.tsx`, `UserAvatarMenu.tsx`, `RoleBasedMenu.tsx` | v2 dropdown/nav item styling |
| Shell | `src/components/portal/PortalBreadcrumb.tsx` | Standalone row, new slug labels |
| Modules | `src/components/portal/{inicio,perfil,invitaciones,mis-reservas,mis-suscripciones,planes-publicos,entrenamientos-publicos,entrenamientos,gestion-reservas,planes,disciplines,scenarios,servicios,tenant,gestion-equipo,gestion-suscripciones,formularios,analitica}/**`, `PortalTenantsPage.tsx` | Phase 5 token/kit migration |
| Docs | `projectspec/03-project-structure.md` | Document `ui/grit` kit, `grit-*` tokens, new files; replace "landing-* tokens" mentions for Portal |

---

## Acceptance Criteria

**Tokens and kit**

1. `tailwind.config.ts` exposes `grit-*` colors, `font-grit-title`, `font-grit-body` and `rounded-grit-{xs,sm,md,lg,xl,2xl}` with the exact values listed in Phase 1. The existing `borderRadius.lg`/`xl` overrides are unchanged, and the landing home and `/auth/*` pages look identical before and after (screenshot comparison).
2. Every component in `src/components/ui/grit/` renders the values listed in its row of the Phase 2 table (padding, radius, font size/weight, fill, border). It can be imported from `@/components/ui`.
3. `getDisciplinaVisual('Natación')` returns the `pool` icon and the swim color, `getDisciplinaVisual('CICLISMO')` returns cycle, and an unknown name returns the `sports` + cyan fallback.

**Public detail route (`/entrenamientos-publicos/[id]`)**

4. The page still renders the current landing `Header` and `Footer`, unchanged (same components, links and behavior as before this story).
5. The breadcrumb reads `⌂ Inicio › Entrenamientos › {nombre}` with the v2 styling, and the "Volver" link sits right-aligned in the same row. Both hrefs are exactly the ones produced today by `resolveOrigin(from)`.
6. At 1440 px viewport width, each section matches `OyIqr` within ±2 px for padding, gap, radius and font size: hero 340 px with no border; tags are bordered pills (radius 8); includes list gap 14; schedule badge has a border; location card padding 28 with a 340×240 map tile and an outlined "Ver en Google Maps" button; reserve card padding 24 with a 2×2 info grid and side-by-side CTAs 42 px tall; pricing cards radius 16 (not 48) and padding 20; CTA banner uses `event_available` in a 48 px tile.
7. No element on the page resolves to a 32 px or 48 px border radius (no `rounded-lg`/`rounded-xl` classes remain in the detail components).
8. The discipline tag shows the discipline-specific icon from `getDisciplinaVisual`.
9. `src/components/landing/Header.tsx` and `src/components/landing/Footer.tsx` have no diff in this story.
10. "Reservar mi cupo" (reserve card and CTA banner) opens `RegistrateParaReservarModal` for anonymous visitors and `PublicTrainingReservaModal` for authenticated ones, and is disabled with "Cargando…" while auth initializes, as before.
11. Loading, error (with working "Reintentar") and not-found states render as `GritEmptyState` inside the v2 shell. Not-found links to `/entrenamientos-publicos`.
12. At 375 px width there is no horizontal scroll. All two-column rows stack to one column, the map tile hides, and the reserve CTAs stack.

**Portal shell and modules**

13. All Portal pages render on `.grit-shell` with Montserrat body text and Rajdhani headings. `document.body` computed font inside `/portal` is Montserrat.
14. `PortalHeader` matches the v2 Navbar (18/48 padding, `grit-glass-border` bottom border, 36 px round bell and avatar). The breadcrumb renders as its own row below the header on every Portal page with more than one segment, including on mobile (wrapping instead of hidden).
15. After Phase 5, `grep -rE "turquoise|portal-primary|portal-secondary|portal-card|portal-border|glass-card|navy-deep|navy-medium|navy-soft|card-dark|font-display|landing-(primary|text|bg|border|surface)|rounded-(lg|xl)\\b" src/components/portal src/app/portal` returns no matches.
16. Every Portal page title uses `GritPageHeader` (single `h1` per page), and every page wrapper uses `GritPageContainer`.
17. Existing functionality is unchanged (every route, link target, click handler and data query behaves as before this story): `npm run build` and `npm run lint` pass, and smoke tests pass for booking a training, managing reservations, the form builder, analytics filters, team invitations and subscriptions.

---

## Implementation Steps

- [ ] **Phase 1**: Add `--grit-*` variables and `.grit-shell` to `globals.css`; extend `tailwind.config.ts`; add deprecation comments; confirm landing/auth screenshots are unchanged
- [ ] **Phase 2**: Build the `src/components/ui/grit/` kit, `icon-map.ts`, `styles.ts`, `disciplina-visual.ts`; export from `@/components/ui`
- [ ] **Phase 3**: Extract `PublicTrainingDetalleBody`, CTA banner and states (pure refactor); rebuild each section against `OyIqr`
- [ ] Phase 3: Wire the public detail page (keeping the current `Header`/`Footer`)
- [ ] **Phase 4**: Restyle `PortalHeader`, `PortalNavMenu`, `UserAvatarMenu`, `RoleBasedMenu`; move the breadcrumb into its own row; update `portal/layout.tsx`
- [ ] **Phase 5**: Migrate modules in the order (a)→(f), one PR each, comparing each against the matching `.pen` frame (`d41rX5`, `ql3Ij`, `P43Yo`, `zfVKC`)
- [ ] Remove Portal-only deprecated tokens and `PortalSidebar.tsx` if unused; run the grep in AC 15
- [ ] Manual test at 375 / 768 / 1440 px: public detail (anon + logged in), not-found id, fetch error; click every link/CTA and confirm the destination is unchanged
- [ ] Update `projectspec/03-project-structure.md`

---

## Non-Functional Requirements

- **Security**: No DB, RLS, route or auth changes. `resolveOrigin(from)` is kept as is. External links (`paginaEventoUrl`, Google Maps) keep `target="_blank" rel="noopener noreferrer"`. Description markdown stays rendered without raw HTML (no `rehype-raw`).
- **Performance**: No new queries. `backdrop-blur` only on glass cards/navbar, not on list rows, to avoid paint cost on long tables. The hero keeps a single `<img>` with `object-cover`.
- **Accessibility**: Text colors on `#07111F` meet WCAG AA (`#E6EDF3` ≈ 15:1, `#BAC7D5` ≈ 10:1; `#8A9AAB` only for ≥ 11 px secondary text, ≈ 6:1). The primary button's dark text on cyan (`#07111F` on `#14DBC4` ≈ 11:1) is kept. Every interactive kit component has a visible `focus-visible` ring in `grit-cyan`. Icons are `aria-hidden` unless labelled. Breadcrumbs use `nav[aria-label] > ol` with `aria-current="page"`. Dropdowns keep `aria-expanded`/`aria-haspopup` and Escape-to-close with focus return. Each page has exactly one `h1`.
- **Error handling**: Fetch failures show `GritEmptyState` with a "Reintentar" button (retry calls `refetch`). Not-found is a distinct state with a link back to the relevant listing. Inline form errors across migrated modules use `text-grit-danger`. Existing toasts keep their behavior and only adopt `GritCard` styling.

---

## Out of Scope (follow-up stories)

- **US-0117**: Portal-scoped training detail route (`/portal/entrenamientos-publicos/[id]`), Portal-aware card link, `from` validation for Portal origins, breadcrumb override context.

- Switching the admin Portal to the 240 px left sidebar layout from `zfVKC` (`ua705`).
- Replacing Material Symbols with `lucide-react` (the `GritIcon` wrapper + `icon-map.ts` make that a one-file swap later).
- Data-backed design elements with no source today: "Nivel recomendado", amenity tags, "MÁS POPULAR" featured price.
- Replacing the landing `Header`/`Footer` on the public detail page with the design's Navbar (`oUFl9`) and Footer (`iDRcK`).
- Restyling the marketing landing home (`/`) and `/auth/*` pages, and removing the `borderRadius.lg/xl` overrides that they depend on.
