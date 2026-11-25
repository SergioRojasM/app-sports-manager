---
name: GRIT Arena — UI Design Guide
design_source: projectspec/designs/pencil/grit-arena-v3.pen
code_source: src/app/globals.css · tailwind.config.ts · src/components/ui/grit/
scope: Authenticated Portal (/portal/*) and the public event pages
updated: 2026-11-23 (US-0141 — grit-arena-v3)
---

# UI Design Guide

Read this **before building, restyling or migrating any page**. It describes the
v3 design system as it exists in the code, so a screen looks like it belongs to
the product without reinventing anything.

Three rules cover most of it:

1. **Use the tokens and the kit.** Colours, fonts, radii, surfaces and controls
   already exist. If a screen needs something the kit doesn't have, extend the
   kit — never write one-off classes in a feature folder.
2. **The design file wins.** `grit-arena-v3.pen` is the source of truth for
   measurements. Open it with the pencil MCP tools (`.pen` files are encrypted —
   never read them as text). Every v3 value has a token or a kit recipe here.
3. **Pages migrate one at a time.** US-0141 moved the tokens, the kit and the
   shell to v3. Pages still built with hand-rolled v2 markup follow
   §10 "Migrating a page to v3" in their own story.

---

## 1. Where everything lives

| What | Where |
| --- | --- |
| Design file (source of truth) | `projectspec/designs/pencil/grit-arena-v3.pen` |
| Component board (every reusable piece) | frame `ljQp3` "Componentes · GRIT Arena App" |
| CSS variables, `.grit-shell`, `.grit-scrollbar`, `.grit-scan-line` | `src/app/globals.css` |
| Tailwind tokens (colours, fonts, radii) | `tailwind.config.ts` (`theme.extend`) |
| Fonts (`next/font`) | `src/app/layout.tsx` |
| Component kit | `src/components/ui/grit/` — import from `@/components/ui` |
| Portal shell | `src/app/portal/layout.tsx`, `src/components/portal/Portal*.tsx` |
| Chart theme + palette | `src/components/portal/analitica/chart-theme.ts` (still v2 hex — update in the analítica page story) |
| Discipline icon/colour helper | `src/lib/portal/disciplina-visual.ts` |
| Design → Material Symbols icon map | `src/components/ui/grit/icon-map.ts` |

### Design file frames → routes

Open the frame for the route you are working on. All app screens share the same
shell (§7), so only the content area is page-specific.

| Frame | Screen | Route |
| --- | --- | --- |
| `lhbhK` | App · Inicio v9 | `/portal/inicio` — migrated (agenda row derived from `dBJ8K`) |
| `V2eGcp` | App · Inicio v10 (collapsed sidebar) | `/portal/inicio` — collapsed sidebar not built yet (§9) |
| `kMj4F` | App · Organizaciones (marketplace) | `/portal/orgs` — migrated (no discipline chips, distance, rating, favorites or DESTACADO: no data) |
| `zY4v8` | App · Eventos (marketplace) | `/portal/eventos` — migrated (header calendar button folded into "Ver calendario") |
| `LSqV5` | App · Mis suscripciones | `/portal/mis-suscripciones` — migrated ("Renovar" opens the plans catalog) |
| `x9xdbA` | App · Mis reservas | `/portal/mis-reservas` — migrated (no row ⋯ menu) |
| `v1lcBA` | App · Mis entradas | `/portal/mis-entradas` — migrated (no add-to-calendar button) |
| `SSjFs` | App · Notificaciones (tiempo real) | header bell panel · `/portal/notificaciones` |
| `aYwNn` | Admin · Configuración | `orgs/[tenant_id]/gestion-organizacion` — migrated (no "Ver perfil público": no public org page; no sede / category; visibility tag instead of the category pill; channels In-app + Email, no WhatsApp) |
| `qG0T5` | Admin · Escenarios | `orgs/[tenant_id]/gestion-escenarios` — migrated (type tabs built from the free-text `tipo`; no "Mantenimiento" status: Activo / Inactivo) |
| `fXuVP` | Admin · Disciplinas | `orgs/[tenant_id]/gestion-disciplinas` — migrated (stats: "Atletas con nivel" + "Niveles activos" only; no level descriptions, "Ascenso automático", sessions or attendance; levels reordered with buttons, the drag handle is decorative) |
| `v8mqZG` | Admin · Servicios | `orgs/[tenant_id]/gestion-servicios` — migrated (status tabs instead of type tabs; no TIPO / DISCIPLINA / CUPO / PRECIO columns; delete is a direct row action; no "Más usados este mes" / "Tiqueteras por agotarse" panels) |
| `J7Lw7d` | Admin · Planes | `orgs/[tenant_id]/gestion-planes` — migrated, admin and read-only (usuario / entrenador) views (no KPI row, "Ingreso / mes" + sparkline or subscriber avatars: analytics deferred; status Activo / Inactivo instead of Borrador; the toast is a dismissible `GritAlert` without "Deshacer") |
| `nIhrL` | Admin · Equipo · Miembros | `orgs/[tenant_id]/gestion-equipo` |
| `PKOv8` | Admin · Equipo · Suscripciones | `orgs/[tenant_id]/gestion-suscripciones` |
| `p5Ms22` | Admin · Entrenamientos (calendario) | `orgs/[tenant_id]/gestion-entrenamientos` |
| `kPW3x` | Admin · Entrenamientos · Reservas | `orgs/[tenant_id]/gestion-reservas` |
| `nnCrm` | Admin · Entrenamientos · Formularios | `orgs/[tenant_id]/gestion-formularios` |
| `ZYxt2` · `g9lnB` | Admin · Eventos (calendario · semana) | `orgs/[tenant_id]/gestion-eventos` — `ZYxt2` migrated (Tarjetas / Lista composed from the kit); week view `g9lnB` not built yet |
| `LV7I0` · `xjlmU` | Admin · Check-in (eventos · lista grande) | `orgs/[tenant_id]/control-ingreso` · `control-ingreso/[evento_id]` — `LV7I0` and `xjlmU` migrated (result card and latest check-ins composed from the kit) |
| `IZudm` | Admin · Analítica | `orgs/[tenant_id]/analitica` |

Routes without a v3 frame (`perfil`, `invitaciones`, `activar-cuenta`,
`completar-perfil`, `atletas`, `entrenamientos-disponibles`, `landing-org`,
`mis-suscripciones-y-pagos`, `eventos/[event_id]`, the event wizard) are composed
from the kit and the patterns in §9 — don't invent a new look for them.

---

## 2. Tokens

Use the Tailwind names. Never write a raw hex in a component.

### Colour

The token **names** are the v2 ones (so existing code picked up v3 without
edits); the **values** are v3. `$name` is the v3 file variable.

| Token | Value | v3 source | Use for |
| --- | --- | --- | --- |
| `grit-bg` | `#080C10` | `$canvas` | Page background (via `.grit-shell`), dark tiles |
| `grit-cyan` | `#14DBC4` | `$brand` | The single brand accent: primary actions, active states, key icons, links |
| `grit-cyan-light` | `#2BE3D0` | `$brand-deep` | Hover of a cyan fill only |
| `grit-on-brand` | `#04121A` | `$on-brand` | Text and icons **on** a cyan fill |
| `grit-teal` | `#0FA3AB` | — | Rare secondary accent (charts, discipline "cycle") |
| `grit-text` | `#F3F7F8` | `$ink` | Titles, values, primary copy |
| `grit-subtext` | `#B3BFC5` | `$ink-2` | Labels, secondary copy, inactive nav labels |
| `grit-muted` | `#8593A0` | `$ink-3` | Captions, placeholders, inactive icons, overlines (≥10px uppercase or ≥11px) |
| `grit-line` | `#1F2A31` | `$line` | Opaque hairline (topbar bell, rules drawn on the canvas) |
| `grit-surface` | `#111A21` | board | Card gradient start |
| `grit-surface-deep` | `#0B1116` | board | Card gradient end |
| `grit-surface-accent` | `#14302D` | board | Highlighted card gradient start |
| `grit-sidebar` | `#0B1116` | board | Sidebar / drawer gradient end |
| `grit-glass` | `rgba(17,26,33,.85)` | board | Overlay fill (dropdowns, modals, notification panel) — always with blur |
| `grit-card` | `rgba(17,26,33,.8)` | board | Legacy flat card fill; prefer `GritCard` |
| `grit-glass-border` | `rgba(255,255,255,.12)` | board | **Neutral hairline** (it was cyan in v2 — the name is historical) |
| `grit-avatar` | `#1E3A3F` | board | Initials avatar fill |
| `grit-success` | `#3DDC97` | — | Positive values, upward deltas |
| `grit-warning` | `#FFC46B` | Status / Mora | Warnings, "en mora", admin role |
| `grit-danger` | `#FF8A80` | Status / Suspendido | Errors, destructive actions, suspended |
| `grit-violet` | `#B9A3FF` | Status / Pendiente | Pending states, trainer role |

Category colours (unchanged from v2 — charts and `getDisciplinaVisual` depend on
them): `grit-discipline-swim #14DBC4` · `cycle #0FA3AB` · `run #F2B84B` ·
`strength #B98AFF` · `functional #FF6B6B` · `mobility #6BCB77`. Don't pick a
discipline colour by hand: `getDisciplinaVisual(nombre)` returns
`{ icon, colorClass }`.

**Opacity modifiers**: solid tokens are hex, so `bg-grit-cyan/15` works.
Translucent tokens (`grit-glass`, `grit-card`, `grit-glass-border`) are CSS
variables and **must be used without a modifier** — `bg-grit-card/60` silently
produces nothing.

### The two alpha ladders

v3 builds almost every neutral surface and stroke from **white at low alpha**,
and every accent tint from **cyan at fixed steps**. Use these steps only:

| White alpha | Used for |
| --- | --- |
| `white/[0.02]` | Table head row, row hover |
| `white/[0.025]`–`[0.03]` | `inset` surfaces, chips, user card, row actions |
| `white/[0.04]` | Controls: secondary buttons, icon buttons, search, inputs, hover of nav rows |
| `white/[0.06]` | Dividers, table row hairlines, progress track |
| `white/[0.08]` | Segmented track border, icon-chip border |
| `white/[0.10]` | Card and panel borders, chip border |
| `white/[0.12]` | Control strokes (= `grit-glass-border`) |

| Cyan alpha | Used for |
| --- | --- |
| `grit-cyan/[0.06]`–`/10` | Tinted fill (accent pill, accent icon tile, unread notification) |
| `grit-cyan/25` | Tinted stroke (accent pill, accent tile) |
| `grit-cyan/30`–`/35` | Active stroke (active nav pill, active segment, outline-accent button) |
| `grit-cyan/40`–`/50` | Strong stroke (highlight card, org tile) |

Status tones use the same formula with their own colour: ~8% fill, 25% stroke,
full-colour text (see `GritTag`).

### Typography

| Token | Family | Use for |
| --- | --- | --- |
| `font-grit-title` | Exo 2 | Headings, KPI values, prices, big numerals |
| `font-grit-body` | Montserrat | Everything else; set once by `.grit-shell` |
| `font-grit-mono` | JetBrains Mono | Percentages and tabular numbers in tables/progress |

Weights carry the v3 look — **titles are light**, not bold:

| Role | Spec |
| --- | --- |
| Page `h1` | Exo 2 **300**, 40px (30px < 640px), accent part cyan |
| KPI value | Exo 2 300, 36px in `GritKpiCard` (56px with `layout="stacked"`), 30px inline |
| Entity title (org name, detail header) | Exo 2 500, 24px |
| Section / panel title | Exo 2 500, 19px (`lg`) / 17px (`md`) |
| Card name | Montserrat 600, 15px (Exo 2 500 20px on photo cards) |
| Nav label | Montserrat 14px (600 when active) |
| Body, large buttons | 13px |
| Buttons, controls, meta | 12px, 600 for actions |
| Pills, captions | 11px, 600 for pills |
| Overlines, table headers | 10px 600 uppercase, `tracking-[1.3px]`, `grit-muted` |

Exo 2 bold italic is reserved for the org mark (written `font-[700] italic` so the §11 grep stays strict everywhere else). Secondary text uses
`text-grit-subtext` — never a dimmed `text-grit-text`.

### Shape

`rounded-lg` and `rounded-xl` are **32px and 48px** in this project (a legacy
override the landing/auth pages depend on), so they must never appear in Portal
code.

| Radius | Class | v3 role |
| --- | --- | --- |
| pill | `rounded-full` | **Every control**: buttons, icon buttons, search fields, chips, segmented controls, nav items, status pills, avatars, pagination |
| 6 / 8 | `rounded-grit-xs` / `-sm` | Tiny chips inside dense rows (legacy) |
| 10 | `rounded-grit-md` | Legacy v2 control radius — don't use for new controls |
| 11–12 | `rounded-grit-lg` | Icon tiles (34–48px), form inputs |
| 14 | `rounded-grit-xl` | Rarely; legacy panels |
| 16 | `rounded-[16px]` | Date tiles, `inset` surfaces inside a card |
| 18 | `rounded-[18px]` | Org switcher, dropdown menus, toasts |
| 20 | `rounded-[20px]` | User card |
| 22 | `rounded-grit-2xl` | **Cards, panels, KPI cards, modals** (`GritCard`) |
| 24 | `rounded-[24px]` | Notification panel, event cards |
| 28 | `rounded-grit-3xl` | Sidebar, mobile drawer, hero cards |

---

## 3. Elevation & surfaces

v3 is built from four surfaces. All of them come from `GritCard` — don't
recreate them with raw classes.

| Surface | `GritCard variant` | Recipe | Use for |
| --- | --- | --- | --- |
| Card | `card` | `grit-surface → grit-surface-deep` vertical gradient · `white/[0.10]` border · 22px | Data panels, tables, KPI cards, settings sections — the default for page content |
| Glass | `glass` (component default) | `grit-glass` + `backdrop-blur-xl` · `white/[0.10]` border · 22px | Things that float **over** content: modals, dropdowns, filter drawers, the notification panel |
| Highlight | `highlight` | `grit-surface-accent → grit-surface-deep` · `grit-cyan/40` border · 22px | The one featured item of a view (KPI Card / Destacada, the next event) |
| Inset | `inset` | `white/[0.025]` · `white/[0.06]` border · 16px · no shadow | A surface nested inside a card (meters, sub-panels) |

- **Shadow**: `card`, `glass` and `highlight` share `0 20px 48px rgba(0,0,0,.5)`
  plus a 1px `inset` top highlight (`rgba(255,255,255,.06)`). The design draws
  gradient strokes; CSS approximates them with that hairline + highlight — never
  use `border-image` (it breaks the radius).
- **Glow** (`0 8px 24px rgba(20,219,196,.35)`-like cyan shadows) is reserved for:
  the page CTA (`GritButton size="lg"`), the active nav icon chip, the active
  chip / solid segmented option, and the unread dot. One glow per view region.
- **Blur** only on overlays (`glass`, drawer, dropdowns). Never on cards inside
  scrolling lists — it is expensive.
- `.grit-shell` paints the canvas and its two glows (cyan bottom-right, faint
  white top). Don't add page-level gradients on top of it.

---

## 4. The component kit

Everything imports from `@/components/ui`. Kit components are presentational
only: no data fetching, no business logic. Each one names the v3 design node it
reproduces in its doc comment.

### Surfaces, layout and type

| Component | Key props (defaults) | v3 node · notes |
| --- | --- | --- |
| `GritCard` | `variant` card·glass·highlight·inset (`glass`), `padding` none·sm·md·lg·xl = 0/16/20/24/28 (`lg`), `as` (`div`), HTML attributes (`aria-label`…) | See §3. Pass `variant="card"` for page content — the `glass` default is meant for overlays |
| `GritPageHeader` | `title`, `titleAccent`, `italic`, `titleVariant` light·display (`light`), `titleAdornment`, `eyebrow`, `subtitle`, `actions` | `lnMVj` / `jHJwK`. The page's only `h1`: Exo 2 300, 40px (30px mobile). `titleAccent` is cyan; `italic` slants the accent only. `titleVariant="display"` = Exo 2 600 italic for a record name (`xjlmU` "GRIT 10K"); `titleAdornment` (a status pill) sits beside the `h1`, outside it. `actions` holds the page tools and at most one `GritButton size="lg"` |
| `GritSectionHeading` | `title`, `subtitle`, `action`, `size` md·lg = 17/19px (`lg`), `as` h2·h3 (`h2`), `id`, `icon` | Panel title, Exo 2 500; subtitle 12px muted; `action` right-aligned. `icon` = 36px round chip with a 16px cyan icon before the title (settings sections of `aYwNn`) |
| `GritPageContainer` | — | Applied once by the Portal layout (padding 12/32/32/32, gap 20, max 1440). Use directly only outside `/portal` |
| `GritDivider` | — | 1px `white/[0.06]` rule |
| `GritEmptyState` | `icon`, `title`, `description`, `action`, `titleAs`, `descriptionClassName` | Loading / error / empty / not-found, on a `card` surface |
| `GritAlert` | `tone` success·warning·danger·info (`info`), `icon`, `action`, `onDismiss` | Derived (no v3 frame): inline banner, token at 10% fill / 35% stroke, 16px radius. success/info → `role="status"`, warning/danger → `role="alert"`. Use for page feedback (saved, toggled, failed refresh) above existing content |

### Actions

| Component | Key props (defaults) | v3 node · notes |
| --- | --- | --- |
| `GritButton` | `variant` primary·secondary·outline-accent·ghost·danger (`primary`), `size` sm·md·lg = 31/37/42px (`md`), `icon`, `iconPosition`, `fullWidth`, `loading`, `loadingLabel`, `href`, `external` | `a8wf1a` / `zG7Qt` / `DdNsJ` / `yC90U`. Always a pill, 600 weight. `primary` = cyan fill + `grit-on-brand` text; at `lg` it glows (page CTA). `secondary` = `white/[0.04]` + `white/[0.12]` stroke. `outline-accent` = cyan-tinted. `ghost` = text only. `danger` = danger-tinted pill for destructive confirms. Renders `<button>`, `<Link>`, or `<a target="_blank" rel="noopener noreferrer">` when `external` |

Button rules:

- One filled `primary` per view region, and at most one `size="lg"` per page.
- Text on a cyan fill is `text-grit-on-brand`, never white.
- A destructive action is `variant="danger"` (danger-tinted pill), never a red fill.

### Labels and indicators

| Component | Key props (defaults) | v3 node · notes |
| --- | --- | --- |
| `GritTag` | `tone` accent·neutral·warning·danger·violet (`accent`), `dot`, `icon`, `colorClass` | Status / Role pills (`Y8D4zJ`, `DOceZ`, `ximbE`, `tQv6H`, `yNrdr`, `DVkIi`, `PBVdH`). 11px/600, **not uppercase**. Record status → `tone` + `dot`; role → `tone` without dot (`neutral` atleta, `violet` entrenador, `warning` admin) |
| `GritBadge` | `icon` | Neutral info chip (Chip / Default look), 12px/500, cyan icon |
| `GritIconTile` | `size` 34·38·40·48 (`34`), `shape` rounded·circle (`rounded`), `tone` card·accent·warning·violet·danger (`card`) | 12px-radius tile or round chip; `card` = neutral tile with a cyan icon, the others tinted |
| `GritInfoRow` | `icon`, `label`, `value`, `as` | Icon tile + label/value pair |
| `GritIcon` | `name`, `size` (16), `label` | Material Symbols at weight 300; decorative (`aria-hidden`) unless `label` is set |

### Form and table classes (`styles.ts`)

| Export | Use |
| --- | --- |
| `gritInputClass`, `gritSelectClass` | Form fields: 12px radius, `white/[0.04]` fill, `white/[0.12]` stroke, 13px, cyan focus. **Derived** — v3 has no form frame yet; revisit when one is designed |
| `gritPillSelectClass` | Toolbar `<select>` (Dropdown Filter `XSFT7`): pill, 35px. For a leading icon or the 29px compact size use the `GritPillSelect` component |
| `gritFocusRing`, `cx` | Shared focus ring; class joiner |
| `gritTableHeadClass`, `gritTableHeadCellClass`, `gritTableRowClass`, `gritTableCellClass` (+ `gritTableHeadCellCompactClass` / `gritTableCellCompactClass`, 14px side padding for 8+ columns) | Table / Head + Row (`v3ijUr`, `jpBWr`): head row `white/[0.02]`, 10px uppercase muted headers with 1.3px tracking, `white/[0.06]` row hairlines, 13px cells. Put the `<table>` in `GritCard variant="card" padding="none" className="overflow-hidden"` |

### Controls and data (added in v3)

| Component | Key props (defaults) | v3 node · notes |
| --- | --- | --- |
| `GritIconButton` | `icon`, **`label`** (required → `aria-label`), `size` sm·md·lg = 30/38/44 (`md`), `variant` default·ghost (`default`), `href` | `cA3ke` / `fBFBp` / `J4S1Zw`. `ghost` = the table Row Action. Omitting `label` is a type error |
| `GritSearchField` | `size` md·lg = 37/44 (`md`), all `<input>` props, **`aria-label` or `aria-labelledby`** (required by type), `className` on the wrapper | `l3ixX` / `N4tyD`. Pill `type="search"` with leading icon. A placeholder is not a label |
| `GritSegmented` | `options` `{value,label,count?,icon?}[]`, `value`, `onChange`, `variant` soft·solid (`soft`), **`ariaLabel`** | `LW0MQ` / `rhTJ3` (soft) · `g2bgr` View Switch (solid). Buttons with `aria-pressed` in a labelled `role="group"`; scrolls horizontally inside its track on narrow screens |
| `GritChip` | `active`, `icon`, button props | `xKTkP` / `bHakw`. Toggle chip (`aria-pressed`); active = cyan fill + glow |
| `GritKpiCard` | `icon`, `iconTone` accent·danger·muted (`accent`, inline only), `value`, `label`, `detail`, `highlight`, `valueClassName`, `layout`, `hint`, `hintTone`, `href` + `hrefLabel` | `GO5Yf` / `pbTiS`. Default `layout="inline"`: round icon chip, Exo 2 300 36px value, 12px label. `layout="stacked"` (Inicio `lhbhK`): 28px radius, 36px accent icon chip + optional round shortcut (`href` requires `hrefLabel`), Exo 2 300 56px value, 13/500 label, 12px `hint` toned `muted` / `accent` / `warning`. `highlight` for the one featured KPI; tone the value with `text-grit-success` / `text-grit-warning` |
| `GritAvatar` | `name`, `src`, `size` 32·34·38 people / 20·26·36·42·52·56 club marks (`34`), `tone` neutral·soft·solid·org (`neutral`), `shape` circle·rounded (`circle`) | `sFaSi` / `gNnuk` / club mark `orsH4`. Initials from `name` (person icon if empty, shield for `org`); image is decorative (`alt=""`) because the name is always shown beside it, and falls back to the initials when it fails to load. `org` = dark 80% fill, cyan 50% stroke, cyan Exo 2 700 italic initials scaled with the circle. `shape="rounded"` = 18px-radius square (organization logo, `aYwNn` `YfbBZ`) |
| `GritProgress` | `value` 0–100 (clamped), **`label`**, `showValue` (`true`), `tone` accent·warning·danger | `fU6ex`. 6px track, JetBrains Mono %, `role="progressbar"` |
| `GritProgressRing` | `value` (null → "—"), `max`, `caption`, **`label`**, `size` (`96`) | `LV7I0` `G1a17B`. SVG ring (white 8% track, cyan arc with glow), "value/max" Exo 2 24 + 10px caption, `role="progressbar"` |
| `GritPillSelect` | **`label`** (sr-only), `icon`, `size` sm·md = 29/35px (`md`), `onChange(value)`, `<option>` children | `XSFT7` / `ZYxt2` `gQPV3` / `LV7I0` `UjgJj`. Pill `<select>` with a leading cyan icon; options carry the visible text ("Estado: Todos") |
| `GritSwitch` | `checked`, `onChange(next)`, **`label`**, `showLabel` (`false`), `disabled` | Toggle `sM1rG` (`aYwNn`) / `HY4nd` (`v8mqZG`): 36×20 pill, padding 2, 16px knob; off = white 8% track, on = cyan track + on-brand knob. `<button role="switch" aria-checked>`; `label` is `aria-label` unless `showLabel` renders it beside the track |
| `GritAddTile` | `title`, `subtitle`, `icon` (`add`), `size` md·sm (`md`), button props | `qG0T5` `SmgQv` / `fXuVP` `siF01`. Dashed slot closing a grid or row: 56px (md) / 40px (sm) cyan ring, Exo 2 19 title (md) or 12/600 label (sm). One `<button>`, `h-full` |
| `GritDrawer` | `open`, `onClose`, `title`, `subtitle`, `busy`, `footer`, `size` md·lg = 576/768px (`md`) | Derived (§9 "Modals and drawers"): right-docked `glass` panel, full width below `sm`; `role="dialog"` + `aria-labelledby` on the `GritSectionHeading` title; scrollable body, sticky footer; focus moved in, Tab trapped, returned to the opener; `busy` ignores Escape / backdrop / close. Every create / edit form opens in one |
| `GritConfirmDialog` | `open`, `title`, `message`, `confirmLabel` (`Eliminar`), `pendingLabel`, `cancelLabel`, `tone` danger·primary (`danger`), `pending`, `error`, `onConfirm`, `onCancel` | Derived: centered `glass` panel 420 wide, `role="alertdialog"`; initial focus on Cancel, Escape cancels, `pending` disables both actions. Replaces `window.confirm` |
| `GritField` + `gritDescribedBy` | **`htmlFor`**, **`label`**, `hint`, `error`, `optional` | Derived (§9 "Forms"): label 12/600 `grit-subtext`, hint 11px `grit-muted` (`{id}-hint`), error 12px `grit-danger` with `role="alert"` (`{id}-error`). The control sets `aria-describedby={gritDescribedBy(id, hint, error)}` and uses `gritInputInvalidClass` / `gritSelectInvalidClass` when invalid |
| `GritPagination` | `page` (1-based), `totalPages`, `onPageChange`, `summary` | `Alk2W`. Renders nothing for ≤1 page; ellipsis above 7 pages; `nav[aria-label="Paginación"]` + `aria-current` |
| `GritMediaCard` | `image`, `imageAlt`, `placeholderIcon`, `radius` lg·xl·none = 24/28/0 (`lg`), `stroke` neutral·accent·none (`neutral`; `none` + `radius="none"` = a photo zone inside a larger card), `top`, `bottom`, `padding` 14·16·20·22·24 (`14`), `as` | Photo surface of the event / club cards. Full-bleed photo under the v3 top (55% → 0 at 30%) and bottom (0 at 35% → 95%) shades; placeholder (dark gradient + icon) when the image is missing or fails. Decorative photo unless `imageAlt` |
| `GritOverlayPill` | `tone` glass·brand·danger (`glass`), `icon`, `iconTone` accent·ink, `size` md·lg (`md`), `href` / `onClick`, `ariaLabel` | Over-photo pill (`YxmsK`, `hShSC`, `L3ojFF`): glass = `grit-bg/45` + white 20% stroke + 14px blur; brand = cyan fill. Span, `Link` or `button`. `gritOverlayPillClass` styles external triggers the same way |
| `GritDateTile` | `dateIso`, `size` sm·md·lg = 56×46 / 48×52 / 64×59 (`md`), `tone` overlay·accent·muted (`overlay`) | `jLgGe` / `r9UZz` / `tsbPt`. Day (Exo 2) over 3-letter month (700, tracked), Bogotá; "Por definir" for `null`; `role="img"` with the long date |
| `GritEventCard` | `variant` hero·compact·grid, `title`, `href`, `image`, `dateIso`, `badges`, `organizer`, `meta`, `price`, `actions`, `headingLevel` (`3`) | `zRDg2` / `R1QegD` / `uCKmV`. Generic content only (map domain → props in feature code). grid = the whole card is one link; compact = round arrow link stretched over the card; hero = title link + separate `actions` (never nested in a link) |
| `GritNextEventPanel` | `label`, `image`, `coverAction` {icon,label,href\|onClick}, `title`, `subtitle`, `tags`, `meters` {icon,label,value,total?,caption?}[], `actions`, `headingLevel` (`2`) | `s2Gt8L` (frame `ZYxt2`). 320 wide, radius 26; 200px photo cover fading into the surface with a glass label pill + 32px round action; inset meters (value + "/ total", 5px glowing track with `role="progressbar"`, or a caption when there is no total); actions stacked at the bottom |

### Which component for which job

| Need | Use |
| --- | --- |
| Status of a record (activo, mora, suspendido, pendiente) | `GritTag tone=… dot` |
| A role (atleta, entrenador, admin) | `GritTag` without `dot` (`neutral` / `violet` / `warning`) |
| Up to ~6 mutually exclusive filters or tabs | `GritSegmented` (`soft`; with `count` for tabs) |
| A view switch (tarjetas / lista / calendario) | `GritSegmented variant="solid"` |
| Open-ended categories (disciplines, tags) | A row of `GritChip` |
| Search in a toolbar or header | `GritSearchField` (`lg` in a page header, `md` in a toolbar) |
| A filter dropdown in a toolbar | `<select className={gritPillSelectClass}>`, or `GritPillSelect` with an icon |
| An icon-only action (row menu, close, search toggle) | `GritIconButton` |
| The page's main action | `GritButton size="lg"` in `GritPageHeader actions` — once per page |
| A headline number | `GritKpiCard` (a row of 3–4, at most one `highlight`) |
| A ratio in a table cell | `GritProgress` |
| A ratio as the focal number of a card (check-in) | `GritProgressRing` |
| Page feedback (saved, toggled, failed) | `GritAlert` |
| An on/off setting saved immediately (activo, canal) | `GritSwitch` |
| A create / edit form | `GritDrawer` (form fields inside, Cancel + Save in `footer`) |
| A destructive confirmation | `GritConfirmDialog` — never `window.confirm` |
| An add-to-grid slot ("Agregar escenario", "Nivel 04") | `GritAddTile` |

---

## 5. Component rules of thumb

- Kit components own their geometry. Pass `className` for **layout** (width,
  margin, flex, grid placement), not to restyle colours, radii or padding — if a
  variant is missing, add it to the kit.
- New kit props are additive and default to the existing look, so existing call
  sites never need edits.
- A kit component names its v3 node in its doc comment; keep that up to date
  when you change it.

---

## 6. Icons

The design draws **Lucide** icons; the app renders **Material Symbols
Outlined** at weight 300 through `GritIcon`. `icon-map.ts` (`GRIT_ICON_MAP`)
holds the translation, including every icon on the v3 board — for example
`house → home`, `plus → add`, `ellipsis → more_horiz`,
`chevrons-up-down → unfold_more`, `list-filter → filter_list`,
`scan-line → qr_code_scanner`, `circle-x → cancel`. When you take an icon from
the design, look it up there; if it is missing, add the mapping rather than
guessing in a component.

Sizes: 13–14px (inside pills and small buttons) · 15–16px (buttons, list rows,
sub-nav) · 17–18px (nav items, KPI chips) · 22px (48px tiles) · 30px+
(decorative). Colour: `grit-muted` when inactive, `grit-subtext` on secondary
controls, `grit-cyan` or a status colour when meaningful, `grit-on-brand` on
cyan fills.

---

## 7. Page skeleton (the shell)

### Portal pages

`src/app/portal/layout.tsx` provides the shell (v3 frames: every App/Admin
screen shares it). A page renders **only its content**:

```
.grit-shell (h-screen, flex, font-grit-body, lg:p-4 lg:pr-0)       ← 16px inset ≥1024px
├─ PortalSidebar  (≥1024px)   240px floating panel, rounded-grit-3xl, gradient surface
│  ├─ logo (logo-grit-arena-dark.png)
│  ├─ PortalNavContent        Org Switcher · MI CUENTA · ORGANIZACIÓN tree (scrolls)
│  └─ PortalSidebarUser       User Card
└─ column (flex-1)
   ├─ PortalHeader            56px transparent topbar: breadcrumb (≥1024px) or logo,
   │                          bell, avatar, hamburger (<1024px)
   └─ <main id="portal-main"> (scrolls)
      ├─ PortalBreadcrumb     inline row, <1024px only
      └─ GritPageContainer    padding 12/32/32/32, gap 20, max 1440 ← your page renders here
         ├─ GritPageHeader    the page's single <h1> (+ tools and the page CTA)
         └─ your content      GritCard panels, tables, KPI rows…
```

Consequences for a page:

- **Do not** add outer page padding, a max width, or a background — the layout
  owns them. A page component starts at `<section className="flex flex-col gap-5">`.
- **Exactly one `h1` per page**, and it comes from `GritPageHeader`.
- Don't render a navbar, sidebar or breadcrumb. Add a label for a new route
  segment in `SLUG_LABELS` inside `PortalBreadcrumb.tsx`.
- Below 1024px the sidebar becomes `PortalMobileDrawer` (right side, same
  surface); its rows are ≥40px tall.

Navigation styling (owned by the shell — reuse it, don't copy it into pages):

| Element | v3 node | Look |
| --- | --- | --- |
| Org Switcher | `weLbQ` | 18px-radius card, tenant initial in a cyan-stroked tile, name + "Organización", links to `/portal/orgs` |
| Section label | — | 10px/600 uppercase, 1.3px tracking, `grit-muted` |
| Nav item | `h135V` | Pill, 18px muted icon, 14px subtext label |
| Active nav item | `cUHCL` | Cyan gradient pill + `grit-cyan/30` stroke + glow, 32px cyan icon chip, 600 label, trailing cyan dot |
| Group | `OYzP7` | Pill, 17px icon (cyan when it holds the active route), chevron |
| Sub item | `oZ0P6` / `LTtTI` | Indented pill, 12px; active = same gradient + dot |
| User Card | `XLHCz` | 20px radius, soft avatar, name + role (cyan) or email |
| Topbar | `vwVLa` | 56px, transparent, no border; 38px bell (`grit-line` stroke) and solid-cyan avatar |

```tsx
export function MiModuloPage() {
  return (
    <section className="flex flex-col gap-5">
      <GritPageHeader
        title="Gestiona tus"
        titleAccent="eventos."
        actions={<GritButton size="lg" icon="add">Nuevo evento</GritButton>}
      />
      {/* content */}
    </section>
  );
}
```

### Public pages

`/eventos/*` keeps the marketing `Header` and `Footer` and the `landing-shell`
wrapper. Inside that chrome, the content uses the same tokens and kit as the
Portal (so it is v3 too). The public app home (`/`, `src/components/home/`)
is also built on `grit-*` tokens and follows this guide. Only `/auth/*` keeps
its own `landing-*` tokens and is out of scope.

---

## 8. Accessibility

- One `h1` per page; sections use `h2`/`h3` via `GritSectionHeading`.
- Every interactive element keeps a visible focus ring (`gritFocusRing`; every
  kit control includes it).
- Icon-only controls always have a name: `GritIconButton` requires `label`,
  `GritSearchField` requires `aria-label`/`aria-labelledby` — both enforced by
  the types.
- Toggles expose state: `GritChip` and `GritSegmented` use `aria-pressed`;
  disclosure buttons use `aria-expanded` + `aria-controls`.
- Icons are `aria-hidden` unless they carry meaning — then pass `label`.
  Decorative dots and glows are `aria-hidden`.
- Breadcrumbs: `nav[aria-label="Ruta de navegación"] > ol`, last crumb
  `aria-current="page"`; only one breadcrumb is visible per breakpoint.
- Dropdowns and dialogs: `aria-expanded` / `aria-haspopup` / `aria-modal`,
  Escape closes, focus returns to the trigger.
- Status is never colour alone: status pills carry a text label (and a dot),
  unread notifications carry a non-colour marker.
- Contrast on `#080C10`: `grit-text` ≈ 18:1, `grit-subtext` ≈ 11:1,
  `grit-muted` ≈ 6:1 (so `grit-muted` only for ≥10px uppercase labels or ≥11px
  text), `grit-on-brand` on cyan ≈ 11:1, `grit-danger` ≈ 8:1.
- Respect `prefers-reduced-motion` for slides and transitions.

---

## 9. Patterns

Each pattern names the v3 frame or node to open. Build them from the kit; if a
pattern needs something the kit lacks, extend the kit (§5) — never fork a kit
component in a feature folder.

### Page header with tools (`lnMVj`)

`GritPageHeader` with `actions` holding, left to right: a view switch
(`GritSegmented variant="solid"`), a search (`GritSearchField size="lg"` or a
`GritIconButton icon="search" size="lg"` that expands), and the page CTA
(`GritButton size="lg"`).

### Summary + filters + toolbar + table (`nIhrL` Equipo · Miembros)

```
GritPageHeader (title + CTA)
GritSegmented (tabs with count)                       ← soft
GritCard card, padding 20/24, gap 32                  ← summary strip: big number + stacked bar + mini stats
toolbar: GritSearchField · GritSegmented (status) · gritPillSelectClass filters · GritButton sm secondary "Exportar"
GritCard card padding="none" overflow-hidden
  <table>  gritTableHeadClass / gritTableHeadCellClass / gritTableRowClass / gritTableCellClass
           member cell = GritAvatar + name (13/600) + email (11px muted)
           role = GritTag (no dot) · status = GritTag tone+dot · ratio = GritProgress
           row actions = GritIconButton size="sm" variant="ghost" icon="more_horiz"
  GritPagination summary="Mostrando 1–7 de 102 miembros"
```

### KPI row + workspace (`IZudm` Analítica)

A row of 3–4 `GritKpiCard` (one `highlight` at most), then a two-column
workspace: a large chart panel (`GritCard card` + `GritSectionHeading size="lg"`)
and a narrow column of smaller panels (`size="md"`). Chart colours come from
`chart-theme.ts` only.

### Settings sections (`aYwNn` Configuración)

Rows of `GritCard card` sections (padding 22, gap 18), each with
`GritSectionHeading icon` (36px chip, title, subtitle, `action` =
`GritButton size="sm" variant="outline-accent" icon="add"` or a secondary
"Editar") — `TenantSettingsSection` composes this for the organization page. A
setting saved immediately (a rule's activo) is a `GritSwitch` on the row. Read-only key/values inside use `GritInfoRow` or an
`inset` card; lists of items inside use list rows (below). Big numbers inside a
section use Exo 2 300 in cyan (`3 días`).

### List rows

`GritIconTile` (tone by category or status) → text block (title 13–14px/600 +
one or two 11–12px `grit-muted` meta lines) → right-aligned value, `GritTag`
or `GritIconButton`. Separate rows with `divide-y divide-white/[0.06]`. Reuse
this shape for any list of records.

### Modals and drawers

Backdrop: `fixed inset-0 z-50 bg-grit-bg/70 backdrop-blur-sm`. Panel:
`GritCard variant="glass"` (22px radius), title as `GritSectionHeading`,
actions as `GritButton` (one `primary`). Close with `GritIconButton
icon="close" label="Cerrar"`. Keep Escape-to-close, click-outside-to-close and
focus return.

Don't hand-roll this: forms open in `GritDrawer` and destructive confirmations
in `GritConfirmDialog`. Both share the kit's focus management (focus in, Tab
trapped, Escape, focus back to the opener) and a `busy` / `pending` state that
blocks closing while a request runs.

### Forms — derived

v3 has **no form frame yet**. Use `gritInputClass` / `gritSelectClass`
(12px radius, `white/[0.04]` fill, `white/[0.12]` stroke, 13px, cyan focus),
labels 12px/600 `grit-subtext`, helper text 11px `grit-muted`, inline errors
12px `grit-danger`. Frame every field with `GritField`; a field in error swaps to
`gritInputInvalidClass` / `gritSelectInvalidClass` (full class strings — never
stack a danger border on top of `gritInputClass`). Booleans are a labelled
`GritSwitch showLabel`. When a form frame is designed, update `styles.ts` and this
section — never restyle a field ad hoc.

### Empty, loading and error states

All three go through `GritEmptyState`. Keep them distinct: a fetch error is
retryable (`action` = `GritButton variant="secondary"` "Reintentar") and must
never read as "no data". When data is already on screen and a refresh fails,
show a compact banner above it instead of replacing the page.

### Charts (`@nivo`)

Import `analiticaChartTheme` and `ANALITICA_CHART_COLORS` from
`src/components/portal/analitica/chart-theme.ts`. Never pass an inline palette
or theme. Charts are the one place hex literals are allowed (nivo cannot read
Tailwind classes) and they live only in that file. **Its values are still v2**:
the analítica page story must update axis/grid/tooltip colours to the v3 ink
scale (`#F3F7F8` / `#B3BFC5` / `#8593A0`, grid `rgba(255,255,255,.06)`,
tooltip on `grit-glass`).

### Feature patterns drawn in v3 but not yet in the kit

Promote each one into the kit in the first page story that needs it (with the
same prop style), then move its row to §4.

| Pattern | Node | Measurements |
| --- | --- | --- |
| Live Toast | `PzYwn` | 370 wide, radius 18, padding 14/16, gap 12; `grit-surface-deep` at 95% + blur 20, cyan 40% stroke, `0 20px 50px` shadow; 34px solid-cyan round icon, title 13/600, body 11px muted, 14px close icon |
| Collapsed sidebar | `J0Zbc` (screen `V2eGcp`) | 80 wide, radius 28, padding 22/0/14, gap 24; 48px round nav buttons; active = radial cyan 20%→3% fill + cyan 35% stroke + glow; 40px user avatar; 28px round expand toggle (`grit-surface`, white 18% stroke) on the edge. Needs persisted UI state |
| Notifications: day groups + tabs + footer | `FidFw` | Group labels "AHORA" / "AYER" as overlines (padding 12/20/6); segmented tabs under the header; footer with settings link and "Ver todas". Needs data shaping — a notifications story |

---

## 10. Migrating a page to v3

US-0141 already gave every page the v3 tokens, kit and shell. A page story
finishes the job for its route:

1. Open the route's frame (§1 table) in `grit-arena-v3.pen` next to the running
   page at 1440px and 375px.
2. List the kit components the frame uses (§4 "Which component for which job").
3. Replace hand-rolled markup with kit components:
   - `<button className="rounded-grit-md …">` / `<Link className="… rounded-grit-md …">` → `GritButton` (or `GritIconButton` when icon-only)
   - hand-built search inputs → `GritSearchField`
   - rows of filter/tab buttons → `GritSegmented` / `GritChip`
   - status/role spans → `GritTag tone dot`
   - hand-built KPI tiles → `GritKpiCard`
   - initials circles / profile images → `GritAvatar`
   - hand-built bars → `GritProgress`
   - table markup → `gritTable*` classes + `GritPagination`
   - top-level `bg-grit-card`/`bg-grit-glass` boxes → `GritCard variant="card"` (or `glass` for overlays)
4. Fix leftover raw classes with this table:

| v2 leftover | v3 replacement |
| --- | --- |
| `font-grit-title font-bold` on an h1 or KPI value | `font-light` (Exo 2 300) |
| `font-grit-title font-bold` on a section/card title | `font-medium` (Exo 2 500) |
| `border-grit-cyan` / `border-grit-glass-border` used as **accent or selected** state | `border-grit-cyan/35` (+ `bg-grit-cyan/[0.12]`) |
| `text-grit-bg` on a cyan fill | `text-grit-on-brand` |
| `uppercase tracking-[0.5px]` tag spans | `GritTag` |
| `divide-grit-glass-border`, `border-white/[.07]` row separators | `divide-white/[0.06]` / `border-white/[0.06]` |
| `rounded-grit-md` on a control | `rounded-full` via the kit component |
| `rounded-grit-md` on an icon tile | `GritIconTile` (12px) |
| `bg-grit-cyan/10` hover on neutral rows | `hover:bg-white/[0.04]` |
| `text-grit-discipline-run` used as a warning | `text-grit-warning` |
| `text-grit-subtext` captions under 12px | `text-grit-muted` |

5. Verify against the frame at 375 / 768 / 1440 (no horizontal scroll, one `h1`),
   do a keyboard pass, and run the §11 greps on the page's folders.

---

## 11. Deprecated — never in Portal code

These exist only for `/auth/*` and legacy code:

`turquoise` · `accent-teal` (`#00e5c4`) · `navy-deep` / `navy-medium` /
`navy-soft` · `card-dark` · `.glass` / `.glass-card` · `font-display` (Lexend) ·
`landing-*` tokens · `slate-*` text and surfaces · `rounded-lg` / `rounded-xl`.

**Global check** — must return nothing across the Portal:

```bash
grep -rnE "turquoise|portal-primary|portal-card|portal-border|glass-card|navy-deep|navy-medium|navy-soft|card-dark|font-display|landing-(primary|text|bg|border|surface)|rounded-(lg|xl)\b" \
  src/components/portal src/app/portal
```

**v3 check** — run on the folders a page story migrated (and on the kit and
shell, where it already returns nothing). It must return nothing there; it is
not run Portal-wide until every page is migrated:

```bash
grep -rnE "text-grit-bg|tracking-\[0\.5px\]|font-grit-title[^\"'\`]*font-bold|font-bold[^\"'\`]*font-grit-title|divide-grit-glass-border|border-white/\[\.07\]|rounded-grit-md" \
  src/components/ui/grit src/components/portal/Portal{Sidebar,SidebarUser,NavContent,Header,Breadcrumb,MobileDrawer}.tsx \
  src/components/portal/UserAvatarMenu.tsx <migrated-folder>
```

---

## 12. Checklist for a new or migrated page

- [ ] The route's v3 frame was opened; the page matches it at 1440 and 375px.
- [ ] The page renders only its content: no outer padding, max width or background.
- [ ] Exactly one `h1`, from `GritPageHeader` (Exo 2 300); at most one `GritButton size="lg"`.
- [ ] Every surface is a `GritCard` (`card` for content, `glass` for overlays, `inset` when nested).
- [ ] Every control is a kit component (`GritButton`, `GritIconButton`, `GritSearchField`, `GritSegmented`, `GritChip`, `gritPillSelectClass`) — pills, no `rounded-grit-md` buttons.
- [ ] Status → `GritTag` with `dot`; roles → `GritTag` without; numbers → `GritKpiCard`; ratios → `GritProgress`; tables → `gritTable*` + `GritPagination`.
- [ ] Only `grit-*` tokens and the two alpha ladders (§2); no raw hex, no `slate-*`, no deprecated tokens.
- [ ] Text on cyan is `text-grit-on-brand`; secondary text `grit-subtext`; captions `grit-muted`.
- [ ] Icons go through `GritIcon`; new design icons are added to `icon-map.ts`.
- [ ] Loading, empty and error states exist and are distinguishable; errors retry.
- [ ] No horizontal scroll at 375 / 768 / 1440px; columns stack; segmented controls scroll inside their track.
- [ ] Keyboard pass: focus rings visible, Escape closes overlays, toggles expose `aria-pressed`/`aria-expanded`.
- [ ] Both greps in §11 return nothing for the page's folders.

