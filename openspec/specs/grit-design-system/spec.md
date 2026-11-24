# Capability: grit-design-system

## Purpose
Defines the v2 design tokens (colours, fonts, radii, shell background) taken 1:1 from `projectspec/designs/pencil/grit-arena-v2.pen`, the shared `src/components/ui/grit` component kit built on them, and the discipline icon/colour helper. Every Portal surface styles itself from this system.

## Requirements

### Requirement: Design tokens mirror grit-arena-v3.pen
`src/app/globals.css` SHALL define a `--grit-*` CSS variable family whose values follow `projectspec/designs/pencil/grit-arena-v3.pen` (variables `$canvas`, `$ink`, `$ink-2`, `$ink-3`, `$line`, `$brand`, `$brand-deep`, `$on-brand` and the component board `ljQp3`). Existing variable names SHALL be kept so every consumer picks up the new values:
- `--grit-bg-navy #080C10`
- `--grit-accent-cyan #14DBC4`
- `--grit-accent-cyan-light #2BE3D0`
- `--grit-accent-teal #0FA3AB`
- `--grit-text-primary #F3F7F8`
- `--grit-text-subtext #B3BFC5`
- `--grit-text-muted #8593A0`
- `--grit-glass-fill rgba(17,26,33,.85)`
- `--grit-glass-border rgba(255,255,255,.12)`
- `--grit-card-fill rgba(17,26,33,.8)`
- `--grit-sidebar-fill #0B1116`
- `--grit-success #3DDC97`
- `--grit-danger #FF8A80`
- `--grit-discipline-{swim,cycle,run,strength,functional,mobility}` unchanged (`#14DBC4`, `#0FA3AB`, `#F2B84B`, `#B98AFF`, `#FF6B6B`, `#6BCB77`).

It SHALL add:
- `--grit-on-brand #04121A`
- `--grit-line #1F2A31`
- `--grit-surface #111A21`
- `--grit-surface-deep #0B1116`
- `--grit-surface-accent #14302D`
- `--grit-warning #FFC46B`
- `--grit-violet #B9A3FF`
- `--grit-avatar-fill #1E3A3F`

`tailwind.config.ts` SHALL expose all of them as `colors.grit.*` (solid colors as hex so opacity modifiers work). It SHALL also set `fontFamily['grit-title']` to Exo 2, `fontFamily['grit-body']` to Montserrat and `fontFamily['grit-mono']` to JetBrains Mono. Exo 2 (300–700, normal and italic) and JetBrains Mono (400, 500) SHALL be self-hosted through `next/font`. Rajdhani SHALL remain loaded for the landing and auth pages.

#### Scenario: Token values match the design file
- **WHEN** a developer compares `--grit-*` values with the v3 `.pen` variables and component board
- **THEN** every value SHALL be identical (hex or equivalent rgba)

#### Scenario: Opacity modifiers work on solid tokens
- **WHEN** a component uses `bg-grit-cyan/15`
- **THEN** the rendered background SHALL be `#14DBC4` at 15% opacity

#### Scenario: Titles render in Exo 2
- **WHEN** any element using `font-grit-title` is rendered in the Portal
- **THEN** its rendered font SHALL be Exo 2

#### Scenario: Landing keeps its fonts
- **WHEN** `/auth/login` is rendered (it styles itself with `landing-*` tokens)
- **THEN** it SHALL still render its Rajdhani/Lexend headings, unchanged; the public app home `/` and `/eventos/*` are built on `grit-*` tokens and SHALL take the v3 look

### Requirement: Named radius scale without overriding defaults
`tailwind.config.ts` SHALL add `borderRadius` entries `grit-xs 6px`, `grit-sm 8px`, `grit-md 10px`, `grit-lg 12px`, `grit-xl 14px`, `grit-2xl 22px` (the v3 card/panel radius) and `grit-3xl 28px` (shell and hero surfaces). The existing `borderRadius.lg = 2rem` and `borderRadius.xl = 3rem` overrides MUST remain unchanged.

#### Scenario: Landing and auth are unaffected
- **WHEN** `/auth/login` is rendered before and after the change
- **THEN** its screenshots SHALL be visually identical

