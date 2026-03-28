## ADDED Requirements

### Requirement: User can view their own subscriptions for a tenant
The system SHALL provide a page at `(usuario)/mis-suscripciones-y-pagos` that displays all subscriptions belonging to the authenticated user for the current tenant, ordered by `created_at` descending. The page SHALL only be accessible to users whose resolved role for that tenant is `usuario`.

#### Scenario: Usuario views their subscription list
- **WHEN** a user with role `usuario` navigates to `/{tenant_id}/mis-suscripciones-y-pagos`
- **THEN** the page SHALL render a list of subscriptions scoped to that tenant and that user only

#### Scenario: Non-usuario role is redirected
- **WHEN** a user with role `administrador` or `entrenador` navigates directly to `/{tenant_id}/mis-suscripciones-y-pagos`
- **THEN** the system SHALL redirect them to the tenant landing page

#### Scenario: Unauthenticated user is redirected to login
- **WHEN** an unauthenticated user navigates to `/{tenant_id}/mis-suscripciones-y-pagos`
- **THEN** the system SHALL redirect to `/auth/login`

#### Scenario: Subscriptions from other tenants are not shown
- **WHEN** the authenticated user has subscriptions in multiple tenants
- **THEN** the page SHALL display only subscriptions matching the current `tenant_id`

---

### Requirement: Each subscription is displayed as a card with plan and status information
Each subscription entry SHALL be rendered as a card containing: plan name (`plan_nombre`), subscription status badge (`SuscripcionEstadoBadge`), start date (`fecha_inicio`) and end date (`fecha_fin`) displayed as "—" when null, and a remaining classes counter (`clases_restantes / clases_plan`) visible only when not null.

#### Scenario: Subscription card shows plan name and status badge
- **WHEN** the subscription list renders
- **THEN** each card SHALL display the associated plan name and a `SuscripcionEstadoBadge`

#### Scenario: Null dates display as dash
- **WHEN** a subscription has `fecha_inicio` or `fecha_fin` as null
- **THEN** the corresponding date field SHALL display "—"

#### Scenario: Classes counter is hidden when null
- **WHEN** a subscription has `clases_restantes` and `clases_plan` both as null
- **THEN** the classes counter section SHALL NOT be rendered

#### Scenario: Classes counter shows remaining over total
- **WHEN** a subscription has non-null `clases_restantes` and `clases_plan`
- **THEN** the classes counter SHALL display as `clases_restantes / clases_plan`

---

### Requirement: Each subscription card includes a payment section
If a subscription has an associated `pago`, the payment section SHALL show: amount (`monto`) formatted as currency, payment method name (`metodo_pago_nombre`) shown as "—" when null, payment status badge (`PagoEstadoBadge`), and payment date (`fecha_pago`) shown as "—" when null. If the subscription has no associated `pago`, the section SHALL show the message: _"No payment record found for this subscription."_

#### Scenario: Payment section shows all payment fields
- **WHEN** a subscription has an associated pago
- **THEN** the card SHALL display monto, metodo_pago_nombre, PagoEstadoBadge, and fecha_pago

#### Scenario: Null payment fields display as dash
- **WHEN** `metodo_pago_nombre` or `fecha_pago` is null
- **THEN** those fields SHALL display "—"

#### Scenario: No payment record shows informational message
- **WHEN** a subscription has no associated pago
- **THEN** the payment section SHALL display _"No payment record found for this subscription."_

---

### Requirement: Comprobante preview is shown when a file exists
When `pago.comprobante_path` is not null, the system SHALL render a preview using a signed URL with a 5-minute TTL. Image types (jpg/jpeg/png/webp) SHALL render as an inline `<img>`. PDF files SHALL render as a PDF icon with a download link.

#### Scenario: Image comprobante renders inline
- **WHEN** `comprobante_path` points to a jpg, jpeg, png, or webp file
- **THEN** an inline `<img>` element SHALL be rendered with the signed URL

#### Scenario: PDF comprobante renders download link
- **WHEN** `comprobante_path` points to a PDF file
- **THEN** a PDF icon and a download link SHALL be rendered

#### Scenario: No preview when comprobante_path is null
- **WHEN** `pago.comprobante_path` is null
- **THEN** no preview element SHALL be rendered

---

