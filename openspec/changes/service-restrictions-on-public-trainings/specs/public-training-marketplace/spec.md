## REMOVED Requirements

### Requirement: Pre-publish validation blocks servicio-based restrictions
**Reason**: The rule rested on the premise that "a cross-tenant visitor can never hold a subscription/service in a tenant they aren't a member of". US-0093 invalidated it: a non-member can buy a public plan, which creates a subscription in that tenant and populates `suscripcion_servicios` with the units the subtype grants. The booking pipeline was already tenant+athlete scoped rather than membership scoped, so a service-only restriction row is satisfiable by a paying non-member and the block only forced administrators to strip restrictions off a training to make it visible.

**Migration**: Replaced by "Pre-publish validation blocks membership-only restrictions" below, which keeps the same three-layer enforcement but retargets it at the conditions a non-member genuinely cannot satisfy. No data migration is required: every training published under the old rule is free of service restrictions by construction, so none is invalidated. The database trigger `entrenamientos_publicos_no_servicio_restriccion` and its function `check_entrenamiento_publico_sin_restriccion_servicio()` are dropped and replaced.

## ADDED Requirements

### Requirement: Pre-publish validation blocks membership-only restrictions
The system SHALL prevent publishing (insert or update of `entrenamientos_publicos`) for any `entrenamiento_id` that **has** at least one `entrenamiento_restricciones` row and where **none** of its rows is free of membership-only conditions — a row being "free" when `usuario_estado IS NULL` **and** `validar_nivel_disciplina` is not true. Service-based conditions (`servicio_1_id`…`servicio_4_id`) SHALL NOT block publication.

Because restriction rows are evaluated as OR at booking time, a training SHALL remain publishable whenever at least one row is satisfiable without membership, even if other rows are membership-only. Conditions combined within a single row are ANDed, so a row that sets both a service slot and `usuario_estado` is not satisfiable without membership.

This rule MUST be enforced at three layers: the "Publicar"/"Gestionar publicación" UI action SHALL be disabled with an explanatory reason; the publish service function SHALL reject the operation before attempting the write, with a typed error; and a database trigger on `entrenamientos_publicos` SHALL raise an exception on `before insert or update`. The database trigger is the authority; the service layer SHALL map its exception onto the same typed error so a stale UI state surfaces the user-facing message rather than a raw database error.

A training whose only timing constraints are `reserva_antelacion_horas` and/or `cancelacion_antelacion_horas` (columns on `entrenamientos`, not rows in `entrenamiento_restricciones`) SHALL remain publishable.

#### Scenario: Service-restricted training becomes publishable
- **WHEN** an administrador opens the training options modal for a training whose only `entrenamiento_restricciones` row sets `servicio_1_id`
- **THEN** the "Publicar" action SHALL be enabled

#### Scenario: Training with no restrictions remains publishable
- **WHEN** a training has zero `entrenamiento_restricciones` rows
- **THEN** the "Publicar" action SHALL be enabled

#### Scenario: Membership-only restriction blocks publication
- **WHEN** a training's only restriction row sets `usuario_estado`, or sets `validar_nivel_disciplina = true`
- **THEN** the "Publicar" action SHALL be disabled with a reason explaining that the restrictions can only be met by members of the organization

#### Scenario: A satisfiable row alongside a membership-only row still publishes
- **WHEN** a training has one row setting only `servicio_1_id` and another row setting only `usuario_estado`
- **THEN** the "Publicar" action SHALL be enabled, because the rows are OR-ed at booking time

#### Scenario: Service and membership conditions in the same row block publication
- **WHEN** a training has a single restriction row that sets both `servicio_1_id` and `usuario_estado`
- **THEN** the "Publicar" action SHALL be disabled, because conditions within one row are ANDed

#### Scenario: Direct write bypassing the UI is still rejected
- **WHEN** an insert or update into `entrenamientos_publicos` is attempted (bypassing the application service) for a training whose restriction rows are all membership-only
- **THEN** the database trigger SHALL raise an exception and the write SHALL fail

#### Scenario: Trigger rejection surfaces as a typed error
- **WHEN** the publish service attempts a write that the trigger rejects
- **THEN** the service SHALL surface the same user-facing message it uses for its own pre-check, and SHALL NOT expose a raw database error

#### Scenario: Existing publications are unaffected
- **WHEN** the migration is applied
- **THEN** every existing `entrenamientos_publicos` row SHALL remain present and active, and none SHALL be invalidated or deleted

---

### Requirement: Marketplace listings show the services a training requires
On the authenticated marketplace, a listing whose training has service-based restrictions SHALL display the distinct names of the required services, sorted alphabetically. A listing with no service requirement SHALL render exactly as before, with no empty row or placeholder. The publish modal's live preview SHALL show the same information an authenticated visitor will see.

#### Scenario: Required services are listed
- **WHEN** an authenticated visitor views a marketplace listing whose training requires one or more services
- **THEN** the card SHALL display the distinct required service names, sorted alphabetically

#### Scenario: Unrestricted listing is unchanged
- **WHEN** the training has no service-based restriction
- **THEN** the card SHALL render no requirements row and no placeholder

#### Scenario: Publish preview matches the visitor's view
- **WHEN** an administrador opens the publish modal for a service-restricted training
- **THEN** the live preview SHALL show the same required-services information

---

