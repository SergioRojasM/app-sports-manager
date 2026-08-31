---
name: GRIT Arena — Portal UI Design Guide
derived_from: projectspec/designs/pencil/grit-arena.pen (node d41rX5, "Entrenamientos")
scope: Authenticated portal/app pages (dashboard, entrenamientos, perfil, organización, etc.)
related: ../landing_new_dessign/DESIGN.md (marketing/landing brand guide — public-facing pages only)
---

# Portal UI Design Guide

Reference to follow **every time a new portal page is designed or built**.
It captures the recurring visual patterns already established across the
existing screens (`04_dashboard`, `10_entrenamientos`, `11_Perfil`,
`12_user_home`, etc.) so new pages look like they belong to the same product
instead of reinventing layout each time.

This is the **app/portal** guide — dark, data-dense, glass panels. The
[landing guide](../landing_new_dessign/DESIGN.md) is a separate, more
editorial style for public marketing pages; don't mix the two.

## Design tokens

| Token | Value | Usage |
| --- | --- | --- |
| `bg-navy` | `#07111F` | Page background — always this near-black navy, never pure black |
| `accent-cyan` | `#14DBC4` | Primary accent: CTAs, active/selected states, links, key icons |
| `accent-teal` | `#0FA3AB` | Secondary accent (also `discipline-cycle`) |
| `text-primary` | `#E6EDF3` | Titles, primary content, values |
| `text-subtext` | `#BAC7D5` | Secondary text, meta info, labels |
| `glass-fill` | `#0F1F30B0` | Translucent panel/card/pill background |
| `glass-border` | `#14DBC440` | 1px hairline border on nearly every panel, pill, and button |
| `card-fill` | `#0B1826CC` | Slightly denser fill for nested cards inside a panel |
| `font-title` | Rajdhani, 700 | Page titles, big numbers, day/date numerals |
| `font-body` | Montserrat | Everything else — body text, labels, buttons, nav |

