# portal-my-subscriptions Specification

## Purpose
Defines the cross-tenant `/portal/mis-suscripciones` page, where a signed-in user reviews every subscription they hold across organizations, filters them, follows the period and service usage, manages payment proof and starts a renewal.

## Requirements

### Requirement: Mis suscripciones route and data
The system SHALL serve `/portal/mis-suscripciones` to any signed-in user, listing only that user's subscriptions in every organization, newest first. Each subscription SHALL carry plan name and plan description, organization, status, dates, latest payment and services. Unauthenticated visitors SHALL be redirected to login with `next=/portal/mis-suscripciones`.

#### Scenario: Cross-tenant listing
- **WHEN** a user with subscriptions in "SwimLab" and "Grit Arena" opens `/portal/mis-suscripciones`
- **THEN** subscriptions of both organizations SHALL be listed, newest first

#### Scenario: Other users' subscriptions are not listed
- **WHEN** another athlete of the same organization has subscriptions
- **THEN** none of them SHALL appear on the page

#### Scenario: Unauthenticated visitor
- **WHEN** a visitor without a session opens the page
- **THEN** they SHALL be redirected to `/auth/login?next=%2Fportal%2Fmis-suscripciones`

### Requirement: Mis suscripciones header and filters
The page SHALL show the single `h1` "Mis suscripciones." with "suscripciones." as the accent, and in the header:
- a status segmented control: Todas, Pendiente, Activa, Vencida, Cancelada (default Todas);
- a payment pill select "Pago": Todos, Pendiente, Validado, Rechazado;
- an organization pill select, only when the subscriptions span more than one organization.

Filters SHALL combine with AND, run in memory and expose `aria-pressed` on segments.

#### Scenario: Status filter
- **WHEN** the user selects "Vencida"
- **THEN** only subscriptions with estado `vencida` SHALL be listed and the "Vencida" segment SHALL have `aria-pressed="true"`

#### Scenario: Payment filter excludes subscriptions without payment
- **WHEN** the user selects "Pago: Validado"
- **THEN** only subscriptions whose payment is `validado` SHALL be listed, and subscriptions without a payment SHALL be hidden

#### Scenario: Organization select hidden for one organization
- **WHEN** all subscriptions belong to the same organization
- **THEN** the organization select SHALL NOT be rendered

#### Scenario: No server request on filter change
- **WHEN** the user changes any filter
- **THEN** no additional data request SHALL be made

### Requirement: Subscription card cover zone
Each subscription SHALL be one card whose first zone shows:
- the plan name in the display face (italic);
- the plan description on one line, only when present;
- an organization pill with the organization's initials mark and name;
- a status tag with a dot and the Spanish label: Pendiente, Activa, Vencida or Cancelada.

#### Scenario: Plan without description
- **WHEN** the plan has no description
- **THEN** the cover SHALL show the plan name and SHALL NOT render an empty line

#### Scenario: Status is conveyed by text
- **WHEN** a subscription is `vencida`
- **THEN** the cover SHALL show a tag reading "Vencida"

### Requirement: Subscription card period
The second zone SHALL show the date range as date-only values (e.g. "18 ago – 17 sep 2026"), a time label and a period track:
- before the start: "Inicia en N días";
- during the period: "Día N de M", with the track filled by the elapsed share;
- after the end: "Finalizado", with the track full.

Missing dates SHALL show "Sin fechas" and no track.

#### Scenario: Date-only formatting does not shift
- **WHEN** `fecha_fin` is `2026-11-30`
- **THEN** the range SHALL end on "30 nov", not "29 nov", in Bogotá

#### Scenario: Active period
- **WHEN** a 30-day subscription started 11 days ago, counting today as day 12
- **THEN** the label SHALL read "Día 12 de 30" and the track SHALL be about 40% filled

#### Scenario: Ended period
- **WHEN** `fecha_fin` is before today
- **THEN** the label SHALL read "Finalizado" and the track SHALL be full

