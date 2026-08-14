## ADDED Requirements

### Requirement: Self-service subscription inserts are authorized against the target plan
The `suscripciones` self-service insert policy SHALL require, in addition to `atleta_id = auth.uid()`, that the referenced plan is `activo` and either has `es_publico = true` or belongs to a tenant the caller is a member of. Administrator-initiated subscription creation on behalf of an athlete SHALL remain governed by its own policy and SHALL NOT be affected.

#### Scenario: Member subscribes to their tenant's plan
- **WHEN** a member of a tenant creates a subscription for an active plan of that tenant
- **THEN** the insert SHALL succeed

#### Scenario: Non-member subscribes to a public plan
- **WHEN** a user who is not a member of a tenant creates a subscription for an active public plan of that tenant
- **THEN** the insert SHALL succeed

#### Scenario: Non-member is rejected on a private plan
- **WHEN** a user who is not a member of a tenant attempts to create a subscription for a private plan of that tenant
- **THEN** the insert SHALL be rejected by row level security

#### Scenario: Inactive plan is rejected
- **WHEN** any user attempts a self-service subscription for a plan whose `activo` is false
- **THEN** the insert SHALL be rejected by row level security

#### Scenario: Administrator creation on behalf is unaffected
- **WHEN** an administrator creates a subscription on behalf of an athlete for any plan of their tenant
- **THEN** the insert SHALL succeed under the administrator insert policy

---

### Requirement: Subscriptions from non-member buyers are manageable by the tenant administrator
The subscription management screen SHALL list subscriptions created by users who are not members of the tenant, resolving the buyer's name and email, and SHALL allow the administrator to validate, reject, edit and delete them using the existing actions.

#### Scenario: Non-member subscription is listed
- **WHEN** a non-member has acquired a public plan of the tenant
- **THEN** the resulting subscription SHALL appear in the tenant's subscription management list with the buyer's name and email

#### Scenario: Non-member subscription can be validated
- **WHEN** the administrator validates a subscription belonging to a non-member buyer
- **THEN** the subscription and its payment SHALL transition exactly as they do for a member's subscription