### Requirement: Required service names are resolved server-side and never exposed to anonymous visitors
Required service names SHALL be resolved through a database view that runs with its owner's privileges and is granted to the `authenticated` role **only**. The client SHALL NOT read `servicios` or `entrenamiento_restricciones` directly to render them, and no policy on those tables SHALL be relaxed for this purpose. The anonymous public view `entrenamientos_publicos_view` SHALL NOT expose service data and its existing grants SHALL remain unchanged, so the anonymous landing page displays no requirements row and its data path is unaffected.

#### Scenario: Non-member sees a service name no public plan grants
- **WHEN** an authenticated non-member views a listing requiring a service that no public plan of that organization grants
- **THEN** the service name SHALL still be displayed, resolved through the view rather than a direct read of `servicios`

#### Scenario: Anonymous role cannot obtain service names
- **WHEN** the `anon` role queries the required-services view
- **THEN** the request SHALL be rejected for lack of privilege
- **WHEN** the `anon` role queries `servicios` or `entrenamiento_restricciones`
- **THEN** no rows SHALL be returned, since their policies grant the anonymous role nothing

#### Scenario: The required-services view is not a write path
- **WHEN** any role other than the owner attempts an insert, update or delete through the required-services view
- **THEN** the write SHALL be rejected — the view grants `SELECT` only, so it cannot be used to reach the underlying tables under owner privileges

#### Scenario: Anonymous public view is unchanged
- **WHEN** the migration is applied
- **THEN** `entrenamientos_publicos_view` SHALL expose the same columns with the same definition and the same grants as before

#### Scenario: Landing page renders no requirements
- **WHEN** an unauthenticated visitor browses the public landing page
- **THEN** no requirements row SHALL be rendered and the listing output SHALL be unchanged from before this change

#### Scenario: Requirements fetch failure degrades gracefully
- **WHEN** the query resolving required service names fails
- **THEN** the marketplace SHALL render the listings without requirements rows rather than failing the whole grid

---

### Requirement: A booking rejected for a missing service offers the organization's plan catalog
When a booking attempt from the authenticated marketplace is rejected with `SERVICIO_REQUERIDO` or `UNIDADES_AGOTADAS`, the system SHALL display the existing rejection message — which names the specific service — together with an action that opens the publishing organization's public plan catalog. The anonymous landing page SHALL NOT offer this action and SHALL keep its existing registration prompt.

#### Scenario: Missing service offers the catalog
- **WHEN** a non-member's booking is rejected because they hold no subscription granting the required service
- **THEN** the rejection message SHALL name the required service
- **THEN** an action SHALL be offered that opens that organization's public plan catalog

#### Scenario: Exhausted units offer the catalog
- **WHEN** a booking is rejected because the athlete's units for a required service are exhausted
- **THEN** the same catalog action SHALL be offered alongside the exhausted-units message

#### Scenario: Catalog action leads into the acquisition flow
- **WHEN** the visitor activates the catalog action
- **THEN** the organization's public plan catalog SHALL open, and acquiring a plan from it SHALL follow the existing public-plan acquisition flow unchanged

#### Scenario: Anonymous visitor is not offered the catalog
- **WHEN** an unauthenticated visitor attempts to book from the landing page
- **THEN** the existing registration prompt SHALL be shown and no catalog action SHALL be offered

---

### Requirement: Non-members can book service-restricted public trainings
A user who is not a member of the publishing organization SHALL be able to book a published training whose restrictions are service-based, provided they hold an active subscription with available units in the required services. The booking SHALL follow the existing reservation pipeline unchanged: the same restriction evaluation, the same atomic unit deduction, the same ledger entry, and the same restoration on cancellation.

#### Scenario: Non-member with units books successfully
- **WHEN** a non-member holding an active subscription with available units in the required service books the training
- **THEN** the reservation SHALL be created, the units SHALL be deducted from `suscripcion_servicios`, and the `reserva_servicios` ledger row SHALL be written

#### Scenario: Pending subscription does not grant access
- **WHEN** the non-member's subscription is still `pendiente` because the administrator has not validated it
- **THEN** the booking SHALL be rejected

#### Scenario: Cancellation restores the units
- **WHEN** a non-member cancels such a booking within the allowed window
- **THEN** the deducted units SHALL be restored exactly as they are for a member

#### Scenario: Member booking is unaffected
- **WHEN** a member books a service-restricted training, public or private
- **THEN** the validation, deduction and messages SHALL be identical to before this change

## MODIFIED Requirements

### Requirement: Marketplace filtering by date, search, and organization
The marketplace page SHALL provide date chips (Hoy, Mañana, Esta semana, Fin de semana) filtering by `fecha_hora`, a search field filtering by case-insensitive substring match on `nombre`/`descripcion` **and on the names of the services the training requires**, and an "Organización" dropdown filtering by the publishing tenant. All three filters SHALL apply client-side to the fetched list and SHALL be combinable.

#### Scenario: Date chip filters the list
- **WHEN** a visitor selects the "Esta semana" date chip
- **THEN** only publications with `fecha_hora` within the current week SHALL remain visible

#### Scenario: Search filters by name or description
- **WHEN** a visitor types a substring into the search field that matches a listing's `nombre`
- **THEN** only matching listings SHALL remain visible

#### Scenario: Search matches a required service name
- **WHEN** a visitor types a substring matching the name of a service that a listing's training requires
- **THEN** that listing SHALL remain visible

#### Scenario: Organization dropdown filters by tenant
- **WHEN** a visitor selects a specific organization from the dropdown
- **THEN** only that organization's published listings SHALL remain visible
