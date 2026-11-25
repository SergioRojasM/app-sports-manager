# US-0141 — Migrate the Component Layer to the GRIT Arena v3 Design

## ID
US-0141

## Name
Re-skin the Portal to `grit-arena-v3.pen` by changing only the design tokens, the `grit` component kit and the Portal shell, and rewrite `DESIGN.md` as the v3 contract for every future page migration

## As a
Product team (developers building or restyling Portal pages), and indirectly every authenticated Portal user (administrador, entrenador, usuario/atleta)

## I Want
The new v3 look — floating sidebar, pill controls, neutral hairlines, Exo 2 light titles, gradient surfaces — applied everywhere it can reach through tokens, kit components and the shell, without touching any page or feature component, plus a `DESIGN.md` that tells future page stories exactly how to finish the migration

## So That
The whole Portal moves to v3 in one low-risk change (no business logic, data or route is touched), and each page can later be migrated on its own by following a single written contract instead of re-reading the design file

---

## Description

### Current State
- The Portal is built on `grit-arena-v2.pen` (US-0116, US-0138). `DESIGN.md` (repo root) documents v2: navy background `#07111F`, Rajdhani titles, a **cyan** glass border on every surface, 10px buttons, 16px cards and uppercase tags.
- Tokens live in `src/app/globals.css` (`--grit-*` variables, `.grit-shell`) and `tailwind.config.ts` (`theme.extend.colors.grit`, `fontFamily.grit-*`, `borderRadius.grit-*`). Fonts are loaded in `src/app/layout.tsx` (`Rajdhani`, `Montserrat`, `Lexend`).
- The kit (`src/components/ui/grit/`, 12 components plus `styles.ts` and `icon-map.ts`) is used by 103 files. Features also use raw tokens heavily: 223 files outside the kit reference `rounded-grit-*`, `border-grit-glass-border`, `bg-grit-card|glass` or `font-grit-title` (`rounded-grit-md` ×539, `rounded-grit-2xl` ×174, `font-grit-title` ×160).
- The shell (`src/app/portal/layout.tsx` + `src/components/portal/Portal*.tsx`) has a 280px edge-to-edge sidebar with a cyan right border, a 72px top header with a bottom border, and the breadcrumb rendered as a row inside the scrolling `<main>`.

### Design Reference
Source of truth: `projectspec/designs/pencil/grit-arena-v3.pen` (open it with the pencil MCP tools; `.pen` files are encrypted and cannot be read as text).

**Variables** (the file defines only 8, no themes):

| v3 variable | Value |
|---|---|
| `$canvas` | `#080C10` |
| `$ink` | `#F3F7F8` |
| `$ink-2` | `#B3BFC5` |
| `$ink-3` | `#8593A0` |
| `$line` | `#1F2A31` |
| `$brand` | `#14DBC4` |
| `$brand-deep` | `#2BE3D0` |
| `$on-brand` | `#04121A` |

**Component board**: frame `ljQp3` ("Componentes · GRIT Arena App"). Reusable components used by this story:

| Design component | Node | Kit target |
|---|---|---|
| Sidebar / Usuario · Sidebar / Organización | `N3E8S` · `Vl7zI` | `PortalSidebar`, `PortalNavContent` |
| Org Switcher · User Card | `weLbQ` · `XLHCz` | `PortalNavContent` (org header) · `PortalSidebarUser` |
| Nav Item / Default · Activo · Grupo | `h135V` · `cUHCL` · `OYzP7` | `PortalNavContent` |
| Sub Item / Activo · Default | `LTtTI` · `oZ0P6` | `PortalNavContent` |
| Topbar · Breadcrumb | `vwVLa` · `c3k2e` | `PortalHeader` · `PortalBreadcrumb` |
| Notificaciones / Campana · Avatar / Topbar | `KGaw6` · `gNnuk` | `NotificacionesBell` · `UserAvatarMenu` |
| Page Header · Page Title | `lnMVj` · `jHJwK` | `GritPageHeader` |
| Button / Primary Glow · Primary · Secondary · Small | `DdNsJ` · `zG7Qt` · `yC90U` · `a8wf1a` | `GritButton` |
| Icon Button · Icon Button / Large · Row Action | `cA3ke` · `fBFBp` · `J4S1Zw` | **new** `GritIconButton` |
| Search / Large · Search | `N4tyD` · `l3ixX` | **new** `GritSearchField` |
| Dropdown Filter | `XSFT7` | `gritSelectClass` (pill variant) |
| View Switch · Tabs / Con contador · Segmented / Filtros | `g2bgr` · `rhTJ3` · `LW0MQ` | **new** `GritSegmented` |
| Chip / Activo · Chip / Default | `xKTkP` · `bHakw` | **new** `GritChip` |
| KPI Card · KPI Card / Destacada | `GO5Yf` · `pbTiS` | **new** `GritKpiCard` |
| Status / Activo · Mora · Suspendido · Pendiente | `Y8D4zJ` · `DOceZ` · `ximbE` · `tQv6H` | `GritTag` (new tones + `dot`) |
| Role / Atleta · Entrenador · Admin | `yNrdr` · `DVkIi` · `PBVdH` | `GritTag` (`neutral` · `violet` · `warning`) |
| Avatar / Iniciales | `sFaSi` | **new** `GritAvatar` |
| Progress / Asistencia | `fU6ex` | **new** `GritProgress` |
| Table / Head · Row · Pager | `v3ijUr` · `jpBWr` · `Alk2W` | **new** `gritTable*` classes + `GritPagination` |
| Notifications Panel · Notification Item | `FidFw` · `o7ity` | `NotificacionesPanel` · `NotificacionItem` |

**Reference screens** (to compare the result against): `nIhrL` Admin · Equipo · Miembros (table, segmented, KPI summary), `IZudm` Admin · Analítica (KPIs, panels, italic accent title), `aYwNn` Admin · Configuración (section cards), `lhbhK` App · Inicio v9 (athlete sidebar). Every screen uses the same shell: 16px outer inset, 240px floating sidebar, main column with a 56px transparent topbar and content padding `12 32 32 32`, gap 20.

Feature-level components on the board (`zRDg2` Event Card / Hero, `R1QegD` Event Card / Compacta, `uCKmV` Event Card, `s2Gt8L` Next Event Panel, `PzYwn` Live Toast) and the collapsed sidebar (`J0Zbc` Sidebar / Recogida, screen `V2eGcp`) are **not built here**. They are documented in `DESIGN.md` for the page stories that adopt them (see Out of Scope).