#### Scenario: Named radii resolve to design values
- **WHEN** elements use `rounded-grit-2xl` and `rounded-grit-3xl`
- **THEN** their computed `border-radius` SHALL be `22px` and `28px` respectively

### Requirement: grit shell background
`globals.css` SHALL define `.grit-shell` with:
- the `--grit-bg-navy` (`#080C10`) canvas;
- a cyan radial glow anchored at the bottom-right (≈12% alpha);
- a faint white radial glow at the top (≈4% alpha), reproducing the fills of the v3 screen frames;
- `--grit-text-primary` color and the Montserrat font.

`.grit-scrollbar` SHALL use a neutral `rgba(255,255,255,.14)` thumb.

#### Scenario: Shell renders glows
- **WHEN** a page root uses `.grit-shell`
- **THEN** the background SHALL be `#080C10` with a visible cyan glow toward the bottom-right corner and the body font SHALL be Montserrat

#### Scenario: Neutral scrollbar
- **WHEN** the sidebar navigation overflows
- **THEN** its scrollbar thumb SHALL be neutral white at low opacity, not cyan

### Requirement: Deprecated legacy Portal tokens
`turquoise`, `accent-teal` (`#00e5c4`), `portal-*`, `navy-*`, `card-dark`, `.glass`, `.glass-card` and `.sidebar-item-active` SHALL carry a deprecation comment stating they MUST NOT be used in new Portal code. Their definitions SHALL remain while any non-Portal file references them.

#### Scenario: Deprecation is documented
- **WHEN** a developer opens `tailwind.config.ts` or `globals.css`
- **THEN** each legacy Portal token SHALL be preceded by a deprecation comment pointing to `grit-*`

### Requirement: Shared grit component kit
`src/components/ui/grit/` SHALL provide presentational components with no data fetching, exported from `src/components/ui/grit/index.ts` and re-exported from `src/components/ui/index.ts`. Existing props and defaults SHALL stay backward compatible. Each component SHALL follow v3:
- `GritCard` — `variant: 'glass' | 'card' | 'highlight' | 'inset'`, 22px radius:
  - `card` = `grit-surface`→`grit-surface-deep` vertical gradient, white 10% border, `0 20px 48px` black 50% shadow and a 1px inset top highlight;
  - `glass` = `grit-glass` fill with backdrop blur, white 10% border and the same shadow;
  - `highlight` = `grit-surface-accent`→`grit-surface-deep` gradient with a cyan 40% border;
  - `inset` = white 2.5% fill, white 6% border, no shadow, for surfaces nested inside a card.
  - `padding: 'none'|'sm'|'md'|'lg'|'xl'` = 0/16/20/24/28px; `as` override.
- `GritTag` — status/role pill: fully rounded, padding 4/10px, 11px Montserrat 600, not uppercase.
  - `tone: 'accent' | 'neutral' | 'warning' | 'danger' | 'violet'`; each tinted tone uses an 8–10% fill, a 25% border and full-colour text; `neutral` uses white 4% fill, white 10% border and subtext.
  - Optional `dot` (6px leading dot in the text colour), `icon` and `colorClass` override.
- `GritBadge` — fully rounded, white 3% fill, white 10% border, padding 7/12px, 12px 500 text, optional 13px cyan icon.
- `GritButton`:
  - `variant: 'primary'|'secondary'|'outline-accent'|'ghost'`; `size: 'sm'|'md'|'lg'` = 31/37/42px tall, 12/12/13px 600 text, 14/15/16px icon; fully rounded.
  - `primary`: cyan fill and `grit-on-brand` text, cyan-light hover; at `lg` it adds a cyan glow shadow.
  - `secondary`: white 4% fill and white 12% border.
  - `outline-accent`: cyan 8% fill and cyan 35% border with cyan text.
  - `ghost`: subtext, white 4% hover.
  - Renders `<a>` with `href` (and `target="_blank" rel="noopener noreferrer"` when `external`); has `loading` and `disabled` states and a visible `focus-visible` cyan ring.
- `GritIconTile` — `size: 34|40|48`; `shape: 'rounded'` (12px) or `'circle'`.
  - `tone: 'card'|'accent'|'warning'|'violet'|'danger'`: `card` = white 4% fill, white 8% border, cyan icon; tinted tones use a 10% fill and a 25% border.
