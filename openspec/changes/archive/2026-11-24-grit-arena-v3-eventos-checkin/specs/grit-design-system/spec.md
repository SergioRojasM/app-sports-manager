# Spec Delta

## ADDED Requirements

### Requirement: Next event panel primitive
The kit SHALL provide `GritNextEventPanel` (`s2Gt8L`): a 320px-wide panel, radius 26, with the card gradient and shadow. It SHALL contain:
- a 200px photo cover that fades to the surface, with a label pill (dot + text), an optional round action and the title area;
- a body (padding 16/18/18, gap 14) with tags, inset meters, and actions stacked at the bottom.

It SHALL take generic content only.

#### Scenario: Cover placeholder
- **WHEN** the panel has no cover image
- **THEN** it SHALL show the dark placeholder, and the title SHALL stay readable

#### Scenario: Round action is labelled
- **WHEN** a cover action with label "Editar evento" is given
- **THEN** it SHALL render as an icon button with `aria-label="Editar evento"`

### Requirement: Next event panel meters
Each meter of `GritNextEventPanel` SHALL show an icon and a label, a value (Exo 2 22) with "/ total" in muted text, and a 5px track with a cyan glowing fill. The track SHALL expose `role="progressbar"` with min, max and value. When the total is absent, the meter SHALL show a caption instead of the track. A null value SHALL render "—".

#### Scenario: Meter with total
- **WHEN** a meter has value 1 and total 100
- **THEN** it SHALL show "1 / 100" and a progressbar with `aria-valuenow="1"` and `aria-valuemax="100"`

#### Scenario: Meter without total
- **WHEN** a meter has value 12, no total, and the caption "Sin límite"
- **THEN** it SHALL show "12" and "Sin límite" and no progressbar

### Requirement: Alert primitive
The kit SHALL provide `GritAlert`: an inline banner with tones `success`, `warning`, `danger` and `info`, a leading icon, a message, an optional action and an optional close button labelled "Cerrar mensaje". It SHALL use the tone token at 10% fill and 35% stroke, and a 16px radius. `success` and `info` SHALL use `role="status"`; `warning` and `danger` SHALL use `role="alert"`.

#### Scenario: Danger alert
- **WHEN** `<GritAlert tone="danger">No se pudo completar la operación.</GritAlert>` is rendered
- **THEN** it SHALL have `role="alert"` and a decorative error icon

#### Scenario: Dismiss
- **WHEN** `onDismiss` is given and the user activates the close button
- **THEN** `onDismiss` SHALL be called

### Requirement: Progress ring primitive
The kit SHALL provide `GritProgressRing`: a circular track (white 8%) with a cyan arc proportional to `value / max`, the text "value/max" (Exo 2 24) and a caption (10px muted) in the centre. It SHALL expose `role="progressbar"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow` and an accessible label. A null value SHALL render "—" with an empty arc. A zero `max` SHALL render an empty arc.

#### Scenario: Partial progress
- **WHEN** `value=1`, `max=4`, caption "ingresaron"
- **THEN** the ring SHALL show a quarter arc and "1/4" over "ingresaron"

#### Scenario: Unknown value
- **WHEN** `value` is null
- **THEN** the ring SHALL show "—" and no arc

### Requirement: Page header display title
`GritPageHeader` SHALL accept `titleVariant`: `light` (default; Exo 2 300) or `display` (Exo 2 600 italic, the record-name style of `xjlmU`). Both variants SHALL keep the 40px desktop / 30px mobile size, the single `h1`, and the optional accent and actions. With `display`, an inline `titleAdornment` (for example a status pill) SHALL be rendered beside the title, outside the `h1`.

#### Scenario: Display title with adornment
- **WHEN** `<GritPageHeader title="GRIT 10K" titleVariant="display" titleAdornment={<pill/>} />` is rendered
- **THEN** the `h1` SHALL read "GRIT 10K" in Exo 2 600 italic, and the pill SHALL be beside it, outside the `h1`

#### Scenario: Default unchanged
- **WHEN** `titleVariant` is omitted
- **THEN** the title SHALL render in Exo 2 300 as before

### Requirement: Pill select primitive
The kit SHALL provide `GritPillSelect`: a native `<select>` styled as a pill, with a visually hidden label, an optional leading cyan icon, and sizes `sm` (29px, 11px text) and `md` (35px, 12px text). It SHALL keep native keyboard behaviour.

#### Scenario: Labelled select with icon
- **WHEN** `<GritPillSelect label="Estado" icon="radio_button_checked">` is rendered
- **THEN** the select SHALL have the accessible name "Estado", and the icon SHALL be decorative

### Requirement: Danger button variant
`GritButton` SHALL accept `variant="danger"`: a danger-tinted pill (danger token at 8% fill, 35% stroke, danger text) for destructive confirms. It SHALL never render a solid red fill.

#### Scenario: Destructive confirm
- **WHEN** a delete modal renders its confirm button with `variant="danger"`
- **THEN** the button SHALL show danger-coloured text on a tinted pill, and keep the loading label while submitting
