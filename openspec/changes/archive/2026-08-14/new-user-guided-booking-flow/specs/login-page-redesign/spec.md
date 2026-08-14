## ADDED Requirements

### Requirement: Guided Booking Stepper on Login
The login page SHALL render the guided booking stepper (see the `guided-public-training-booking` capability) when its resolved `nextPath` encodes a guided booking target, without altering the existing redirect semantics defined by "Redirect Semantics with Next Parameter".

#### Scenario: Stepper shown for a guided next target
- **WHEN** the login page is rendered at `/auth/login?next=...` where `next` decodes to a path encoding a guided booking target
- **THEN** the guided booking stepper is displayed, highlighting step 1 ("Crear cuenta")

#### Scenario: Stepper absent for an ordinary next target
- **WHEN** the login page is rendered with no `next` query parameter, or with a `next` value that does not encode a guided booking target
- **THEN** no stepper is rendered and the page behaves exactly as it does today

#### Scenario: Existing redirect behavior is unaffected
- **WHEN** a user signs in successfully from a login page showing the guided booking stepper
- **THEN** the post-login redirect still follows the existing `next`-based redirect semantics unchanged