### Scope Boundary — "component layer only"

**Allowed to change** (exhaustive list):
1. Design tokens: `src/app/globals.css`, `tailwind.config.ts`, and the font loading in `src/app/layout.tsx`.
2. The kit: everything under `src/components/ui/grit/` (existing files and new files).
3. The Portal shell: `src/app/portal/layout.tsx` (shell markup only), `src/components/portal/Portal{Sidebar,SidebarUser,NavContent,Header,Breadcrumb,MobileDrawer}.tsx`, `src/components/portal/UserAvatarMenu.tsx`, and the header chrome `src/components/portal/notificaciones/{NotificacionesBell,NotificacionesPanel,NotificacionItem}.tsx`.
4. Documentation: `DESIGN.md`, `projectspec/03-project-structure.md`.
5. One static asset: `public/logo-grit-arena-dark.png` (copied from `projectspec/designs/pencil/images/logo-grit-arena-dark.png`).

**Must not change**: any `page.tsx`/`layout.tsx` other than the two above, any feature folder under `src/components/portal/<feature>/` (apart from the three notificaciones chrome files), `src/hooks/**`, `src/services/**`, `src/types/**`, `src/lib/**`, `supabase/**`, `src/components/home/**`, `/auth/*`, and any `landing-*` token. The public app home `/` (US-0140) is built on `grit-*` tokens, so it takes the v3 look through the token change without its files being edited (decided 2026-11-23). Kit component **props stay backward compatible**: every existing call site must compile and render without edits. New props and components are additive.

Pages reach v3 through two channels: (a) kit components restyle themselves, and (b) the tokens they already use change value. Whatever a page builds by hand with hard-coded geometry (for example `rounded-grit-md` buttons or `font-grit-title font-bold` KPIs) keeps that geometry until its own page story. That gap is expected; `DESIGN.md` §10 lists the replacements.

### Proposed Changes

#### 1. Tokens (`globals.css` + `tailwind.config.ts`)

Keep every existing token **name**, so the 223 feature files pick up v3 with no edits, and change the **values**:

| Tailwind token | CSS variable | v2 value | v3 value | v3 source |
|---|---|---|---|---|
| `grit-bg` | `--grit-bg-navy` | `#07111F` | `#080C10` | `$canvas` |
| `grit-text` | `--grit-text-primary` | `#E6EDF3` | `#F3F7F8` | `$ink` |
| `grit-subtext` | `--grit-text-subtext` | `#BAC7D5` | `#B3BFC5` | `$ink-2` |
| `grit-muted` | `--grit-text-muted` | `#8A9AAB` | `#8593A0` | `$ink-3` |
| `grit-cyan` | `--grit-accent-cyan` | `#14DBC4` | unchanged | `$brand` |
| `grit-cyan-light` | `--grit-accent-cyan-light` | `#49F5E2` | `#2BE3D0` | `$brand-deep` (hover of cyan fills) |
| `grit-glass-border` | `--grit-glass-border` | `rgba(20,219,196,.25)` | `rgba(255,255,255,.12)` | controls/cards stroke `#FFFFFF1F` |
| `grit-card` | `--grit-card-fill` | `rgba(11,24,38,.8)` | `rgba(17,26,33,.8)` | surface `#111A21` |
| `grit-glass` | `--grit-glass-fill` | `rgba(15,31,48,.69)` | `rgba(17,26,33,.85)` | overlay panels (used with blur) |
| `grit-sidebar` | `--grit-sidebar-fill` | `rgba(6,14,26,.8)` | `#0B1116` | sidebar gradient end |
| `grit-danger` | `--grit-danger` | `#FF6B6B` | `#FF8A80` | Status / Suspendido |

Add these tokens (hex, so opacity modifiers work):

| New Tailwind token | CSS variable | Value | Use |
|---|---|---|---|
| `grit-on-brand` | `--grit-on-brand` | `#04121A` | Text/icons on cyan fills |
| `grit-line` | `--grit-line` | `#1F2A31` | Opaque hairline (topbar bell, dividers on canvas) |
| `grit-surface` | `--grit-surface` | `#111A21` | Card gradient start |
| `grit-surface-deep` | `--grit-surface-deep` | `#0B1116` | Card gradient end |
| `grit-surface-accent` | `--grit-surface-accent` | `#14302D` | Highlighted card gradient start |
| `grit-warning` | `--grit-warning` | `#FFC46B` | Status / Mora, Role / Admin |
| `grit-violet` | `--grit-violet` | `#B9A3FF` | Status / Pendiente, Role / Entrenador |
| `grit-avatar` | `--grit-avatar-fill` | `#1E3A3F` | Initials avatar fill |

Unchanged: `grit-teal`, `grit-success`, all `grit-discipline-*` (the charts and `getDisciplinaVisual` depend on them).

**Radius**: keep `grit-xs` 6, `grit-sm` 8, `grit-md` 10, `grit-lg` 12, `grit-xl` 14. Change `grit-2xl` from **16 → 22px** (the v3 card/panel/KPI radius, which re-rounds the 174 card usages for free). Add `grit-3xl` = **28px** (sidebar, hero, mobile drawer). Pill controls use Tailwind's `rounded-full`.

**Fonts** (`src/app/layout.tsx`): load `Exo_2` (weights 300, 400, 500, 600, 700, `style: ['normal','italic']`) as `--font-exo2`, and `JetBrains_Mono` (400, 500) as `--font-jetbrains-mono`. Point `fontFamily['grit-title']` to `var(--font-exo2)` and add `fontFamily['grit-mono']` → `var(--font-jetbrains-mono)`. Keep Rajdhani loaded, because `landing-display` and `/auth/*` still use it. `grit-body` stays Montserrat.

**Shell background** (`.grit-shell`): replace the navy and the two glows with the v3 canvas: `var(--grit-bg-navy)` plus `radial-gradient(ellipse at 95% 95%, rgba(20,219,196,.12), transparent 60%)` and `radial-gradient(ellipse at 30% 0%, rgba(255,255,255,.04), transparent 50%)`.

**Scrollbar** (`.grit-scrollbar`): thumb `rgba(255,255,255,.14)` (neutral, v3 never paints chrome in cyan).

