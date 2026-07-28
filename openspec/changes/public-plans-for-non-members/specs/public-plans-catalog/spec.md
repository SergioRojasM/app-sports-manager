## ADDED Requirements

### Requirement: Plans carry a public visibility flag
The `planes` table SHALL carry an `es_publico` column of type `boolean not null default false`. A plan with `es_publico = true` SHALL be visible to, and purchasable by, authenticated users who are not members of the plan's tenant. Every plan existing before this change SHALL remain private.

#### Scenario: Existing plans default to private
- **WHEN** the migration adding `es_publico` is applied
- **THEN** every pre-existing `planes` row SHALL have `es_publico = false`
- **THEN** no plan SHALL become visible to non-members as a result of the migration

#### Scenario: Public flag is persisted
- **WHEN** an administrator saves a plan with the public option enabled
- **THEN** `planes.es_publico` SHALL be stored as `true` for that plan

---

### Requirement: Non-members can only read public plans
The system SHALL restrict `SELECT` on `planes`, `plan_tipos`, `plan_tipos_servicios` and `planes_disciplina` to rows whose plan satisfies at least one of: the caller is a member of the plan's tenant, the plan is both `es_publico = true` and `activo = true`, or the caller already holds a subscription (`suscripciones`) referencing that plan. `SELECT` on `servicios` SHALL be restricted to services whose tenant the caller is a member of, services granted by a subtype of a public active plan, or services for which the caller already holds `suscripcion_servicios` units. These rules SHALL be enforced by row level security policies, not only by service-layer filters.

#### Scenario: Non-member reads only public plans
- **WHEN** a user who is not a member of a tenant queries `planes` for that tenant
- **THEN** only rows with `es_publico = true` SHALL be returned
- **THEN** private plans of that tenant SHALL NOT be returned

#### Scenario: Non-member cannot read private plan subtypes or services
- **WHEN** a non-member queries `plan_tipos`, `plan_tipos_servicios`, `planes_disciplina` or `servicios` for rows that belong exclusively to private plans
- **THEN** no rows SHALL be returned

#### Scenario: Member reads all plans of their tenant
- **WHEN** a user who is a member of a tenant, in any role and any membership state, queries that tenant's plans
- **THEN** both public and private plans of that tenant SHALL be returned, including inactive ones

#### Scenario: Retired public plan is hidden from non-members
- **WHEN** a plan has `es_publico = true` but `activo = false`
- **THEN** a non-member SHALL NOT be able to read it
- **THEN** a member of its tenant SHALL still be able to read it

#### Scenario: Buyer keeps reading a plan after it is un-published
- **WHEN** a non-member holds a subscription to a plan and an administrator sets `es_publico = false` on it
- **THEN** the buyer SHALL still be able to read that plan, its subtype and its services
- **THEN** the plan SHALL NOT appear in that organization's public catalog

---

### Requirement: Self-service subscription creation is restricted to purchasable plans
The system SHALL reject, at the database level, any self-service `suscripciones` insert whose target plan is inactive, or is neither public nor owned by a tenant the caller is a member of. The insert SHALL continue to require `atleta_id = auth.uid()`.

#### Scenario: Non-member subscribes to a public plan
- **WHEN** a non-member inserts a subscription referencing an active public plan of that tenant
- **THEN** the insert SHALL succeed

#### Scenario: Non-member is rejected on a private plan
- **WHEN** a non-member inserts a subscription referencing a private plan
- **THEN** the insert SHALL be rejected by row level security with error code `42501`

#### Scenario: Subscription on behalf of another user is rejected
- **WHEN** any authenticated user inserts a subscription whose `atleta_id` is not their own user id
- **THEN** the insert SHALL be rejected

---

### Requirement: Organization cards expose a "Ver planes" action
The organizations directory at `/portal/orgs` SHALL render a "Ver planes" action on every organization card, alongside the existing primary action ("Ingresar" for members, "Solicitar acceso" for non-members). Activating it SHALL open the public plan catalog modal for that organization.

#### Scenario: Non-member sees the action
- **WHEN** an authenticated non-member views the organizations directory
- **THEN** each organization card SHALL show both "Solicitar acceso" and "Ver planes"

#### Scenario: Member sees the action
- **WHEN** an authenticated member views the organizations directory
- **THEN** their organization's card SHALL show both "Ingresar" and "Ver planes"

#### Scenario: Action opens the catalog
- **WHEN** the user activates "Ver planes" on an organization card
- **THEN** the system SHALL open a modal showing that organization's public plan catalog

---

### Requirement: Public plan catalog lists public active plans with subtypes and services
The catalog modal SHALL list only plans of the selected organization with `es_publico = true` and `activo = true`. Each plan entry SHALL display its name, modalidad, associated discipline names and benefits, plus a **collapsible** section containing one row per **active** subtype showing `precio` formatted as COP currency, `vigencia_dias`, and the services that subtype grants with their unit counts. A service whose assigned `unidades` is null SHALL be displayed as unlimited. The collapsed section SHALL summarize how many options the plan has and its lowest price, and SHALL be expanded by default whenever a search term is active, so that a plan matched only by a service name shows the matching service.

#### Scenario: Public plans are listed with their subtypes
- **WHEN** the catalog opens for an organization that has public active plans
- **THEN** each public plan SHALL be rendered with a collapsible subtypes section that, once expanded, shows each active subtype's price, validity in days and granted services