### Requirement: Subscription card services
The second zone SHALL list each included service as a tile with its name and either "restantes/incluidas" plus a progress bar, or "∞" when unlimited. When the remaining units are 0, the value SHALL be in the danger tone.

#### Scenario: Limited and unlimited services
- **WHEN** a subscription includes "Tiquetera Delfines" with 3 of 4 units left and "Clases de natación" unlimited
- **THEN** the tiles SHALL read "3/4" with a 75% bar and "∞" without a bar

#### Scenario: Exhausted service
- **WHEN** a service has 0 of 1 units left
- **THEN** its tile SHALL read "0/1" in the danger tone

### Requirement: Subscription card payment status
The third zone SHALL show the latest payment's amount in COP and a status line:
- "Pago validado" (accent);
- "Pago pendiente" (warning);
- "Pago rechazado" (danger), followed by the rejection reason when present.

A subscription without a payment SHALL show "Sin pago registrado" and no amount.

#### Scenario: Rejected payment with reason
- **WHEN** the payment is `rechazado` with reason "Comprobante ilegible"
- **THEN** the zone SHALL show "Pago rechazado" and "Comprobante ilegible"

#### Scenario: No payment
- **WHEN** a subscription has no payment record
- **THEN** the zone SHALL show "Sin pago registrado" and no amount

### Requirement: Subscription payment proof actions
When a payment proof exists, a "Ver comprobante" icon button SHALL open it. When the payment is `pendiente` or `rechazado`, "Subir comprobante" (or "Resubir comprobante" when a proof exists) SHALL upload a new proof and then refresh the preview. Validated payments SHALL offer no upload.

#### Scenario: Re-upload a rejected proof
- **WHEN** a rejected payment has a proof and the user picks a new file with "Resubir comprobante"
- **THEN** the file SHALL be uploaded and "Ver comprobante" SHALL open the new proof

#### Scenario: Validated payment cannot be re-uploaded
- **WHEN** the payment is `validado`
- **THEN** no upload action SHALL be shown

### Requirement: Renewal entry point
Subscriptions with estado `vencida` or `cancelada` SHALL show a primary "Renovar" action. It SHALL open the organization's public plans catalog in a dialog, where the user can subscribe again. Pending or active subscriptions SHALL NOT show "Renovar".

#### Scenario: Renew an expired subscription
- **WHEN** the user clicks "Renovar" on an expired "SwimLab" subscription of "Grit Arena"
- **THEN** the plans dialog of "Grit Arena" SHALL open, and closing it SHALL return focus to "Renovar"

#### Scenario: Active subscription
- **WHEN** a subscription is `activa`
- **THEN** "Renovar" SHALL NOT be shown

### Requirement: Mis suscripciones empty and filter-empty states
When the user has no subscriptions, the page SHALL show "Aún no tienes suscripciones" with an action "Explorar organizaciones" to `/portal/orgs`, and SHALL hide the filters. When filters match nothing, it SHALL show "No hay suscripciones con estos filtros" with "Limpiar filtros", which resets all filters.

#### Scenario: No subscriptions
- **WHEN** the user has no subscriptions
- **THEN** the empty state and its link to `/portal/orgs` SHALL be shown and no filter control SHALL be rendered

#### Scenario: Clear filters
- **WHEN** the filters match nothing and the user clicks "Limpiar filtros"
- **THEN** every filter SHALL return to its default and all subscriptions SHALL be listed

### Requirement: Mis suscripciones responsive layout
At 1280px and wider, the card SHALL lay its three zones side by side with dividers. Below that, the zones SHALL stack. The header filters SHALL wrap under the title, and the segmented control SHALL scroll inside its track. No viewport from 360px up SHALL scroll horizontally.

#### Scenario: Phone width
- **WHEN** the page is viewed at 375px
- **THEN** each card's zones SHALL stack vertically and the page SHALL NOT scroll horizontally