#### 2. Existing kit components (`src/components/ui/grit/`)

All props remain; changes are visual, plus a few additive props.

| Component | v3 change |
|---|---|
| `GritCard` | Radius `rounded-grit-2xl` (now 22). `card` → `bg-gradient-to-b from-grit-surface to-grit-surface-deep border border-white/[0.10] shadow-[0_20px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]`. `glass` → `bg-grit-glass backdrop-blur-xl border border-white/[0.10]` with the same shadow (overlays, modals, filter drawers). `highlight` → `bg-gradient-to-b from-grit-surface-accent to-grit-surface-deep border border-grit-cyan/40`. **New** variant `inset` → `rounded-grit-2xl bg-white/[0.025] border border-white/[0.06]` with no shadow, for surfaces nested inside a card (Next Event Panel meters). The CSS approximates the design's gradient strokes with a solid hairline plus a 1px inset top highlight; do not add `border-image` hacks. |
| `GritButton` | `rounded-full`, `font-semibold` (600) at every size. `primary`: `bg-grit-cyan text-grit-on-brand hover:bg-grit-cyan-light shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]`. `secondary`: `bg-white/[0.04] border border-white/[0.12] text-grit-text hover:bg-white/[0.08]`, icon in `text-grit-subtext`. `outline-accent`: `bg-grit-cyan/[0.08] border border-grit-cyan/35 text-grit-cyan hover:bg-grit-cyan/15`. `ghost`: `text-grit-subtext hover:bg-white/[0.04] hover:text-grit-text`. Sizes: `sm` → h 31, `px-3.5`, 12px, icon 14 (Button / Small); `md` → h 37, `px-[18px]`, 12px, icon 15 (Button / Primary). **New** size `lg` → h 42, `px-[22px]`, 13px, icon 16, and for `primary` adds the glow `shadow-[0_8px_24px_rgba(20,219,196,0.35)]` (Button / Primary Glow, the page-level CTA). |
| `GritPageHeader` | `h1`: `font-grit-title font-light text-[30px] leading-[1.1] sm:text-[40px] text-grit-text`. `titleAccent` stays cyan with the same weight. **`italic` now italicizes only the accent** (Analítica: "Indicadores *del club.*"); it has no call sites today, so nothing regresses. `eyebrow` → 11px/600 uppercase `tracking-[1.3px] text-grit-cyan`. `subtitle` → 13px `text-grit-subtext`. `actions` gap 10px. |
| `GritSectionHeading` | Title `font-grit-title font-medium`: `lg` 19px, `md` 17px. Subtitle 12px `text-grit-muted`. |
| `GritTag` | Becomes the v3 status/role pill: `rounded-full px-2.5 py-1 text-[11px] font-semibold`, **no uppercase**. Tones (existing `accent`/`neutral` keep their names): `accent` = `bg-grit-cyan/10 border-grit-cyan/25 text-grit-cyan`; `neutral` = `bg-white/[0.04] border-white/10 text-grit-subtext`; **new** `warning`, `danger` and `violet` use the same 8%-fill/25%-border/full-colour-text formula with `grit-warning`, `grit-danger` and `grit-violet`. **New** prop `dot?: boolean` renders a leading 6px dot in the text colour (Status pills). `colorClass` keeps working as an override. |
| `GritBadge` | Chip / Default look: `rounded-full bg-white/[0.03] border border-white/10 px-3 py-[7px] text-xs font-medium text-grit-text`, icon cyan. |
| `GritIconTile` | Every size uses `rounded-grit-lg` (12) when `shape="rounded"`. `card` tone → `bg-white/[0.04] border border-white/[0.08]` with a cyan icon; `accent` → `bg-grit-cyan/10 border border-grit-cyan/25`. **New** tones `warning`, `violet`, `danger` (notification icons). |
| `GritEmptyState` | Uses `GritCard variant="card"`; title `font-grit-title font-medium text-xl`. |
| `GritDivider` | `bg-white/[0.06]` (v3 `#FFFFFF0F` rule). |
| `GritIcon` | Unchanged API. Default weight stays 300. |
| `GritPageContainer` | v3 content box: `px-4 sm:px-6 lg:px-8`, `pt-3`, `pb-8`, `gap-5` (20px). Keep `max-w-[1440px] mx-auto`. |
| `styles.ts` | `gritInputClass` → `rounded-grit-lg bg-white/[0.04] border border-white/[0.12] px-4 py-2.5 text-[13px] text-grit-text placeholder:text-grit-muted focus:border-grit-cyan/60 focus:ring-2 focus:ring-grit-cyan/20`. v3 draws no form field, so this is a **derived** style; `DESIGN.md` must say so. `gritSelectClass` keeps building on it. **New** `gritPillSelectClass` (Dropdown Filter: `rounded-full`, h 35, 12px). `gritFocusRing` → `ring-grit-cyan/70`, offset colour `grit-bg`. **New** table classes (see §3). |
| `icon-map.ts` | Add the v3 Lucide → Material mappings: `plus→add`, `search→search`, `ellipsis→more_horiz`, `chevron-left→chevron_left`, `chevrons-up-down→unfold_more`, `list→list`, `list-filter→filter_list`, `layout-grid→grid_view`, `calendar-range→date_range`, `calendar-plus→calendar_add_on`, `calendar-x→event_busy`, `alarm-clock→alarm`, `hourglass→hourglass_empty`, `timer→timer`, `activity→monitoring`, `footprints→directions_run`, `bike→directions_bike`, `mountain→landscape`, `sailboat→sailing`, `medal→military_tech`, `wallet→account_balance_wallet`, `receipt→receipt_long`, `download→download`, `refresh-cw→refresh`, `badge-check→verified`, `circle-x→cancel`, `circle-dot→radio_button_checked`, `circle-dashed→pending`, `ban→block`, `info→info`, `sparkles→auto_awesome`, `bookmark→bookmark`, `star→star`, `heart→favorite`, `map→map`, `pencil→edit`, `file-pen-line→edit_document`, `scan-line→qr_code_scanner`, `settings-2→tune`. Update the header comment to `grit-arena-v3.pen`. |

#### 3. New kit primitives (presentational only, exported from the barrel)