Category/status colors (for tags, icons, badges — pick a consistent palette
per domain, don't invent new hues per page):

| Token | Value |
| --- | --- |
| `discipline-swim` | `#14DBC4` |
| `discipline-cycle` | `#0FA3AB` |
| `discipline-run` | `#F2B84B` |
| `discipline-strength` | `#B98AFF` |
| `discipline-functional` | `#FF6B6B` |
| `discipline-mobility` | `#6BCB77` |

Background treatment: one or two large, very soft radial-gradient ellipses
(accent color fading to transparent, ~20% peak opacity) placed behind the
content for ambient glow. Always non-interactive, always clipped to the page
frame, never competing with foreground content.

## Typography rules

- **Rajdhani (bold)** — reserved for page titles (e.g. `38px/700`) and large
  numerals (day numbers, stats). Never for body copy.
- **Montserrat** — everything interactive or paragraph-length: nav items,
  buttons, form labels, card copy, table cells.
- Standard sizes seen across the portal: `38px` page title, `15px` subtitle/
  section labels, `13–14px` primary UI text, `10–12px` meta/secondary text.
  Stay within this scale rather than introducing new sizes per page.
- Secondary/meta text is always `text-subtext`, never a dimmed opacity of
  `text-primary` — use the dedicated token so contrast stays consistent.

## Page skeleton

Every portal page follows the same top-level shape:

```
Page (bg-navy, clip)
├─ ambient background glow (1-2 radial ellipses)
└─ Content (vertical)
   ├─ Navbar (see below) — identical across all portal pages
   └─ Body (vertical, gap ~28, padding ~32/48/36/48)
      ├─ Header Row (space-between)
      │  ├─ Left: page Title (Rajdhani, 38px/700) + one-line subtitle
      │  └─ Right (optional): a summary/stat widget relevant to the page
      └─ page-specific content below
```

### Navbar (shared, don't redesign per page)

Row, `space-between`, 1px bottom border (`glass-border`), padding `18/48`.

- **Left**: logo (cyan rounded-square icon badge + "GRIT" / "ARENA"
  two-line wordmark) → menu dropdown ("Menú" + grid icon + chevron) →
  breadcrumb trail (`Inicio › Org › Team › Current Page`, all `text-subtext`
  except the current page, which is bold `text-primary`).
- **Right**: notification bell (36x36 glass pill) → user avatar (36x36 cyan
  circle with initial, or photo).

### Header Row

- Title uses the page name in Spanish, sentence case (`Entrenamientos`,
  `Perfil`, not `ENTRENAMIENTOS`).
- Subtitle is one short sentence describing the page's purpose, `text-subtext`.
- An optional widget on the right surfaces one key number relevant to the
  page (e.g. "24 entrenamientos disponibles esta semana") — a glass pill with
  an icon badge, a bold value line, and a subtext caption line. Use this
  pattern instead of a plain stat number floating in the header.

## Reusable component patterns

### Glass panel (the base container)

The default wrapper for any grouped content block (calendar, sidebar, form
section, table container): `glass-fill` background, `glass-border` 1px
stroke, `cornerRadius: 16`, internal `padding: 24`, vertical layout with
`gap: 20`. Nested cards inside a panel step down to `card-fill` +
`cornerRadius: 10` so there's a visible depth hierarchy without shadows.

### Buttons

- **Primary**: `accent-cyan` fill, dark text (`#07111F` — never white on
  cyan, contrast is the point), `cornerRadius: 8`, no heavy shadow.
- **Secondary / icon button**: transparent fill, `glass-border` 1px stroke,
  `text-subtext` or `text-primary` content. Circular (`cornerRadius: 18` on a
  36x36 box) for icon-only nav buttons (prev/next arrows, bell); rounded
  rectangle (`cornerRadius: 10`, padding `9/16`) for text buttons (`Hoy`,
  `Mañana`, `Limpiar`).
- Never stack more than one filled primary button in the same row — the
  cyan fill must stay a rare, deliberate accent.

### Pills / dropdowns

A horizontal pill (`cornerRadius: 10`, `glass-border` stroke, padding
`~9-10/12-16`) is the standard control for: date ranges, "today/tomorrow"
quick filters, category dropdowns. Structure: optional leading icon (13-16px,
`text-subtext` unless it's the active state) → label (`13px/600`,
`text-primary`) → optional trailing chevron (`text-subtext`). Don't invent a
different shape (e.g. underlined select, plain text link) for the same kind
of control on another page.

### Grid/column layouts (calendar, schedules, kanban-like data)

When a page needs repeated day/category columns (as in the weekly training
schedule): equal-width `fill_container` columns, `gap: 12`, each column
`padding: 8`, contents centered. A column can be marked **selected/active**
by giving it its own subtle tinted fill (`accent-cyan` at ~8% opacity),
a `1.5px` `accent-cyan` stroke, and `cornerRadius: 12` — this is distinct
from **"today"/"current"**, which instead gets a small cyan dot marker under
its header label. Never conflate the two states into one visual treatment;
a user must be able to view a day other than today without losing the sense
of "where today is."

### List items (rows of records)

Row layout, `gap: 12`, vertically centered: icon badge (36x36, tinted
category-color background at ~13% opacity, full-color icon) → text block
(title `14px/700` + one or two meta lines `11px/500` `text-subtext`,
`fixed-width` + `fill_container` so text wraps instead of overflowing) →
right-aligned trailing block (a key value/stat stacked over its label, plus
an optional primary action button). This is the default shape for any
"list of bookable/actionable records" pattern — reuse it rather than
building a bespoke row per page.

### Small cards (compact record summary)

Vertical, `card-fill` background, `glass-border` stroke, `cornerRadius: 10`,
padding `10`, `gap: 6`: a small category row (icon + colored label) → a bold
title (wraps, `lineHeight: 1.25`) → one or two `text-subtext` meta lines → a
bottom pill showing a count/ratio (`booked/capacity` style, `accent-cyan`
stroke and text). Used wherever a compact, stackable unit of information is
needed (e.g. inside a grid column).

## Spacing & radius scale

Stick to the values already in use — don't introduce arbitrary new numbers:

- **Radius**: `6` (tiny pills) · `8` (buttons, icon wraps) · `10` (cards,
  pills, dropdowns) · `12` (selected states) · `14–16` (panels) · `18`
  (circular 36px buttons/avatars).
- **Gaps**: `4–6` (tight label pairs) · `8–12` (related controls, list rows)
  · `16` (list items) · `20–32` (sections within/between panels).
- **Padding**: `8` (grid column cells) · `10` (compact cards) · `24`
  (panels) · body page padding `32 / 48 / 36 / 48` (top/sides/bottom).

## Icons

Lucide icons only, used at small sizes (12–18px), always tinted
(`text-subtext` for neutral/inactive, `accent-cyan` or a category color for
active/emphasized). Never a filled/duotone icon style — keep them line icons
consistent with the rest of the set already used (`zap`, `bell`, `calendar`,
`arrow-left`/`arrow-right`, `chevron-down`/`chevron-right`, `users`,
`list-filter`, `layout-grid`, plus category icons like `waves`, `bike`,
`activity`, `dumbbell`, `flame`, `wind`).

## Checklist before shipping a new portal page

- [ ] Background is `bg-navy` with clipping, not pure black.
- [ ] Navbar matches the shared pattern exactly (no per-page redesign).
- [ ] Page title is Rajdhani bold; everything else is Montserrat.
- [ ] Any grouped content sits inside a `glass-fill` panel with
      `glass-border`, not a bare/borderless block.
- [ ] Only one filled cyan primary action is emphasized per view.
- [ ] Selected vs. "current/today" states use two visually distinct
      treatments if both concepts exist on the page.
- [ ] Category/status colors reuse the existing discipline/status token set
      instead of introducing new colors.
- [ ] Spacing values (gap/padding/radius) come from the scale above.
