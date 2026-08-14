## ADDED Requirements

### Requirement: SuscripcionServicioDisplay read-model type is defined
The system SHALL define a `SuscripcionServicioDisplay` interface in `src/types/portal/suscripciones.types.ts` with fields: `servicio_id: string`, `servicio_nombre: string`, `unidades_incluidas: number | null`, and `unidades_restantes: number | null`. A `null` value for either unit field SHALL represent an unlimited entitlement.

#### Scenario: Type is importable and correctly shaped
- **WHEN** any component or service imports `SuscripcionServicioDisplay` from `suscripciones.types.ts`
- **THEN** the interface SHALL be available with the four required fields

---

### Requirement: Subscription views include per-service unit data
The system SHALL extend `InicioSuscripcion`, `MiSuscripcionRow`, and `SuscripcionAdminRow` with a `servicios: SuscripcionServicioDisplay[]` field. When a subscription has no service assignments, this array SHALL be empty (`[]`). The field SHALL never be `null` or `undefined`.

#### Scenario: Subscription with service assignments returns populated array
- **WHEN** `fetchMisSuscripciones`, `fetchMisSuscripcionesTenant`, or `fetchSuscripcionesAdmin` returns a subscription that has rows in `suscripcion_servicios`
- **THEN** the returned row's `servicios` field SHALL contain one `SuscripcionServicioDisplay` entry per `suscripcion_servicios` row, with `servicio_nombre` resolved from the joined `servicios` table

#### Scenario: Subscription without service assignments returns empty array
- **WHEN** a subscription has no rows in `suscripcion_servicios`
- **THEN** the returned row's `servicios` field SHALL be `[]`

---

### Requirement: Service data is fetched in a single joined query
The system SHALL join `suscripcion_servicios(servicio_id, unidades_incluidas, unidades_restantes, servicio:servicios!suscripcion_servicios_servicio_id_fkey(nombre))` within the same PostgREST `select` string used to load subscriptions. No additional database round-trips SHALL be issued per subscription row to retrieve service units.

#### Scenario: No extra queries when filters change
- **WHEN** the user changes a filter in `MisSuscripcionesFilters` or `SuscripcionesHeaderFilters`
- **THEN** the system SHALL NOT issue any new database queries; filtering SHALL be performed client-side on the already-loaded list

---

### Requirement: Subscription service units are displayed in the home dashboard widget
The `InicioSuscripciones` component SHALL render a compact per-service row for each subscription item that has `servicios.length > 0`. Each service SHALL display `{servicio_nombre}: {unidades_restantes}/{unidades_incluidas}`. When either value is `null`, the symbol `∞` SHALL be shown in its place. Services SHALL be separated by a middle dot `·`. When `servicios` is empty, no services row SHALL be rendered.

#### Scenario: Subscription with services shows inline unit row
- **WHEN** a subscription item in the home dashboard has one or more services
- **THEN** each service SHALL be shown as `{nombre}: {restantes}/{incluidas}` (or `∞`) in a compact row below the date range

#### Scenario: Subscription without services shows no services row
- **WHEN** a subscription item has an empty `servicios` array
- **THEN** no services row SHALL appear below the date range

#### Scenario: Null units display as ∞
- **WHEN** a service has `unidades_restantes: null` or `unidades_incluidas: null`
- **THEN** the corresponding value SHALL render as `∞`

---

### Requirement: Subscription service units are displayed in the athlete subscription card
The `SuscripcionCard` component SHALL render a services section below the date row when `suscripcion.servicios.length > 0`. Each service SHALL show a label `{servicio_nombre}: {restantes}/{incluidas}` with a mini progress bar when `unidades_incluidas` is not null and greater than 0. When `unidades_restantes === 0`, the progress bar and label SHALL use a rose color class. When `servicios` is empty, the services section SHALL NOT be rendered. When `unidades_incluidas` is null, the value SHALL display as `∞` and no progress bar SHALL be rendered.

#### Scenario: Card with services shows section with progress bars
- **WHEN** `SuscripcionCard` renders a subscription with at least one service assignment
- **THEN** a services section SHALL appear below the date row with one row per service showing name, unit counter, and progress bar

#### Scenario: Card without services hides services section
- **WHEN** `SuscripcionCard` renders a subscription with an empty `servicios` array
- **THEN** no services section SHALL be rendered

#### Scenario: Exhausted service highlighted in rose
- **WHEN** a service has `unidades_restantes === 0` and `unidades_incluidas` is not null
- **THEN** the progress bar and counter SHALL use rose color classes

#### Scenario: Unlimited service shows ∞ without progress bar
- **WHEN** a service has `unidades_incluidas: null`
- **THEN** the counter SHALL display `∞` and no progress bar SHALL be rendered

---

### Requirement: Subscription service units are displayed in the admin table
The `SuscripcionesTable` component SHALL replace the "Clases" column with a "Servicios" column. When `row.servicios` is empty, the cell SHALL display `"—"`. When `row.servicios` has entries, the cell SHALL render each as `{nombre}: {restantes}/{incluidas}` (null → `∞`). When more than 3 services exist, only the first 3 SHALL be rendered followed by `+N más` (where N is the remaining count).

#### Scenario: Servicios column shows all services (≤ 3)
- **WHEN** a subscription row has 1–3 service assignments
- **THEN** the Servicios column SHALL list all services with their unit counters

#### Scenario: Servicios column truncates beyond 3
- **WHEN** a subscription row has more than 3 service assignments
- **THEN** the cell SHALL show the first 3 services followed by `+N más`

#### Scenario: Servicios column shows dash when no services
- **WHEN** a subscription row has no service assignments
- **THEN** the cell SHALL display `"—"`

---

### Requirement: Plan acquisition modal shows service inclusions per subtype
The `SuscripcionModal` Step 1 subtype cards SHALL display the services included in each `plan_tipo` when `tipo.servicios` is populated. Each service SHALL display as a compact chip: `{servicioNombre}: {unidades} uds` (null → `∞`). When `tipo.servicios` is undefined, empty, or has length 0, no services row SHALL be rendered inside that card. The Step 2 summary box SHALL display the same chip list for the `selectedTipo`. No additional data fetching is required; `tipo.servicios` is already populated by `planesService.getPlanes`.

#### Scenario: Step 1 card shows service chips for a tipo with services
- **WHEN** `SuscripcionModal` renders Step 1 and a `plan_tipo` has `servicios.length > 0`
- **THEN** the tipo card SHALL display a row of compact chips showing `{nombre}: {unidades} uds` (or `∞`)

#### Scenario: Step 1 card shows nothing for a tipo without services
- **WHEN** a `plan_tipo` has `servicios` undefined or empty
- **THEN** no services chips row SHALL appear inside that card

#### Scenario: Step 2 summary box shows selected tipo's services
- **WHEN** the user proceeds to Step 2 having selected a `plan_tipo` with services
- **THEN** the summary box SHALL include the same service chip list

#### Scenario: Step 2 summary box shows no services section when tipo has none
- **WHEN** the selected `plan_tipo` has no service assignments
- **THEN** the Step 2 summary box SHALL NOT show a services section