| Component / export | Props | Design | Notes |
|---|---|---|---|
| `GritIconButton` | `icon`, `label` (**required**, becomes `aria-label`), `size` `sm`·`md`·`lg` (30·38·44, default `md`), `variant` `default`·`ghost`, `href?`, plus button attrs | Icon Button, Row Action | Round. `default` = `bg-white/[0.04] border-white/[0.12]`, icon `grit-text`; `ghost` (Row Action) = `bg-white/[0.03]`, no border, icon `grit-subtext`. |
| `GritSearchField` | `size` `md`·`lg` (37·44), plus all `<input>` attrs; requires `aria-label` or `aria-labelledby` | Search, Search / Large | Pill, leading search icon 15/16 `grit-muted`, `lg` adds `shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]`. Renders `type="search"`. |
| `GritSegmented` | `options: {value,label,count?,icon?}[]`, `value`, `onChange`, `variant` `soft`·`solid` (default `soft`), `ariaLabel` | Segmented / Filtros, Tabs / Con contador, View Switch | Container `rounded-full bg-black/30 border-white/[0.08] p-1 gap-0.5`. `soft` active = `bg-grit-cyan/[0.12] border-grit-cyan/35 text-grit-text font-semibold`; `solid` active = `bg-grit-cyan text-grit-on-brand` + glow. Inactive = `text-grit-subtext font-medium`. `count` renders a pill (active: cyan fill/on-brand; inactive: `bg-white/[0.08]`). Buttons inside a `role="group"` with `aria-pressed`. Overflows horizontally with scroll on narrow screens, never wraps. |
| `GritChip` | `active`, `icon?`, `children`, button attrs | Chip / Activo, Chip / Default | `aria-pressed={active}`. Active = cyan fill, `text-grit-on-brand`, glow `0 6px 18px cyan/25`. Default = `bg-white/[0.03] border-white/10 text-grit-text font-medium`, icon cyan. |
| `GritKpiCard` | `icon`, `value`, `label`, `detail?`, `highlight?`, `valueClassName?` | KPI Card, KPI Card / Destacada | Horizontal: 40px round icon chip, value `font-grit-title font-light text-[36px]`, label 12px `grit-subtext`. `highlight` uses `GritCard variant="highlight"`. |
| `GritAvatar` | `name` (for initials), `src?`, `size` 32·34·38, `tone` `neutral`·`soft`·`solid` | Avatar / Iniciales, Avatar / Topbar, User Card avatar | `neutral` = `bg-grit-avatar text-grit-text`; `soft` = `bg-grit-cyan/[0.12] border-grit-cyan/35 text-grit-cyan`; `solid` = `bg-grit-cyan text-grit-on-brand`. Uses `next/image` when `src` is set; `alt=""` because the name is always printed next to it. |
| `GritProgress` | `value` (0–100), `label?`, `showValue?` (default true), `tone` `accent`·`warning`·`danger` | Progress / Asistencia | 6px track `bg-white/[0.06]`, fill by tone, value in `font-grit-mono text-[11px] text-grit-subtext`. `role="progressbar"` with `aria-valuenow/min/max` and `aria-label`. Values outside 0–100 are clamped. |
| `GritPagination` | `page`, `totalPages`, `onPageChange`, `summary?` (e.g. "Mostrando 1–7 de 102 miembros") | Table / Pager | 30px round buttons, active `bg-grit-cyan text-grit-on-brand`, ellipsis when `totalPages > 7`, prev/next disabled at the ends, `nav[aria-label="Paginación"]`, `aria-current="page"`. Renders nothing when `totalPages <= 1`. |
| `gritTableHeadClass`, `gritTableHeadCellClass`, `gritTableRowClass`, `gritTableCellClass` (in `styles.ts`) | — | Table / Head, Table / Row | Head row `bg-white/[0.02]`; head cells `px-[22px] py-[13px] text-[10px] font-semibold uppercase tracking-[1.3px] text-grit-muted`; rows `border-t border-white/[0.06] hover:bg-white/[0.02]`; cells `px-[22px] py-4 text-[13px] text-grit-text`. The table itself sits in `GritCard variant="card" padding="none" className="overflow-hidden"`. |

#### 4. Portal shell

**`src/app/portal/layout.tsx`**: shell markup only. The `.grit-shell` root becomes `flex h-screen overflow-hidden lg:p-4 lg:gap-0`; the sidebar floats inside the 16px inset; the main column keeps `flex-1 min-w-0 flex-col`. Render `<PortalBreadcrumb variant="inline" />` inside `<main>` with `lg:hidden`. No auth, cookie or redirect logic changes.

**`PortalSidebar`** (Sidebar / Organización `Vl7zI`, Sidebar / Usuario `N3E8S`): `w-[240px] rounded-grit-3xl bg-gradient-to-b from-grit-surface to-grit-sidebar border border-white/[0.10] shadow-[0_20px_48px_rgba(0,0,0,0.5)]`, padding `26 14 16 14`, still `hidden lg:flex`. Logo: `public/logo-grit-arena-dark.png` at 132×38, `object-contain`, inside `px-2`. The nav area keeps its own scroll (`grit-scrollbar`); logo, org switcher and user card stay anchored. Remove the `GritDivider` above the user card (v3 separates it with flexible space).

