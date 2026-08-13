## MODIFIED Requirements

### Requirement: User can view their own subscriptions for a tenant
The system SHALL provide a portal-level page at `/portal/mis-suscripciones` that displays all subscriptions belonging to the authenticated user across **every** organization, ordered by `created_at` descending. The page SHALL be accessible to any authenticated user and SHALL scope its data exclusively to `atleta_id = auth.uid()`, enforced by row level security. It SHALL NOT require membership in any organization, so that users who acquired a public plan without joining the organization can see their subscriptions. The former tenant-scoped route `/portal/orgs/{tenant_id}/mis-suscripciones-y-pagos` SHALL redirect to the new page.

#### Scenario: Usuario views their subscription list
- **WHEN** an authenticated user navigates to `/portal/mis-suscripciones`
- **THEN** the page SHALL render a list of that user's subscriptions from all organizations, newest first

#### Scenario: Non-member buyer sees their subscription
- **WHEN** a user who is not a member of any organization has acquired a public plan
- **THEN** the page SHALL display that subscription

#### Scenario: Unauthenticated user is redirected to login
- **WHEN** an unauthenticated user navigates to `/portal/mis-suscripciones`
- **THEN** the system SHALL redirect to `/auth/login`, exactly as it does for every other `/portal` route (the portal shell owns the `next` parameter)

#### Scenario: Subscriptions of other users are not shown
- **WHEN** the page loads for any user
- **THEN** only subscriptions whose `atleta_id` equals the authenticated user id SHALL be returned

#### Scenario: Legacy tenant-scoped route redirects
- **WHEN** a user navigates to `/portal/orgs/{tenant_id}/mis-suscripciones-y-pagos`
- **THEN** the system SHALL redirect to `/portal/mis-suscripciones`

---

### Requirement: Each subscription is displayed as a card with plan and status information
Each subscription entry SHALL be rendered as a card containing: the organization name of the subscription's tenant, plan name (`plan_nombre`), subscription status badge (`SuscripcionEstadoBadge`), start date (`fecha_inicio`) and end date (`fecha_fin`) displayed as "—" when null, and a remaining classes counter (`clases_restantes / clases_plan`) visible only when not null.

#### Scenario: Subscription card shows plan name and status badge
- **WHEN** the subscription list renders
- **THEN** each card SHALL display the associated plan name and a `SuscripcionEstadoBadge`

#### Scenario: Subscription card shows the organization
- **WHEN** the subscription list renders
- **THEN** each card SHALL display the name of the organization the subscription belongs to

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