- `GritInfoRow` — 34px icon tile + 11px/600 subtext label + 13px/700 value.
- `GritSectionHeading` — Exo 2 500 title (`size md` 17px / `lg` 19px), optional 12px muted subtitle, optional right `action` slot, `h2` by default.
- `GritPageHeader`:
  - optional 11px/600 uppercase cyan eyebrow;
  - Exo 2 300 `h1`, 30px on mobile and 40px from 640px, with an optional cyan `titleAccent`; `italic` italicizes only the accent;
  - optional 13px subtitle and an optional `actions` slot with a 10px gap.
- `GritPageContainer` — `max-w-[1440px]`, horizontal padding 16/24/32px by breakpoint, top 12px, bottom 32px, vertical gap 20px.
- `GritDivider` — 1px white 6% line.
- `GritIcon` — Material Symbols Outlined wrapper at weight 300 with `name`, `size`; `aria-hidden` unless `label` is set.
- `GritEmptyState` — `card` surface, 48px accent icon tile, Exo 2 500 title, description, optional action.
- `icon-map.ts` — mapping from the Lucide names used in v3 to Material Symbols, including every icon drawn on the v3 component board (e.g. `house→home`, `plus→add`, `search→search`, `ellipsis→more_horiz`, `chevrons-up-down→unfold_more`, `list-filter→filter_list`, `scan-line→qr_code_scanner`, `circle-x→cancel`).
- `styles.ts`:
  - `gritInputClass` / `gritSelectClass`: 12px radius, white 4% fill, white 12% border, padding 10/16px, 13px text, cyan focus border and a soft cyan ring.
  - `gritPillSelectClass`: fully rounded, 35px tall, 12px text.
  - `gritFocusRing`: cyan ring offset against `grit-bg`.

#### Scenario: Kit is importable from the UI barrel
- **WHEN** a component imports `{ GritCard, GritButton, GritSegmented } from '@/components/ui'`
- **THEN** the import SHALL resolve and type-check

#### Scenario: Primary button matches design
- **WHEN** `<GritButton variant="primary">` is rendered
- **THEN** it SHALL have a `#14DBC4` background, `#04121A` 600 text, a fully rounded shape, a height of 37px and a visible focus ring on keyboard focus

#### Scenario: Large primary button glows
- **WHEN** `<GritButton variant="primary" size="lg">` is rendered
- **THEN** it SHALL be 42px tall with a cyan glow shadow (design "Button / Primary Glow")

#### Scenario: Existing call sites keep compiling
- **WHEN** the project is type-checked after the restyle without editing any kit call site
- **THEN** type-check SHALL pass

#### Scenario: External link button is safe
- **WHEN** `<GritButton href="https://x" external>` is rendered
- **THEN** it SHALL render an `<a>` with `target="_blank"` and `rel="noopener noreferrer"`

#### Scenario: Status pill
- **WHEN** `<GritTag tone="warning" dot>Mora</GritTag>` is rendered
- **THEN** it SHALL render a fully rounded 11px/600 pill with `#FFC46B` text, a 6px `#FFC46B` dot and no uppercase transform

#### Scenario: Accent-only italic title
- **WHEN** `<GritPageHeader title="Indicadores" titleAccent="del club." italic />` is rendered at 1440px
- **THEN** it SHALL render one `h1` in Exo 2 weight 300 at 40px where only "del club." is italic and cyan

#### Scenario: Decorative icons are hidden from assistive tech
- **WHEN** `<GritIcon name="home" />` is rendered without `label`
- **THEN** it SHALL have `aria-hidden="true"`

### Requirement: Discipline visual helper
`src/lib/portal/disciplina-visual.ts` SHALL export a pure function `getDisciplinaVisual(nombre: string): { icon: string; colorClass: string }` that matches the name case- and accent-insensitively: natación/nado/swim → `pool` + swim; ciclismo/bici/cycle → `directions_bike` + cycle; running/carrera/trote → `directions_run` + run; fuerza/gym/strength → `fitness_center` + strength; funcional/crossfit → `sports_gymnastics` + functional; movilidad/yoga/stretch → `self_improvement` + mobility; otherwise `sports` + cyan.