**`PortalNavContent`** (both `sidebar` and `drawer` variants; the drawer keeps its ≥40px touch targets):
- **Org Switcher** (`weLbQ`), rendered at the top of the nav only when `tenantNav` exists: `rounded-[18px] bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/10 px-3 py-2.5`, inset top highlight. A 34px tile `rounded-[11px] bg-grit-bg border-grit-cyan/50` with a cyan glow, showing the tenant's initial in `font-grit-title font-bold italic text-grit-cyan` (no image: US-0138's "the menu never loads images" rule still applies). Then name (13/600 `grit-text`, truncated with `title`), the caption "Organización" (10px `grit-muted`), and an `unfold_more` icon. The whole card is a `Link` to `/portal/orgs` with `aria-label="Cambiar de organización (actual: {tenantName})"`. While the name loads, show the existing skeleton bars.
- **Section overlines**: "MI CUENTA" (replaces "Menú") and "ORGANIZACIÓN", `px-3.5 pt-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[1.3px] text-grit-muted`, separated by a `GritDivider`. The "MI CUENTA" collapse toggle from US-0138 is **kept** (chevron 12px at the right of the overline, same `aria-expanded`/`aria-controls`). The "ORGANIZACIÓN" section is always expanded, because v3 has no org collapse and the org header is now the switcher.
- **Nav Item / Default** (`h135V`): `rounded-full px-3.5 py-3 gap-3`, icon 18 `grit-muted`, label 14px `grit-subtext`, hover `bg-white/[0.04] text-grit-text`.
- **Nav Item / Activo** (`cUHCL`): `rounded-full py-[7px] pl-[7px] pr-3.5 gap-3`, background `bg-gradient-to-r from-grit-cyan/[0.18] via-grit-cyan/[0.04] to-transparent`, `border border-grit-cyan/30`, shadows `inset 0 1px 0 rgba(255,255,255,.1), 0 8px 24px rgba(20,219,196,.12)`. Leading 32px round icon chip `bg-gradient-to-b from-[var(--grit-accent-cyan-light)] to-grit-cyan` with a 16px `grit-on-brand` icon and glow. Label 14/600 `grit-text`, then a trailing 6px cyan "live" dot with glow (`aria-hidden`).
- **Nav Item / Grupo** (`OYzP7`): `rounded-full px-3.5 py-[11px] gap-3.5`, icon 17, label 13px; collapsed shows `chevron_right`, expanded `expand_more` (14px `grit-muted`). When the group holds the active route: icon `grit-cyan`, label `grit-text font-medium`.
- **Sub Item** (`LTtTI` / `oZ0P6`): container `pl-[22px] pt-0.5 pb-1.5 gap-0.5` (no left border line). Default `rounded-full py-[9px] pl-4 pr-3 text-xs text-grit-subtext`; active uses the same gradient pill, border and live dot as Nav Item / Activo, with label 12/600 `grit-text`. Sub items render an icon (15px) only when the resolved leaf has one; **do not** add icons to `portal.types.ts` (out of scope).
- Top-level org leaves (Analítica, athlete "Planes") use the Nav Item Default/Activo styles.

**`PortalSidebarUser`** (User Card `XLHCz`): `rounded-[20px] bg-white/[0.03] border border-white/[0.07] px-3 py-2.5 gap-2.5`; `GritAvatar size={32} tone="soft"` (photo when `foto_url`); name 13/600; second line 10px in `grit-cyan` when it shows the tenant role, `grit-muted` when it shows the email; logout as `GritIconButton variant="ghost" size="sm" label="Cerrar sesión"` (hover keeps the danger tint). Same link and logout behavior as today.

**`PortalHeader`** (Topbar `vwVLa`): transparent, **no bottom border, no blur**, `h-14 px-4 sm:px-6 lg:px-8`. Left: the breadcrumb (`<PortalBreadcrumb variant="topbar" />`, `hidden lg:flex`) on desktop, the logo (`lg:hidden`) on mobile. Right (gap 14): `NotificacionesBell`, `UserAvatarMenu`, and the mobile menu button as `GritIconButton size="md" label="Abrir menú"` (`lg:hidden`, keeps `aria-expanded`/`aria-controls`).

**`PortalBreadcrumb`** (Breadcrumb `c3k2e`): new prop `variant?: 'topbar' | 'inline'` (default `inline`, so the API stays backward compatible). Both variants: home icon 13 + `chevron_right` separators 12, all `grit-muted`, crumbs 12px `grit-muted`, the last crumb 12/500 `grit-subtext` with `aria-current="page"`. `inline` adds `px-4 pt-3 sm:px-6`. Label and segment logic unchanged.

**`PortalMobileDrawer`**: panel `rounded-l-grit-3xl` with the sidebar's gradient, border and shadow; backdrop `bg-grit-bg/70 backdrop-blur-sm`; close button `GritIconButton`. Behavior (focus trap, Escape, return focus, slide animation, scroll lock) unchanged.

**`UserAvatarMenu`** (Avatar / Topbar `gNnuk`): trigger `GritAvatar size={38} tone="solid"` (photo when present) with the kit focus ring. Dropdown `rounded-[18px]` using `GritCard variant="glass"` styling; items `rounded-full px-3.5 py-2.5 text-[13px]`, hover `bg-white/[0.04]`; the logout item keeps its danger hover.

**`NotificacionesBell`** (Campana `KGaw6`): 38px round, `border border-grit-line`, icon 16 `grit-subtext`, hover `bg-white/[0.04]`. Unread indicator: keep today's semantics (dot or count). The dot is 7px cyan; a count uses a `bg-grit-cyan text-grit-on-brand` pill. Keep the existing `aria-label`, which announces the count.

**`NotificacionesPanel` + `NotificacionItem`** (`FidFw` / `o7ity`): panel `w-[410px] max-w-[calc(100vw-2rem)] rounded-[24px]` with `GritCard variant="glass"` styling plus `shadow-[0_30px_70px_rgba(0,0,0,0.7),0_0_40px_rgba(20,219,196,0.1)]`; header `px-5 pt-[18px] pb-3`, title `font-grit-title font-medium text-lg`; dividers `GritDivider`. Items: `px-5 py-3 gap-3`; leading `GritIconTile size={38}` (sized via class; tone by notification type when the type is already known in the component, else `card`); title 13/600, body 12px `grit-muted`, meta 11px `grit-muted`. Unread items get `bg-gradient-to-r from-grit-cyan/[0.06] to-transparent`. **Do not** add day grouping (AHORA/AYER), tabs or settings links that the component doesn't have today; those need data/logic and belong to a notifications story.

#### 5. `DESIGN.md` rewrite (the v3 contract for future pages)

Rewrite the repo-root `DESIGN.md` so it describes v3 **as implemented by this story**. Keep the current structure and tone, and update or add these sections:

