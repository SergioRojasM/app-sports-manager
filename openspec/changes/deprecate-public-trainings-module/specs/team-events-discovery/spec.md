## MODIFIED Requirements

### Requirement: Discovery navigation entries
- The portal global menu (no tenant selected) SHALL include "Eventos" (icon `celebration`) linking to `/portal/eventos`. The menu SHALL NOT include "Entrenamientos Públicos".
- The landing header's "Plataforma" group SHALL include "Eventos" linking to `/eventos`, and SHALL NOT include "Calendario de Entrenamientos".
- The portal breadcrumb SHALL label the `eventos` segment "Eventos".

#### Scenario: Landing header link
- **WHEN** a visitor opens the "Plataforma" menu in the landing header
- **THEN** an "Eventos" link to `/eventos` SHALL be listed and no "Calendario de Entrenamientos" link SHALL be shown

#### Scenario: Portal breadcrumb
- **WHEN** a user is on `/portal/eventos`
- **THEN** the breadcrumb SHALL read "Eventos"

## REMOVED Requirements

### Requirement: Events slices independent of public trainings
**Reason**: The public trainings module no longer exists (US-0123), so there is nothing to stay independent from. The shared types `CronogramaItem`, `IncluyeItem` and `PrecioItem` now live in `src/types/portal/eventos.types.ts`.
**Migration**: None. Event code imports those types from `@/types/portal/eventos.types`.