### Requirement: Client-side filter bar allows filtering by subscription and payment status
A filter bar SHALL be displayed above the subscription list with three independent selectors: subscription status (options: All, Pendiente, Activa, Vencida, Cancelada; default: All), payment status (options: All, Pendiente, Validado, Rechazado; default: All), and organization (options: All plus one entry per organization present in the user's subscriptions; default: All). Filtering SHALL be applied in memory — no additional server requests SHALL be made when filters change. When more than one filter is active, results SHALL satisfy all active conditions (AND logic).

#### Scenario: Default state shows all subscriptions
- **WHEN** all filters are set to "All"
- **THEN** all subscriptions SHALL be displayed

#### Scenario: Subscription status filter narrows results
- **WHEN** user selects a specific subscription status
- **THEN** only subscriptions with that `estado` SHALL be shown

#### Scenario: Payment status filter narrows results
- **WHEN** user selects a specific payment status
- **THEN** only subscriptions whose pago has that `estado` SHALL be shown
- **THEN** subscriptions without a payment record SHALL be excluded

#### Scenario: Organization filter narrows results
- **WHEN** user selects a specific organization
- **THEN** only subscriptions belonging to that organization's tenant SHALL be shown

#### Scenario: Multiple filters active use AND logic
- **WHEN** more than one filter is active
- **THEN** only subscriptions matching every active condition SHALL be displayed

---

### Requirement: Filter empty state prompts user to clear filters
When active filters produce zero results but the user has at least one subscription, the system SHALL display a "No results match the selected filters" message with a "Clear filters" action that resets the subscription status, payment status and organization filters to All. This state is distinct from the true empty state where the user has no subscriptions.

#### Scenario: Filter empty state shown with clear action
- **WHEN** filters produce zero results and the user has at least one subscription
- **THEN** a message SHALL read "No results match the selected filters"
- **THEN** a "Clear filters" button SHALL be displayed
- **THEN** clicking "Clear filters" SHALL reset all three filters to All and show all subscriptions

---

### Requirement: Empty state is shown when user has no subscriptions
When the user has no subscriptions in any organization, the page SHALL display a friendly empty state message with a call-to-action linking to the organizations directory (`/portal/orgs`), where the user can browse organizations and their public plans. The filter bar SHALL NOT be displayed in this state.

#### Scenario: Empty state shown with organizations link
- **WHEN** the user has no subscriptions at all
- **THEN** a friendly empty state message SHALL be shown
- **THEN** a link to `/portal/orgs` SHALL be included
- **THEN** the filter bar SHALL NOT be rendered

## ADDED Requirements

### Requirement: Payment proof upload targets the subscription's own organization
Uploading or re-uploading a payment proof from a subscription card SHALL store the file under the storage path of the tenant that owns **that** subscription, and SHALL update the `comprobante_path` of that subscription's payment record. Storage policies SHALL permit the upload when the object is in the caller's own user folder and the caller is either an active member of the tenant **or** holds a subscription in it, so that a non-member buyer of a public plan can submit proof of payment. Re-uploading to an existing path (upsert) SHALL be permitted under the same conditions.

#### Scenario: Proof is uploaded to the correct tenant path
- **WHEN** the user uploads a payment proof from a card belonging to a given organization
- **THEN** the file SHALL be stored under that organization's tenant path
- **THEN** the corresponding `pagos.comprobante_path` SHALL be updated

#### Scenario: Non-member buyer uploads proof of payment
- **WHEN** a user who is not a member of the organization uploads a payment proof for a subscription they acquired through a public plan
- **THEN** the upload SHALL succeed

#### Scenario: Re-upload replaces the object at the same path
- **WHEN** a user uploads a payment proof to a path where an object already exists
- **THEN** the upsert SHALL succeed and replace the stored object

#### Scenario: Buyer reads back their own proof
- **WHEN** a non-member buyer views the subscription card or requests a signed URL for their own comprobante
- **THEN** the object SHALL be readable by them

#### Scenario: Administrator reads a buyer's proof for validation
- **WHEN** an administrator of the organization opens the payment detail for a non-member buyer's subscription
- **THEN** the buyer's comprobante SHALL be readable by that administrator

#### Scenario: A user cannot write into another user's folder
- **WHEN** any authenticated user attempts to upload to a receipts path whose user segment is not their own id
- **THEN** the upload SHALL be rejected by storage row level security

#### Scenario: Proofs across organizations do not collide
- **WHEN** the user holds subscriptions in more than one organization and uploads a proof in each
- **THEN** each file SHALL be stored under its own tenant path and neither record SHALL overwrite the other

---

### Requirement: Mis Suscripciones is reachable from the portal-level menu
The `Mis Suscripciones` navigation entry SHALL be presented in the portal-level menu (the menu shown when the user is not inside an organization), pointing to `/portal/mis-suscripciones`. It SHALL be removed from the tenant-scoped `usuario` role menu.

#### Scenario: Entry appears in the portal-level menu
- **WHEN** an authenticated user opens the portal menu outside any organization
- **THEN** a `Mis Suscripciones` entry pointing to `/portal/mis-suscripciones` SHALL be present

#### Scenario: Entry no longer appears in the tenant menu
- **WHEN** a user with role `usuario` opens the menu inside an organization
- **THEN** the tenant-scoped `Mis Suscripciones` entry SHALL NOT be present