1. **Frontmatter**: `design_source: projectspec/designs/pencil/grit-arena-v3.pen`, `updated: <date> (US-0141)`.
2. **Where everything lives**: v3 file and component board `ljQp3`; a frame table (the reference screens listed above plus `kMj4F`, `zY4v8`, `LSqV5`, `x9xdbA`, `v1lcBA`, `ZYxt2`, `LV7I0`, `g9lnB`, `qG0T5`, `fXuVP`, `v8mqZG`, `J7Lw7d`, `PKOv8`, `p5Ms22`, `kPW3x`, `nnCrm`, `SSjFs`) mapping each frame to its Portal route, so a page story knows which frame to open.
3. **Tokens**: the v3 table (§1 of this story) with the `$variable` → Tailwind mapping; the rule "solid tokens accept opacity modifiers, `grit-glass`/`grit-card`/`grit-glass-border` do not"; the **white-alpha ladder** v3 uses for neutral surfaces and strokes (`white/[0.02]` table head, `0.03` chip/user card, `0.04` controls, `0.06` dividers/track, `0.08` segmented border, `0.10` cards, `0.12` control stroke); the cyan alpha ladder for accents (`/10` tinted fill, `/25` tinted stroke, `/35` active stroke, `/50` tile stroke).
4. **Typography**: Exo 2 for titles and numerals, **light (300) for page titles and KPI values**, medium (500) for section and card titles, bold italic only for the org mark; Montserrat body; JetBrains Mono for percentages and tabular numbers. Scale: 40 (h1) · 36 (KPI card) · 30 (inline KPI) · 24 (entity title) · 19/17 (section) · 15 (card name) · 14 (nav) · 13 (buttons lg, body) · 12 (buttons, controls, meta) · 11 (pills, captions) · 10 (overlines, table headers, `tracking-[1.3px]` uppercase).
5. **Shape**: radius scale with v3 roles (`rounded-full` every control: buttons, inputs of type search, chips, segmented, nav items, pills, avatars · 11–12 icon tiles · 16 date tiles and nested `inset` surfaces · 18 org switcher, dropdowns, toasts · 20 user card · 22 cards/panels/KPIs (`rounded-grit-2xl`) · 24 notification panel, event cards · 28 sidebar, hero (`rounded-grit-3xl`)). State that `rounded-lg`/`rounded-xl` remain forbidden.
6. **Elevation & surfaces**: the three card recipes (`card`, `glass`, `highlight`) plus `inset`; the standard drop shadow `0 20px 48px rgba(0,0,0,.5)`; the cyan glow reserved for the primary CTA, the active nav chip and active chips/switches; "one glow per view region".
7. **Shell**: the v3 skeleton (16px inset, 240px floating sidebar, 56px transparent topbar holding the breadcrumb on desktop, content padding 12/32/32/32 with gap 20) and what a page must not do (no outer padding, no background, no second `h1`).
8. **Component kit**: the full table of existing and new components with their v3 props (§2–§3), and when to use each (for example "status of a record → `GritTag tone + dot`; role → `GritTag` without dot", "filters with ≤6 options → `GritSegmented`; open-ended categories → `GritChip` row", "page CTA → `GritButton size="lg"`, at most one per page").
9. **Patterns** (with the design node to copy from): page header with tools (`lnMVj`), summary strip + segmented + toolbar + table (`nIhrL`), KPI row (`IZudm`), settings section cards (`aYwNn`), list rows, modals/drawers, forms (marked **derived**: v3 has no form frame; update when one is designed), empty/loading/error, charts (the `chart-theme.ts` hex values must be updated to v3 in the analítica page story), and the **feature patterns not yet in the kit**: Event Card hero/compact/grid (`zRDg2`/`R1QegD`/`uCKmV`: photo + bottom shade gradient + blurred `#080C1073` pills and date tile), Next Event Panel (`s2Gt8L`), Live Toast (`PzYwn`), collapsed sidebar (`J0Zbc`). Each is documented with its measurements so the page story that needs it can promote it into the kit.
10. **Migrating a page to v3**: a step-by-step checklist that every future page story follows:
    - Open the page's frame in v3 and list the kit components it uses.
    - Replace hand-rolled controls with kit components: `<button className="rounded-grit-md …">` → `GritButton`/`GritIconButton`; search inputs → `GritSearchField`; tab/filter button rows → `GritSegmented`/`GritChip`; status spans → `GritTag tone dot`; hand-built KPI tiles → `GritKpiCard`; avatars → `GritAvatar`; progress bars → `GritProgress`; table markup → `gritTable*` + `GritPagination`.
    - A find → replace table for leftover raw classes: `font-grit-title font-bold` on titles/numerals → `font-light` (h1/KPI) or `font-medium` (sections); `border-grit-cyan`/`border-grit-glass-border` used as an *accent* → `border-grit-cyan/35`; `text-grit-bg` on cyan → `text-grit-on-brand`; uppercase `tracking-[0.5px]` tags → `GritTag`; `bg-grit-card` used as a top-level card → `GritCard variant="card"`; `divide-grit-glass-border`/`border-white/[.07]` → `white/[0.06]`.
    - Verify against the frame at 375/768/1440, keyboard pass, and the §11 grep.
11. **Deprecated** and the **CI grep**: extend the v2 grep with v3 leftovers in migrated folders (`rounded-grit-md` on `<button>`/`<a>` elements, `text-grit-bg` on cyan, `uppercase tracking-\[0\.5px\]`). Note that the grep is applied per migrated folder until every page has been migrated.
12. **Checklist for a new page**: the v2 checklist updated to v3 rules.

Also update `projectspec/03-project-structure.md` (the kit listing near line 393 and the design-system paragraph near line 1117) so it points to v3 and lists the new kit files.

---

## Database Changes
None. This story changes no table, column, function or RLS policy.

---

## API / Server Actions
None. No service, server action, route handler or hook is created or modified.

---

## Files to Create or Modify