#### Scenario: Accent- and case-insensitive match
- **WHEN** `getDisciplinaVisual('NATACIÓN')` and `getDisciplinaVisual('natacion')` are called
- **THEN** both SHALL return icon `pool` with the swim color

#### Scenario: Unknown discipline falls back
- **WHEN** `getDisciplinaVisual('Esgrima')` is called
- **THEN** it SHALL return icon `sports` with the cyan color

### Requirement: Icon button primitive
The kit SHALL provide `GritIconButton`: a round icon-only button (or link with `href`) in sizes 30/38/44px. The `default` variant uses a white 4% fill and white 12% border; the `ghost` variant (design "Row Action") uses a white 3% fill and no border. A `label` prop SHALL be required and SHALL become the accessible name. It SHALL show the kit focus ring.

#### Scenario: Accessible name is mandatory
- **WHEN** a developer renders `GritIconButton` without `label`
- **THEN** type-check SHALL fail

#### Scenario: Keyboard focus
- **WHEN** the button receives keyboard focus
- **THEN** a visible cyan focus ring SHALL be shown and its accessible name SHALL equal `label`

### Requirement: Search field primitive
The kit SHALL provide `GritSearchField`: a fully rounded `type="search"` input with a leading muted search icon, white 4% fill and white 12% border, 37px (`md`) or 44px (`lg`, with an inset shadow) tall. It SHALL forward native input attributes and SHALL require `aria-label` or `aria-labelledby` at the type level.

#### Scenario: Missing accessible name
- **WHEN** `GritSearchField` is rendered with neither `aria-label` nor `aria-labelledby`
- **THEN** type-check SHALL fail

#### Scenario: Native behavior preserved
- **WHEN** the user types in the field
- **THEN** the forwarded `onChange` and `value` SHALL behave as on a native input

### Requirement: Segmented control primitive
The kit SHALL provide `GritSegmented`: a fully rounded black 30% track holding option buttons with optional count and icon. The `soft` variant marks the active option with a cyan 12% fill and a cyan 35% border; `solid` uses a cyan fill with `grit-on-brand` text. It SHALL render `role="group"` with an accessible label, each option a button with `aria-pressed`.

#### Scenario: Selecting an option
- **WHEN** the user activates the "Mora" option
- **THEN** `onChange` SHALL be called with its value and, once selected, it SHALL have `aria-pressed="true"` while the others have `aria-pressed="false"`

#### Scenario: Narrow viewport
- **WHEN** a six-option control renders at 375px
- **THEN** it SHALL scroll horizontally inside its own track without wrapping and without causing page-level horizontal scroll

#### Scenario: Count badge
- **WHEN** an option has `count={8}`
- **THEN** a pill showing `8` SHALL be rendered next to its label

### Requirement: Filter chip primitive
The kit SHALL provide `GritChip`: a fully rounded toggle button with optional icon and `aria-pressed`. Active = cyan fill, `grit-on-brand` text and a cyan glow. Inactive = white 3% fill, white 10% border, `grit-text` 500 label and a cyan icon.

#### Scenario: Active chip
- **WHEN** `<GritChip active>Todos</GritChip>` is rendered
- **THEN** it SHALL have a cyan background, dark text and `aria-pressed="true"`

### Requirement: KPI card primitive
The kit SHALL provide `GritKpiCard` in two layouts. The default `inline` layout is a horizontal card with a 40px round icon chip, the value in Exo 2 weight 300 at 36px, a 12px subtext label and an optional detail. The `stacked` layout (frame `lhbhK`, 28px radius, 22px padding) has a top row with a 36px accent icon chip and an optional round shortcut link, then the value in Exo 2 weight 300 at 56px next to a 13px label and an optional 12px hint whose tone is `muted` (default), `accent` or `warning`. Both layouts use the `card` surface, or the `highlight` surface when `highlight` is set.

#### Scenario: Highlighted KPI
- **WHEN** `<GritKpiCard highlight icon="event_available" value="12" label="Próximos confirmados" />` is rendered
- **THEN** it SHALL use the highlight gradient and cyan border, and show "12" in Exo 2 light 36px