### Requirement: Upload button is shown only when payment can still be updated
An upload button SHALL be visible when `pago.estado` is `pendiente` or `rechazado`. The upload button SHALL NOT be rendered when `pago.estado` is `validado`. The button SHALL accept `image/*` and `.pdf` files, and SHALL enforce a maximum file size of 5 MB client-side.

#### Scenario: Upload button shown for pendiente
- **WHEN** `pago.estado` is `pendiente`
- **THEN** the upload button SHALL be rendered

#### Scenario: Upload button shown for rechazado
- **WHEN** `pago.estado` is `rechazado`
- **THEN** the upload button SHALL be rendered

#### Scenario: Upload button hidden for validado
- **WHEN** `pago.estado` is `validado`
- **THEN** the upload button SHALL NOT be rendered

#### Scenario: File larger than 5 MB is rejected client-side
- **WHEN** the user selects a file exceeding 5 MB
- **THEN** a client-side validation error SHALL be shown and the upload SHALL NOT proceed

---

### Requirement: Successful upload updates the comprobante and refreshes the preview
On a successful upload, the system SHALL update `pagos.comprobante_path` in the database and immediately refresh the comprobante preview in the UI. Re-uploads (when a path already exists) SHALL replace the existing storage object using upsert.

#### Scenario: Upload succeeds and preview refreshes
- **WHEN** the user selects a valid file and the upload completes successfully
- **THEN** `pagos.comprobante_path` SHALL be updated in the database
- **THEN** the comprobante preview SHALL refresh with the new signed URL

#### Scenario: Re-upload replaces existing file
- **WHEN** `comprobante_path` already exists and the user uploads a new file
- **THEN** the storage object SHALL be replaced (upsert) at the same path
- **THEN** `pagos.comprobante_path` SHALL reflect the updated path

#### Scenario: Upload error shows inline message
- **WHEN** the upload or DB update fails
- **THEN** an inline error message SHALL be shown below the upload button
- **THEN** the page SHALL NOT crash

---

### Requirement: Client-side filter bar allows filtering by subscription and payment status
A filter bar SHALL be displayed above the subscription list with two independent selectors: subscription status (options: All, Pendiente, Activa, Vencida, Cancelada; default: All) and payment status (options: All, Pendiente, Validado, Rechazado; default: All). Filtering SHALL be applied in memory — no additional server requests SHALL be made when filters change. When both filters are active, results SHALL satisfy both conditions (AND logic).

#### Scenario: Default state shows all subscriptions
- **WHEN** both filters are set to "All"
- **THEN** all subscriptions SHALL be displayed

#### Scenario: Subscription status filter narrows results
- **WHEN** user selects a specific subscription status
- **THEN** only subscriptions with that `estado` SHALL be shown

#### Scenario: Payment status filter narrows results
- **WHEN** user selects a specific payment status
- **THEN** only subscriptions whose pago has that `estado` SHALL be shown
- **THEN** subscriptions without a payment record SHALL be excluded

#### Scenario: Both filters active uses AND logic
- **WHEN** both subscription status and payment status filters are active
- **THEN** only subscriptions matching both conditions SHALL be displayed

---

### Requirement: Filter empty state prompts user to clear filters
When active filters produce zero results but the user has subscriptions for the tenant, the system SHALL display a "No results match the selected filters" message with a "Clear filters" action that resets both filters to All. This state is distinct from the true empty state where the user has no subscriptions.

#### Scenario: Filter empty state shown with clear action
- **WHEN** filters produce zero results and the user has at least one subscription
- **THEN** a message SHALL read "No results match the selected filters"
- **THEN** a "Clear filters" button SHALL be displayed
- **THEN** clicking "Clear filters" SHALL reset both filters to All and show all subscriptions

---

### Requirement: Empty state is shown when user has no subscriptions
When the user has no subscriptions for the current tenant, the page SHALL display a friendly empty state message with a call-to-action linking to the plans page (`gestion-planes`). The filter bar SHALL NOT be displayed in this state.

#### Scenario: Empty state shown with plans link
- **WHEN** the user has no subscriptions for the tenant
- **THEN** a friendly empty state message SHALL be shown
- **THEN** a link to `gestion-planes` SHALL be included
- **THEN** the filter bar SHALL NOT be rendered