#### Scenario: Collapsed section summarizes the options
- **WHEN** a plan's subtypes section is collapsed
- **THEN** it SHALL show the number of available options and the lowest price among them

#### Scenario: Search expands the subtypes
- **WHEN** a search term is active
- **THEN** the subtypes section of each visible plan SHALL be expanded by default

#### Scenario: Subtypes collapse again when the search is cleared
- **WHEN** the user clears the search term
- **THEN** the subtypes sections SHALL return to their collapsed state

#### Scenario: Private and inactive plans are excluded
- **WHEN** the organization also has private plans or inactive plans
- **THEN** those plans SHALL NOT be listed in the catalog

#### Scenario: Inactive subtypes are excluded
- **WHEN** a listed public plan has inactive subtypes
- **THEN** those subtypes SHALL NOT be rendered

#### Scenario: Unlimited service units are labelled
- **WHEN** a subtype grants a service with `unidades` set to null
- **THEN** that service SHALL be displayed as unlimited rather than showing a numeric count

---

### Requirement: Catalog search matches plans and services
The catalog SHALL provide a single search input that filters the listed plans in memory, without additional server requests. The search SHALL match, case-insensitively and accent-insensitively, against plan name, plan description, plan benefits, subtype name and **service name**. A plan SHALL remain visible when any of its subtypes or any of their services matches.

#### Scenario: Search matches a plan name
- **WHEN** the user types text matching a plan's name
- **THEN** only plans matching the search SHALL remain visible

#### Scenario: Search matches a service name
- **WHEN** the user types text matching only the name of a service granted by one of a plan's subtypes
- **THEN** that plan SHALL remain visible in the list

#### Scenario: Search ignores accents and case
- **WHEN** the user types a term without accents or with different casing than the stored value
- **THEN** matching entries SHALL still be returned

#### Scenario: Search performs no server request
- **WHEN** the user changes the search term
- **THEN** the system SHALL NOT issue an additional data request

---

### Requirement: Catalog exposes loading, empty, no-results and error states
The catalog modal SHALL render a loading state while the catalog is being fetched, an explicit message when the organization has no public plans, a distinct no-results state with a clear-search action when the search yields nothing, and an error state with a retry action when the fetch fails.

#### Scenario: Organization has no public plans
- **WHEN** the organization has no plan with `es_publico = true` and `activo = true`
- **THEN** the modal SHALL display an explicit "no public plans" message

#### Scenario: Search yields no results
- **WHEN** the search term matches no plan, subtype or service
- **THEN** the modal SHALL display a no-results state with an action that clears the search

#### Scenario: Catalog fetch fails
- **WHEN** the catalog request fails
- **THEN** the modal SHALL display an error message and a retry action

---

### Requirement: Non-members acquire public plans through the existing subscription flow
Acquiring a public plan SHALL reuse the existing subscription flow without behavioral divergence: subtype selection, payment method selection, optional payment proof upload, creation of a `suscripciones` row with `estado = 'pendiente'`, population of `suscripcion_servicios` from the subtype's `plan_tipos_servicios`, creation of a linked `pagos` row with `estado = 'pendiente'`, and administrator validation from the tenant's subscription management screen. The acquire action SHALL be offered to non-members and to members whose role in that organization is `usuario`, and SHALL NOT be offered to that organization's `administrador` or `entrenador`.

#### Scenario: Non-member acquires a public plan
- **WHEN** a non-member completes the acquisition flow for a public plan subtype
- **THEN** a `suscripciones` row SHALL be created with `estado = 'pendiente'` for that tenant and plan subtype
- **THEN** `suscripcion_servicios` rows SHALL be created matching the subtype's `plan_tipos_servicios`, preserving null unit values as unlimited
- **THEN** a linked `pagos` row SHALL be created with `estado = 'pendiente'`

#### Scenario: Administrator validates a non-member subscription
- **WHEN** the tenant administrator opens the subscription management screen after a non-member purchase
- **THEN** the subscription SHALL be listed with the buyer's name and email resolved
- **THEN** the administrator SHALL be able to validate or reject it exactly as for a member's subscription

#### Scenario: Duplicate pending request is blocked
- **WHEN** a user attempts to acquire a plan for which they already have a subscription in `pendiente` state
- **THEN** the system SHALL block the submission and display the existing duplicate-request message

#### Scenario: Acquire action hidden for tenant staff
- **WHEN** the user browsing the catalog is `administrador` or `entrenador` of that organization
- **THEN** the acquire action SHALL NOT be rendered

#### Scenario: Plan becomes unavailable before submission
- **WHEN** the plan is deactivated or un-published between catalog load and submission and the insert is rejected by row level security
- **THEN** the system SHALL display a message stating the plan is no longer available and inviting the user to refresh the list

---

### Requirement: Acquiring a public plan does not grant membership
Completing a public plan purchase SHALL NOT create a `miembros_tenant` row. The buyer SHALL remain a non-member of the organization and SHALL continue to use the existing access request flow to join it.

#### Scenario: Buyer remains a non-member
- **WHEN** a non-member completes a public plan purchase
- **THEN** no membership row SHALL be created for that user and tenant
- **THEN** the organization card SHALL continue to display the "Solicitar acceso" action for that user
