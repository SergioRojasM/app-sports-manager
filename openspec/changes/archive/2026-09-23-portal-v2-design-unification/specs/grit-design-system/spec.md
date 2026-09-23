## ADDED Requirements

### Requirement: v2 design tokens mirror grit-arena-v2.pen
`src/app/globals.css` SHALL define a `--grit-*` CSS variable family whose values equal the variables of `projectspec/designs/pencil/grit-arena-v2.pen`: `--grit-bg-navy #07111F`, `--grit-accent-cyan #14DBC4`, `--grit-accent-cyan-light #49F5E2`, `--grit-accent-teal #0FA3AB`, `--grit-text-primary #E6EDF3`, `--grit-text-subtext #BAC7D5`, `--grit-text-muted #8A9AAB`, `--grit-glass-fill rgba(15,31,48,.69)`, `--grit-glass-border rgba(20,219,196,.25)`, `--grit-card-fill rgba(11,24,38,.8)`, `--grit-sidebar-fill rgba(6,14,26,.8)`, `--grit-success #3DDC97`, `--grit-danger #FF6B6B`, and `--grit-discipline-{swim,cycle,run,strength,functional,mobility}` (`#14DBC4`, `#0FA3AB`, `#F2B84B`, `#B98AFF`, `#FF6B6B`, `#6BCB77`). `tailwind.config.ts` SHALL expose them as `colors.grit.*` (solid colors as hex so opacity modifiers work), `fontFamily['grit-title']` (Rajdhani) and `fontFamily['grit-body']` (Montserrat).

#### Scenario: Token values match the design file
- **WHEN** a developer compares `--grit-*` values with the `.pen` variables
- **THEN** every value SHALL be identical (hex or equivalent rgba)

#### Scenario: Opacity modifiers work on solid tokens
- **WHEN** a component uses `bg-grit-cyan/15`
- **THEN** the rendered background SHALL be `#14DBC4` at 15% opacity

### Requirement: Named radius scale without overriding defaults
`tailwind.config.ts` SHALL add `borderRadius` entries `grit-xs 6px`, `grit-sm 8px`, `grit-md 10px`, `grit-lg 12px`, `grit-xl 14px`, `grit-2xl 16px`. The existing `borderRadius.lg = 2rem` and `borderRadius.xl = 3rem` overrides MUST remain unchanged.

#### Scenario: Landing and auth are unaffected
- **WHEN** `/` and `/auth/login` are rendered before and after the change
- **THEN** their screenshots SHALL be visually identical

#### Scenario: Named radii resolve to design values
- **WHEN** an element uses `rounded-grit-2xl`
- **THEN** its computed `border-radius` SHALL be `16px`

### Requirement: grit shell background
`globals.css` SHALL define `.grit-shell` with the `--grit-bg-navy` background, a cyan radial glow at the top-right and a teal radial glow at the mid-left (reproducing the `BG Glow` ellipses), `--grit-text-primary` color and Montserrat font.

#### Scenario: Shell renders glows
- **WHEN** a page root uses `.grit-shell`
- **THEN** the background SHALL be `#07111F` with visible cyan/teal radial glows and the body font SHALL be Montserrat

### Requirement: Deprecated legacy Portal tokens
`turquoise`, `accent-teal` (`#00e5c4`), `portal-*`, `navy-*`, `card-dark`, `.glass`, `.glass-card` and `.sidebar-item-active` SHALL carry a deprecation comment stating they MUST NOT be used in new Portal code. Their definitions SHALL remain while any non-Portal file references them.

#### Scenario: Deprecation is documented
- **WHEN** a developer opens `tailwind.config.ts` or `globals.css`
- **THEN** each legacy Portal token SHALL be preceded by a deprecation comment pointing to `grit-*`

### Requirement: Shared grit component kit
`src/components/ui/grit/` SHALL provide presentational components with no data fetching, exported from `src/components/ui/grit/index.ts` and re-exported from `src/components/ui/index.ts`:
- `GritCard` — `variant: 'glass' | 'card' | 'highlight'` (glass = `grit-glass` + blur; card = `grit-card`; highlight = `#14DBC414` + cyan border), all with `grit-glass-border` border (cyan for highlight) and 16px radius; `padding: 'sm'|'md'|'lg'|'xl'` = 16/20/24/28px; `as` override.
- `GritTag` — `tone: 'accent' | 'neutral'`, optional `icon` and `color`; padding 7/12px, radius 8px, 12px Montserrat 700 uppercase, letter-spacing .5px, `grit-glass-border` border.
- `GritBadge` — `grit-card` fill, `grit-glass-border` border, radius 8px, padding 7/12px, 12px 600, optional 13px cyan icon.
- `GritButton` — `variant: 'primary'|'secondary'|'outline-accent'|'ghost'`, `size: 'sm'|'md'`, radius 10px, optional `icon`/`iconPosition`, renders `<a>` with `href` (and `target="_blank" rel="noopener noreferrer"` when `external`), `loading` and `disabled` states, visible `focus-visible` cyan ring.
- `GritIconTile` — `size: 34|40|48`, `shape: 'rounded'|'circle'`, `tone: 'card'|'accent'`.
- `GritInfoRow` — 34px icon tile + 11px/600 subtext label + 13px/700 value.
- `GritSectionHeading` — Rajdhani 700 title (`size md` 20px / `lg` 22px), optional 12–13px subtitle, optional right `action` slot, `h2` by default.
- `GritPageHeader` — optional 12px/600 cyan eyebrow, Rajdhani 700 `h1` title with optional cyan `titleAccent` and `italic`, optional 14px subtitle, optional `actions` slot.
- `GritPageContainer` — `max-w-[1440px]`, horizontal padding 16/24/48px by breakpoint, top 24px, bottom 48px, vertical gap 32px.
- `GritDivider` — 1px `grit-glass-border` line.
- `GritIcon` — Material Symbols Outlined wrapper at weight 300 with `name`, `size`; `aria-hidden` unless `label` is set.
- `GritEmptyState` — icon tile, title, description, optional action.
- `icon-map.ts` — mapping from design Lucide names to Material Symbols (e.g. `house→home`, `clock-3→schedule`, `map-pin→location_on`, `circle-check→check_circle`, `arrow-up-right→arrow_outward`, `calendar-check→event_available`).
- `styles.ts` — `gritInputClass` / `gritSelectClass` (`grit-card` fill, `grit-glass-border` border, radius 10px, padding 10/14px, cyan focus border and ring).

#### Scenario: Kit is importable from the UI barrel
- **WHEN** a component imports `{ GritCard, GritButton } from '@/components/ui'`
- **THEN** the import SHALL resolve and type-check

#### Scenario: Primary button matches design
- **WHEN** `<GritButton variant="primary">` is rendered
- **THEN** it SHALL have a `#14DBC4` background, `#07111F` bold text, 10px radius and a visible focus ring on keyboard focus

#### Scenario: External link button is safe
- **WHEN** `<GritButton href="https://x" external>` is rendered
- **THEN** it SHALL render an `<a>` with `target="_blank"` and `rel="noopener noreferrer"`

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