#### Scenario: Stacked KPI with shortcut
- **WHEN** `<GritKpiCard layout="stacked" icon="credit_card" value="0" label="Suscripciones activas" hint="Sin planes activos" href="/portal/mis-suscripciones" hrefLabel="Ver suscripciones activas" />` is rendered
- **THEN** it SHALL show the accent icon chip and a round arrow link named "Ver suscripciones activas" in the top row, "0" in Exo 2 light 56px, the label and the muted hint

#### Scenario: Stacked KPI without shortcut
- **WHEN** a stacked card is rendered without `href`
- **THEN** no shortcut link SHALL be rendered and the top row SHALL hold only the icon chip

#### Scenario: Accent hint
- **WHEN** a stacked card has `hint="Estás al día"` and `hintTone="accent"`
- **THEN** the hint SHALL be rendered in the cyan accent colour

### Requirement: Avatar primitive
The kit SHALL provide `GritAvatar`: a circle of 32, 34 or 38px that shows the image when `src` is set and otherwise up to two initials derived from `name`. Tones: `neutral` (`grit-avatar` fill, `grit-text` initials), `soft` (cyan 12% fill, cyan 35% border, cyan initials), `solid` (cyan fill, `grit-on-brand` initials). The image is decorative because the name is printed next to it.

#### Scenario: Initials fallback
- **WHEN** `<GritAvatar name="Laura Méndez" />` is rendered without `src`
- **THEN** it SHALL display "LM"

#### Scenario: Image avatar
- **WHEN** `src` is provided
- **THEN** the image SHALL fill the circle with an empty `alt`

### Requirement: Progress primitive
The kit SHALL provide `GritProgress`: a 6px rounded track (white 6%) with a fill in the tone colour and an optional value label in JetBrains Mono 11px. It SHALL expose `role="progressbar"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"` and an accessible label, clamping the value to 0–100.

#### Scenario: Clamped values
- **WHEN** `GritProgress` receives `value={140}` and then `value={-5}`
- **THEN** it SHALL render full with `aria-valuenow="100"` and then empty with `aria-valuenow="0"`

### Requirement: Pagination primitive
The kit SHALL provide `GritPagination`: an optional summary text plus 30px round page buttons inside `nav[aria-label="Paginación"]`. The current page uses a cyan fill and `aria-current="page"`. Ranges over 7 pages are collapsed with an ellipsis, and prev/next are disabled at the ends. It SHALL render nothing when there is at most one page.

#### Scenario: Long range
- **WHEN** `totalPages={15}` and `page={1}`
- **THEN** it SHALL show `1 2 3 … 15`, disable "previous" and mark page 1 with `aria-current="page"`

#### Scenario: Single page
- **WHEN** `totalPages={1}`
- **THEN** nothing SHALL be rendered

### Requirement: Table styling classes
`styles.ts` SHALL export `gritTableHeadClass`, `gritTableHeadCellClass`, `gritTableRowClass` and `gritTableCellClass`, reproducing v3 "Table / Head" and "Table / Row":
- head row: white 2% fill;
- head cells: 10px/600 uppercase muted text, 1.3px tracking, padding 13/22px;
- rows: white 6% top hairline and a faint hover;
- body cells: 13px `grit-text`, horizontal padding 22px.

#### Scenario: Header cell styling
- **WHEN** a `<th>` uses `gritTableHeadCellClass`
- **THEN** it SHALL render 10px uppercase `#8593A0` text with 1.3px letter-spacing

### Requirement: Design guide documents the v3 contract
The repo-root `DESIGN.md` SHALL describe the v3 system as implemented, naming `grit-arena-v3.pen` as its source. It SHALL include: a frame→route table, tokens with the white and cyan alpha ladders, typography and radius roles, surface recipes, the shell skeleton, every kit component and prop, patterns with design node ids, a "migrate a page to v3" checklist with a find→replace table, and the deprecated-class grep.

#### Scenario: Documented API exists
- **WHEN** a reviewer checks each component and prop named in `DESIGN.md`
- **THEN** each SHALL exist in `src/components/ui/grit/` with that exact name

#### Scenario: Page migration guidance
- **WHEN** a developer starts a page migration story
- **THEN** `DESIGN.md` SHALL tell them which v3 frame to open for the route and which kit components replace each hand-rolled v2 pattern
