## MODIFIED Requirements

### Requirement: clases_restantes is system-managed and read-only in admin UI
*Modifies the subscription list and edit requirements defined in `openspec/specs/subscription-management/spec.md`.*

The `clases_restantes` column on any admin subscription table or edit form SHALL be rendered as read-only. Administrators MUST NOT be able to override this value via the subscription management UI; it is exclusively managed by the `book_and_deduct_class` and `cancel_and_restore_class` RPCs. The displayed value MUST always reflect the latest value from the database (no optimistic local decrement/increment).

#### Scenario: Subscription list shows current class balance
- **WHEN** an admin views the subscription list for a tenant
- **THEN** each row with a class-based plan displays the current `clases_restantes` value as returned by the `suscripciones` query; no stale cached value is shown

#### Scenario: Admin cannot edit clases_restantes via UI
- **WHEN** an admin opens the edit form for a subscription
- **THEN** the `clases_restantes` field (if visible) is displayed as a read-only label or disabled input; no form submission includes a `clases_restantes` write

#### Scenario: Subscription with NULL clases_restantes labelled as unlimited
- **WHEN** an admin views a subscription associated with an unlimited plan (`clases_restantes IS NULL`)
- **THEN** the class balance column displays "Ilimitado" (or equivalent) instead of a numeric value or blank

---

### Requirement: Athlete-facing class balance visibility
The athlete home or subscription view SHALL display `clases_restantes` for each active subscription with a class-based plan so the athlete can self-serve their remaining class balance before attempting to book.

#### Scenario: Athlete sees remaining class count on active subscription card
- **WHEN** an athlete with an active class-based subscription views their subscription section (e.g., `InicioSuscripciones` component)
- **THEN** each subscription card or row shows "X clases restantes" where X is the current `clases_restantes` value

#### Scenario: Zero balance displayed with warning style
- **WHEN** `clases_restantes = 0` for an active subscription
- **THEN** the balance is displayed with a visual warning (e.g., red text or warning icon) to alert the athlete that no classes remain

#### Scenario: Unlimited plan hides class counter
- **WHEN** an athlete's active subscription has `clases_restantes IS NULL`
- **THEN** no class counter is shown; the subscription card does not display "Ilimitado" as a balance label to avoid confusion with numeric values
