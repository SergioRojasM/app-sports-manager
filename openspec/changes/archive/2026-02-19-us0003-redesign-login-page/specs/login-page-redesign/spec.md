## ADDED Requirements

### Requirement: Redesigned Login Layout
The system SHALL render `/auth/login` as a responsive two-panel login experience aligned with the approved layout and content structure from `projectspec/designs/login.html`, including a left informational panel and a right authentication card.

#### Scenario: Desktop two-panel rendering
- **WHEN** a user opens `/auth/login` on desktop viewport width
- **THEN** the page MUST display both the left brand/benefits panel and the right login form panel in a side-by-side layout

#### Scenario: Mobile stacked rendering
- **WHEN** a user opens `/auth/login` on mobile viewport width
- **THEN** the page MUST render the same content in a usable responsive layout without horizontal overflow

### Requirement: Login Form Fields and Actions
The system SHALL provide email and password inputs, a remember-me checkbox, a forgot-password visual link, a primary sign-in submit action, an “Or continue with” divider, and a sign-up CTA link in the login card.

#### Scenario: Required controls present
- **WHEN** the login page is loaded
- **THEN** all required controls and text sections MUST be visible and keyboard accessible

### Requirement: Authentication Flow Preservation
The login submit action MUST continue to use the existing auth chain (`LoginForm` → `useAuth().signIn` → `authService.signInWithPassword`) for email/password authentication.

#### Scenario: Valid credentials authenticate
- **WHEN** a user submits valid email and password
- **THEN** the system SHALL authenticate using the existing Supabase-backed service flow without introducing a new auth endpoint

#### Scenario: Invalid credentials return feedback
- **WHEN** a user submits invalid credentials
- **THEN** the system SHALL present a user-friendly authentication error message

### Requirement: Loading and Submit State
The system SHALL present loading feedback during sign-in requests and MUST prevent duplicate submissions while a request is in progress.

#### Scenario: Submit during pending request
- **WHEN** sign-in is in progress
- **THEN** the submit button MUST be disabled and indicate loading state

### Requirement: Redirect Semantics with Next Parameter
The system SHALL preserve post-login redirect semantics by prioritizing the `next` query parameter and falling back to `/dashboard` when `next` is absent.

#### Scenario: Redirect with next parameter
- **WHEN** a user signs in successfully from `/auth/login?next=/dashboard`
- **THEN** the system MUST redirect the user to `/dashboard`

#### Scenario: Redirect without next parameter
- **WHEN** a user signs in successfully from `/auth/login` without a `next` query parameter
- **THEN** the system MUST redirect the user to `/dashboard`
