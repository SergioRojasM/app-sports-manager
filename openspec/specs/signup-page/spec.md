## ADDED Requirements

### Requirement: Signup Route and Layout
The system SHALL expose a dedicated `GET /auth/signup` route that renders a responsive split-screen authentication layout.

#### Scenario: Render signup route
- **WHEN** a user navigates to `/auth/signup`
- **THEN** the application renders the signup page without server errors

#### Scenario: Reuse existing left panel
- **WHEN** the signup page is rendered
- **THEN** the left panel SHALL use the existing `LoginBenefitsPanel` component without content or style changes

### Requirement: Signup Form Inputs and Validation
The signup page SHALL provide a form with `email`, `password`, and `confirmPassword` inputs and SHALL prevent submission when client-side validation fails.

#### Scenario: Required fields validation
- **WHEN** the user submits the form with one or more required fields empty
- **THEN** the page SHALL display validation feedback and SHALL NOT call signup service

#### Scenario: Password confirmation validation
- **WHEN** `password` and `confirmPassword` values do not match
- **THEN** the page SHALL display a mismatch error and SHALL NOT call signup service

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
- **THEN** the user SHALL be redirected to `/dashboard`

### Requirement: Auth Route Navigation Links
The signup page SHALL provide a navigation link for existing users to access `GET /auth/login`.

#### Scenario: Navigate to login from signup
- **WHEN** the user activates the existing-account link on `/auth/signup`
- **THEN** the application SHALL navigate to `/auth/login`

### Requirement: Architecture Boundary Compliance
Signup implementation SHALL follow the project architecture boundaries where page composition is in `app/`, presentation logic is in `components/`, and auth integration is consumed through existing hooks/services.

#### Scenario: No direct auth provider calls from page
- **WHEN** code changes for signup are reviewed
- **THEN** page and UI components SHALL consume `useAuth().signUp` rather than directly calling Supabase SDK APIs

## ADDED Requirements

### Requirement: Signup provisioning creates default public membership
After a successful signup user creation, the system SHALL ensure onboarding provisioning creates one default membership in `public.miembros_tenant` for tenant `public` with role `usuario`, in addition to ensuring the `public.usuarios` profile row.

#### Scenario: Signup provisions default membership
- **WHEN** signup succeeds for a newly created auth user
- **THEN** the system SHALL ensure one membership row exists for that user in tenant `public` with role `usuario`

#### Scenario: Provisioning is idempotent for repeated signup hooks
- **WHEN** provisioning logic is triggered more than once for the same user lifecycle event
- **THEN** the system MUST avoid duplicate membership rows and keep exactly one default public membership