| Area | File | Change |
|------|------|--------|
| Tokens | `src/app/globals.css` | Update `--grit-*` values, add the 8 new variables, new `.grit-shell` background, neutral `.grit-scrollbar` |
| Tokens | `tailwind.config.ts` | Add new `grit.*` colours, `grit-3xl` radius, `grit-2xl` → 22px, `grit-title` → Exo 2, new `grit-mono` |
| Fonts | `src/app/layout.tsx` | Load `Exo_2` and `JetBrains_Mono` via `next/font/google`, add their variables to `<body>` (Rajdhani stays) |
| Asset | `public/logo-grit-arena-dark.png` | Copy from `projectspec/designs/pencil/images/logo-grit-arena-dark.png` |
| Kit | `src/components/ui/grit/GritCard.tsx` | v3 recipes + new `inset` variant |
| Kit | `src/components/ui/grit/GritButton.tsx` | Pill shape, v3 variants, new `lg` size with glow |
| Kit | `src/components/ui/grit/GritPageHeader.tsx` | Exo 2 light 40px, accent-only italic |
| Kit | `src/components/ui/grit/GritSectionHeading.tsx` | Exo 2 medium 19/17px |
| Kit | `src/components/ui/grit/GritTag.tsx` | Status/role pill, new tones, `dot` prop |
| Kit | `src/components/ui/grit/GritBadge.tsx` | Chip / Default look |
| Kit | `src/components/ui/grit/GritIconTile.tsx` | 12px radius, neutral/tinted tones |
| Kit | `src/components/ui/grit/GritEmptyState.tsx` | `card` variant, Exo 2 medium title |
| Kit | `src/components/ui/grit/GritDivider.tsx` | `white/[0.06]` |
| Kit | `src/components/ui/grit/GritPageContainer.tsx` | v3 content padding and gap |
| Kit | `src/components/ui/grit/styles.ts` | v3 input/select/focus classes, `gritPillSelectClass`, `gritTable*` classes |
| Kit | `src/components/ui/grit/icon-map.ts` | v3 Lucide mappings, header comment |
| Kit | `src/components/ui/grit/GritIconButton.tsx` | **New** |
| Kit | `src/components/ui/grit/GritSearchField.tsx` | **New** |
| Kit | `src/components/ui/grit/GritSegmented.tsx` | **New** (client component: `'use client'`) |
| Kit | `src/components/ui/grit/GritChip.tsx` | **New** |
| Kit | `src/components/ui/grit/GritKpiCard.tsx` | **New** |
| Kit | `src/components/ui/grit/GritAvatar.tsx` | **New** |
| Kit | `src/components/ui/grit/GritProgress.tsx` | **New** |
| Kit | `src/components/ui/grit/GritPagination.tsx` | **New** (client component) |
| Kit | `src/components/ui/grit/index.ts` | Export the new components and class constants |
| Shell | `src/app/portal/layout.tsx` | 16px inset shell, inline breadcrumb only below `lg` |
| Shell | `src/components/portal/PortalSidebar.tsx` | Floating 240px gradient sidebar, v3 logo |
| Shell | `src/components/portal/PortalNavContent.tsx` | Org Switcher, overlines, v3 nav/group/sub items |
| Shell | `src/components/portal/PortalSidebarUser.tsx` | User Card |
| Shell | `src/components/portal/PortalHeader.tsx` | Transparent 56px topbar with breadcrumb |
| Shell | `src/components/portal/PortalBreadcrumb.tsx` | `variant` prop, v3 crumb styles |
| Shell | `src/components/portal/PortalMobileDrawer.tsx` | v3 panel styling |
| Shell | `src/components/portal/UserAvatarMenu.tsx` | Solid cyan avatar trigger, v3 dropdown |
| Shell | `src/components/portal/notificaciones/NotificacionesBell.tsx` | v3 bell |
| Shell | `src/components/portal/notificaciones/NotificacionesPanel.tsx` | v3 panel |
| Shell | `src/components/portal/notificaciones/NotificacionItem.tsx` | v3 item |
| Docs | `DESIGN.md` | Full v3 rewrite (§5 of Proposed Changes) |
| Docs | `projectspec/03-project-structure.md` | Point to v3, list new kit files |

---

## Acceptance Criteria

**Scope**
1. `git diff --name-only main...HEAD` lists only files from the "Files to Create or Modify" table (plus OpenSpec artifacts, if the change is run through OpenSpec). No file under `src/hooks`, `src/services`, `src/types`, `src/lib`, `supabase`, or a feature folder other than the three notificaciones chrome files is modified.
2. `npm run build` and `npm run lint` pass with zero new errors and zero edits to existing kit call sites. Every existing prop value (`variant`, `size`, `tone`, `padding`, `italic`, `colorClass`…) still type-checks.

**Tokens & fonts**
3. In the browser, `getComputedStyle(document.documentElement)` returns the v3 values for every variable in the §1 tables, and `.grit-shell` paints `#080C10` with the bottom-right cyan glow.
4. Any element with `font-grit-title` renders in Exo 2 (verified in DevTools → Computed → rendered font). `/auth/login` still renders Rajdhani/Lexend and is pixel-identical to `develop` (screenshot comparison). The public app home `/` takes the v3 look (Exo 2, v3 ink colours).
5. `rounded-grit-2xl` computes to 22px and `rounded-grit-3xl` to 28px. `rounded-grit-xs`…`xl` are unchanged.

**Kit**
6. `GritButton` renders as a pill at all sizes. `size="lg" variant="primary"` shows the cyan glow; `sm`, `md` and `lg` measure 31/37/42px high (±1px). Text on cyan is `#04121A`.
7. `GritPageHeader title="Indicadores" titleAccent="del club." italic` renders a single `h1` at 40px Exo 2 weight 300 at ≥640px, with only the accent italic and cyan.
8. `GritTag tone="warning" dot` renders the Status / Mora pill (11px/600, `#FFC46B` text, 6px dot, not uppercase). The `danger`, `violet`, `accent` and `neutral` tones match Suspendido, Pendiente, Activo and Role / Atleta respectively.
9. Each new primitive renders and matches its design node within ±2px at 1440px: `GritIconButton`, `GritSearchField`, `GritSegmented` (both variants, with and without `count`), `GritChip`, `GritKpiCard` (normal and `highlight`), `GritAvatar` (3 tones, with and without `src`), `GritProgress`, `GritPagination`. Verify by mounting them temporarily in a local, uncommitted scratch page.
10. `GritIconButton` without `label` is a TypeScript error. `GritSearchField`'s props type requires either `aria-label` or `aria-labelledby` (a discriminated union), so omitting both is also a TypeScript error.
11. `GritProgress value={140}` renders full and reports `aria-valuenow="100"`; `value={-5}` renders empty with `aria-valuenow="0"`.
12. `GritPagination` with `totalPages={1}` renders nothing; with `totalPages={15}, page={1}` it shows `1 2 3 … 15`, disables "previous", and marks page 1 with `aria-current="page"`.
13. `GritSegmented` exposes `role="group"` with the given `aria-label`, each option is a `<button aria-pressed>`, and at 375px a 6-option control scrolls horizontally instead of wrapping or overflowing the page.

