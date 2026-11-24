# Spec Delta

## MODIFIED Requirements

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
