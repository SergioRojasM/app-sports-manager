## MODIFIED Requirements

### Requirement: Subscription request modal
Clicking "Adquirir" SHALL open `SuscripcionModal` displaying a summary of the selected plan (name and benefits) and SHALL require the user to select a plan_tipo before proceeding. The modal SHALL display plan_tipo details (price, validity in days, and services with unit caps) for the selected tipo. The modal SHALL NOT reference or fall back to plan-level `precio`, `vigencia_meses`, or `clases_incluidas` fields. The modal SHALL include an optional `comentarios` textarea, a `comprobante de pago` file input (accepts JPEG, PNG, WebP, PDF; max 5 MiB; optional), and "Confirmar" and "Cancelar" buttons.

#### Scenario: Modal opens with plan summary and tipo selection
- **WHEN** a `usuario` clicks "Adquirir" on a plan row
- **THEN** `SuscripcionModal` SHALL open displaying the plan's name and a list of active plan_tipos to select from

#### Scenario: Tipo must be selected before confirm
- **WHEN** the user has not selected any plan_tipo
- **THEN** the "Confirmar" button SHALL be disabled

#### Scenario: Selected tipo details are displayed including services
- **WHEN** the user selects a plan_tipo
- **THEN** the modal SHALL display the tipo's `precio`, `vigencia_dias` (formatted), and — when `tipo.servicios` is populated — a list of service chips showing `{nombre}: {unidades} uds` (null → `∞`)

#### Scenario: Step 1 card shows service chips for a tipo with services
- **WHEN** `SuscripcionModal` renders Step 1 and a `plan_tipo` has `servicios.length > 0`
- **THEN** the tipo card SHALL display a compact row of service chips after the price/vigencia row

#### Scenario: Step 1 card shows no services row for a tipo without services
- **WHEN** a `plan_tipo` has `servicios` undefined or empty
- **THEN** no services row SHALL appear inside that tipo card

#### Scenario: Step 2 summary box shows selected tipo services
- **WHEN** the user proceeds to Step 2 with a plan_tipo that has services
- **THEN** the summary box SHALL display the service chip list

#### Scenario: Step 2 summary box omits services section when tipo has none
- **WHEN** the selected plan_tipo has no service assignments
- **THEN** the Step 2 summary box SHALL NOT include a services section

#### Scenario: Modal closes on Cancelar
- **WHEN** the user clicks "Cancelar" inside `SuscripcionModal`
- **THEN** the modal SHALL close without creating any database records

#### Scenario: Valid proof file selected — filename shown
- **WHEN** the user selects a valid comprobante file (JPEG, PNG, WebP, or PDF, ≤ 5 MiB)
- **THEN** the filename SHALL be displayed and the `File` object SHALL be stored in modal state

#### Scenario: Invalid MIME type rejected
- **WHEN** the user selects a file with an unsupported MIME type
- **THEN** an inline error SHALL be shown and the file SHALL NOT be stored in modal state

#### Scenario: File exceeding 5 MiB rejected
- **WHEN** the user selects a file larger than 5 MiB
- **THEN** an inline error SHALL be shown and the file SHALL NOT be stored in modal state
