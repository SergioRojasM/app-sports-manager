## MODIFIED Requirements

### Requirement: Booking from the marketplace reuses the existing reservation pipeline
Booking a published training SHALL use the same reservation creation path used for same-tenant bookings (`reservasService.create()`, restriction validation against `entrenamiento_restricciones`, and formulario attachment handling), targeting the publication's `entrenamiento_id`. No new or duplicated booking, restriction, or formulario logic SHALL be introduced for the marketplace flow. Advance-notice enforcement (`reserva_antelacion_horas`/`cancelacion_antelacion_horas`) SHALL always be evaluated against the live value on the source `entrenamientos` row, never against the value snapshotted on `entrenamientos_publicos`. Restriction validation (`reservasService.validateBookingRestrictions()`) SHALL run once when the visitor clicks "Reservar", before the booking form (or any formulario step) is shown, in addition to the existing pre-flight evaluation `reservasService.create()` already performs immediately before the atomic booking RPC. If the upfront check rejects the booking, the form SHALL NOT be shown; if the upfront check fails unexpectedly (e.g. a network error unrelated to a real rejection), the flow SHALL proceed to the form as if the check had passed, since the RPC-level check remains the authoritative, race-safe gate regardless of the upfront check's outcome.

#### Scenario: Booking creates a reservation against the source training
- **WHEN** an authenticated visitor clicks "Reservar" on a published listing and completes the booking form
- **THEN** a `reservas` row SHALL be created against the publication's `entrenamiento_id`, using the same creation path as a same-tenant booking

#### Scenario: Internal formulario still applies
- **WHEN** the published training's source `entrenamientos` row has `formulario_id` set and the upfront restriction check passes
- **THEN** the visitor SHALL be routed through the same form-fill step used for same-tenant bookings before the reservation is created

#### Scenario: Advance-notice cutoff uses the live value
- **WHEN** a visitor attempts to book less than `reserva_antelacion_horas` (read from the source `entrenamientos` row) before the training's start time
- **THEN** the booking SHALL be rejected with the same validation message used for same-tenant bookings

#### Scenario: Booking UI never exposes tenant-admin affordances
- **WHEN** a visitor with no role in the owning tenant opens the booking modal from the marketplace
- **THEN** no tenant-admin-only controls (reservations list, export, attendance management) SHALL be rendered

#### Scenario: Ineligible visitor is rejected before the form appears
- **WHEN** a visitor clicks "Reservar" on a training whose restrictions they do not satisfy (e.g. missing a required service, exhausted service units, insufficient tenant status, or insufficient discipline level)
- **THEN** the booking modal SHALL show a rejection state immediately, and the booking form (and any formulario step) SHALL NOT be displayed

#### Scenario: Eligible visitor proceeds to the form without extra friction
- **WHEN** a visitor clicks "Reservar" on a training whose restrictions they satisfy (or which has none)
- **THEN** the booking modal SHALL show a brief loading state while the upfront check runs, then proceed directly to the booking form (or formulario step, if attached) exactly as before this change

#### Scenario: Upfront check failure does not block booking
- **WHEN** the upfront restriction check fails to complete due to an unexpected error (not a real rejection)
- **THEN** the flow SHALL proceed to the booking form as if the check had passed, and the existing submit-time RPC check SHALL still apply as the final safety net

---

## ADDED Requirements

### Requirement: Rejection reasons that cannot be fixed by a plan purchase show a message-only dialog
When the upfront (or submit-time) restriction check rejects a booking for a reason other than a missing or exhausted service (e.g. advance-notice timing, tenant membership status, or discipline level), the rejection dialog SHALL show the rejection message with a way to dismiss it, and SHALL NOT offer a plan-purchase action, since acquiring a plan cannot resolve those conditions.

#### Scenario: Timing rejection shows no purchase option
- **WHEN** a visitor's booking attempt is rejected with a timing-related code
- **THEN** the rejection dialog SHALL display the rejection message and a way to close it, with no "Ver planes" or equivalent purchase action

#### Scenario: Service-related rejection still offers the purchase option
- **WHEN** a visitor's booking attempt is rejected because a required service is missing or its units are exhausted
- **THEN** the rejection dialog SHALL offer an action that opens the organization's public plan catalog

---

### Requirement: Marketplace cards offer a formulario preview action
A public training card whose source training has an attached formulario SHALL offer a way to preview it without requiring the visitor to attempt a booking first. When the formulario is an internal template, the action SHALL open a read-only preview of its sections. When only an external formulario URL is set, the action SHALL open that URL in a new tab instead. A card whose training has no attached formulario SHALL show neither action.

#### Scenario: Internal formulario can be previewed from the card
- **WHEN** a visitor views a public training card whose source training has an internal formulario attached
- **THEN** the card SHALL offer a "Vista previa" action that opens a read-only rendering of the formulario's sections, without creating or modifying any reservation

#### Scenario: External formulario opens in a new tab
- **WHEN** a visitor views a public training card whose source training has only an external formulario URL set
- **THEN** the card SHALL offer an action that opens that URL in a new browser tab

#### Scenario: No formulario means no preview action
- **WHEN** a visitor views a public training card whose source training has neither an internal nor an external formulario
- **THEN** the card SHALL show no formulario preview or link action

---

### Requirement: Marketplace cards offer a plan acquisition action for required services
A public training card whose training requires at least one service SHALL offer an action that opens the organization's public plan catalog, pre-searched to the required service, so a visitor can acquire the necessary plan without first attempting a booking. A card whose training has no service requirement SHALL show no such action. This action's presence depends only on whether the training has a service requirement, not on whether the viewing visitor already holds it.

#### Scenario: Card with a service requirement offers plan acquisition
- **WHEN** a visitor views a public training card whose training requires at least one service
- **THEN** the card SHALL offer an "Adquirir plan" action that opens the training's organization's public plan catalog, with the catalog's search pre-filled to the required service's name

#### Scenario: Card without a service requirement offers no plan acquisition action
- **WHEN** a visitor views a public training card whose training has no service requirement
- **THEN** the card SHALL show no plan acquisition action

#### Scenario: Pre-filled search does not leak between cards
- **WHEN** a visitor opens the plan acquisition action from one card, closes it, then opens it from a different card requiring a different service
- **THEN** the catalog's search SHALL reflect the second card's required service, not a term left over from the first

#### Scenario: Existing unfiltered catalog entry points are unaffected
- **WHEN** a visitor opens the public plan catalog through an existing entry point that does not specify a pre-filled search (e.g. an organization's "Ver planes" button)
- **THEN** the catalog SHALL open unfiltered, exactly as it does today
