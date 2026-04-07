## MODIFIED Requirements

### Requirement: PlanTipo TypeScript interface and related input types are defined
The system SHALL define the following TypeScript types in `src/types/portal/planes.types.ts`:
- `PlanTipo` interface with all `plan_tipos` columns. The `clases_incluidas` field SHALL be typed as `number | null`, where `null` indicates unlimited classes.
- `CreatePlanTipoInput` for service create calls. The `clases_incluidas` field SHALL be typed as `number | null`.
- `UpdatePlanTipoInput` for service update calls. The `clases_incluidas` field SHALL be typed as `number | null`.
- `PlanTipoFormValues` for controlled form inputs (numeric fields as strings, `activo` as boolean). The `clases_incluidas` field SHALL remain typed as `string`; an empty string SHALL map to `null` (unlimited) at form submit time.
- The existing `PlanModalidad` type SHALL remain unchanged.

#### Scenario: PlanTipoFormValues clases_incluidas empty string maps to null
- **WHEN** a `PlanTipoFormValues` object has `clases_incluidas` set to an empty string `''`
- **THEN** the form submission logic SHALL map it to `null` in the `CreatePlanTipoInput` or `UpdatePlanTipoInput` payload, indicating unlimited classes

#### Scenario: PlanTipoFormValues clases_incluidas with numeric string maps to integer
- **WHEN** a `PlanTipoFormValues` object has `clases_incluidas` set to a numeric string like `'10'`
- **THEN** the form submission logic SHALL parse it to the integer `10` in the input payload

#### Scenario: PlanTipo.clases_incluidas null renders as unlimited in UI
- **WHEN** a `PlanTipo` record has `clases_incluidas = null`
- **THEN** the UI SHALL display "Ilimitadas" or "Sin límite" wherever class count is shown

### Requirement: Subscription request modal
Clicking "Adquirir" SHALL open `SuscripcionModal` displaying a summary of the selected plan (name and benefits) and SHALL require the user to select a plan_tipo before proceeding. The modal SHALL display plan_tipo details (price, validity in days, class quota or "Ilimitadas") for the selected tipo. The modal SHALL NOT reference or fall back to plan-level `precio`, `vigencia_meses`, or `clases_incluidas` fields. The modal SHALL include an optional `comentarios` textarea, a `comprobante de pago` file input (accepts JPEG, PNG, WebP, PDF; max 5 MiB; optional), and "Confirmar" and "Cancelar" buttons.

#### Scenario: Modal opens with plan summary and tipo selection
- **WHEN** a `usuario` clicks "Adquirir" on a plan row
- **THEN** `SuscripcionModal` SHALL open displaying the plan's name and a list of active plan_tipos to select from

#### Scenario: Tipo must be selected before confirm
- **WHEN** the user has not selected any plan_tipo
- **THEN** the "Confirmar" button SHALL be disabled

#### Scenario: Selected tipo details are displayed
- **WHEN** the user selects a plan_tipo
- **THEN** the modal SHALL display the tipo's `precio`, `vigencia_dias` (formatted), and `clases_incluidas` (as count or "Ilimitadas" if null)

#### Scenario: Modal closes on Cancelar
- **WHEN** the user clicks "Cancelar" inside `SuscripcionModal`
- **THEN** the modal SHALL close without creating any database records

#### Scenario: Valid proof file selected — filename shown
- **WHEN** the user selects a valid comprobante file (JPEG, PNG, WebP, or PDF, ≤ 5 MiB)
- **THEN** the filename SHALL be displayed and the `File` object SHALL be stored in modal state

### Requirement: Subscription creation uses plan_tipo fields exclusively
When submitting a subscription request, the system SHALL use the selected `plan_tipo`'s `precio` for `pagos.monto` and the selected `plan_tipo`'s `clases_incluidas` for `suscripciones.clases_plan`. The system SHALL NOT fall back to plan-level `precio` or `clases_incluidas` fields. The `plan_tipo_id` SHALL be stored in `suscripciones.plan_tipo_id`.

#### Scenario: Subscription created with tipo precio
- **WHEN** a user confirms a subscription request with a selected plan_tipo
- **THEN** the `pagos.monto` SHALL be set to `selectedTipo.precio`

#### Scenario: Subscription created with tipo clases_incluidas
- **WHEN** a user confirms a subscription request with a selected plan_tipo
- **THEN** the `suscripciones.clases_plan` SHALL be set to `selectedTipo.clases_incluidas` (may be null for unlimited)

#### Scenario: No fallback to plan-level fields
- **WHEN** no plan_tipo is selected (should not happen given UI enforcement)
- **THEN** the system SHALL NOT attempt to read `plan.precio` or `plan.clases_incluidas` as they no longer exist
