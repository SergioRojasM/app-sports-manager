## MODIFIED Requirements

### Requirement: Signup Submission and Feedback
The signup form SHALL call the existing auth signup contract and provide deterministic loading, success, and error feedback states.

#### Scenario: Loading state during submit
- **WHEN** a valid signup submission is in progress
- **THEN** the submit button SHALL be disabled and loading text/state SHALL be visible

#### Scenario: Error response from auth
- **WHEN** signup fails in the auth service
- **THEN** the page SHALL display the returned error message in an accessible alert region

#### Scenario: Confirmation required outcome
- **WHEN** signup succeeds without an active session
- **THEN** the page SHALL show guidance instructing the user to confirm email before login

#### Scenario: Immediate session outcome
- **WHEN** signup succeeds and an active session is returned
- **THEN** the user SHALL be redirected to the resolved `next` target (see "Signup Redirect Target Accepts a Next Parameter"), which defaults to `/dashboard` when no `next` query parameter was supplied

## ADDED Requirements

### Requirement: Signup Redirect Target Accepts a Next Parameter
The system SHALL accept an optional `next` query parameter on `GET /auth/signup`, using it both to resolve the post-signup immediate-session redirect target and to build the confirmation email's `emailRedirectTo` link, so the target survives even when the confirmation link is opened on a different device or browser than the one used to sign up.

#### Scenario: next parameter resolves the immediate-session redirect target
- **WHEN** a user submits the signup form from `/auth/signup?next=/portal/entrenamientos-publicos%3Fentrenamiento%3D123` and an active session is returned immediately
- **THEN** the user SHALL be redirected to `/portal/entrenamientos-publicos?entrenamiento=123`

#### Scenario: next parameter is forwarded into the confirmation email link
- **WHEN** a user submits the signup form from `/auth/signup?next=/portal/entrenamientos-publicos%3Fentrenamiento%3D123` and the outcome requires email confirmation
- **THEN** the confirmation email's link SHALL resolve, once clicked, to `/auth/callback` with a `next` query parameter that decodes to `/portal/entrenamientos-publicos?entrenamiento=123`

#### Scenario: Missing next parameter defaults to the dashboard
- **WHEN** a user submits the signup form from `/auth/signup` with no `next` query parameter present
- **THEN** the immediate-session redirect target and the confirmation email link both resolve to `/dashboard`, unchanged from prior behavior

### Requirement: Guided Booking Stepper on Signup
The signup page SHALL render the guided booking stepper (see the `guided-public-training-booking` capability) when its resolved `next` value encodes a guided booking target.

#### Scenario: Stepper shown for a guided next target
- **WHEN** the signup page is rendered with a `next` query parameter that encodes a guided booking target
- **THEN** the guided booking stepper is displayed, highlighting step 1 before submission and step 2 after a confirmation-required outcome

#### Scenario: Stepper absent for an ordinary next target
- **WHEN** the signup page is rendered with no `next` query parameter, or with a `next` value that does not encode a guided booking target
- **THEN** no stepper is rendered and the page behaves exactly as it does today
