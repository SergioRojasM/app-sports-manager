## MODIFIED Requirements

### Requirement: Analytics behavior is unchanged
The restyle MUST NOT change data fetching (`useAnalitica`), the analytics service, date presets, Bogotá date handling, tab state, formatting (currency/integer/percent) or the route. The content of the "Resumen" tab is governed by the `analitica-resumen-dashboard` capability, and the content of the `Ingresos`, `Operación` and `Equipo` tabs by the `analitica-detail-tabs` capability, together with the RPC fields that feed them.

#### Scenario: Resumen unaffected by detail-tab changes
- **WHEN** the detail tabs change under `analitica-detail-tabs`
- **THEN** the Resumen KPI values and chart series SHALL stay identical for the same tenant and range

#### Scenario: Type-check and lint
- **WHEN** `npx tsc --noEmit` and `npm run lint` run
- **THEN** they SHALL report no new errors versus the base branch
