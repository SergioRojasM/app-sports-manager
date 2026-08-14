## ADDED Requirements

### Requirement: Google OAuth Sign-In Service Method
The system SHALL provide an `authService.signInWithOAuth` method that initiates a Google OAuth sign-in via Supabase (`supabase.auth.signInWithOAuth({ provider: 'google', ... })`), building `redirectTo` from the app origin plus `/auth/callback`, optionally appending a `next` query parameter using the same encoding pattern as `signUpWithPassword`.

#### Scenario: Redirect built without a next param
- **WHEN** `signInWithOAuth` is called with no `next` argument
- **THEN** the system SHALL request a redirect to `${origin}/auth/callback`

#### Scenario: Redirect built with a next param
- **WHEN** `signInWithOAuth` is called with a `next` argument
- **THEN** the system SHALL request a redirect to `${origin}/auth/callback?next=<url-encoded next>`

#### Scenario: Client-side failure before redirect
- **WHEN** `supabase.auth.signInWithOAuth` returns an error (e.g., provider not enabled, network failure)
- **THEN** the system SHALL return `{ errorMessage: <error message> }` without navigating away from the current page

### Requirement: Google Sign-In Button on Login and Signup
The system SHALL render a "Continuar con Google" button beneath the existing "O continúa con" divider on both `/auth/login` and `/auth/signup`, which invokes the Google OAuth sign-in flow via `useAuth().signInWithGoogle`.

#### Scenario: Button present on login page
- **WHEN** `/auth/login` is rendered
- **THEN** a "Continuar con Google" button MUST be visible and keyboard-focusable beneath the divider

#### Scenario: Button present on signup page
- **WHEN** `/auth/signup` is rendered
- **THEN** a "Continuar con Google" button MUST be visible and keyboard-focusable beneath the divider

#### Scenario: Click initiates OAuth flow
- **WHEN** a user clicks the "Continuar con Google" button
- **THEN** the system SHALL call `signInWithGoogle` with the page's current `nextPath` (when present) and enter a disabled/loading state while the redirect is pending

#### Scenario: Error surfaces in the existing alert banner
- **WHEN** `signInWithGoogle` resolves with a non-null `errorMessage`
- **THEN** the page SHALL display that message in the same `role="alert"` error banner already used for email/password errors, and the button SHALL return to its enabled state

### Requirement: Next Parameter Preserved Through Google OAuth
The Google OAuth flow SHALL preserve the `next` destination (including guided-booking targets produced by `buildGuidedNextPath`) through the redirect round trip, landing the user on the same destination that a successful email/password flow would use.

#### Scenario: Guided booking next param survives OAuth round trip
- **WHEN** a user starts the Google OAuth flow from `/auth/login?next=<guided-booking-target>` or `/auth/signup` with a guided `nextPath` prop
- **THEN** after Supabase completes the OAuth exchange, the user SHALL be redirected to that same guided-booking target via the existing `/auth/callback` → (`/portal/bootstrap` when applicable) redirect chain

#### Scenario: No next param falls back to default destination
- **WHEN** a user completes Google OAuth from a page with no `next` param
- **THEN** the user SHALL land on `/dashboard`, matching the existing default used by `/auth/callback`

### Requirement: Google Profile Metadata Mapped to User Profile
On first sign-in via Google, the `public.usuarios` provisioning trigger SHALL populate `nombre` and `foto_url` from Google's OAuth metadata keys (`full_name` or `name`, and `avatar_url` or `picture`, respectively) when the password-flow's own keys (`nombre`, `foto_url`) are absent, without overwriting existing non-null values on repeat logins.

#### Scenario: First-time Google signup populates name and photo
- **WHEN** a brand-new user completes sign-up via Google and Supabase inserts the corresponding `auth.users` row with `full_name`/`name` and `avatar_url`/`picture` in `raw_user_meta_data`
- **THEN** the resulting `public.usuarios` row SHALL have `nombre` and `foto_url` populated from those values

#### Scenario: Existing profile data is not overwritten with nulls
- **WHEN** an existing user with non-null `nombre`/`foto_url` in `public.usuarios` signs in again (via any provider) and the incoming metadata lacks a value for one of those fields
- **THEN** the trigger SHALL preserve the existing non-null value rather than clearing it

#### Scenario: Password signup keys still take priority
- **WHEN** `raw_user_meta_data` contains both the password-flow's own key (e.g. `nombre`) and Google's fallback key (e.g. `full_name`)
- **THEN** the system SHALL use the password-flow's own key's value
