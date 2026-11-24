# Spec Delta

## MODIFIED Requirements

### Requirement: Avatar primitive
The kit SHALL provide `GritAvatar`: a circle that shows the image when `src` is set and otherwise up to two initials derived from `name`. Sizes: 32, 34 and 38px for people, plus 20, 26, 36, 42 and 52px for organization marks. Tones:
- `neutral`: `grit-avatar` fill, `grit-text` initials;
- `soft`: cyan 12% fill, cyan 35% border, cyan initials;
- `solid`: cyan fill, `grit-on-brand` initials;
- `org`: dark fill at 80%, cyan 50% border, cyan Exo 2 700 italic initials, for club marks.

The image is decorative because the name is printed next to it. When the image fails to load, the initials SHALL be shown instead.

#### Scenario: Initials fallback
- **WHEN** `<GritAvatar name="Laura Méndez" />` is rendered without `src`
- **THEN** it SHALL display "LM"

#### Scenario: Image avatar
- **WHEN** `src` is provided
- **THEN** the image SHALL fill the circle with an empty `alt`

#### Scenario: Organization mark
- **WHEN** `<GritAvatar name="Pace Club" tone="org" size={36} />` is rendered without `src`
- **THEN** it SHALL show "PC" in cyan italic inside a 36px circle with the cyan 50% border

#### Scenario: Broken image falls back to initials
- **WHEN** the `src` image fails to load
- **THEN** the avatar SHALL show the initials

## ADDED Requirements

### Requirement: Media card primitive
The kit SHALL provide `GritMediaCard`: a clipped surface with a full-bleed photo under the v3 top and bottom shades, content in a top row and a bottom row, radius `lg` (24px) or `xl` (28px), and stroke `neutral` or `accent`. Without an image, or when it fails to load, it SHALL show a placeholder (dark gradient, optional icon). The photo SHALL be decorative unless `imageAlt` is given.

#### Scenario: Image fails
- **WHEN** the photo URL returns an error
- **THEN** the card SHALL show the placeholder and keep its content readable

#### Scenario: Accent stroke
- **WHEN** `stroke="accent"` is set
- **THEN** the card border SHALL use the cyan gradient

### Requirement: Overlay pill primitive
The kit SHALL provide `GritOverlayPill`: a pill for use over photos, with padding 7/12, 11px/600 text, an optional leading icon, and 999px radius. Tones:
- `glass`: `#080C10` 45% fill, white 20% stroke, 14px backdrop blur, ink text and cyan icon;
- `brand`: cyan fill, `grit-on-brand` text.

It SHALL render as a span by default, or as a link or button when `href` or `onClick` is given, with a visible focus ring.

#### Scenario: Status pill
- **WHEN** `<GritOverlayPill tone="brand" icon="verified">MIEMBRO</GritOverlayPill>` is rendered
- **THEN** it SHALL show a cyan pill with dark text "MIEMBRO" and a decorative icon

#### Scenario: Interactive pill
- **WHEN** an `onClick` is given
- **THEN** the pill SHALL be a `<button type="button">` reachable by keyboard

### Requirement: Date tile primitive
The kit SHALL provide `GritDateTile`: the day number over a 3-letter uppercase month, in sizes `sm` (list), `md` and `lg` (over photos), and tones `overlay`, `accent` and `muted`. It SHALL take an ISO instant and format it in `America/Bogota`, or show "Por definir" for null. It SHALL expose the full date to assistive technology.

#### Scenario: Bogotá day
- **WHEN** the instant is `2026-11-22T03:00:00Z`
- **THEN** the tile SHALL show "21" and "NOV"

#### Scenario: Accessible date
- **WHEN** the tile renders 21 nov 2026
- **THEN** assistive technology SHALL read "21 de noviembre de 2026"

### Requirement: Event card primitive
The kit SHALL provide `GritEventCard`, built on the media card, overlay pill and date tile, with variants `hero` (badges, large date tile, organizer, large italic title, meta pills, actions), `compact` (badge, date tile, title, round arrow link) and `grid` (date tile, price pill, title, meta row). It SHALL take generic content and hold no event domain logic. The title SHALL be a heading. With `href` and no actions, the whole card SHALL be one link.

#### Scenario: Grid card is one link
- **WHEN** a `grid` card is rendered with `href` and no actions
- **THEN** the card SHALL be a single focusable link whose accessible name includes the title

#### Scenario: Hero card actions
- **WHEN** a `hero` card is rendered with an "Obtener entrada" action
- **THEN** the action SHALL be a separate focusable control and SHALL NOT be nested inside another link