**Shell**
14. At ≥1024px the sidebar is a 240px floating panel, 16px from the top, left and bottom of the viewport, 28px radius, gradient fill, no cyan border; the main column has no visible header border, and the breadcrumb sits in the 56px topbar on the left. Below 1024px the sidebar is hidden, the topbar shows logo + bell + avatar + menu button, and the breadcrumb renders as the first row of the content.
15. Inside a tenant, the Org Switcher shows the tenant's initial and name and links to `/portal/orgs`. Its accessible name includes the tenant name. While the name loads, the skeleton is shown. Outside a tenant there is no Org Switcher and no "ORGANIZACIÓN" section.
16. The active route renders the Nav Item / Activo treatment (gradient pill, 32px cyan icon chip, live dot) in exactly one place: top-level item, org leaf or sub item. A group that contains the active route shows a cyan icon and is expanded on load (US-0138 behavior preserved).
17. The "MI CUENTA" toggle still collapses/expands the personal list with correct `aria-expanded`. Every nav group toggle still works with keyboard (Enter/Space) and shows a visible focus ring.
18. The mobile drawer opens from the right with the v3 panel style; focus trap, Escape-to-close, click-outside, return-focus and body scroll lock behave exactly as on `main`, and every row is ≥40px tall.
19. The avatar trigger is a 38px solid-cyan circle with dark initials (or the photo). The dropdown opens, closes with Escape and returns focus as today. Logout from both the dropdown and the User Card works.
20. The notifications bell is a 38px circle with a `#1F2A31` border. The panel opens at 410px wide (never wider than the viewport minus 2rem), and loading, error-with-retry, empty and list states all still render and are distinguishable. Mark-as-read actions behave as on `main`.
21. No page renders two `h1` elements, and no page has horizontal scroll at 375, 768 or 1440px on these routes: `/portal/inicio`, `/portal/orgs`, `/portal/eventos`, `/portal/mis-reservas`, `/portal/notificaciones`, and inside a tenant `gestion-equipo`, `analitica`, `gestion-organizacion`, `gestion-eventos`, `control-ingreso`.

**Documentation**
22. `DESIGN.md` points to `grit-arena-v3.pen`, contains every section listed in §5 (including the frame→route table, the white-alpha ladder, the "Migrating a page to v3" checklist with the find→replace table, the feature patterns not yet in the kit, and the updated grep), and every component/prop it documents exists in the code with that exact name.
23. `projectspec/03-project-structure.md` lists the 8 new kit files and references v3.

---

## Implementation Steps

- [ ] Open `grit-arena-v3.pen` (pencil MCP) and keep frames `ljQp3`, `nIhrL`, `IZudm`, `aYwNn` side by side as reference
- [ ] Take "before" screenshots of the 11 routes in AC 21 at 375/768/1440, plus `/` and `/auth/login`
- [ ] Copy the dark logo to `public/`
- [ ] Tokens: update `globals.css`, `tailwind.config.ts`; load Exo 2 + JetBrains Mono in `src/app/layout.tsx`
- [ ] Restyle the existing kit components (§2), keeping every prop
- [ ] Add the new kit primitives (§3) and export them from `index.ts`
- [ ] Verify each new primitive in a local, uncommitted scratch page against its design node; delete the scratch page
- [ ] Restyle the shell: `PortalSidebar`, `PortalNavContent`, `PortalSidebarUser`, `PortalHeader`, `PortalBreadcrumb`, `PortalMobileDrawer`, `UserAvatarMenu`, notificaciones chrome; adjust `src/app/portal/layout.tsx`
- [ ] `npm run lint` + `npm run build`
- [ ] Take "after" screenshots of the same routes; check AC 14–21 (layout, keyboard, drawer, dropdowns, notifications states) as admin, entrenador and atleta
- [ ] Confirm `/auth/login` is unchanged and `/` renders the v3 look correctly
- [ ] Run `git diff --name-only` against the allowed file list (AC 1)
- [ ] Rewrite `DESIGN.md` (§5) and update `03-project-structure.md`
- [ ] Record any visual gaps found on pages (hand-rolled controls still in v2 geometry) as candidates for page-migration stories

---

## Non-Functional Requirements

- **Security**: No auth, role or data-access change. The Org Switcher only links to the existing `/portal/orgs` route, which applies its own access rules. Avatar images keep using `next/image` with the already-allowed remote patterns.
- **Performance**: Exactly two new font families via `next/font` (self-hosted, `display: swap`), limited to the listed weights. No new npm dependency (icons stay on Material Symbols). `backdrop-blur` is limited to overlays (`glass` cards, drawer, notification panel, dropdowns), never to cards inside scrolling lists. The sidebar menu still loads no images except the logo.
- **Accessibility**: Contrast on `#080C10`: `grit-text` ≈ 18:1, `grit-subtext` ≈ 10:1, `grit-muted` ≈ 6:1 (11px+ only), `#04121A` on `#14DBC4` ≈ 11:1. Every new interactive primitive has a visible `gritFocusRing`, a required or documented accessible name, and keyboard support (`GritSegmented`/`GritChip` use `aria-pressed`, `GritPagination` uses `nav` + `aria-current`, `GritProgress` uses `role="progressbar"`). Decorative dots and glows are `aria-hidden`. Only one breadcrumb is exposed at a time (the hidden variant uses `display: none`). Honour `prefers-reduced-motion` on the drawer slide and any new transitions.
- **Error handling**: No new error paths. Existing loading, empty and error states (notifications panel, tenant-name skeleton, `GritEmptyState` retry actions) must keep rendering and stay distinguishable in v3 styles.
- **Compatibility**: Every existing kit prop and default is preserved. Raw-token usages in features change appearance only through token values, by design. Any feature that becomes unreadable because of the token change (for example cyan-on-cyan after `grit-glass-border` turns neutral) is reported, not fixed here, unless the fix fits inside a kit component.

---

## Out of Scope (follow-up stories)

- Migrating individual pages to the new kit primitives (each page gets its own story, following `DESIGN.md` §10).
- Collapsed 80px sidebar with expand toggle (`J0Zbc`, screen `V2eGcp`), which needs persisted UI state.
- Event Card hero/compact/grid, Next Event Panel and Live Toast as kit components. Promote them when the first page that needs them is migrated.
- Notification grouping by day, panel tabs and the settings link drawn in `FidFw`.
- Sub-item icons in the tenant menu (requires changing `portal.types.ts`).
- Updating `src/components/portal/analitica/chart-theme.ts` hex values to v3 (analítica page story).
- Switching the icon set from Material Symbols to `lucide-react`.
- `/auth/*` and the `landing-*` tokens (the public app home `/` changes only through the shared tokens).
